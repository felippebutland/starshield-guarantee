import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WarrantyDocument = Warranty & Document;

export enum WarrantyStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export enum CoverageType {
  SCREEN_ONLY = 'screen_only',
  FULL_DEVICE = 'full_device',
  PREMIUM = 'premium',
}

@Schema({ timestamps: true })
export class Warranty {
  @Prop({ type: Types.ObjectId, ref: 'Device', required: true })
  deviceId: Types.ObjectId;

  @Prop({ required: true, enum: CoverageType })
  coverageType: CoverageType;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({
    required: true,
    enum: WarrantyStatus,
    default: WarrantyStatus.ACTIVE,
  })
  status: WarrantyStatus;

  @Prop({ required: true, min: 0 })
  maxClaims: number;

  @Prop({ required: true, min: 0, default: 0 })
  usedClaims: number;

  @Prop({ required: true })
  policyNumber: string;

  @Prop({ required: true })
  insuranceProvider: string;

  @Prop()
  notes: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const WarrantySchema = SchemaFactory.createForClass(Warranty);
