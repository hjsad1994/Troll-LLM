/**
 * Test script for API key sk-1frbsdAwvlRT-TY5J-I8ZA
 * Endpoint: https://llm-proxy.app.all-hands.dev
 * Model: claude-opus-4-5-20251101
 * Provider: anthropic
 */

const https = require('https');

const API_KEY = 'sk-1frbsdAwvlRT-TY5J-I8ZA';
const ENDPOINT = 'https://llm-proxy.app.all-hands.dev';
const MODEL = 'claude-opus-4-5-20251101';

async function testAnthropicKey() {
  console.log('🔑 Testing API Key:', API_KEY);
  console.log('🌐 Endpoint:', ENDPOINT);
  console.log('🤖 Model:', MODEL);
  console.log('📦 Provider: anthropic');
  console.log('-----------------------------------\n');

  const url = new URL('/v1/chat/completions', ENDPOINT);
  
  const requestData = JSON.stringify({
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: 'Hello! Please respond with a simple greeting to confirm the connection is working.'
      }
    ],
    max_tokens: 100,
    temperature: 0.7
  });

  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Length': Buffer.byteLength(requestData)
    }
  };

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const req = https.request(options, (res) => {
      let data = '';
      
      console.log(`📊 Status Code: ${res.statusCode}`);
      console.log(`📋 Headers:`, JSON.stringify(res.headers, null, 2));
      console.log('-----------------------------------\n');

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;
        console.log(`⏱️  Response Time: ${duration}ms\n`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log('✅ Response Body (JSON):');
          console.log(JSON.stringify(jsonData, null, 2));
          
          if (res.statusCode === 200) {
            console.log('\n🎉 SUCCESS! API key is working with Anthropic provider!');
            if (jsonData.choices && jsonData.choices[0]) {
              console.log('\n💬 AI Response:');
              console.log(jsonData.choices[0].message.content);
            }
          } else {
            console.log(`\n⚠️  WARNING: Received non-200 status code: ${res.statusCode}`);
          }
          
          resolve({ success: res.statusCode === 200, data: jsonData, statusCode: res.statusCode });
        } catch (e) {
          console.log('📄 Response Body (Raw):');
          console.log(data);
          console.log('\n❌ Failed to parse JSON response');
          resolve({ success: false, error: 'Invalid JSON', raw: data, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request Error:', error.message);
      console.error('Stack:', error.stack);
      reject(error);
    });

    req.on('timeout', () => {
      console.error('⏰ Request Timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    // Set timeout to 30 seconds
    req.setTimeout(30000);

    // Send the request
    console.log('📤 Sending request...\n');
    req.write(requestData);
    req.end();
  });
}

// Run the test
testAnthropicKey()
  .then((result) => {
    console.log('\n-----------------------------------');
    console.log('🏁 Test Complete');
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n-----------------------------------');
    console.error('💥 Test Failed with Error:', error);
    process.exit(1);
  });
