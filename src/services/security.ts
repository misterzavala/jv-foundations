// Security Service for HMAC request signing and validation
// Ensures secure communication between N8N workflows and the platform

import crypto from 'crypto'

export class SecurityService {
  private readonly algorithm = 'sha256'
  private readonly encoding = 'hex'

  /**
   * Generate HMAC signature for request
   */
  generateHMAC(payload: string, secret: string): string {
    const hmac = crypto.createHmac(this.algorithm, secret)
    hmac.update(payload, 'utf8')
    return hmac.digest(this.encoding)
  }

  /**
   * Verify HMAC signature
   */
  verifyHMAC(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateHMAC(payload, secret)
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, this.encoding),
      Buffer.from(expectedSignature, this.encoding)
    )
  }

  /**
   * Generate secure webhook signature header
   */
  generateWebhookSignature(payload: string, secret: string, timestamp?: number): {
    signature: string
    timestamp: number
    header: string
  } {
    const ts = timestamp || Math.floor(Date.now() / 1000)
    const signaturePayload = `${ts}.${payload}`
    const signature = this.generateHMAC(signaturePayload, secret)
    
    return {
      signature,
      timestamp: ts,
      header: `t=${ts},v1=${signature}`
    }
  }

  /**
   * Verify webhook signature with timestamp validation
   */
  verifyWebhookSignature(
    payload: string,
    signatureHeader: string,
    secret: string,
    toleranceSeconds = 300 // 5 minutes
  ): boolean {
    try {
      const elements = signatureHeader.split(',')
      let timestamp: number | null = null
      let signature: string | null = null

      for (const element of elements) {
        const [key, value] = element.split('=')
        if (key === 't') {
          timestamp = parseInt(value, 10)
        } else if (key === 'v1') {
          signature = value
        }
      }

      if (!timestamp || !signature) {
        return false
      }

      // Check timestamp tolerance
      const now = Math.floor(Date.now() / 1000)
      if (Math.abs(now - timestamp) > toleranceSeconds) {
        return false
      }

      // Verify signature
      const signaturePayload = `${timestamp}.${payload}`
      return this.verifyHMAC(signaturePayload, signature, secret)

    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return false
    }
  }

  /**
   * Generate secure API key
   */
  generateAPIKey(length = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * Generate secure random string
   */
  generateSecureRandom(length = 16): string {
    return crypto.randomBytes(length).toString('base64url')
  }

  /**
   * Hash sensitive data for storage
   */
  hashSensitiveData(data: string, salt?: string): { hash: string; salt: string } {
    const generatedSalt = salt || crypto.randomBytes(16).toString('hex')
    const hash = crypto.pbkdf2Sync(data, generatedSalt, 10000, 64, 'sha512').toString('hex')
    
    return { hash, salt: generatedSalt }
  }

  /**
   * Verify hashed data
   */
  verifyHashedData(data: string, hash: string, salt: string): boolean {
    const verifyHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex')
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'))
  }

  /**
   * Encrypt sensitive data
   */
  encryptData(data: string, key: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher('aes-256-cbc', key)
    
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    return {
      encrypted,
      iv: iv.toString('hex')
    }
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData: string, key: string, iv: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', key)
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }

  /**
   * Rate limiting check (simple in-memory implementation)
   */
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>()

  checkRateLimit(
    identifier: string, 
    maxRequests = 100, 
    windowMinutes = 15
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const windowMs = windowMinutes * 60 * 1000
    const resetTime = now + windowMs

    const existing = this.rateLimitStore.get(identifier)

    if (!existing || now > existing.resetTime) {
      // New window or expired
      this.rateLimitStore.set(identifier, { count: 1, resetTime })
      return { allowed: true, remaining: maxRequests - 1, resetTime }
    }

    if (existing.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetTime: existing.resetTime }
    }

    // Increment counter
    existing.count++
    this.rateLimitStore.set(identifier, existing)

    return { 
      allowed: true, 
      remaining: maxRequests - existing.count, 
      resetTime: existing.resetTime 
    }
  }

  /**
   * Clean up expired rate limit entries
   */
  cleanupRateLimit(): void {
    const now = Date.now()
    for (const [key, value] of this.rateLimitStore.entries()) {
      if (now > value.resetTime) {
        this.rateLimitStore.delete(key)
      }
    }
  }

  /**
   * Validate request signature middleware
   */
  validateRequestSignature = (secret: string) => {
    return (req: Request): boolean => {
      try {
        const signature = req.headers.get('X-Signature')
        const timestamp = req.headers.get('X-Timestamp')
        
        if (!signature || !timestamp) {
          return false
        }

        // Check timestamp (prevent replay attacks)
        const requestTime = parseInt(timestamp, 10)
        const now = Math.floor(Date.now() / 1000)
        
        if (Math.abs(now - requestTime) > 300) { // 5 minutes tolerance
          return false
        }

        // Verify signature
        const payload = JSON.stringify(req.body)
        const expectedSignature = this.generateHMAC(`${timestamp}.${payload}`, secret)
        
        return crypto.timingSafeEqual(
          Buffer.from(signature, 'hex'),
          Buffer.from(expectedSignature, 'hex')
        )

      } catch (error) {
        console.error('Request signature validation failed:', error)
        return false
      }
    }
  }

  /**
   * Generate request headers with HMAC signature
   */
  generateRequestHeaders(
    payload: string,
    secret: string,
    additionalHeaders: Record<string, string> = {}
  ): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = this.generateHMAC(`${timestamp}.${payload}`, secret)

    return {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp.toString(),
      'X-Signature': signature,
      'User-Agent': 'Zavala-AI-Platform/1.0',
      ...additionalHeaders
    }
  }

  /**
   * Secure token generation for API access
   */
  generateAccessToken(payload: Record<string, any>, secret: string, expiresIn = 3600): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    }

    const now = Math.floor(Date.now() / 1000)
    const tokenPayload = {
      ...payload,
      iat: now,
      exp: now + expiresIn
    }

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
    const encodedPayload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url')
    
    const signature = this.generateHMAC(`${encodedHeader}.${encodedPayload}`, secret)
    
    return `${encodedHeader}.${encodedPayload}.${signature}`
  }

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token: string, secret: string): { valid: boolean; payload?: any; error?: string } {
    try {
      const [encodedHeader, encodedPayload, signature] = token.split('.')
      
      if (!encodedHeader || !encodedPayload || !signature) {
        return { valid: false, error: 'Invalid token format' }
      }

      // Verify signature
      const expectedSignature = this.generateHMAC(`${encodedHeader}.${encodedPayload}`, secret)
      
      if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
        return { valid: false, error: 'Invalid signature' }
      }

      // Decode payload
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString())
      
      // Check expiration
      const now = Math.floor(Date.now() / 1000)
      if (payload.exp && now > payload.exp) {
        return { valid: false, error: 'Token expired' }
      }

      return { valid: true, payload }

    } catch (error) {
      return { valid: false, error: 'Token verification failed' }
    }
  }

  /**
   * Sanitize input to prevent injection attacks
   */
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['";]/g, '') // Remove potential SQL injection characters
      .trim()
  }

  /**
   * Generate secure webhook endpoint URL
   */
  generateWebhookURL(baseUrl: string, workflowType: string, secret: string): string {
    const token = this.generateSecureRandom()
    const signature = this.generateHMAC(`${workflowType}.${token}`, secret)
    
    return `${baseUrl}/webhook/${workflowType}?token=${token}&sig=${signature}`
  }

  /**
   * Validate webhook URL
   */
  validateWebhookURL(url: string, workflowType: string, secret: string): boolean {
    try {
      const urlObj = new URL(url)
      const token = urlObj.searchParams.get('token')
      const signature = urlObj.searchParams.get('sig')
      
      if (!token || !signature) {
        return false
      }

      const expectedSignature = this.generateHMAC(`${workflowType}.${token}`, secret)
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )

    } catch (error) {
      return false
    }
  }
}

// Export singleton instance
export const securityService = new SecurityService()

// Middleware for Next.js API routes
export function withSecurity(handler: Function, secret: string) {
  return async (req: Request) => {
    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown'
    const rateLimit = securityService.checkRateLimit(clientIP, 100, 15)
    
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { 
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetTime.toString()
          }
        }
      )
    }

    // Signature validation
    const validator = securityService.validateRequestSignature(secret)
    if (!validator(req)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request signature' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Call the actual handler
    return handler(req)
  }
}