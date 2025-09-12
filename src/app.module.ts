import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseConfig } from './config/database.config';
import { Device, DeviceSchema } from './schemas/device.schema';
import { Warranty, WarrantySchema } from './schemas/warranty.schema';
import { Claim, ClaimSchema } from './schemas/claim.schema';
import { User, UserSchema } from './schemas/user.schema';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { WarrantyModule } from './modules/warranty/warranty.module';
import { ClaimsModule } from './modules/claims/claims.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    MongooseModule.forFeature([
      { name: Device.name, schema: DeviceSchema },
      { name: Warranty.name, schema: WarrantySchema },
      { name: Claim.name, schema: ClaimSchema },
      { name: User.name, schema: UserSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    WarrantyModule,
    ClaimsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
