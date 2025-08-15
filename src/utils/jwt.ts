// JWT Token Generation for N8N Webhook Authentication
// Using Web Crypto API for browser compatibility

/**
 * Generate a JWT token for N8N webhook authentication
 * Uses HS256 algorithm with the provided secret
 */
export async function generateJWT(secret: string, payload: Record<string, any> = {}): Promise<string> {
  // JWT Header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }

  // JWT Payload with default claims
  const now = Math.floor(Date.now() / 1000)
  const jwtPayload = {
    iat: now,  // Issued at
    exp: now + 300, // Expires in 5 minutes
    iss: 'zavala-ai-content-engine', // Issuer
    ...payload
  }

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload))

  // Create signature
  const data = `${encodedHeader}.${encodedPayload}`
  const signature = await createHMAC(secret, data)

  return `${data}.${signature}`
}

/**
 * Create HMAC-SHA256 signature using Web Crypto API
 */
async function createHMAC(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  
  // Import the secret key
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  // Sign the data
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  
  // Convert to base64url
  return base64UrlEncode(new Uint8Array(signature))
}

/**
 * Base64URL encode (RFC 4648 Section 5)
 */
function base64UrlEncode(input: string | Uint8Array): string {
  let str: string
  
  if (typeof input === 'string') {
    str = btoa(unescape(encodeURIComponent(input)))
  } else {
    // Convert Uint8Array to string
    str = btoa(String.fromCharCode(...input))
  }
  
  return str
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Test JWT generation (for development/testing)
 */
export async function testJWT(): Promise<void> {
  const secret = 'test-secret'
  const token = await generateJWT(secret, { test: true })
  console.log('Generated JWT:', token)
  
  // You can verify this token at jwt.io
  const parts = token.split('.')
  console.log('Header:', JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'))))
  console.log('Payload:', JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))))
}