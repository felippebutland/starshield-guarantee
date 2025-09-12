# 🛡️ StarShield Guarantee - Screen Warranty Validation Portal

A comprehensive backend API system for validating and processing screen warranty claims for mobile devices, built with NestJS and MongoDB.

## 📋 Features

- ✅ **Warranty Validation**: IMEI/Fiscal number validation with device model verification
- ✅ **Device Registration**: Complete device registration with photo upload support (2-6 photos)
- ✅ **Claims Processing**: Complete warranty claim submission and tracking system
- ✅ **Email Notifications**: Automatic email notifications for device registration
- ✅ **Protocol Generation**: Automatic protocol number generation for claim tracking
- ✅ **Audit Logging**: Complete audit trail of all system operations
- ✅ **MongoDB Integration**: Scalable NoSQL database with proper schema design
- ✅ **Input Validation**: Comprehensive validation using class-validator
- ✅ **Unit Testing**: Comprehensive test coverage for all services and controllers

## 🚀 Quick Start with Docker (Recommended)

### Prerequisites
- Docker and Docker Compose installed on your system
- Git (to clone the repository)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd starshield-guarantee

# Copy environment variables
cp .env .env
```

### 2. Configure Environment Variables
Edit the `.env` file with your specific configuration:

```bash
# Required: Update these values
MONGO_ROOT_PASSWORD=your_secure_password_here
GMAIL_USER=your_email@gmail.com
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# Optional: SMTP fallback
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 3. Start the Application
```bash
# Build and start all services
docker-compose up -d

# Check if services are running
docker-compose ps

# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f mongodb
```

### 4. Test the API
The API will be available at `http://localhost:3000`

```bash
# Health check
curl http://localhost:3000

# Test device registration
curl -X POST http://localhost:3000/warranty/register \
  -H "Content-Type: application/json" \
  -d '{
    "imei": "123456789012345",
    "fiscalNumber": "NF123456789",
    "model": "iPhone 15 Pro",
    "brand": "Apple",
    "purchaseDate": "2024-01-15T00:00:00.000Z",
    "ownerCpfCnpj": "12345678901",
    "ownerName": "João Silva",
    "ownerEmail": "joao.silva@email.com",
    "ownerPhone": "+5511999999999",
    "photos": ["photo1.jpg", "photo2.jpg"]
  }'
```

### 5. Stop the Application
```bash
# Stop services
docker-compose down

# Stop and remove volumes (⚠️ This will delete all data)
docker-compose down -v
```

## 🛠️ Manual Installation (Alternative)

If you prefer to run without Docker:

### Prerequisites
- Node.js 18+ 
- MongoDB 7.0+
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env .env
# Edit .env with your MongoDB connection and email settings

# Build the application
npm run build

# Start in development mode
npm run start:dev

# Start in production mode
npm run start:prod
```

### Run Tests
```bash
# Unit tests
npm run test

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## 📂 Project Structure

```
src/
├── config/              # Configuration files
├── modules/
│   ├── warranty/        # Warranty validation and device registration
│   ├── claims/          # Claims processing
│   └── email/          # Email services
├── schemas/            # MongoDB schemas
│   ├── device.schema.ts
│   ├── warranty.schema.ts
│   ├── claim.schema.ts
│   ├── user.schema.ts
│   └── audit-log.schema.ts
├── app.module.ts       # Main application module
└── main.ts            # Application entry point
```

## 🐳 Docker Services

The Docker Compose setup includes:

- **MongoDB 7.0**: Primary database with persistent storage
- **NestJS App**: Main application server
- **Persistent Volumes**: Data persistence between container restarts
- **Network Isolation**: Secure communication between services

### Docker Commands Reference

```bash
# View service status
docker-compose ps

# View logs
docker-compose logs -f [service_name]

# Execute commands in containers
docker-compose exec app npm run test
docker-compose exec mongodb mongosh

# Update and rebuild
docker-compose build --no-cache
docker-compose up -d

# Database backup (example)
docker-compose exec mongodb mongodump --out /data/backup

# Scale services (if needed)
docker-compose up -d --scale app=2
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Application environment | No | `production` |
| `PORT` | Application port | No | `3000` |
| `DATABASE_URL` | MongoDB connection string | Yes | - |
| `GMAIL_CLIENT_ID` | Gmail API client ID | No | - |
| `GMAIL_CLIENT_SECRET` | Gmail API client secret | No | - |
| `GMAIL_REFRESH_TOKEN` | Gmail API refresh token | No | - |
| `GMAIL_USER` | Gmail account email | No | - |
| `SMTP_HOST` | SMTP server host | No | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | No | `587` |
| `SMTP_USER` | SMTP username | No | - |
| `SMTP_PASS` | SMTP password | No | - |

### Email Configuration

The system supports two email methods:

1. **Gmail API** (Recommended): More reliable, requires OAuth2 setup
2. **SMTP**: Fallback method, uses app passwords

For Gmail API setup, follow the [Google API Documentation](https://developers.google.com/gmail/api/quickstart).

## 📚 API Documentation

Comprehensive API documentation is available in [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md).

### Key Endpoints

- `POST /warranty/validate` - Validate device warranty
- `POST /warranty/register` - Register new device (triggers email)
- `POST /claims` - Submit warranty claim
- `GET /claims/protocol/:protocolNumber` - Get claim by protocol
- `GET /claims/damage-types` - Get available damage types

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test warranty.service.spec.ts
```

Test files are located alongside source files with `.spec.ts` extension.

## 🔒 Security

- Non-root user in Docker container
- Environment variable validation
- Input sanitization with class-validator
- Audit logging for all operations
- Secure MongoDB configuration

## 📈 Monitoring and Logs

```bash
# Application logs
docker-compose logs -f app

# Database logs  
docker-compose logs -f mongodb

# Follow all logs
docker-compose logs -f

# Log rotation (in production)
docker-compose logs --tail=100 app
```

## 🚀 Production Deployment

1. **Security**: Update all default passwords in `.env`
2. **SSL**: Configure reverse proxy (nginx) with SSL certificates
3. **Backup**: Set up automated MongoDB backups
4. **Monitoring**: Implement health checks and monitoring
5. **Scaling**: Use Docker Swarm or Kubernetes for scaling

## 📞 Support

For technical support or questions:
- Check the [API Documentation](./API_DOCUMENTATION.md)
- Review the test files for usage examples
- Check Docker logs for troubleshooting

## 📄 License

This project is licensed under the MIT License.
