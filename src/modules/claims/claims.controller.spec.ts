import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClaimsController, SubmitClaimDto } from './claims.controller';
import { ClaimsService } from './claims.service';
import { DamageType, ClaimStatus } from '../../schemas/claim.schema';

describe('ClaimsController', () => {
  let controller: ClaimsController;
  let claimsService: jest.Mocked<ClaimsService>;

  const mockRequest = {
    ip: '192.168.1.1',
    connection: {
      remoteAddress: '192.168.1.1',
    },
  };

  const mockClaimResponse = {
    id: 'claim-id-123',
    protocolNumber: 'SGR17023456789001',
    status: ClaimStatus.SUBMITTED,
    damageType: DamageType.CRACKED_SCREEN,
    damageDescription: 'Screen cracked after dropping the phone',
    incidentDate: new Date('2023-12-01'),
    customerName: 'João Silva',
    customerCpf: '12345678901',
    customerPhone: '+5511999999999',
    customerEmail: 'joao@email.com',
    createdAt: new Date('2023-12-01T10:00:00Z'),
    device: {
      imei: '123456789012345',
      model: 'iPhone 14 Pro',
      brand: 'Apple',
    },
    warranty: {
      policyNumber: 'POL123456',
      remainingClaims: 1,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClaimsController],
      providers: [
        {
          provide: ClaimsService,
          useValue: {
            createClaim: jest.fn(),
            getClaimByProtocol: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ClaimsController>(ClaimsController);
    claimsService = module.get(ClaimsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitClaim', () => {
    const validSubmitDto: SubmitClaimDto = {
      deviceId: 'device-id-123',
      damageType: DamageType.CRACKED_SCREEN,
      damageDescription: 'Screen cracked after dropping the phone',
      incidentDate: '2023-12-01',
      customerName: 'João Silva',
      customerCpf: '12345678901',
      customerPhone: '+5511999999999',
      customerEmail: 'joao@email.com',
      evidencePhotos: ['photo1.jpg', 'photo2.jpg'],
      documents: ['receipt.pdf'],
    };

    it('should submit claim successfully', async () => {
      claimsService.createClaim.mockResolvedValue(mockClaimResponse);

      const result = await controller.submitClaim(validSubmitDto, mockRequest);

      expect(result).toEqual(mockClaimResponse);
      expect(claimsService.createClaim).toHaveBeenCalledWith(
        {
          deviceId: validSubmitDto.deviceId,
          damageType: validSubmitDto.damageType,
          damageDescription: validSubmitDto.damageDescription,
          incidentDate: new Date(validSubmitDto.incidentDate),
          customerName: validSubmitDto.customerName,
          customerCpf: validSubmitDto.customerCpf,
          customerPhone: validSubmitDto.customerPhone,
          customerEmail: validSubmitDto.customerEmail,
          evidencePhotos: validSubmitDto.evidencePhotos,
          documents: validSubmitDto.documents,
        },
        mockRequest.ip,
      );
    });

    it('should submit claim without optional fields', async () => {
      const minimalDto: SubmitClaimDto = {
        deviceId: 'device-id-123',
        damageType: DamageType.BROKEN_SCREEN,
        damageDescription: 'Screen completely broken',
        incidentDate: '2023-12-01',
        customerName: 'Maria Santos',
        customerCpf: '98765432100',
        customerPhone: '+5511888888888',
        customerEmail: 'maria@email.com',
      };

      const expectedResponse = {
        ...mockClaimResponse,
        damageType: DamageType.BROKEN_SCREEN,
        damageDescription: 'Screen completely broken',
        customerName: 'Maria Santos',
        customerCpf: '98765432100',
        customerPhone: '+5511888888888',
        customerEmail: 'maria@email.com',
      };

      claimsService.createClaim.mockResolvedValue(expectedResponse);

      const result = await controller.submitClaim(minimalDto, mockRequest);

      expect(result).toEqual(expectedResponse);
      expect(claimsService.createClaim).toHaveBeenCalledWith(
        {
          deviceId: minimalDto.deviceId,
          damageType: minimalDto.damageType,
          damageDescription: minimalDto.damageDescription,
          incidentDate: new Date(minimalDto.incidentDate),
          customerName: minimalDto.customerName,
          customerCpf: minimalDto.customerCpf,
          customerPhone: minimalDto.customerPhone,
          customerEmail: minimalDto.customerEmail,
          evidencePhotos: undefined,
          documents: undefined,
        },
        mockRequest.ip,
      );
    });

    it('should handle different damage types', async () => {
      const touchNotWorkingDto: SubmitClaimDto = {
        deviceId: 'device-id-123',
        damageType: DamageType.TOUCH_NOT_WORKING,
        damageDescription: 'Touch screen is not responsive',
        incidentDate: '2023-12-01',
        customerName: 'Pedro Costa',
        customerCpf: '11122233344',
        customerPhone: '+5511777777777',
        customerEmail: 'pedro@email.com',
      };

      const expectedResponse = {
        ...mockClaimResponse,
        damageType: DamageType.TOUCH_NOT_WORKING,
        damageDescription: 'Touch screen is not responsive',
        customerName: 'Pedro Costa',
        customerCpf: '11122233344',
        customerPhone: '+5511777777777',
        customerEmail: 'pedro@email.com',
      };

      claimsService.createClaim.mockResolvedValue(expectedResponse);

      const result = await controller.submitClaim(touchNotWorkingDto, mockRequest);

      expect(result.damageType).toBe(DamageType.TOUCH_NOT_WORKING);
      expect(claimsService.createClaim).toHaveBeenCalledWith(
        expect.objectContaining({
          damageType: DamageType.TOUCH_NOT_WORKING,
        }),
        mockRequest.ip,
      );
    });

    it('should convert date string to Date object', async () => {
      claimsService.createClaim.mockResolvedValue(mockClaimResponse);

      await controller.submitClaim(validSubmitDto, mockRequest);

      expect(claimsService.createClaim).toHaveBeenCalledWith(
        expect.objectContaining({
          incidentDate: new Date('2023-12-01'),
        }),
        mockRequest.ip,
      );
    });

    it('should handle different date formats', async () => {
      const dtoWithISODate: SubmitClaimDto = {
        ...validSubmitDto,
        incidentDate: '2023-12-01T15:30:00.000Z',
      };

      claimsService.createClaim.mockResolvedValue(mockClaimResponse);

      await controller.submitClaim(dtoWithISODate, mockRequest);

      expect(claimsService.createClaim).toHaveBeenCalledWith(
        expect.objectContaining({
          incidentDate: new Date('2023-12-01T15:30:00.000Z'),
        }),
        mockRequest.ip,
      );
    });

    it('should extract IP address correctly', async () => {
      const mockRequestWithIP = {
        ip: '10.0.0.1',
        connection: { remoteAddress: '192.168.1.1' },
      };

      claimsService.createClaim.mockResolvedValue(mockClaimResponse);

      await controller.submitClaim(validSubmitDto, mockRequestWithIP);

      expect(claimsService.createClaim).toHaveBeenCalledWith(
        expect.any(Object),
        '10.0.0.1',
      );
    });

    it('should use connection remoteAddress as fallback IP', async () => {
      const mockRequestWithConnection = {
        connection: { remoteAddress: '192.168.1.2' },
      };

      claimsService.createClaim.mockResolvedValue(mockClaimResponse);

      await controller.submitClaim(validSubmitDto, mockRequestWithConnection);

      expect(claimsService.createClaim).toHaveBeenCalledWith(
        expect.any(Object),
        '192.168.1.2',
      );
    });

    it('should use "unknown" as fallback when no IP is available', async () => {
      const mockRequestNoIP = {};

      claimsService.createClaim.mockResolvedValue(mockClaimResponse);

      await controller.submitClaim(validSubmitDto, mockRequestNoIP);

      expect(claimsService.createClaim).toHaveBeenCalledWith(
        expect.any(Object),
        'unknown',
      );
    });

    it('should handle multiple evidence photos and documents', async () => {
      const dtoWithMultipleFiles: SubmitClaimDto = {
        ...validSubmitDto,
        evidencePhotos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'],
        documents: ['receipt.pdf', 'warranty_card.pdf', 'purchase_proof.pdf'],
      };

      claimsService.createClaim.mockResolvedValue(mockClaimResponse);

      await controller.submitClaim(dtoWithMultipleFiles, mockRequest);

      expect(claimsService.createClaim).toHaveBeenCalledWith(
        expect.objectContaining({
          evidencePhotos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'],
          documents: ['receipt.pdf', 'warranty_card.pdf', 'purchase_proof.pdf'],
        }),
        mockRequest.ip,
      );
    });
  });

  describe('getClaimByProtocol', () => {
    it('should return claim when found', async () => {
      const protocolNumber = 'SGR17023456789001';

      claimsService.getClaimByProtocol.mockResolvedValue(mockClaimResponse);

      const result = await controller.getClaimByProtocol(protocolNumber);

      expect(result).toEqual(mockClaimResponse);
      expect(claimsService.getClaimByProtocol).toHaveBeenCalledWith(protocolNumber);
    });

    it('should throw NotFoundException when claim is not found', async () => {
      const protocolNumber = 'SGR_INVALID_123';

      claimsService.getClaimByProtocol.mockResolvedValue(null);

      await expect(
        controller.getClaimByProtocol(protocolNumber),
      ).rejects.toThrow(
        new NotFoundException('Claim not found with the provided protocol number'),
      );
    });

    it('should handle different protocol number formats', async () => {
      const protocolNumbers = [
        'SGR17023456789001',
        'SGR17023456789002',
        'SGR17023456789999',
      ];

      for (const protocolNumber of protocolNumbers) {
        const expectedResponse = {
          ...mockClaimResponse,
          protocolNumber,
        };

        claimsService.getClaimByProtocol.mockResolvedValue(expectedResponse);

        const result = await controller.getClaimByProtocol(protocolNumber);

        expect(result.protocolNumber).toBe(protocolNumber);
        expect(claimsService.getClaimByProtocol).toHaveBeenCalledWith(protocolNumber);

        jest.clearAllMocks();
      }
    });
  });

  describe('getDamageTypes', () => {
    it('should return all available damage types with Portuguese labels', async () => {
      const result = controller.getDamageTypes();

      expect(result).toEqual([
        { value: DamageType.CRACKED_SCREEN, label: 'Tela Rachada' },
        { value: DamageType.BROKEN_SCREEN, label: 'Tela Quebrada' },
        { value: DamageType.BLACK_SCREEN, label: 'Tela Preta/Não Liga' },
        { value: DamageType.TOUCH_NOT_WORKING, label: 'Touch Não Funciona' },
        { value: DamageType.OTHER, label: 'Outros' },
      ]);
    });

    it('should return consistent damage types structure', () => {
      const result = controller.getDamageTypes();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(5);

      result.forEach((damageType) => {
        expect(damageType).toHaveProperty('value');
        expect(damageType).toHaveProperty('label');
        expect(typeof damageType.value).toBe('string');
        expect(typeof damageType.label).toBe('string');
      });
    });

    it('should include all DamageType enum values', () => {
      const result = controller.getDamageTypes();
      const returnedValues = result.map((dt) => dt.value);

      expect(returnedValues).toContain(DamageType.CRACKED_SCREEN);
      expect(returnedValues).toContain(DamageType.BROKEN_SCREEN);
      expect(returnedValues).toContain(DamageType.BLACK_SCREEN);
      expect(returnedValues).toContain(DamageType.TOUCH_NOT_WORKING);
      expect(returnedValues).toContain(DamageType.OTHER);
    });
  });

  describe('error handling', () => {
    it('should propagate service errors from claim submission', async () => {
      const validSubmitDto: SubmitClaimDto = {
        deviceId: 'device-id-123',
        damageType: DamageType.CRACKED_SCREEN,
        damageDescription: 'Screen cracked',
        incidentDate: '2023-12-01',
        customerName: 'Test User',
        customerCpf: '12345678901',
        customerPhone: '+5511999999999',
        customerEmail: 'test@email.com',
      };

      claimsService.createClaim.mockRejectedValue(
        new Error('Device not found'),
      );

      await expect(
        controller.submitClaim(validSubmitDto, mockRequest),
      ).rejects.toThrow('Device not found');
    });

    it('should handle service exceptions properly', async () => {
      const validSubmitDto: SubmitClaimDto = {
        deviceId: 'invalid-device-id',
        damageType: DamageType.CRACKED_SCREEN,
        damageDescription: 'Screen cracked',
        incidentDate: '2023-12-01',
        customerName: 'Test User',
        customerCpf: '12345678901',
        customerPhone: '+5511999999999',
        customerEmail: 'test@email.com',
      };

      const serviceError = new Error('No active warranty found for this device');
      claimsService.createClaim.mockRejectedValue(serviceError);

      await expect(
        controller.submitClaim(validSubmitDto, mockRequest),
      ).rejects.toThrow(serviceError);

      expect(claimsService.createClaim).toHaveBeenCalledWith(
        expect.any(Object),
        mockRequest.ip,
      );
    });

    it('should handle protocol lookup service errors', async () => {
      const protocolNumber = 'SGR_ERROR_TEST';

      claimsService.getClaimByProtocol.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        controller.getClaimByProtocol(protocolNumber),
      ).rejects.toThrow('Database connection failed');
    });
  });
});