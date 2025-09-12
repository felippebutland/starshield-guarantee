import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import * as nodemailer from 'nodemailer';

export interface DeviceRegistrationEmailData {
  ownerName: string;
  ownerEmail: string;
  deviceModel: string;
  deviceBrand: string;
  imei: string;
  registrationDate: Date;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeGmailTransporter();
  }

  private async initializeGmailTransporter() {
    try {
      const oauth2Client = new google.auth.OAuth2(
        this.configService.get('GMAIL_CLIENT_ID'),
        this.configService.get('GMAIL_CLIENT_SECRET'),
        'https://developers.google.com/oauthplayground',
      );

      oauth2Client.setCredentials({
        refresh_token: this.configService.get('GMAIL_REFRESH_TOKEN'),
      });

      const accessToken = await oauth2Client.getAccessToken();

      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: this.configService.get('GMAIL_USER'),
          clientId: this.configService.get('GMAIL_CLIENT_ID'),
          clientSecret: this.configService.get('GMAIL_CLIENT_SECRET'),
          refreshToken: this.configService.get('GMAIL_REFRESH_TOKEN'),
          accessToken: accessToken.token,
        },
      });

      this.logger.log('Gmail transporter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Gmail transporter:', error);
      // Fallback to simple SMTP if Gmail API fails
      this.initializeFallbackTransporter();
    }
  }

  private initializeFallbackTransporter() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
    this.logger.log('Fallback SMTP transporter initialized');
  }

  async sendDeviceRegistrationEmail(
    data: DeviceRegistrationEmailData,
  ): Promise<boolean> {
    try {
      const emailTemplate = this.getDeviceRegistrationEmailTemplate(data);

      const mailOptions = {
        from: {
          name: 'StarShield Garantias',
          address:
            this.configService.get('GMAIL_USER') ||
            this.configService.get('SMTP_USER'),
        },
        to: data.ownerEmail,
        subject: 'Dispositivo Registrado com Sucesso - StarShield Garantias',
        html: emailTemplate,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Device registration email sent successfully to ${data.ownerEmail}`,
      );
      return true;
    } catch (error) {
      this.logger.error('Failed to send device registration email:', error);
      return false;
    }
  }

  private getDeviceRegistrationEmailTemplate(
    data: DeviceRegistrationEmailData,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dispositivo Registrado - StarShield</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c3e50; color: white; text-align: center; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .device-info { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #3498db; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #7f8c8d; }
          .button { display: inline-block; padding: 12px 24px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛡️ StarShield Garantias</h1>
            <h2>Dispositivo Registrado com Sucesso!</h2>
          </div>
          <div class="content">
            <p>Olá, <strong>${data.ownerName}</strong>!</p>
            
            <p>Seu dispositivo foi registrado com sucesso em nosso sistema de garantias. Agora você tem proteção para a tela do seu dispositivo!</p>
            
            <div class="device-info">
              <h3>📱 Informações do Dispositivo Registrado:</h3>
              <ul>
                <li><strong>Modelo:</strong> ${data.deviceBrand} ${data.deviceModel}</li>
                <li><strong>IMEI:</strong> ${data.imei}</li>
                <li><strong>Data de Registro:</strong> ${data.registrationDate.toLocaleDateString('pt-BR')}</li>
              </ul>
            </div>
            
            <h3>✅ O que você pode fazer agora:</h3>
            <ul>
              <li>Sua garantia de tela está ativa e válida</li>
              <li>Em caso de danos na tela, você pode acionar sua garantia</li>
              <li>Guarde este e-mail como comprovante do registro</li>
            </ul>
            
            <h3>🔧 Como acionar sua garantia:</h3>
            <ol>
              <li>Acesse nosso portal de garantias</li>
              <li>Vá para a seção "Acionar Sinistro"</li>
              <li>Informe os dados do seu dispositivo</li>
              <li>Descreva o problema e anexe fotos</li>
              <li>Aguarde o processamento do seu pedido</li>
            </ol>
            
            <p><strong>Importante:</strong> Mantenha sempre seu dispositivo em local seguro e tome cuidados para evitar danos desnecessários.</p>
            
            <p>Se você tiver alguma dúvida ou precisar de ajuda, não hesite em nos contatar.</p>
            
            <p>Obrigado por confiar na StarShield Garantias!</p>
          </div>
          <div class="footer">
            <p>Este é um e-mail automático, não responda a esta mensagem.</p>
            <p>© 2024 StarShield Garantias - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
