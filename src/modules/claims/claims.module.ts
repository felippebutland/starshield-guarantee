import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { Device, DeviceSchema } from '../../schemas/device.schema';
import { Warranty, WarrantySchema } from '../../schemas/warranty.schema';
import { Claim, ClaimSchema } from '../../schemas/claim.schema';
import { AuditLog, AuditLogSchema } from '../../schemas/audit-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Device.name, schema: DeviceSchema },
      { name: Warranty.name, schema: WarrantySchema },
      { name: Claim.name, schema: ClaimSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [ClaimsController],
  providers: [ClaimsService],
  exports: [ClaimsService],
})
export class ClaimsModule {}
