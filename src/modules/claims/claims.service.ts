import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Device, DeviceDocument } from '../../schemas/device.schema';
import {
  Warranty,
  WarrantyDocument,
  WarrantyStatus,
} from '../../schemas/warranty.schema';
import {
  Claim,
  ClaimDocument,
  ClaimStatus,
  DamageType,
} from '../../schemas/claim.schema';
import {
  AuditLog,
  AuditLogDocument,
  ActionType,
  EntityType,
} from '../../schemas/audit-log.schema';

export interface CreateClaimDto {
  deviceId: string;
  damageType: DamageType;
  damageDescription: string;
  incidentDate: Date;
  customerName: string;
  customerCpf: string;
  customerPhone: string;
  customerEmail: string;
  evidencePhotos?: string[];
  documents?: string[];
}

export interface ClaimResponse {
  id: string;
  protocolNumber: string;
  status: ClaimStatus;
  damageType: DamageType;
  damageDescription: string;
  incidentDate: Date;
  customerName: string;
  customerCpf: string;
  customerPhone: string;
  customerEmail: string;
  createdAt: Date;
  device: {
    imei: string;
    model: string;
    brand: string;
  };
  warranty: {
    policyNumber: string;
    remainingClaims: number;
  };
}

@Injectable()
export class ClaimsService {
  constructor(
    @InjectModel(Device.name) private deviceModel: Model<DeviceDocument>,
    @InjectModel(Warranty.name) private warrantyModel: Model<WarrantyDocument>,
    @InjectModel(Claim.name) private claimModel: Model<ClaimDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async createClaim(
    createClaimDto: CreateClaimDto,
    ipAddress?: string,
  ): Promise<ClaimResponse> {
    const { deviceId, ...claimData } = createClaimDto;

    // Validate device exists
    const device = await this.deviceModel.findById(deviceId);
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Find active warranty
    const warranty = await this.warrantyModel.findOne({
      deviceId: new Types.ObjectId(deviceId),
      status: WarrantyStatus.ACTIVE,
      isActive: true,
    });

    if (!warranty) {
      throw new BadRequestException('No active warranty found for this device');
    }

    // Check if warranty is expired
    const now = new Date();
    if (warranty.endDate < now) {
      await this.warrantyModel.updateOne(
        { _id: warranty._id },
        { status: WarrantyStatus.EXPIRED },
      );
      throw new BadRequestException('Warranty has expired');
    }

    // Check if there are remaining claims
    if (warranty.usedClaims >= warranty.maxClaims) {
      throw new BadRequestException(
        'Maximum number of claims reached for this warranty',
      );
    }

    // Generate protocol number
    const protocolNumber = this.generateProtocolNumber();

    // Create claim
    const claim = new this.claimModel({
      protocolNumber,
      deviceId: new Types.ObjectId(deviceId),
      warrantyId: warranty._id,
      status: ClaimStatus.SUBMITTED,
      ...claimData,
    });

    await claim.save();

    // Update warranty used claims count
    await this.warrantyModel.updateOne(
      { _id: warranty._id },
      { $inc: { usedClaims: 1 } },
    );

    // Log audit
    await this.logAudit({
      action: ActionType.SUBMIT_CLAIM,
      entityType: EntityType.CLAIM,
      entityId: claim._id,
      description: `Claim submitted with protocol: ${protocolNumber}`,
      ipAddress,
      metadata: { deviceId, protocolNumber },
    });

    return {
      id: (claim._id as any).toString(),
      protocolNumber: claim.protocolNumber,
      status: claim.status,
      damageType: claim.damageType,
      damageDescription: claim.damageDescription,
      incidentDate: claim.incidentDate,
      customerName: claim.customerName,
      customerCpf: claim.customerCpf,
      customerPhone: claim.customerPhone,
      customerEmail: claim.customerEmail,
      createdAt: (claim as any).createdAt,
      device: {
        imei: device.imei,
        model: device.model,
        brand: device.brand,
      },
      warranty: {
        policyNumber: warranty.policyNumber,
        remainingClaims: warranty.maxClaims - warranty.usedClaims,
      },
    };
  }

  async getClaimByProtocol(
    protocolNumber: string,
  ): Promise<ClaimResponse | null> {
    const claim = await this.claimModel
      .findOne({ protocolNumber, isActive: true })
      .populate('deviceId')
      .populate('warrantyId');

    if (!claim) {
      return null;
    }

    const device = claim.deviceId as any;
    const warranty = claim.warrantyId as any;

    return {
      id: (claim._id as any).toString(),
      protocolNumber: claim.protocolNumber,
      status: claim.status,
      damageType: claim.damageType,
      damageDescription: claim.damageDescription,
      incidentDate: claim.incidentDate,
      customerName: claim.customerName,
      customerCpf: claim.customerCpf,
      customerPhone: claim.customerPhone,
      customerEmail: claim.customerEmail,
      createdAt: (claim as any).createdAt,
      device: {
        imei: device.imei,
        model: device.model,
        brand: device.brand,
      },
      warranty: {
        policyNumber: warranty.policyNumber,
        remainingClaims: warranty.maxClaims - warranty.usedClaims,
      },
    };
  }

  async updateClaimStatus(
    claimId: string,
    status: ClaimStatus,
    adminNotes?: string,
    userId?: string,
    ipAddress?: string,
  ): Promise<void> {
    const claim = await this.claimModel.findById(claimId);
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    const oldStatus = claim.status;
    claim.status = status;
    if (adminNotes) {
      claim.adminNotes = adminNotes;
    }

    if (status === ClaimStatus.COMPLETED) {
      claim.completionDate = new Date();
    }

    await claim.save();

    // Log audit
    await this.logAudit({
      action:
        status === ClaimStatus.APPROVED
          ? ActionType.APPROVE_CLAIM
          : ActionType.UPDATE,
      entityType: EntityType.CLAIM,
      entityId: claim._id,
      description: `Claim status updated from ${oldStatus} to ${status}`,
      ipAddress,
      metadata: { oldStatus, newStatus: status, adminNotes },
    });
  }

  private generateProtocolNumber(): string {
    const prefix = 'SGR';
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
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
