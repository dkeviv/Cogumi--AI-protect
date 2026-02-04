/**
 * Test SSRF Protection
 */

import { validateAgentUrl } from '../packages/shared/src/url-security';

console.log('🔒 Testing SSRF Protection\n');

const testCases = [
  // Should FAIL - Cloud metadata
  { url: 'http://169.254.169.254/latest/meta-data/', expected: false, reason: 'AWS metadata endpoint' },
  { url: 'http://metadata.google.internal/', expected: false, reason: 'GCP metadata endpoint' },
  
  // Should FAIL - Private IPs
  { url: 'http://10.0.0.1/admin', expected: false, reason: 'Private IP 10.x' },
  { url: 'http://192.168.1.100:8080/api', expected: false, reason: 'Private IP 192.168.x' },
  { url: 'http://127.0.0.1:3000/', expected: false, reason: 'Loopback (production mode)' },
  
  // Should FAIL - Non-HTTP protocols  
  { url: 'file:///etc/passwd', expected: false, reason: 'File protocol' },
  
  // Should PASS - Legitimate URLs
  { url: 'https://api.example.com/agent', expected: true, reason: 'Legitimate HTTPS' },
  { url: 'http://public-ip.example.com/webhook', expected: true, reason: 'Legitimate HTTP' },
];

let passed = 0;
let failed = 0;

testCases.forEach(({ url, expected, reason }) => {
  const result = validateAgentUrl(url, { 
    allowLocalhost: false, // Production mode
    requireHttps: false,
    allowedProtocols: ['http:', 'https:']
  });
  
  const success = result.valid === expected;
  const icon = success ? '✅' : '❌';
  const status = expected ? 'ALLOW' : 'BLOCK';
  
  console.log(`${icon} ${status}: ${url}`);
  console.log(`   Reason: ${reason}`);
  
  if (!success) {
    console.log(`   ⚠️  Expected ${expected ? 'valid' : 'invalid'}, got ${result.valid ? 'valid' : 'invalid'}`);
    if (result.error) console.log(`   Error: ${result.error}`);
    failed++;
  } else {
    if (result.error) console.log(`   Blocked: ${result.error}`);
    passed++;
  }
  console.log('');
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed === 0) {
  console.log('✅ All SSRF protection tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed');
  process.exit(1);
}
