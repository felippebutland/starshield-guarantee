const API_BASE_URL = 'http://127.0.0.1:3000';

const testDeviceRegistration = async () => {
  const { default: fetch } = await import('node-fetch');
  console.log('🧪 Testing Device Registration with Email...\n');

  const deviceData = {
    imei: '1234567890123451',
    fiscalNumber: 'NF1234561789',
    model: 'iPhone 15 Pro',
    brand: 'Apple',
    purchaseDate: '2024-01-15T00:00:00.000Z',
    ownerCpfCnpj: '12345678901',
    ownerName: 'João Silva',
    ownerEmail: 'butlandfelippe@gmail.com',
    ownerPhone: '+5511999999999',
    photos: [
      'https://example.com/device-photo1.jpg',
      'https://example.com/device-photo2.jpg'
    ],
    termsOfUseBase64: 'ZGVjbGFybyBxdWUgYWNlaXRvcyBvcyB0ZXJtb3MgZGUgdXNvIGRvIHNlcnZpw6dvLiA=' // "declaro que aceitos os termos de uso do serviço."
  };

  try {
    console.log('📱 Registering device:', deviceData.model);
    console.log('📧 Email will be sent to:', deviceData.ownerEmail);

    const response = await fetch(`${API_BASE_URL}/warranty/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deviceData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch((e) => {
        console.error('error', e)
      });
      console.error('❌ Registration failed:', errorData);
      return;
    }

    const result = await response.json();
    console.log('✅ Device registered successfully!');
    console.log('📋 Registration details:');
    console.log('  - Device ID:', result.device.id);
    console.log('  - IMEI:', result.device.imei);
    console.log('  - Model:', result.device.brand, result.device.model);
    console.log('  - Warranty ID:', result.warranty.id);
    console.log('  - Policy Number:', result.warranty.policyNumber);
    console.log('  - Warranty Period:', new Date(result.warranty.startDate).toLocaleDateString(), 'to', new Date(result.warranty.endDate).toLocaleDateString());
    console.log('  - Email Sent:', result.emailSent ? '✅ Yes' : '❌ No');
    console.log('  - Message:', result.message);

    console.log('\n📝 Note: Check your email configuration in environment variables:');
    console.log('  - GMAIL_CLIENT_ID');
    console.log('  - GMAIL_CLIENT_SECRET');
    console.log('  - GMAIL_REFRESH_TOKEN');
    console.log('  - GMAIL_USER');
    console.log('  Or fallback SMTP settings:');
    console.log('  - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');

  } catch (error) {
    console.error('❌ Test failed:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running:');
      console.log('   npm run start:dev');
    }
  }
};

// Run the test
testDeviceRegistration();