# StarShield Guarantee API Documentation

## Overview

This is a backend API system for **Screen Warranty Validation Portal** - a comprehensive solution for validating and processing screen warranty claims for mobile devices.

## Features

- ✅ **Warranty Validation**: IMEI/Fiscal number validation with device model verification
- ✅ **Claims Processing**: Complete warranty claim submission and tracking system
- ✅ **Protocol Generation**: Automatic protocol number generation for claim tracking
- ✅ **Audit Logging**: Complete audit trail of all system operations
- ✅ **MongoDB Integration**: Scalable NoSQL database with proper schema design
- ✅ **Input Validation**: Comprehensive validation using class-validator
- ✅ **Error Handling**: Proper HTTP error responses and logging

## Technical Stack

- **Framework**: NestJS with Fastify adapter
- **Database**: MongoDB with Mongoose ODM
- **Validation**: class-validator and class-transformer
- **Email Service**: Gmail API with OAuth2 authentication
- **Language**: TypeScript
- **Architecture**: Modular design with clean separation of concerns

## Email Configuration

The system automatically sends welcome emails to users when they register their first device. Configure the following environment variables:

### Gmail API (Recommended)
```env
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
GMAIL_USER=your_email@gmail.com
```

### SMTP Fallback
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

**Note:** The email service includes automatic fallback from Gmail API to SMTP if authentication fails.

## API Endpoints

### Warranty Validation

#### POST `/warranty/validate`
Validates if a device has active warranty coverage.

**Request Body:**
```json
{
  "imei": "123456789012345",
  "fiscalNumber": "FN123456789",
  "model": "iPhone 14 Pro",
  "ownerCpfCnpj": "12345678901"
}
```

**Note:** Either `imei` or `fiscalNumber` must be provided, but not both are required.

**Response:**
```json
{
  "isValid": true,
  "device": {
    "id": "deviceId",
    "imei": "123456789012345",
    "model": "iPhone 14 Pro",
    "brand": "Apple"
  },
  "warranty": {
    "id": "warrantyId",
    "status": "active",
    "startDate": "2023-01-01T00:00:00.000Z",
    "endDate": "2024-01-01T00:00:00.000Z",
    "maxClaims": 2,
    "usedClaims": 0,
    "remainingClaims": 2,
    "policyNumber": "POL123456",
    "coverageType": "screen_only"
  },
  "message": "Warranty is active and valid"
}
```

### Device Registration

#### POST `/warranty/register`
Registers a new device and creates its warranty. **This is the "first case" that triggers an email notification to the device owner.**

**Request Body:**
```json
{
  "imei": "123456789012345",
  "fiscalNumber": "NF123456789",
  "model": "iPhone 15 Pro",
  "brand": "Apple",
  "purchaseDate": "2024-01-15T00:00:00.000Z",
  "ownerCpfCnpj": "12345678901",
  "ownerName": "João Silva",
  "ownerEmail": "joao.silva@email.com",
  "ownerPhone": "+5511999999999",
  "photos": [
    "https://example.com/device-photo1.jpg",
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
  ]
}
```

