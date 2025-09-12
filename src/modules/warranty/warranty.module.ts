import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WarrantyController } from './warranty.controller';
import { WarrantyService } from './warranty.service';
import { Device, DeviceSchema } from '../../schemas/device.schema';
import { Warranty, WarrantySchema } from '../../schemas/warranty.schema';
import { AuditLog, AuditLogSchema } from '../../schemas/audit-log.schema';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Device.name, schema: DeviceSchema },
      { name: Warranty.name, schema: WarrantySchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    EmailModule,
  ],
  controllers: [WarrantyController],
  providers: [WarrantyService],
  exports: [WarrantyService],
})
export class WarrantyModule {}
