import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Device, DeviceDocument } from '../../schemas/device.schema';
import {
  Warranty,
  WarrantyDocument,
  WarrantyStatus,
} from '../../schemas/warranty.schema';
import {
  AuditLog,
  AuditLogDocument,
  ActionType,
  EntityType,
} from '../../schemas/audit-log.schema';
import {
  EmailService,
  DeviceRegistrationEmailData,
} from '../email/email.service';

export interface WarrantyValidationDto {
  imei?: string;
  fiscalNumber?: string;
  model: string;
  ownerCpfCnpj: string;
}

export interface DeviceRegistrationDto {
  imei: string;
  fiscalNumber: string;
  model: string;
  brand: string;
  purchaseDate: Date;
  ownerCpfCnpj: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  photos: string[];
}

export interface DeviceRegistrationResponse {
  success: boolean;
  device?: {
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    id: string | unknown;
    imei: string;
    model: string;
    brand: string;
  };
  warranty?: {
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    id: string | unknown;
    policyNumber: string;
    startDate: Date;
    endDate: Date;
  };
  message: string;
  emailSent: boolean;
}

export interface WarrantyStatusResponse {
  isValid: boolean;
  warranty?: {
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    id: string | unknown;
    status: WarrantyStatus;
    startDate: Date;
    endDate: Date;
    maxClaims: number;
    usedClaims: number;
    remainingClaims: number;
    policyNumber: string;
    coverageType: string;
  };
  device?: {
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    id: string | unknown;
    imei: string;
    model: string;
    brand: string;
  };
  message: string;
}

@Injectable()
export class WarrantyService {
  constructor(
    @InjectModel(Device.name) private deviceModel: Model<DeviceDocument>,
    @InjectModel(Warranty.name) private warrantyModel: Model<WarrantyDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    private emailService: EmailService,
  ) {}

  async validateWarranty(
    validationDto: WarrantyValidationDto,
    ipAddress?: string,
  ): Promise<WarrantyStatusResponse> {
    const { imei, fiscalNumber, model, ownerCpfCnpj } = validationDto;

    if (!imei && !fiscalNumber) {
      throw new BadRequestException(
        'Either IMEI or fiscal number must be provided',
      );
    }

    const deviceQuery: any = {
      model,
      ownerCpfCnpj,
      isActive: true,
    };

    if (imei) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      deviceQuery.imei = imei;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      deviceQuery.fiscalNumber = fiscalNumber;
    }

    const device = await this.deviceModel.findOne(deviceQuery);

    if (!device) {
      await this.logAudit({
        action: ActionType.VALIDATE_WARRANTY,
        entityType: EntityType.DEVICE,
        description: `Device not found for validation: ${imei || fiscalNumber}`,
        ipAddress,
        metadata: validationDto,
      });

      return {
        isValid: false,
        message: 'Device not found or does not match the provided information',
      };
    }

    const warranty = await this.warrantyModel.findOne({
      deviceId: device._id,
      status: WarrantyStatus.ACTIVE,
      isActive: true,
    });

    if (!warranty) {
      await this.logAudit({
        action: ActionType.VALIDATE_WARRANTY,
        entityType: EntityType.WARRANTY,
        entityId: device._id,
        description: 'No active warranty found for device',
        ipAddress,
        metadata: { deviceId: device._id },
      });

      return {
        isValid: false,
        device: {
          id: device._id,
          imei: device.imei,
          model: device.model,
          brand: device.brand,
        },
        message: 'No active warranty found for this device',
      };
    }

    // Check if warranty is expired
    const now = new Date();
    if (warranty.endDate < now) {
      // Update warranty status to expired
      await this.warrantyModel.updateOne(
        { _id: warranty._id },
        { status: WarrantyStatus.EXPIRED },
      );

      await this.logAudit({
        action: ActionType.VALIDATE_WARRANTY,
        entityType: EntityType.WARRANTY,
        entityId: warranty._id,
        description: 'Warranty expired during validation',
        ipAddress,
      });

      return {
        isValid: false,
        device: {
          id: device._id,
          imei: device.imei,
          model: device.model,
          brand: device.brand,
        },
        warranty: {
          id: warranty._id,
          status: WarrantyStatus.EXPIRED,
          startDate: warranty.startDate,
          endDate: warranty.endDate,
          maxClaims: warranty.maxClaims,
          usedClaims: warranty.usedClaims,
          remainingClaims: warranty.maxClaims - warranty.usedClaims,
          policyNumber: warranty.policyNumber,
          coverageType: warranty.coverageType,
        },
        message: 'Warranty has expired',
      };
    }

