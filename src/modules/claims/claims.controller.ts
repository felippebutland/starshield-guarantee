import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { ClaimResponse, ClaimsService } from './claims.service';
import { Claim, ClaimDocument, ClaimStatus, DamageType } from '../../schemas/claim.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Device, DeviceDocument } from '../../schemas/device.schema';
import { Warranty, WarrantyDocument } from '../../schemas/warranty.schema';
import { AuditLog, AuditLogDocument, ActionType, EntityType } from '../../schemas/audit-log.schema';
import { EmailService } from '../email/email.service';
import { IsString, IsNotEmpty } from 'class-validator';

export class SubmitClaimDto {
  @IsString()
  @IsNotEmpty()
  warrantyId: string;
}

@Controller('claims')
export class ClaimsController {
  constructor(
    private readonly claimsService: ClaimsService,
    @InjectModel(Device.name) private deviceModel: Model<DeviceDocument>,
    @InjectModel(Warranty.name) private warrantyModel: Model<WarrantyDocument>,
    @InjectModel(Claim.name) private claimModel: Model<ClaimDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    private emailService: EmailService,
  ) {}

  @Post()
  async submitClaim(
    @Body() submitClaimDto: SubmitClaimDto,
    @Req() request: any,
  ): Promise<{ success: boolean; message: string; emailSent: boolean }>
  {
    const ipAddress =
      request.ip || request.connection?.remoteAddress || 'unknown';

    const warranty = await this.warrantyModel.findById(
      new Types.ObjectId(submitClaimDto.warrantyId),
    );
    if (!warranty) {
      throw new NotFoundException('Warranty not found');
    }

    const device = await this.deviceModel.findById(warranty.deviceId);
    if (!device) {
      throw new NotFoundException('Device not found for provided warranty');
    }

    const emailSent = await this.emailService.sendClaimSupportEmail({
      cpf: device.ownerCpfCnpj,
      imei: device.imei,
      status: warranty.status,
      modelo: device.model,
      marca: device.brand,
      fiscalNumber: device.fiscalNumber,
      warrantyId: submitClaimDto.warrantyId,
      policyNumber: warranty.policyNumber,
    });

    // Persist minimal claim record and audit log
    try {
      const protocolNumber = this.generateProtocolNumber();

      const claim = new this.claimModel({
        protocolNumber,
        deviceId: device._id,
        warrantyId: warranty._id,
        status: ClaimStatus.SUBMITTED,
        damageType: DamageType.OTHER,
        damageDescription: 'Acionamento de garantia via suporte (e-mail)',
        incidentDate: new Date(),
        customerName: device.ownerName,
        customerCpf: device.ownerCpfCnpj,
        customerPhone: device.ownerPhone,
        customerEmail: device.ownerEmail,
        evidencePhotos: [],
        documents: [],
      });

      await claim.save();

      // Increment usedClaims if below max
      if (warranty.usedClaims < warranty.maxClaims) {
        await this.warrantyModel.updateOne(
          { _id: warranty._id },
          { $inc: { usedClaims: 1 } },
        );
      }

      // Audit log entry
      const auditLog = new this.auditLogModel({
        action: ActionType.SUBMIT_CLAIM,
        entityType: EntityType.CLAIM,
        entityId: claim._id,
        description: `Claim submitted (simplified) with protocol: ${protocolNumber}`,
        ipAddress,
        metadata: {
          warrantyId: warranty._id,
          deviceId: device._id,
          emailSent,
          policyNumber: warranty.policyNumber,
        },
      });
      await auditLog.save();
    } catch (persistError) {
      // Swallow persistence errors to not block user response
      // Consider adding a logger here if available
    }

    return {
      success: true,
      message: emailSent
        ? 'Solicitação enviada para atendimento'
        : 'Solicitação registrada, porém o envio de e-mail falhou',
      emailSent,
    };
  }

  private generateProtocolNumber(): string {
    const prefix = 'SGR';
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }

  @Get('protocol/:protocolNumber')
  async getClaimByProtocol(
    @Param('protocolNumber') protocolNumber: string,
  ): Promise<ClaimResponse> {
    const claim = await this.claimsService.getClaimByProtocol(protocolNumber);

    if (!claim) {
      throw new NotFoundException(
        'Claim not found with the provided protocol number',
      );
    }

    return claim;
  }

  @Get('damage-types')
  getDamageTypes(): { value: string; label: string }[] {
    return [
      { value: DamageType.CRACKED_SCREEN, label: 'Tela Rachada' },
      { value: DamageType.BROKEN_SCREEN, label: 'Tela Quebrada' },
      { value: DamageType.BLACK_SCREEN, label: 'Tela Preta/Não Liga' },
      { value: DamageType.TOUCH_NOT_WORKING, label: 'Touch Não Funciona' },
      { value: DamageType.OTHER, label: 'Outros' },
    ];
  }
}
