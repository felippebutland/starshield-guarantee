import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { WarrantyService } from './warranty.service';
import { Device, DeviceDocument } from '../../schemas/device.schema';
import { Warranty, WarrantyDocument, WarrantyStatus } from '../../schemas/warranty.schema';
import { AuditLog, AuditLogDocument } from '../../schemas/audit-log.schema';
import { EmailService } from '../email/email.service';

describe('WarrantyService', () => {
  let service: WarrantyService;
  let deviceModel: jest.Mocked<Model<DeviceDocument>>;
  let warrantyModel: jest.Mocked<Model<WarrantyDocument>>;
  let auditLogModel: jest.Mocked<Model<AuditLogDocument>>;
  let emailService: jest.Mocked<EmailService>;

  const mockObjectId = new Types.ObjectId();
  const mockDevice = {
    _id: mockObjectId,
    imei: '123456789012345',
    fiscalNumber: 'NF123456789',
    model: 'iPhone 14 Pro',
    brand: 'Apple',
    purchaseDate: new Date('2023-01-01'),
    ownerCpfCnpj: '12345678901',
    ownerName: 'João Silva',
    ownerEmail: 'joao@email.com',
    ownerPhone: '+5511999999999',
    photos: ['photo1.jpg', 'photo2.jpg'],
    isActive: true,
    save: jest.fn(),
  };

  const mockWarranty = {
    _id: mockObjectId,
    deviceId: mockObjectId,
    status: WarrantyStatus.ACTIVE,
    startDate: new Date('2023-01-01'),
    endDate: new Date('2024-01-01'),
    maxClaims: 2,
    usedClaims: 0,
    policyNumber: 'POL123456',
    coverageType: 'Screen Protection',
    isActive: true,
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarrantyService,
        {
          provide: getModelToken(Device.name),
          useValue: jest.fn().mockImplementation((dto) => ({
            ...dto,
            save: jest.fn().mockResolvedValue(dto),
          })),
        },
        {
          provide: getModelToken(Warranty.name),
          useValue: jest.fn().mockImplementation((dto) => ({
            ...dto,
            save: jest.fn().mockResolvedValue(dto),
          })),
        },
        {
          provide: getModelToken(AuditLog.name),
          useValue: jest.fn().mockImplementation((dto) => ({
            ...dto,
            save: jest.fn().mockResolvedValue(dto),
          })),
        },
        {
          provide: EmailService,
          useValue: {
            sendDeviceRegistrationEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WarrantyService>(WarrantyService);
    deviceModel = module.get(getModelToken(Device.name));
    warrantyModel = module.get(getModelToken(Warranty.name));
    auditLogModel = module.get(getModelToken(AuditLog.name));
    emailService = module.get(EmailService);

    // Add static methods to the models
    (deviceModel as any).findOne = jest.fn();
    (warrantyModel as any).findOne = jest.fn();
    (warrantyModel as any).updateOne = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateWarranty', () => {
    const validationDto = {
      imei: '123456789012345',
      model: 'iPhone 14 Pro',
      ownerCpfCnpj: '12345678901',
    };

    it('should throw BadRequestException when neither IMEI nor fiscal number is provided', async () => {
      const invalidDto = {
        model: 'iPhone 14 Pro',
        ownerCpfCnpj: '12345678901',
      };

      await expect(service.validateWarranty(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return invalid warranty when device is not found', async () => {
      (deviceModel as any).findOne.mockResolvedValue(null);

      const result = await service.validateWarranty(validationDto);

      expect(result.isValid).toBe(false);
      expect(result.message).toBe(
        'Device not found or does not match the provided information',
      );
    });

    it('should return invalid warranty when no active warranty is found', async () => {
      (deviceModel as any).findOne.mockResolvedValue(mockDevice as any);
      (warrantyModel as any).findOne.mockResolvedValue(null);

      const result = await service.validateWarranty(validationDto);

      expect(result.isValid).toBe(false);
      expect(result.device).toBeDefined();
      expect(result.message).toBe('No active warranty found for this device');
    });

    it('should return expired warranty when warranty end date has passed', async () => {
      const expiredWarranty = {
        ...mockWarranty,
        endDate: new Date('2022-01-01'), // Past date
      };

      deviceModel.findOne.mockResolvedValue(mockDevice as any);
      warrantyModel.findOne.mockResolvedValue(expiredWarranty as any);
      warrantyModel.updateOne.mockResolvedValue({} as any);

      const result = await service.validateWarranty(validationDto);

      expect(result.isValid).toBe(false);
      expect(result.warranty?.status).toBe(WarrantyStatus.EXPIRED);
      expect(result.message).toBe('Warranty has expired');
      expect(warrantyModel.updateOne).toHaveBeenCalledWith(
        { _id: mockWarranty._id },
        { status: WarrantyStatus.EXPIRED },
      );
    });

    it('should return valid warranty when all conditions are met', async () => {
      deviceModel.findOne.mockResolvedValue(mockDevice as any);
      warrantyModel.findOne.mockResolvedValue(mockWarranty as any);

      const result = await service.validateWarranty(validationDto);

      expect(result.isValid).toBe(true);
      expect(result.device).toBeDefined();
      expect(result.warranty).toBeDefined();
      expect(result.warranty?.remainingClaims).toBe(2);
      expect(result.message).toBe('Warranty is active and valid');
    });

    it('should handle validation with fiscal number instead of IMEI', async () => {
      const validationDtoWithFiscal = {
        fiscalNumber: 'NF123456789',
        model: 'iPhone 14 Pro',
        ownerCpfCnpj: '12345678901',
      };

      deviceModel.findOne.mockResolvedValue(mockDevice as any);
      warrantyModel.findOne.mockResolvedValue(mockWarranty as any);

      const result = await service.validateWarranty(validationDtoWithFiscal);

      expect(result.isValid).toBe(true);
      expect(deviceModel.findOne).toHaveBeenCalledWith({
        model: 'iPhone 14 Pro',
        ownerCpfCnpj: '12345678901',
        isActive: true,
        fiscalNumber: 'NF123456789',
      });
    });
  });

  describe('registerDevice', () => {
    const registrationDto = {
      imei: '123456789012345',
      fiscalNumber: 'NF123456789',
      model: 'iPhone 15 Pro',
      brand: 'Apple',
      purchaseDate: new Date('2024-01-15'),
      ownerCpfCnpj: '12345678901',
      ownerName: 'João Silva',
      ownerEmail: 'joao.silva@email.com',
      ownerPhone: '+5511999999999',
      photos: ['photo1.jpg', 'photo2.jpg'],
    };

    it('should throw BadRequestException when device already exists', async () => {
      deviceModel.findOne.mockResolvedValue(mockDevice as any);

      await expect(
        service.registerDevice(registrationDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully register device and create warranty', async () => {
      const savedDevice = { ...mockDevice, save: jest.fn().mockResolvedValue(mockDevice) };
      const savedWarranty = { ...mockWarranty, save: jest.fn().mockResolvedValue(mockWarranty) };

      deviceModel.findOne.mockResolvedValue(null);
      (deviceModel as any).mockImplementation(() => savedDevice);
      (warrantyModel as any).mockImplementation(() => savedWarranty);
      emailService.sendDeviceRegistrationEmail.mockResolvedValue(true);

      const auditLogSave = jest.fn().mockResolvedValue({});
      (auditLogModel as any).mockImplementation(() => ({ save: auditLogSave }));

      const result = await service.registerDevice(registrationDto);

      expect(result.success).toBe(true);
      expect(result.device).toBeDefined();
      expect(result.warranty).toBeDefined();
      expect(result.emailSent).toBe(true);
      expect(result.message).toBe('Device registered successfully and warranty activated');
      expect(savedDevice.save).toHaveBeenCalled();
      expect(savedWarranty.save).toHaveBeenCalled();
      expect(emailService.sendDeviceRegistrationEmail).toHaveBeenCalled();
    });

    it('should handle email sending failure gracefully', async () => {
      const savedDevice = { ...mockDevice, save: jest.fn().mockResolvedValue(mockDevice) };
      const savedWarranty = { ...mockWarranty, save: jest.fn().mockResolvedValue(mockWarranty) };

      deviceModel.findOne.mockResolvedValue(null);
      (deviceModel as any).mockImplementation(() => savedDevice);
      (warrantyModel as any).mockImplementation(() => savedWarranty);
      emailService.sendDeviceRegistrationEmail.mockRejectedValue(new Error('Email failed'));

      const auditLogSave = jest.fn().mockResolvedValue({});
      (auditLogModel as any).mockImplementation(() => ({ save: auditLogSave }));

      const result = await service.registerDevice(registrationDto);

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(false);
    });

    it('should handle database save errors', async () => {
      const failingSave = jest.fn().mockRejectedValue(new Error('Database error'));
      const savedDevice = { ...mockDevice, save: failingSave };

      deviceModel.findOne.mockResolvedValue(null);
      (deviceModel as any).mockImplementation(() => savedDevice);

      const auditLogSave = jest.fn().mockResolvedValue({});
      (auditLogModel as any).mockImplementation(() => ({ save: auditLogSave }));

      await expect(
        service.registerDevice(registrationDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('audit logging', () => {
    it('should log audit events during warranty validation', async () => {
      const auditLogSave = jest.fn().mockResolvedValue({});
      (auditLogModel as any).mockImplementation(() => ({ save: auditLogSave }));

      deviceModel.findOne.mockResolvedValue(null);

      await service.validateWarranty({
        imei: '123456789012345',
        model: 'iPhone 14 Pro',
        ownerCpfCnpj: '12345678901',
      });

      expect(auditLogSave).toHaveBeenCalled();
    });

    it('should log audit events during device registration', async () => {
      const savedDevice = { ...mockDevice, save: jest.fn().mockResolvedValue(mockDevice) };
      const savedWarranty = { ...mockWarranty, save: jest.fn().mockResolvedValue(mockWarranty) };
      const auditLogSave = jest.fn().mockResolvedValue({});

      deviceModel.findOne.mockResolvedValue(null);
      (deviceModel as any).mockImplementation(() => savedDevice);
      (warrantyModel as any).mockImplementation(() => savedWarranty);
      (auditLogModel as any).mockImplementation(() => ({ save: auditLogSave }));
      emailService.sendDeviceRegistrationEmail.mockResolvedValue(true);

      const registrationDto = {
        imei: '123456789012345',
        fiscalNumber: 'NF123456789',
        model: 'iPhone 15 Pro',
        brand: 'Apple',
        purchaseDate: new Date('2024-01-15'),
        ownerCpfCnpj: '12345678901',
        ownerName: 'João Silva',
        ownerEmail: 'joao.silva@email.com',
        ownerPhone: '+5511999999999',
      };

      await service.registerDevice(registrationDto);

      expect(auditLogSave).toHaveBeenCalled();
    });
  });
});