    await this.logAudit({
      action: ActionType.VALIDATE_WARRANTY,
      entityType: EntityType.WARRANTY,
      entityId: warranty._id,
      description: 'Warranty validation successful',
      ipAddress,
    });

    return {
      isValid: true,
      device: {
        id: device._id,
        imei: device.imei,
        model: device.model,
        brand: device.brand,
      },
      warranty: {
        id: warranty._id,
        status: warranty.status,
        startDate: warranty.startDate,
        endDate: warranty.endDate,
        maxClaims: warranty.maxClaims,
        usedClaims: warranty.usedClaims,
        remainingClaims: warranty.maxClaims - warranty.usedClaims,
        policyNumber: warranty.policyNumber,
        coverageType: warranty.coverageType,
      },
      message: 'Warranty is active and valid',
    };
  }

  async registerDevice(
    registrationDto: DeviceRegistrationDto,
    ipAddress?: string,
  ): Promise<DeviceRegistrationResponse> {
    const {
      imei,
      fiscalNumber,
      model,
      brand,
      purchaseDate,
      ownerCpfCnpj,
      ownerName,
      ownerEmail,
      ownerPhone,
      photos,
    } = registrationDto;

    // Check if device already exists
    const existingDevice = await this.deviceModel.findOne({
      $or: [{ imei }, { fiscalNumber }],
      isActive: true,
    });

    if (existingDevice) {
      throw new BadRequestException(
        'Device with this IMEI or fiscal number already exists',
      );
    }

    try {
      // Create new device
      const device = new this.deviceModel({
        imei,
        fiscalNumber,
        model,
        brand,
        purchaseDate,
        ownerCpfCnpj,
        ownerName,
        ownerEmail,
        ownerPhone,
        photos,
        isActive: true,
      });

      const savedDevice = await device.save();

      // Create warranty for the device
      const warrantyStartDate = new Date();
      const warrantyEndDate = new Date();
      warrantyEndDate.setFullYear(warrantyEndDate.getFullYear() + 1); // 1 year warranty

      const warranty = new this.warrantyModel({
        deviceId: savedDevice._id,
        policyNumber: `POL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        status: WarrantyStatus.ACTIVE,
        startDate: warrantyStartDate,
        endDate: warrantyEndDate,
        maxClaims: 2, // Default: 2 claims per year
        usedClaims: 0,
        coverageType: 'Screen Protection',
        isActive: true,
      });

      const savedWarranty = await warranty.save();

      // Log the registration
      await this.logAudit({
        action: ActionType.CREATE,
        entityType: EntityType.DEVICE,
        entityId: savedDevice._id,
        description: `Device registered successfully: ${imei}`,
        ipAddress,
        metadata: { deviceId: savedDevice._id, warrantyId: savedWarranty._id },
      });

      // Send registration email
      let emailSent = false;
      try {
        const emailData: DeviceRegistrationEmailData = {
          ownerName,
          ownerEmail,
          deviceModel: model,
          deviceBrand: brand,
          imei,
          registrationDate: new Date(),
        };

        emailSent =
          await this.emailService.sendDeviceRegistrationEmail(emailData);
      } catch (emailError) {
        console.error('Failed to send registration email:', emailError);
      }

      return {
        success: true,
        device: {
          id: savedDevice._id,
          imei: savedDevice.imei,
          model: savedDevice.model,
          brand: savedDevice.brand,
        },
        warranty: {
          id: savedWarranty._id,
          policyNumber: savedWarranty.policyNumber,
          startDate: savedWarranty.startDate,
          endDate: savedWarranty.endDate,
        },
        message: 'Device registered successfully and warranty activated',
        emailSent,
      };
    } catch (error) {
      await this.logAudit({
        action: ActionType.CREATE,
        entityType: EntityType.DEVICE,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        description: `Failed to register device: ${error.message}`,
        ipAddress,
        metadata: registrationDto,
      });

      throw new BadRequestException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Failed to register device: ${error.message}`,
      );
    }
  }

  private async logAudit(auditData: {
    action: ActionType;
    entityType: EntityType;
    entityId?: any;
    description: string;
    ipAddress?: string;
    metadata?: any;
  }) {
    const auditLog = new this.auditLogModel({
      ...auditData,
      timestamp: new Date(),
    });
    await auditLog.save();
  }
}
