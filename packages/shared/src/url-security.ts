/**
 * URL Security Validation
 * 
 * Protects against SSRF attacks by validating agent URLs before making requests.
 * Blocks private IP ranges, cloud metadata endpoints, and non-HTTP(S) protocols.
 */

export interface UrlValidationOptions {
  allowLocalhost?: boolean;
  allowPrivateIPs?: boolean;
  requireHttps?: boolean;
  allowedProtocols?: string[];
}

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  securityNote?: string;
}

/**
 * Check if an IP address is private, loopback, or link-local
 */
function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
  const ipv4Patterns = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^127\./,                   // 127.0.0.0/8 (loopback)
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
    /^0\.0\.0\.0$/,             // Unspecified
    /^255\.255\.255\.255$/,     // Broadcast
  ];

  // IPv6 private ranges
  const ipv6Patterns = [
    /^::1$/,                    // Loopback
    /^fe80:/i,                  // Link-local
    /^fc00:/i,                  // Unique local address
    /^fd00:/i,                  // Unique local address
    /^ff00:/i,                  // Multicast
  ];

  // Check IPv4
  if (ipv4Patterns.some(pattern => pattern.test(ip))) {
    return true;
  }

  // Check IPv6
  if (ipv6Patterns.some(pattern => pattern.test(ip))) {
    return true;
  }

  return false;
}

/**
 * Cloud metadata endpoints that should be blocked
 */
const CLOUD_METADATA_HOSTS = [
  '169.254.169.254',           // AWS, Azure, GCP, DigitalOcean
  'metadata.google.internal',   // GCP
  'metadata.azure.com',         // Azure
];

/**
 * Get default validation options based on environment
 */
export function getUrlValidationOptions(): UrlValidationOptions {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    allowLocalhost: isDevelopment || process.env.ALLOW_LOCALHOST_AGENT === 'true',
    allowPrivateIPs: isDevelopment || process.env.ALLOW_PRIVATE_IPS_AGENT === 'true',
    requireHttps: process.env.REQUIRE_HTTPS_AGENT !== 'false' && !isDevelopment,
    allowedProtocols: ['http:', 'https:'],
  };
}

/**
 * Validate an agent URL for SSRF protection
 * 
 * @param urlString - The URL to validate
 * @param options - Validation options (defaults to environment-based config)
 * @returns Validation result with error details if invalid
 */
export function validateAgentUrl(
  urlString: string,
  options?: UrlValidationOptions
): UrlValidationResult {
  const opts = options || getUrlValidationOptions();

  // Parse URL
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format',
    };
  }

  // Check protocol
  if (!opts.allowedProtocols?.includes(url.protocol)) {
    return {
      valid: false,
      error: `Protocol ${url.protocol} not allowed. Only HTTP(S) is permitted.`,
      securityNote: 'This prevents file://, data://, and other non-HTTP protocol exploits',
    };
  }

  // Require HTTPS in production
  if (opts.requireHttps && url.protocol !== 'https:') {
    return {
      valid: false,
      error: 'HTTPS is required for agent URLs in production',
      securityNote: 'Set REQUIRE_HTTPS_AGENT=false to allow HTTP in non-production environments',
    };
  }

  // Extract hostname
  const hostname = url.hostname.toLowerCase();

  // Check for cloud metadata endpoints
  if (CLOUD_METADATA_HOSTS.includes(hostname)) {
    return {
      valid: false,
      error: 'Access to cloud metadata endpoints is not allowed',
      securityNote: 'This prevents credential theft via SSRF attacks',
    };
  }

  // Check for localhost/loopback
  const isLocalhost = hostname === 'localhost' || 
                      hostname === '127.0.0.1' || 
                      hostname.startsWith('127.') ||
                      hostname === '::1' ||
                      hostname === '[::1]';

  if (isLocalhost && !opts.allowLocalhost) {
    return {
      valid: false,
      error: 'Localhost URLs are not allowed in production',
      securityNote: 'Set ALLOW_LOCALHOST_AGENT=true in development if needed',
    };
  }

  // Check for private IP ranges
  // Strip brackets for IPv6
  const ipToCheck = hostname.replace(/^\[|\]$/g, '');
  
  if (isPrivateIP(ipToCheck) && !opts.allowPrivateIPs) {
    return {
      valid: false,
      error: 'Private IP addresses are not allowed',
      securityNote: 'This prevents SSRF attacks against internal services (10.x, 192.168.x, 172.16-31.x, link-local). Set ALLOW_PRIVATE_IPS_AGENT=true in development for Docker networks.',
    };
  }

  return { valid: true };
}
