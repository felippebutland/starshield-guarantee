const API_BASE_URL = 'http://localhost:3000';

const testBase64Photos = async () => {
  const { default: fetch } = await import('node-fetch');
  console.log('🧪 Testing Base64 Photos in Device Registration...\n');

  // Sample base64 encoded 1x1 pixel PNG image
  const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77wgAAAABJRU5ErkJggg==';

  const deviceData = {
    imei: '999888777666555',
    fiscalNumber: 'NF999888777',
    model: 'Galaxy S24 Ultra',
    brand: 'Samsung',
    purchaseDate: '2024-01-20T00:00:00.000Z',
    ownerCpfCnpj: '99988877766',
    ownerName: 'Maria Santos',
    ownerEmail: 'maria.santos@email.com',
    ownerPhone: '+5511888777666',
    photos: [
      base64Image,
      'https://example.com/device-photo2.jpg'
    ]
  };

  try {
    console.log('📱 Registering device with base64 photo:', deviceData.model);
    console.log('📧 Email will be sent to:', deviceData.ownerEmail);
    console.log('🖼️  Photo formats:');
    console.log('  - Photo 1: Base64 encoded (length:', base64Image.length, 'chars)');
    console.log('  - Photo 2: URL');

    const response = await fetch(`${API_BASE_URL}/warranty/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deviceData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Registration failed:', errorData);
      return;
    }

    const result = await response.json();
    console.log('\n✅ Device registered successfully with base64 photos!');
    console.log('📋 Registration details:');
    console.log('  - Device ID:', result.device.id);
    console.log('  - IMEI:', result.device.imei);
    console.log('  - Model:', result.device.brand, result.device.model);
    console.log('  - Warranty ID:', result.warranty.id);
    console.log('  - Policy Number:', result.warranty.policyNumber);
    console.log('  - Email Sent:', result.emailSent ? '✅ Yes' : '❌ No');
    console.log('  - Message:', result.message);

    console.log('\n🎉 SUCCESS: Base64 photos are supported!');
    console.log('📝 You can send photos as:');
    console.log('  ✓ URLs (https://example.com/photo.jpg)');
    console.log('  ✓ File paths (./uploads/photo.jpg)');
    console.log('  ✓ Base64 encoded images (data:image/jpeg;base64,...)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running:');
      console.log('   npm run start:dev');
    }
  }
};

// Run the test
testBase64Photos();