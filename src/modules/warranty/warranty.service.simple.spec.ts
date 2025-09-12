import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { WarrantyService } from './warranty.service';
import { Device } from '../../schemas/device.schema';
import { Warranty, WarrantyStatus } from '../../schemas/warranty.schema';
import { AuditLog } from '../../schemas/audit-log.schema';
import { EmailService } from '../email/email.service';

describe('WarrantyService', () => {
  let service: WarrantyService;
  let deviceModel: any;
  let warrantyModel: any;
  let auditLogModel: any;
  let emailService: any;

  beforeEach(async () => {
    const mockDeviceModel = {
      findOne: jest.fn(),
      constructor: jest.fn().mockImplementation((dto) => ({
        ...dto,
        save: jest.fn().mockResolvedValue(dto),
      })),
    };

    const mockWarrantyModel = {
      findOne: jest.fn(),
      updateOne: jest.fn(),
      constructor: jest.fn().mockImplementation((dto) => ({
        ...dto,
        save: jest.fn().mockResolvedValue(dto),
      })),
    };

    const mockAuditLogModel = {
      constructor: jest.fn().mockImplementation((dto) => ({
        ...dto,
        save: jest.fn().mockResolvedValue(dto),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarrantyService,
        {
          provide: getModelToken(Device.name),
          useValue: mockDeviceModel,
        },
        {
          provide: getModelToken(Warranty.name),
          useValue: mockWarrantyModel,
        },
        {
          provide: getModelToken(AuditLog.name),
          useValue: mockAuditLogModel,
        },
        {
          provide: EmailService,
          useValue: {
            sendDeviceRegistrationEmail: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<WarrantyService>(WarrantyService);
    deviceModel = module.get(getModelToken(Device.name));
    warrantyModel = module.get(getModelToken(Warranty.name));
    auditLogModel = module.get(getModelToken(AuditLog.name));
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateWarranty', () => {
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
      deviceModel.findOne.mockResolvedValue(null);

      const result = await service.validateWarranty({
        imei: '123456789012345',
        model: 'iPhone 14 Pro',
        ownerCpfCnpj: '12345678901',
      });

      expect(result.isValid).toBe(false);
      expect(result.message).toBe(
        'Device not found or does not match the provided information',
      );
    });

    it('should return valid warranty when conditions are met', async () => {
      const mockDevice = {
        _id: 'device-id',
        imei: '123456789012345',
        model: 'iPhone 14 Pro',
        brand: 'Apple',
      };

      const mockWarranty = {
        _id: 'warranty-id',
        status: WarrantyStatus.ACTIVE,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
        maxClaims: 2,
        usedClaims: 0,
        policyNumber: 'POL123456',
        coverageType: 'Screen Protection',
      };

      deviceModel.findOne.mockResolvedValue(mockDevice);
      warrantyModel.findOne.mockResolvedValue(mockWarranty);

      const result = await service.validateWarranty({
        imei: '123456789012345',
        model: 'iPhone 14 Pro',
        ownerCpfCnpj: '12345678901',
      });

      expect(result.isValid).toBe(true);
      expect(result.warranty?.remainingClaims).toBe(2);
    });
  });

  describe('registerDevice', () => {
    it('should throw BadRequestException when device already exists', async () => {
      deviceModel.findOne.mockResolvedValue({ _id: 'existing-device' });

      await expect(
        service.registerDevice({
          imei: '123456789012345',
          fiscalNumber: 'NF123456789',
          model: 'iPhone 15 Pro',
          brand: 'Apple',
          purchaseDate: new Date('2024-01-15'),
          ownerCpfCnpj: '12345678901',
          ownerName: 'João Silva',
          ownerEmail: 'joao.silva@email.com',
          ownerPhone: '+5511999999999',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully register device', async () => {
      deviceModel.findOne.mockResolvedValue(null);
      // Mock the constructor to return a mock with save method
      const mockSavedDevice = { _id: 'device-id', imei: '123456789012345' };
      const mockSavedWarranty = { _id: 'warranty-id', policyNumber: 'POL123' };

      deviceModel.constructor.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedDevice),
      }));

      warrantyModel.constructor.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedWarranty),
      }));

      const result = await service.registerDevice({
        imei: '123456789012345',
        fiscalNumber: 'NF123456789',
        model: 'iPhone 15 Pro',
        brand: 'Apple',
        purchaseDate: new Date('2024-01-15'),
        ownerCpfCnpj: '12345678901',
        ownerName: 'João Silva',
        ownerEmail: 'joao.silva@email.com',
        ownerPhone: '+5511999999999',
      });

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(true);
    });
  });
});