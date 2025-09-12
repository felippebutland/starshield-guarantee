import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

export const getDatabaseConfig = (
  configService: ConfigService,
): MongooseModuleOptions => ({
  uri:
    configService.get<string>('DATABASE_URL') ||
    'mongodb://localhost:27017/starshield-guarantee',
  retryWrites: true,
  w: 'majority',
});
