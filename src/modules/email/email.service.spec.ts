import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService, DeviceRegistrationEmailData } from './email.service';
import { google } from 'googleapis';
import * as nodemailer from 'nodemailer';

// Mock the external dependencies
jest.mock('googleapis');
jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let configService: jest.Mocked<ConfigService>;
  let mockTransporter: jest.Mocked<any>;
  let mockOAuth2Client: jest.Mocked<any>;

  const mockDeviceRegistrationData: DeviceRegistrationEmailData = {
    ownerName: 'João Silva',
    ownerEmail: 'joao.silva@email.com',
    deviceModel: 'iPhone 15 Pro',
    deviceBrand: 'Apple',
    imei: '123456789012345',
    registrationDate: new Date('2024-01-15'),
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock transporter
    mockTransporter = {
      sendMail: jest.fn(),
    };

    // Mock OAuth2 client
    mockOAuth2Client = {
      setCredentials: jest.fn(),
      getAccessToken: jest.fn(),
    };

    // Mock googleapis
    (google.auth.OAuth2 as jest.Mock).mockImplementation(() => mockOAuth2Client);

    // Mock nodemailer
    (nodemailer.createTransporter as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get(ConfigService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize Gmail transporter successfully', async () => {
      // Setup config service mocks
      configService.get
        .mockReturnValueOnce('test_client_id') // GMAIL_CLIENT_ID
        .mockReturnValueOnce('test_client_secret') // GMAIL_CLIENT_SECRET
        .mockReturnValueOnce('test_refresh_token') // GMAIL_REFRESH_TOKEN
        .mockReturnValueOnce('test_user@gmail.com') // GMAIL_USER
        .mockReturnValueOnce('test_client_id') // GMAIL_CLIENT_ID (second call)
        .mockReturnValueOnce('test_client_secret') // GMAIL_CLIENT_SECRET (second call)
        .mockReturnValueOnce('test_refresh_token') // GMAIL_REFRESH_TOKEN (second call)
        .mockReturnValueOnce('test_user@gmail.com'); // GMAIL_USER (second call)

      mockOAuth2Client.getAccessToken.mockResolvedValue({
        token: 'mock_access_token',
      });

      // Create a new service instance to test initialization
      const testModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const testService = testModule.get<EmailService>(EmailService);

      expect(testService).toBeDefined();
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'test_client_id',
        'test_client_secret',
        'https://developers.google.com/oauthplayground',
      );
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        refresh_token: 'test_refresh_token',
      });
    });

    it('should fallback to SMTP when Gmail API fails', async () => {
      // Setup config service to return Gmail config but fail on access token
      configService.get
        .mockReturnValueOnce('test_client_id')
        .mockReturnValueOnce('test_client_secret')
        .mockReturnValueOnce('test_refresh_token')
        .mockReturnValueOnce('test_user@gmail.com');

      mockOAuth2Client.getAccessToken.mockRejectedValue(new Error('Auth failed'));

      // Setup SMTP fallback config
      configService.get
        .mockReturnValueOnce('smtp.gmail.com') // SMTP_HOST
        .mockReturnValueOnce(587) // SMTP_PORT
        .mockReturnValueOnce('smtp_user@gmail.com') // SMTP_USER
        .mockReturnValueOnce('smtp_password'); // SMTP_PASS

      // Create a new service instance to test fallback
      const testModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const testService = testModule.get<EmailService>(EmailService);

      expect(testService).toBeDefined();
      expect(nodemailer.createTransporter).toHaveBeenCalledWith({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'smtp_user@gmail.com',
          pass: 'smtp_password',
        },
      });
    });
  });

  describe('sendDeviceRegistrationEmail', () => {
    beforeEach(() => {
      // Setup default config service responses
      configService.get
        .mockReturnValue('test@gmail.com') // Default fallback for GMAIL_USER or SMTP_USER
        .mockReturnValueOnce('test@gmail.com'); // Specific for sender email
    });

    it('should send device registration email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'mock-message-id',
        response: 'Email sent successfully',
      });

      const result = await service.sendDeviceRegistrationEmail(mockDeviceRegistrationData);

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: {
          name: 'StarShield Garantias',
          address: 'test@gmail.com',
        },
        to: mockDeviceRegistrationData.ownerEmail,
        subject: 'Dispositivo Registrado com Sucesso - StarShield Garantias',
        html: expect.stringContaining('João Silva'),
      });
    });

    it('should return false when email sending fails', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

      const result = await service.sendDeviceRegistrationEmail(mockDeviceRegistrationData);

      expect(result).toBe(false);
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it('should generate correct email template content', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      await service.sendDeviceRegistrationEmail(mockDeviceRegistrationData);

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      const htmlContent = emailCall.html;

      // Check if the HTML template contains expected content
      expect(htmlContent).toContain('João Silva');
      expect(htmlContent).toContain('Apple iPhone 15 Pro');
      expect(htmlContent).toContain('123456789012345');
      expect(htmlContent).toContain('15/01/2024'); // Portuguese date format
      expect(htmlContent).toContain('StarShield Garantias');
      expect(htmlContent).toContain('Dispositivo Registrado com Sucesso');
      expect(htmlContent).toContain('garantia de tela está ativa');
    });

    it('should handle different device data correctly', async () => {
      const samsungData: DeviceRegistrationEmailData = {
        ownerName: 'Maria Santos',
        ownerEmail: 'maria@email.com',
        deviceModel: 'Galaxy S23 Ultra',
        deviceBrand: 'Samsung',
        imei: '987654321098765',
        registrationDate: new Date('2024-02-20'),
      };

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      const result = await service.sendDeviceRegistrationEmail(samsungData);

      expect(result).toBe(true);

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      const htmlContent = emailCall.html;

      expect(htmlContent).toContain('Maria Santos');
      expect(htmlContent).toContain('Samsung Galaxy S23 Ultra');
      expect(htmlContent).toContain('987654321098765');
      expect(htmlContent).toContain('20/02/2024');
      expect(emailCall.to).toBe('maria@email.com');
    });

    it('should use fallback sender email when GMAIL_USER is not available', async () => {
      configService.get
        .mockReturnValueOnce(undefined) // GMAIL_USER not available
        .mockReturnValueOnce('fallback@email.com'); // SMTP_USER as fallback

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      await service.sendDeviceRegistrationEmail(mockDeviceRegistrationData);

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.from.address).toBe('fallback@email.com');
    });
  });

  describe('email template generation', () => {
    it('should generate valid HTML email template', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      await service.sendDeviceRegistrationEmail(mockDeviceRegistrationData);

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      const htmlContent = emailCall.html;

      // Check HTML structure
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html>');
      expect(htmlContent).toContain('<head>');
      expect(htmlContent).toContain('<body>');
      expect(htmlContent).toContain('<style>');

      // Check CSS classes are present
      expect(htmlContent).toContain('class="container"');
      expect(htmlContent).toContain('class="header"');
      expect(htmlContent).toContain('class="content"');
      expect(htmlContent).toContain('class="device-info"');
      expect(htmlContent).toContain('class="footer"');

      // Check responsive meta tag
      expect(htmlContent).toContain('name="viewport"');
      expect(htmlContent).toContain('width=device-width');
    });

    it('should include all required information in email template', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      await service.sendDeviceRegistrationEmail(mockDeviceRegistrationData);

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      const htmlContent = emailCall.html;

      // Check all required sections are present
      expect(htmlContent).toContain('Informações do Dispositivo Registrado');
      expect(htmlContent).toContain('O que você pode fazer agora');
      expect(htmlContent).toContain('Como acionar sua garantia');
      expect(htmlContent).toContain('Este é um e-mail automático');
      expect(htmlContent).toContain('© 2024 StarShield Garantias');

      // Check warranty instructions are included
      expect(htmlContent).toContain('Acesse nosso portal');
      expect(htmlContent).toContain('Acionar Sinistro');
      expect(htmlContent).toContain('Descreva o problema');
      expect(htmlContent).toContain('anexe fotos');
    });

    it('should format date correctly in Portuguese locale', async () => {
      const testData: DeviceRegistrationEmailData = {
        ...mockDeviceRegistrationData,
        registrationDate: new Date('2024-03-25T10:30:00Z'),
      };

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      await service.sendDeviceRegistrationEmail(testData);

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      const htmlContent = emailCall.html;

      expect(htmlContent).toContain('25/03/2024');
    });
  });

  describe('error handling', () => {
    it('should handle transporter sendMail errors gracefully', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.sendDeviceRegistrationEmail(mockDeviceRegistrationData);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle invalid email addresses gracefully', async () => {
      const invalidEmailData: DeviceRegistrationEmailData = {
        ...mockDeviceRegistrationData,
        ownerEmail: 'invalid-email',
      };

      mockTransporter.sendMail.mockRejectedValue(new Error('Invalid email address'));

      const result = await service.sendDeviceRegistrationEmail(invalidEmailData);

      expect(result).toBe(false);
    });

    it('should handle missing configuration gracefully', async () => {
      configService.get.mockReturnValue(undefined);

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      const result = await service.sendDeviceRegistrationEmail(mockDeviceRegistrationData);

      expect(result).toBe(true);
      // Should still work with undefined config values, using fallbacks
    });
  });
});