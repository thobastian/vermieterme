import { createHmac, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const SECRET_KEY = process.env.TOTP_SECRET_KEY || 'vermieterme-2fa-secret-key-default';

// Generate a TOTP secret (base32 encoded)
export function generateTOTPSecret(): string {
  return randomBytes(10).toString('base32').replace(/=/g, '');
}

// Generate TOTP code
export function generateTOTP(secret: string, timestamp = Date.now()): string {
  const time = Math.floor(timestamp / 30000); // 30-second windows
  const key = Buffer.from(secret, 'base32');
  
  // Create HMAC-SHA1
  const hmac = createHmac('sha1', key);
  hmac.update(Buffer.from(time.toString(16).padStart(16, '0'), 'hex'));
  const digest = hmac.digest();
  
  // Dynamic truncation
  const offset = digest[digest.length - 1] & 0x0f;
  const code = (
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  ) % 1000000;
  
  return code.toString().padStart(6, '0');
}

// Verify TOTP code
export function verifyTOTP(secret: string, code: string, timestamp = Date.now()): boolean {
  const expectedCode = generateTOTP(secret, timestamp);
  return code === expectedCode;
}

// Encrypt TOTP secret
export function encryptTOTPSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(SECRET_KEY), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

// Decrypt TOTP secret
export function decryptTOTPSecret(encrypted: string): string {
  const [ivHex, authTagHex, encryptedHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encryptedData = Buffer.from(encryptedHex, 'hex');
  
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(SECRET_KEY), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  
  return decrypted.toString('utf8');
}

// Generate QR code URL for Google Authenticator
export function getTOTPQRCodeURL(email: string, secret: string, issuer = 'VermieterMe'): string {
  const encodedEmail = encodeURIComponent(email);
  const encodedSecret = encodeURIComponent(secret);
  return `otpauth://totp/${issuer}:${encodedEmail}?secret=${encodedSecret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

// Generate backup codes
export function generateBackupCodes(count = 5): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = randomBytes(4).toString('hex').toUpperCase().substring(0, 8);
    codes.push(code);
  }
  return codes;
}
