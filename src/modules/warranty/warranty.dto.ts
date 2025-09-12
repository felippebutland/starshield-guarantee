import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class ValidateWarrantyDto {
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.fiscalNumber)
  @IsNotEmpty({
    message: 'IMEI is required when fiscal number is not provided',
  })
  imei?: string;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.imei)
  @IsNotEmpty({
    message: 'Fiscal number is required when IMEI is not provided',
  })
  fiscalNumber?: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsString()
  @IsNotEmpty()
  ownerCpfCnpj: string;
}

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  imei: string;

  @IsString()
  @IsNotEmpty()
  fiscalNumber: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsDateString()
  purchaseDate: string;

  @IsString()
  @IsNotEmpty()
  ownerCpfCnpj: string;

  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @IsEmail()
  ownerEmail: string;

  @IsString()
  @IsNotEmpty()
  ownerPhone: string;

  @IsArray()
  @ArrayMinSize(2, { message: 'At least 2 photos are required' })
  @ArrayMaxSize(6, { message: 'Maximum 6 photos are allowed' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  photos: string[];
}