**Note:** The `photos` field is required and must contain between 2 and 6 photos as strings. Photos can be provided as:
- URLs (e.g., "https://example.com/photo.jpg")
- File paths (e.g., "./uploads/photo.jpg") 
- Base64 encoded images (e.g., "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...")
```

**Response:**
```json
{
  "success": true,
  "device": {
    "id": "deviceId",
    "imei": "123456789012345",
    "model": "iPhone 15 Pro",
    "brand": "Apple"
  },
  "warranty": {
    "id": "warrantyId",
    "policyNumber": "POL-1704067200000-ABC123XYZ",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2025-01-01T00:00:00.000Z"
  },
  "message": "Device registered successfully and warranty activated",
  "emailSent": true
}
```

**Email Notification:** When a device is successfully registered, a welcome email is automatically sent to the `ownerEmail` address with:
- Device registration confirmation
- Warranty details and coverage information
- Instructions on how to file claims
- Beautiful HTML template with company branding

### Claims Management

#### POST `/claims`
Submits a new warranty claim.

**Request Body:**
```json
{
  "deviceId": "deviceObjectId",
  "damageType": "cracked_screen",
  "damageDescription": "Screen cracked after dropping the phone",
  "incidentDate": "2023-12-01",
  "customerName": "João Silva",
  "customerCpf": "12345678901",
  "customerPhone": "+5511999999999",
  "customerEmail": "joao@email.com",
  "evidencePhotos": ["photo1.jpg", "photo2.jpg"],
  "documents": ["receipt.pdf"]
}
```

**Response:**
```json
{
  "id": "claimId",
  "protocolNumber": "SGR17023456789001",
  "status": "submitted",
  "damageType": "cracked_screen",
  "damageDescription": "Screen cracked after dropping the phone",
  "incidentDate": "2023-12-01T00:00:00.000Z",
  "customerName": "João Silva",
  "customerCpf": "12345678901",
  "customerPhone": "+5511999999999",
  "customerEmail": "joao@email.com",
  "createdAt": "2023-12-01T10:00:00.000Z",
  "device": {
    "imei": "123456789012345",
    "model": "iPhone 14 Pro",
    "brand": "Apple"
  },
  "warranty": {
    "policyNumber": "POL123456",
    "remainingClaims": 1
  }
}
```

#### GET `/claims/protocol/:protocolNumber`
Retrieves claim information by protocol number.

**Response:** Same as claim submission response.

#### GET `/claims/damage-types`
Returns available damage types for claims.

**Response:**
```json
[
  { "value": "cracked_screen", "label": "Tela Rachada" },
  { "value": "broken_screen", "label": "Tela Quebrada" },
  { "value": "black_screen", "label": "Tela Preta/Não Liga" },
  { "value": "touch_not_working", "label": "Touch Não Funciona" },
  { "value": "other", "label": "Outros" }
]
```

## Database Schemas

### Device
- IMEI (unique)
- Fiscal Number
- Model and Brand
- Owner information (CPF/CNPJ, name, email, phone)
- Purchase date
- Status flags

### Warranty
- Device reference
- Coverage type (screen_only, full_device, premium)
- Start/end dates
- Claims limits and usage
- Policy information
- Status tracking

### Claim
- Protocol number (auto-generated)
- Device and warranty references
- Damage information
- Customer details
- Evidence attachments
- Status workflow
- Administrative notes

### Audit Log
- Action tracking
- Entity changes
- User information
- IP address and metadata
- Timestamp

## Environment Variables

```bash
DATABASE_URL=mongodb://localhost:27017/starshield-guarantee
PORT=3000
FRONTEND_URL=http://localhost:3000
```

## Installation & Usage

1. **Install dependencies:**
```bash
npm install
```

2. **Set up MongoDB:**
   - Install MongoDB locally or use MongoDB Atlas
   - Update DATABASE_URL in .env file

3. **Run the application:**
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

4. **API Base URL:**
```
http://localhost:3000
```

## Data Flow

1. **Warranty Validation Flow:**
   - Client sends IMEI/fiscal number + model + owner CPF/CNPJ
   - System validates device exists and matches owner
   - System checks for active warranty
   - Returns warranty status and coverage details

2. **Claim Submission Flow:**
   - Client validates warranty first (gets deviceId)
   - Client submits claim with device reference
   - System validates warranty is still active
   - System checks claim limits
   - Generates protocol number
   - Updates warranty usage
   - Logs audit trail

## Error Handling

- **400 Bad Request**: Invalid input data or business rule violations
- **404 Not Found**: Device, warranty, or claim not found
- **500 Internal Server Error**: System errors

All errors include descriptive messages and are logged for debugging.

## Security Features

- Input validation and sanitization
- CORS configuration
- Request logging and audit trails
- Data type validation
- SQL injection prevention (NoSQL)

## Future Enhancements

- JWT Authentication for admin users
- File upload endpoints for evidence
- Email notifications
- Advanced reporting
- Rate limiting
- API documentation with Swagger