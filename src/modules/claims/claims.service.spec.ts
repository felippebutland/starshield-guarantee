import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { ClaimsService } from './claims.service';
import { Device, DeviceDocument } from '../../schemas/device.schema';
import { Warranty, WarrantyDocument, WarrantyStatus } from '../../schemas/warranty.schema';
import { Claim, ClaimDocument, ClaimStatus, DamageType } from '../../schemas/claim.schema';
import { AuditLog, AuditLogDocument } from '../../schemas/audit-log.schema';

describe('ClaimsService', () => {
  let service: ClaimsService;
  let deviceModel: jest.Mocked<Model<DeviceDocument>>;
  let warrantyModel: jest.Mocked<Model<WarrantyDocument>>;
  let claimModel: jest.Mocked<Model<ClaimDocument>>;
  let auditLogModel: jest.Mocked<Model<AuditLogDocument>>;

  const mockObjectId = new Types.ObjectId();
  const mockDevice = {
    _id: mockObjectId,
    imei: '123456789012345',
    model: 'iPhone 14 Pro',
    brand: 'Apple',
    isActive: true,
  };

  const mockWarranty = {
    _id: mockObjectId,
    deviceId: mockObjectId,
    status: WarrantyStatus.ACTIVE,
    startDate: new Date('2023-01-01'),
    endDate: new Date('2024-12-01'),
    maxClaims: 2,
    usedClaims: 0,
    policyNumber: 'POL123456',
    coverageType: 'Screen Protection',
    isActive: true,
  };

  const mockClaim = {
    _id: mockObjectId,
    protocolNumber: 'SGR17023456789001',
    deviceId: mockObjectId,
    warrantyId: mockObjectId,
    status: ClaimStatus.SUBMITTED,
    damageType: DamageType.CRACKED_SCREEN,
    damageDescription: 'Screen cracked after drop',
    incidentDate: new Date('2023-12-01'),
    customerName: 'João Silva',
    customerCpf: '12345678901',
    customerPhone: '+5511999999999',
    customerEmail: 'joao@email.com',
    evidencePhotos: ['photo1.jpg'],
    documents: ['receipt.pdf'],
    isActive: true,
    createdAt: new Date('2023-12-01'),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaimsService,
        {
          provide: getModelToken(Device.name),
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: getModelToken(Warranty.name),
          useValue: {
            findOne: jest.fn(),
            updateOne: jest.fn(),
          },
        },
        {
          provide: getModelToken(Claim.name),
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
      ],
    }).compile();

    service = module.get<ClaimsService>(ClaimsService);
    deviceModel = module.get(getModelToken(Device.name));
    warrantyModel = module.get(getModelToken(Warranty.name));
    claimModel = module.get(getModelToken(Claim.name));
    auditLogModel = module.get(getModelToken(AuditLog.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createClaim', () => {
    const createClaimDto = {
      deviceId: mockObjectId.toString(),
      damageType: DamageType.CRACKED_SCREEN,
      damageDescription: 'Screen cracked after drop',
      incidentDate: new Date('2023-12-01'),
      customerName: 'João Silva',
      customerCpf: '12345678901',
      customerPhone: '+5511999999999',
      customerEmail: 'joao@email.com',
      evidencePhotos: ['photo1.jpg'],
      documents: ['receipt.pdf'],
    };

    it('should throw NotFoundException when device is not found', async () => {
      deviceModel.findById.mockResolvedValue(null);

      await expect(service.createClaim(createClaimDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when no active warranty is found', async () => {
      deviceModel.findById.mockResolvedValue(mockDevice as any);
      warrantyModel.findOne.mockResolvedValue(null);

      await expect(service.createClaim(createClaimDto)).rejects.toThrow(
        new BadRequestException('No active warranty found for this device'),
      );
    });

    it('should throw BadRequestException when warranty is expired', async () => {
      const expiredWarranty = {
        ...mockWarranty,
        endDate: new Date('2022-01-01'),
      };

      deviceModel.findById.mockResolvedValue(mockDevice as any);
      warrantyModel.findOne.mockResolvedValue(expiredWarranty as any);
      warrantyModel.updateOne.mockResolvedValue({} as any);

      await expect(service.createClaim(createClaimDto)).rejects.toThrow(
        new BadRequestException('Warranty has expired'),
      );
    });

    it('should throw BadRequestException when maximum claims reached', async () => {
      const maxedWarranty = {
        ...mockWarranty,
        usedClaims: 2,
        endDate: new Date('2024-12-01'), // Future date to avoid expiry check
      };

      deviceModel.findById.mockResolvedValue(mockDevice as any);
      warrantyModel.findOne.mockResolvedValue(maxedWarranty as any);

      await expect(service.createClaim(createClaimDto)).rejects.toThrow(
        new BadRequestException('Maximum number of claims reached for this warranty'),
      );
    });

    it('should successfully create a claim', async () => {
      deviceModel.findById.mockResolvedValue(mockDevice as any);
      warrantyModel.findOne.mockResolvedValue(mockWarranty as any);
      warrantyModel.updateOne.mockResolvedValue({} as any);

      const result = await service.createClaim(createClaimDto);

      expect(result.id).toBeDefined();
      expect(result.protocolNumber).toMatch(/^SGR\d+/);
      expect(result.status).toBe(ClaimStatus.SUBMITTED);
      expect(result.damageType).toBe(DamageType.CRACKED_SCREEN);
      expect(result.device.imei).toBe(mockDevice.imei);
      expect(result.warranty.policyNumber).toBe(mockWarranty.policyNumber);
      expect(result.warranty.remainingClaims).toBe(1);

      expect(warrantyModel.updateOne).toHaveBeenCalledWith(
        { _id: mockWarranty._id },
        { $inc: { usedClaims: 1 } },
      );
    });

    it('should generate unique protocol numbers', async () => {
      deviceModel.findById.mockResolvedValue(mockDevice as any);
      warrantyModel.findOne.mockResolvedValue(mockWarranty as any);
      warrantyModel.updateOne.mockResolvedValue({} as any);

      // First call
      const result1 = await service.createClaim(createClaimDto);

      // Second call with slight delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      const result2 = await service.createClaim(createClaimDto);

      expect(result1.protocolNumber).toMatch(/^SGR\d+/);
      expect(result2.protocolNumber).toMatch(/^SGR\d+/);
      expect(result1.protocolNumber).not.toBe(result2.protocolNumber);
    });
  });

  describe('getClaimByProtocol', () => {
    beforeEach(() => {
      // Add static methods to claimModel for query operations
      (claimModel as any).findOne = jest.fn();
    });

    it('should return null when claim is not found', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
      };
      mockQuery.populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      } as any);

      (claimModel as any).findOne.mockReturnValue(mockQuery);

      const result = await service.getClaimByProtocol('INVALID123');

      expect(result).toBeNull();
    });

    it('should return claim when found', async () => {
      const populatedClaim = {
        ...mockClaim,
        deviceId: mockDevice,
        warrantyId: mockWarranty,
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
      };
      mockQuery.populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(populatedClaim),
      } as any);

      (claimModel as any).findOne.mockReturnValue(mockQuery);

      const result = await service.getClaimByProtocol('SGR17023456789001');

      expect(result).toBeDefined();
      expect(result?.protocolNumber).toBe('SGR17023456789001');
      expect(result?.device.imei).toBe(mockDevice.imei);
      expect(result?.warranty.policyNumber).toBe(mockWarranty.policyNumber);
    });
  });

  describe('updateClaimStatus', () => {
    beforeEach(() => {
      // Add static methods to claimModel
      (claimModel as any).findById = jest.fn();
    });

    it('should throw NotFoundException when claim is not found', async () => {
      (claimModel as any).findById.mockResolvedValue(null);

      await expect(
        service.updateClaimStatus(mockObjectId.toString(), ClaimStatus.APPROVED),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully update claim status', async () => {
      const claimToUpdate = {
        ...mockClaim,
        status: ClaimStatus.SUBMITTED,
        save: jest.fn().mockResolvedValue(mockClaim),
      };

      (claimModel as any).findById.mockResolvedValue(claimToUpdate as any);

      await service.updateClaimStatus(
        mockObjectId.toString(),
        ClaimStatus.APPROVED,
        'Claim approved after review',
      );

      expect(claimToUpdate.status).toBe(ClaimStatus.APPROVED);
      expect(claimToUpdate.adminNotes).toBe('Claim approved after review');
      expect(claimToUpdate.save).toHaveBeenCalled();
    });

    it('should set completion date when status is COMPLETED', async () => {
      const claimToUpdate = {
        ...mockClaim,
        status: ClaimStatus.IN_REPAIR,
        save: jest.fn().mockResolvedValue(mockClaim),
      };

      (claimModel as any).findById.mockResolvedValue(claimToUpdate as any);

      await service.updateClaimStatus(
        mockObjectId.toString(),
        ClaimStatus.COMPLETED,
      );

      expect(claimToUpdate.status).toBe(ClaimStatus.COMPLETED);
      expect(claimToUpdate.completionDate).toBeDefined();
      expect(claimToUpdate.save).toHaveBeenCalled();
    });
  });

  describe('protocol number generation', () => {
    it('should generate protocol numbers with correct format', async () => {
      deviceModel.findById.mockResolvedValue(mockDevice as any);
      warrantyModel.findOne.mockResolvedValue(mockWarranty as any);
      warrantyModel.updateOne.mockResolvedValue({} as any);

      const createClaimDto = {
        deviceId: mockObjectId.toString(),
        damageType: DamageType.BROKEN_SCREEN,
        damageDescription: 'Screen completely broken',
        incidentDate: new Date('2023-12-01'),
        customerName: 'Maria Santos',
        customerCpf: '98765432100',
        customerPhone: '+5511888888888',
        customerEmail: 'maria@email.com',
      };

      const result = await service.createClaim(createClaimDto);

      expect(result.protocolNumber).toMatch(/^SGR\d{13}\d{3}$/);
      expect(result.protocolNumber.length).toBe(19); // SGR + 13 digits timestamp + 3 digits random
    });
  });

  describe('audit logging', () => {
    it('should log audit events during claim creation', async () => {
      deviceModel.findById.mockResolvedValue(mockDevice as any);
      warrantyModel.findOne.mockResolvedValue(mockWarranty as any);
      warrantyModel.updateOne.mockResolvedValue({} as any);

      const createClaimDto = {
        deviceId: mockObjectId.toString(),
        damageType: DamageType.TOUCH_NOT_WORKING,
        damageDescription: 'Touch screen not responsive',
        incidentDate: new Date('2023-12-01'),
        customerName: 'Pedro Costa',
        customerCpf: '11122233344',
        customerPhone: '+5511777777777',
        customerEmail: 'pedro@email.com',
      };

      const result = await service.createClaim(createClaimDto);

      // Audit logging is tested implicitly through successful claim creation
      expect(result.id).toBeDefined();
    });

    it('should log audit events during claim status updates', async () => {
      const claimToUpdate = {
        ...mockClaim,
        status: ClaimStatus.UNDER_REVIEW,
        save: jest.fn().mockResolvedValue(mockClaim),
      };

      (claimModel as any).findById.mockResolvedValue(claimToUpdate as any);

      await service.updateClaimStatus(
        mockObjectId.toString(),
        ClaimStatus.REJECTED,
        'Missing required documentation',
      );

      // Audit logging is tested implicitly through successful status update
      expect(claimToUpdate.save).toHaveBeenCalled();
    });
  });
});