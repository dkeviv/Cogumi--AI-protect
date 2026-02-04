/**
 * URL Security Validation
 * 
 * Protects against SSRF attacks by validating URLs before making requests.
 * Blocks private/internal/loopback addresses and enforces protocol restrictions.
 */

import { URL } from 'url';

/**
 * Check if an IP address is private, loopback, or link-local
 */
function isPrivateIP(ip: string): boolean {
  // Remove IPv6 prefix if present
  const cleanIP = ip.replace(/^\[|]$/g, '');
  
  // Loopback addresses
  if (cleanIP === 'localhost' || cleanIP === '127.0.0.1' || cleanIP === '::1') {
    return true;
  }
  
  // IPv4 private ranges
  const ipv4Patterns = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^127\./,                   // 127.0.0.0/8 (loopback)
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
    /^0\.0\.0\.0$/,             // 0.0.0.0
    /^255\.255\.255\.255$/,     // Broadcast
  ];
  
  for (const pattern of ipv4Patterns) {
    if (pattern.test(cleanIP)) {
      return true;
    }
  }
  
  // IPv6 private/special ranges
  const ipv6Patterns = [
    /^::1$/,                    // Loopback
    /^::/,                      // Unspecified
    /^fc00:/,                   // Unique local addresses
    /^fd00:/,                   // Unique local addresses
    /^fe80:/,                   // Link-local
    /^ff00:/,                   // Multicast
  ];
  
  for (const pattern of ipv6Patterns) {
    if (pattern.test(cleanIP.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

/**
 * Validate URL for SSRF protection
 * 
 * @param urlString - The URL to validate
 * @param options - Validation options
 * @returns Validation result with error message if invalid
 */
export function validateAgentUrl(
  urlString: string,
  options: {
    allowLocalhost?: boolean; // Only true in development
    requireHttps?: boolean;   // Require HTTPS in production
  } = {}
): { valid: boolean; error?: string; url?: URL } {
  // Parse URL
  let url: URL;
  try {
    url = new URL(urlString);
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
  
  // Protocol check - only allow HTTP(S)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      valid: false,
      error: `Invalid protocol: ${url.protocol}. Only http: and https: are allowed.`,
    };
  }
  
  // Require HTTPS in production (unless explicitly allowing HTTP for dev)
  if (options.requireHttps && url.protocol !== 'https:') {
    return {
      valid: false,
      error: 'HTTPS required for production agent URLs',
    };
  }
  
  // Check for private/internal IPs (unless explicitly allowed for localhost dev)
  if (!options.allowLocalhost && isPrivateIP(url.hostname)) {
    return {
      valid: false,
      error: `Private/internal IP addresses are not allowed: ${url.hostname}`,
    };
  }
  
  // Block localhost/127.0.0.1 unless explicitly allowed
  if (!options.allowLocalhost) {
    const localhostPatterns = [
      'localhost',
      '127.0.0.1',
      '::1',
      '0.0.0.0',
    ];
    
    if (localhostPatterns.includes(url.hostname.toLowerCase())) {
      return {
        valid: false,
        error: `Localhost addresses are not allowed in production: ${url.hostname}`,
      };
    }
  }
  
  // Block common cloud metadata endpoints
  const metadataEndpoints = [
    '169.254.169.254',  // AWS, Azure, GCP metadata
    'metadata.google.internal',
    'metadata.azure.com',
  ];
  
  if (metadataEndpoints.includes(url.hostname.toLowerCase())) {
    return {
      valid: false,
      error: `Cloud metadata endpoints are not allowed: ${url.hostname}`,
    };
  }
  
  // Success
  return { valid: true, url };
}

/**
 * Get validation options based on environment
 */
export function getUrlValidationOptions(): {
  allowLocalhost: boolean;
  requireHttps: boolean;
} {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    allowLocalhost: isDevelopment || process.env.ALLOW_LOCALHOST_AGENT === 'true',
    requireHttps: !isDevelopment && process.env.REQUIRE_HTTPS_AGENT !== 'false',
  };
}
