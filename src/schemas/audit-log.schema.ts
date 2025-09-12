import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

export enum ActionType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  LOGIN = 'login',
  LOGOUT = 'logout',
  VALIDATE_WARRANTY = 'validate_warranty',
  SUBMIT_CLAIM = 'submit_claim',
  APPROVE_CLAIM = 'approve_claim',
  REJECT_CLAIM = 'reject_claim',
  UPLOAD_FILE = 'upload_file',
}

export enum EntityType {
  USER = 'user',
  DEVICE = 'device',
  WARRANTY = 'warranty',
  CLAIM = 'claim',
  FILE = 'file',
}

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true, enum: ActionType })
  action: ActionType;

  @Prop({ required: true, enum: EntityType })
  entityType: EntityType;

  @Prop({ type: Types.ObjectId })
  entityId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop()
  userEmail: string;

  @Prop()
  ipAddress: string;

  @Prop()
  userAgent: string;

  @Prop({ type: Object })
  oldData: Record<string, any>;

  @Prop({ type: Object })
  newData: Record<string, any>;

  @Prop()
  description: string;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
