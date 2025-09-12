import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DeviceDocument = Device & Document;

@Schema({ timestamps: true })
export class Device {
  @Prop({ required: true, unique: true })
  imei: string;

  @Prop({ required: true })
  fiscalNumber: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  brand: string;

  @Prop({ required: true })
  purchaseDate: Date;

  @Prop({ required: true })
  ownerCpfCnpj: string;

  @Prop({ required: true })
  ownerName: string;

  @Prop({ required: true })
  ownerEmail: string;

  @Prop({ required: true })
  ownerPhone: string;

  @Prop({
    type: [String],
    required: true,
    validate: {
      validator: function(photos: string[]) {
        return photos && photos.length >= 2 && photos.length <= 6;
      },
      message: 'Device must have between 2 and 6 photos'
    }
  })
  photos: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
