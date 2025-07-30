/* eslint-disable comma-dangle */
/* eslint-disable no-undef */
// Create this file as debug-auth.js to test your authentication

// Test function to check if auth is working
async function testAuth() {
  console.log('🔍 Testing authentication...');

  // 1. Check if token exists in localStorage
  let token = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    // eslint-disable-next-line no-undef
    token = window.localStorage.getItem('authToken');
  }
  console.log('Token from localStorage:', token ? 'Found' : 'Not found');

  if (!token) {
    console.log('❌ No token found. Please login first.');
    return;
  }

  // 2. Test the /me endpoint
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));

    const data = await response.json();
    console.log('Response data:', data);

    if (response.ok) {
      console.log('✅ Auth test successful!');
      console.log('User data:', data.data.user);
    } else {
      console.log('❌ Auth test failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Network error:', error);
  }
}

// Test function to check API connectivity
async function testApiConnectivity() {
  console.log('🔍 Testing API connectivity...');

  try {
    const response = await fetch('/health');
    const data = await response.json();
    console.log('Health check:', data);
  } catch (error) {
    console.log('❌ API not reachable:', error);
  }
}

// Test function to check environment variables
function testEnvironment() {
  console.log('🔍 Testing environment...');
  console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
  if (typeof window !== 'undefined') {
    console.log('Current URL:', window.location.origin);
  } else {
    console.log('Current URL: Not available (not running in browser)');
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚗 Starting Ridges Automotors Auth Debug...');
  testEnvironment();
  await testApiConnectivity();
  await testAuth();
}

// Export for use in console
if (typeof window !== 'undefined') {
  window.debugAuth = {
    testAuth,
    testApiConnectivity,
    testEnvironment,
    runAllTests,
  };

  console.log(
    '🔧 Debug tools loaded! Run debugAuth.runAllTests() in the console to test authentication.'
  );
}
