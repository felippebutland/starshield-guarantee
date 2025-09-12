import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClaimDocument = Claim & Document;

export enum ClaimStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IN_REPAIR = 'in_repair',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum DamageType {
  CRACKED_SCREEN = 'cracked_screen',
  BROKEN_SCREEN = 'broken_screen',
  BLACK_SCREEN = 'black_screen',
  TOUCH_NOT_WORKING = 'touch_not_working',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class Claim {
  @Prop({ required: true, unique: true })
  protocolNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Device', required: true })
  deviceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Warranty', required: true })
  warrantyId: Types.ObjectId;

  @Prop({ required: true, enum: ClaimStatus, default: ClaimStatus.SUBMITTED })
  status: ClaimStatus;

  @Prop({ required: true, enum: DamageType })
  damageType: DamageType;

  @Prop({ required: true })
  damageDescription: string;

  @Prop({ required: true })
  incidentDate: Date;

  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true })
  customerCpf: string;

  @Prop({ required: true })
  customerPhone: string;

  @Prop({ required: true })
  customerEmail: string;

  @Prop([String])
  evidencePhotos: string[];

  @Prop([String])
  documents: string[];

  @Prop()
  repairShop: string;

  @Prop()
  estimatedCost: number;

  @Prop()
  actualCost: number;

  @Prop()
  repairDate: Date;

  @Prop()
  completionDate: Date;

  @Prop()
  rejectionReason: string;

  @Prop()
  adminNotes: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const ClaimSchema = SchemaFactory.createForClass(Claim);
