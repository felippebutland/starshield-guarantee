import {
  Controller,
  Post,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  WarrantyService,
  WarrantyValidationDto,
  WarrantyStatusResponse,
  DeviceRegistrationDto,
  DeviceRegistrationResponse,
} from './warranty.service';
import { RegisterDeviceDto, ValidateWarrantyDto } from './warranty.dto';

@Controller('warranty')
export class WarrantyController {
  constructor(private readonly warrantyService: WarrantyService) {}

  @Post('validate')
  async validateWarranty(
    @Body() validateWarrantyDto: ValidateWarrantyDto,
    @Req() request: any,
  ): Promise<WarrantyStatusResponse> {
    if (!validateWarrantyDto.imei && !validateWarrantyDto.fiscalNumber) {
      throw new BadRequestException(
        'Either IMEI or fiscal number must be provided',
      );
    }

    const ipAddress =
      request.ip || request.connection?.remoteAddress || 'unknown';

    const validationDto: WarrantyValidationDto = {
      imei: validateWarrantyDto.imei,
      fiscalNumber: validateWarrantyDto.fiscalNumber,
      model: validateWarrantyDto.model,
      ownerCpfCnpj: validateWarrantyDto.ownerCpfCnpj,
    };

    return this.warrantyService.validateWarranty(validationDto, ipAddress);
  }

  @Post('register')
  async registerDevice(
    @Body() registerDeviceDto: RegisterDeviceDto,
    @Req() request: any,
  ): Promise<DeviceRegistrationResponse> {
    const ipAddress =
      request.ip || request.connection?.remoteAddress || 'unknown';

    const registrationDto: DeviceRegistrationDto = {
      imei: registerDeviceDto.imei,
      fiscalNumber: registerDeviceDto.fiscalNumber,
      model: registerDeviceDto.model,
      brand: registerDeviceDto.brand,
      purchaseDate: new Date(registerDeviceDto.purchaseDate),
      ownerCpfCnpj: registerDeviceDto.ownerCpfCnpj,
      ownerName: registerDeviceDto.ownerName,
      ownerEmail: registerDeviceDto.ownerEmail,
      ownerPhone: registerDeviceDto.ownerPhone,
      photos: registerDeviceDto.photos,
    };

    return await this.warrantyService.registerDevice(
      registrationDto,
      ipAddress,
    );
  }
}
