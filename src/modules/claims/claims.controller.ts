import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { ClaimsService, CreateClaimDto, ClaimResponse } from './claims.service';
import { DamageType } from '../../schemas/claim.schema';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsDateString,
  IsOptional,
  IsArray,
} from 'class-validator';

export class SubmitClaimDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsEnum(DamageType)
  damageType: DamageType;

  @IsString()
  @IsNotEmpty()
  damageDescription: string;

  @IsDateString()
  incidentDate: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  customerCpf: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @IsEmail()
  customerEmail: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidencePhotos?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];
}

@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  async submitClaim(
    @Body() submitClaimDto: SubmitClaimDto,
    @Req() request: any,
  ): Promise<ClaimResponse> {
    const ipAddress =
      request.ip || request.connection?.remoteAddress || 'unknown';

    const createClaimDto: CreateClaimDto = {
      deviceId: submitClaimDto.deviceId,
      damageType: submitClaimDto.damageType,
      damageDescription: submitClaimDto.damageDescription,
      incidentDate: new Date(submitClaimDto.incidentDate),
      customerName: submitClaimDto.customerName,
      customerCpf: submitClaimDto.customerCpf,
      customerPhone: submitClaimDto.customerPhone,
      customerEmail: submitClaimDto.customerEmail,
      evidencePhotos: submitClaimDto.evidencePhotos,
      documents: submitClaimDto.documents,
    };

    return this.claimsService.createClaim(createClaimDto, ipAddress);
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
