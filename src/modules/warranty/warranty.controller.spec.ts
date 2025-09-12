import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  WarrantyController,
  ValidateWarrantyDto,
  RegisterDeviceDto,
} from './warranty.controller';
import { WarrantyService } from './warranty.service';
import { WarrantyStatus } from '../../schemas/warranty.schema';

describe('WarrantyController', () => {
  let controller: WarrantyController;
  let warrantyService: jest.Mocked<WarrantyService>;

  const mockRequest = {
    ip: '192.168.1.1',
    connection: {
      remoteAddress: '192.168.1.1',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WarrantyController],
      providers: [
        {
          provide: WarrantyService,
          useValue: {
            validateWarranty: jest.fn(),
            registerDevice: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WarrantyController>(WarrantyController);
    warrantyService = module.get(WarrantyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateWarranty', () => {
    const validDto: ValidateWarrantyDto = {
      imei: '123456789012345',
      model: 'iPhone 14 Pro',
      ownerCpfCnpj: '12345678901',
    };

    it('should validate warranty successfully with IMEI', async () => {
      const expectedResponse = {
        isValid: true,
        device: {
          id: 'device-id',
          imei: '123456789012345',
          model: 'iPhone 14 Pro',
          brand: 'Apple',
        },
        warranty: {
          id: 'warranty-id',
          status: WarrantyStatus.ACTIVE,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2024-01-01'),
          maxClaims: 2,
          usedClaims: 0,
          remainingClaims: 2,
          policyNumber: 'POL123456',
          coverageType: 'screen_only',
        },
        message: 'Warranty is active and valid',
      };

      warrantyService.validateWarranty.mockResolvedValue(expectedResponse);

      const result = await controller.validateWarranty(validDto, mockRequest);

      expect(result).toEqual(expectedResponse);
      expect(warrantyService.validateWarranty).toHaveBeenCalledWith(
        {
          imei: validDto.imei,
          fiscalNumber: validDto.fiscalNumber,
          model: validDto.model,
          ownerCpfCnpj: validDto.ownerCpfCnpj,
        },
        mockRequest.ip,
      );
    });

    it('should validate warranty successfully with fiscal number', async () => {
      const dtoWithFiscal: ValidateWarrantyDto = {
        fiscalNumber: 'NF123456789',
        model: 'iPhone 14 Pro',
        ownerCpfCnpj: '12345678901',
      };

      const expectedResponse = {
        isValid: true,
        device: {
          id: 'device-id',
          imei: '123456789012345',
          model: 'iPhone 14 Pro',
          brand: 'Apple',
        },
        warranty: {
          id: 'warranty-id',
          status: WarrantyStatus.ACTIVE,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2024-01-01'),
          maxClaims: 2,
          usedClaims: 0,
          remainingClaims: 2,
          policyNumber: 'POL123456',
          coverageType: 'screen_only',
        },
        message: 'Warranty is active and valid',
      };

      warrantyService.validateWarranty.mockResolvedValue(expectedResponse);

      const result = await controller.validateWarranty(dtoWithFiscal, mockRequest);

      expect(result).toEqual(expectedResponse);
      expect(warrantyService.validateWarranty).toHaveBeenCalledWith(
        {
          imei: undefined,
          fiscalNumber: dtoWithFiscal.fiscalNumber,
          model: dtoWithFiscal.model,
          ownerCpfCnpj: dtoWithFiscal.ownerCpfCnpj,
        },
        mockRequest.ip,
      );
    });

    it('should throw BadRequestException when neither IMEI nor fiscal number is provided', async () => {
      const invalidDto: ValidateWarrantyDto = {
        model: 'iPhone 14 Pro',
        ownerCpfCnpj: '12345678901',
      };

      await expect(
        controller.validateWarranty(invalidDto, mockRequest),
      ).rejects.toThrow(
        new BadRequestException('Either IMEI or fiscal number must be provided'),
      );

      expect(warrantyService.validateWarranty).not.toHaveBeenCalled();
    });

    it('should handle invalid warranty response', async () => {
      const invalidResponse = {
        isValid: false,
        message: 'Device not found or does not match the provided information',
      };

      warrantyService.validateWarranty.mockResolvedValue(invalidResponse);

      const result = await controller.validateWarranty(validDto, mockRequest);

      expect(result).toEqual(invalidResponse);
      expect(result.isValid).toBe(false);
    });

    it('should handle expired warranty response', async () => {
      const expiredResponse = {
        isValid: false,
        device: {
          id: 'device-id',
          imei: '123456789012345',
          model: 'iPhone 14 Pro',
          brand: 'Apple',
        },
        warranty: {
          id: 'warranty-id',
          status: WarrantyStatus.EXPIRED,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-12-31'),
          maxClaims: 2,
          usedClaims: 1,
          remainingClaims: 1,
          policyNumber: 'POL123456',
          coverageType: 'screen_only',
        },
        message: 'Warranty has expired',
      };

      warrantyService.validateWarranty.mockResolvedValue(expiredResponse);

      const result = await controller.validateWarranty(validDto, mockRequest);

      expect(result).toEqual(expiredResponse);
      expect(result.warranty?.status).toBe(WarrantyStatus.EXPIRED);
    });

    it('should extract IP address from different request properties', async () => {
      const mockRequestWithConnection = {
        connection: { remoteAddress: '192.168.1.2' },
      };

      warrantyService.validateWarranty.mockResolvedValue({
        isValid: true,
        message: 'Test',
      });

      await controller.validateWarranty(validDto, mockRequestWithConnection);

      expect(warrantyService.validateWarranty).toHaveBeenCalledWith(
        expect.any(Object),
        '192.168.1.2',
      );
    });

    it('should use "unknown" as fallback IP address', async () => {
      const mockRequestNoIP = {};

      warrantyService.validateWarranty.mockResolvedValue({
        isValid: true,
        message: 'Test',
      });

      await controller.validateWarranty(validDto, mockRequestNoIP);

      expect(warrantyService.validateWarranty).toHaveBeenCalledWith(
        expect.any(Object),
        'unknown',
      );
    });
  });

  describe('registerDevice', () => {
    const validRegisterDto: RegisterDeviceDto = {
      imei: '123456789012345',
      fiscalNumber: 'NF123456789',
      model: 'iPhone 15 Pro',
      brand: 'Apple',
      purchaseDate: '2024-01-15T00:00:00.000Z',
      ownerCpfCnpj: '12345678901',
      ownerName: 'João Silva',
      ownerEmail: 'joao.silva@email.com',
      ownerPhone: '+5511999999999',
    };

    it('should register device successfully', async () => {
      const expectedResponse = {
        success: true,
        device: {
          id: 'device-id',
          imei: '123456789012345',
          model: 'iPhone 15 Pro',
          brand: 'Apple',
        },
        warranty: {
          id: 'warranty-id',
          policyNumber: 'POL-123456-ABC',
          startDate: new Date('2024-01-15'),
          endDate: new Date('2025-01-15'),
        },
        message: 'Device registered successfully and warranty activated',
        emailSent: true,
      };

      warrantyService.registerDevice.mockResolvedValue(expectedResponse);

      const result = await controller.registerDevice(validRegisterDto, mockRequest);

      expect(result).toEqual(expectedResponse);
      expect(warrantyService.registerDevice).toHaveBeenCalledWith(
        {
          imei: validRegisterDto.imei,
          fiscalNumber: validRegisterDto.fiscalNumber,
          model: validRegisterDto.model,
          brand: validRegisterDto.brand,
          purchaseDate: new Date(validRegisterDto.purchaseDate),
          ownerCpfCnpj: validRegisterDto.ownerCpfCnpj,
          ownerName: validRegisterDto.ownerName,
          ownerEmail: validRegisterDto.ownerEmail,
          ownerPhone: validRegisterDto.ownerPhone,
        },
        mockRequest.ip,
      );
    });

    it('should handle registration failure', async () => {
      warrantyService.registerDevice.mockRejectedValue(
        new BadRequestException('Device with this IMEI already exists'),
      );

      await expect(
        controller.registerDevice(validRegisterDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should convert date string to Date object', async () => {
      const expectedResponse = {
        success: true,
        device: { id: 'test', imei: 'test', model: 'test', brand: 'test' },
        warranty: {
          id: 'test',
          policyNumber: 'test',
          startDate: new Date(),
          endDate: new Date(),
        },
        message: 'test',
        emailSent: true,
      };

      warrantyService.registerDevice.mockResolvedValue(expectedResponse);

      await controller.registerDevice(validRegisterDto, mockRequest);

      expect(warrantyService.registerDevice).toHaveBeenCalledWith(
        expect.objectContaining({
          purchaseDate: new Date('2024-01-15T00:00:00.000Z'),
        }),
        mockRequest.ip,
      );
    });

    it('should handle registration with email sending failure', async () => {
      const responseWithoutEmail = {
        success: true,
        device: {
          id: 'device-id',
          imei: '123456789012345',
          model: 'iPhone 15 Pro',
          brand: 'Apple',
        },
        warranty: {
          id: 'warranty-id',
          policyNumber: 'POL-123456-ABC',
          startDate: new Date('2024-01-15'),
          endDate: new Date('2025-01-15'),
        },
        message: 'Device registered successfully and warranty activated',
        emailSent: false,
      };

      warrantyService.registerDevice.mockResolvedValue(responseWithoutEmail);

      const result = await controller.registerDevice(validRegisterDto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(false);
    });

    it('should extract IP address correctly for device registration', async () => {
      const mockRequestWithIP = {
        ip: '10.0.0.1',
        connection: { remoteAddress: '192.168.1.1' },
      };

      warrantyService.registerDevice.mockResolvedValue({
        success: true,
        device: { id: 'test', imei: 'test', model: 'test', brand: 'test' },
        warranty: {
          id: 'test',
          policyNumber: 'test',
          startDate: new Date(),
          endDate: new Date(),
        },
        message: 'test',
        emailSent: true,
      });

      await controller.registerDevice(validRegisterDto, mockRequestWithIP);

      expect(warrantyService.registerDevice).toHaveBeenCalledWith(
        expect.any(Object),
        '10.0.0.1',
      );
    });

    it('should handle different date formats', async () => {
      const dtoWithDifferentDate = {
        ...validRegisterDto,
        purchaseDate: '2024-02-28',
      };

      warrantyService.registerDevice.mockResolvedValue({
        success: true,
        device: { id: 'test', imei: 'test', model: 'test', brand: 'test' },
        warranty: {
          id: 'test',
          policyNumber: 'test',
          startDate: new Date(),
          endDate: new Date(),
        },
        message: 'test',
        emailSent: true,
      });

      await controller.registerDevice(dtoWithDifferentDate, mockRequest);

      expect(warrantyService.registerDevice).toHaveBeenCalledWith(
        expect.objectContaining({
          purchaseDate: new Date('2024-02-28'),
        }),
        mockRequest.ip,
      );
    });
  });

  describe('error handling', () => {
    it('should propagate service errors for warranty validation', async () => {
      const validDto: ValidateWarrantyDto = {
        imei: '123456789012345',
        model: 'iPhone 14 Pro',
        ownerCpfCnpj: '12345678901',
      };

      warrantyService.validateWarranty.mockRejectedValue(
        new BadRequestException('Service error'),
      );

      await expect(
        controller.validateWarranty(validDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate service errors for device registration', async () => {
      const validRegisterDto: RegisterDeviceDto = {
        imei: '123456789012345',
        fiscalNumber: 'NF123456789',
        model: 'iPhone 15 Pro',
        brand: 'Apple',
        purchaseDate: '2024-01-15T00:00:00.000Z',
        ownerCpfCnpj: '12345678901',
        ownerName: 'João Silva',
        ownerEmail: 'joao.silva@email.com',
        ownerPhone: '+5511999999999',
      };

      warrantyService.registerDevice.mockRejectedValue(
        new BadRequestException('Registration failed'),
      );

      await expect(
        controller.registerDevice(validRegisterDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });
});