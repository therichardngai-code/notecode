/**
 * AES-256-GCM Encryption Utility
 * Encrypts/decrypts sensitive data like API keys
 * Key stored in NOTECODE_ENCRYPTION_KEY env var
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits

/**
 * Get encryption key from environment
 * Key must be 32 bytes (256 bits) - can be hex encoded (64 chars) or base64
 */
function getEncryptionKey(): Buffer {
  const keyEnv = process.env.NOTECODE_ENCRYPTION_KEY;

  if (!keyEnv) {
    throw new Error('NOTECODE_ENCRYPTION_KEY environment variable not set');
  }

  // Try hex first (64 chars = 32 bytes)
  if (keyEnv.length === 64 && /^[0-9a-fA-F]+$/.test(keyEnv)) {
    return Buffer.from(keyEnv, 'hex');
  }

  // Try base64 (44 chars = 32 bytes)
  if (keyEnv.length === 44) {
    const buf = Buffer.from(keyEnv, 'base64');
    if (buf.length === 32) return buf;
  }

  // Try raw 32-byte string
  if (keyEnv.length === 32) {
    return Buffer.from(keyEnv, 'utf8');
  }

  throw new Error('NOTECODE_ENCRYPTION_KEY must be 32 bytes (64 hex chars, 44 base64 chars, or 32 raw chars)');
}

/**
 * Encrypt plaintext string
 * Returns: base64 encoded string (iv:ciphertext:authTag)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Format: iv:ciphertext:authTag (all base64)
  return `${iv.toString('base64')}:${ciphertext}:${authTag.toString('base64')}`;
}

/**
 * Decrypt encrypted string
 * Input: base64 encoded string (iv:ciphertext:authTag)
 */
export function decrypt(encrypted: string): string {
  const key = getEncryptionKey();

  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }

  const iv = Buffer.from(parts[0], 'base64');
  const ciphertext = parts[1];
  const authTag = Buffer.from(parts[2], 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

/**
 * Check if encryption key is configured
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.NOTECODE_ENCRYPTION_KEY;
}

/**
 * Generate a new random encryption key (hex format)
 * Use this to generate NOTECODE_ENCRYPTION_KEY value
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}
