import crypto from 'node:crypto';
import config from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const secretKey = Buffer.from(config.vercel.encryptionKey, 'hex');

if (secretKey.length !== 32) {
  throw new Error('Invalid VERCEL_ENCRYPTION_KEY: Must be a 64-character hex string (32 bytes).');
}

/**
 * Encrypts a plaintext string.
 * @param text The text to encrypt.
 * @returns A string containing the iv, auth tag, and encrypted content, separated by colons.
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, secretKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an encrypted string.
 * @param encryptedText The encrypted text, in "iv:authTag:content" format.
 * @returns The original plaintext string.
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format.');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, secretKey, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString('utf8');
}
