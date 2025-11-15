import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Encryption Service
 *
 * Provides AES-256-GCM encryption/decryption for sensitive data like:
 * - OAuth refresh tokens
 * - SMTP passwords
 * - API keys
 *
 * Security:
 * - AES-256-GCM (Galois/Counter Mode) provides both confidentiality and authenticity
 * - Unique IV (Initialization Vector) per encryption operation
 * - Authentication tag to detect tampering
 * - Encryption key stored in AWS Secrets Manager (fetched at runtime)
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16; // 128 bits
  private readonly keyLength = 32; // 256 bits

  /**
   * Encrypt sensitive data
   *
   * @param plaintext - Data to encrypt
   * @returns Encrypted string in format: IV:AuthTag:Ciphertext (hex-encoded)
   *
   * Example:
   * ```ts
   * const encrypted = await this.encryptionService.encrypt('my-secret-token');
   * // Returns: "a1b2c3d4e5f6...:<auth-tag>:<ciphertext>"
   * ```
   */
  async encrypt(plaintext: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();

      // Generate random IV (must be unique for each encryption)
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag (for GCM mode)
      const authTag = cipher.getAuthTag();

      // Return IV:AuthTag:Encrypted (all hex-encoded)
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`, error.stack);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   *
   * @param ciphertext - Encrypted string in format: IV:AuthTag:Ciphertext
   * @returns Decrypted plaintext
   *
   * Example:
   * ```ts
   * const decrypted = await this.encryptionService.decrypt(encrypted);
   * // Returns: "my-secret-token"
   * ```
   */
  async decrypt(ciphertext: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();

      // Split IV:AuthTag:Encrypted
      const parts = ciphertext.split(':');
      if (parts.length !== 3) {
        throw new Error(
          'Invalid ciphertext format (expected IV:AuthTag:Encrypted)',
        );
      }

      const [ivHex, authTagHex, encrypted] = parts;

      // Convert from hex
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`, error.stack);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Get encryption key from environment
   *
   * In development: Uses ENCRYPTION_KEY from .env
   * In production: Should use AWS Secrets Manager (via SecretsManagerService)
   *
   * @private
   */
  private async getEncryptionKey(): Promise<Buffer> {
    // Get key from environment (development)
    const keyHex = process.env.ENCRYPTION_KEY;

    if (!keyHex) {
      throw new Error(
        'ENCRYPTION_KEY not found in environment. ' +
          'Run: openssl rand -hex 32 > .env (add ENCRYPTION_KEY=<output>)',
      );
    }

    // Validate key length (must be 32 bytes = 64 hex characters)
    if (keyHex.length !== 64) {
      throw new Error(
        `Invalid ENCRYPTION_KEY length (expected 64 hex characters, got ${keyHex.length}). ` +
          'Run: openssl rand -hex 32',
      );
    }

    return Buffer.from(keyHex, 'hex');
  }

  /**
   * Generate a new encryption key (for setup/rotation)
   *
   * @returns 256-bit encryption key as hex string
   *
   * Example:
   * ```bash
   * # Generate new key
   * openssl rand -hex 32
   * ```
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate if a string is a valid encrypted format
   *
   * @param ciphertext - String to validate
   * @returns true if valid encrypted format, false otherwise
   */
  isValidEncryptedFormat(ciphertext: string): boolean {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      return false;
    }

    const [ivHex, authTagHex, encrypted] = parts;

    // Validate each part is valid hex
    const hexRegex = /^[0-9a-f]+$/i;
    return (
      hexRegex.test(ivHex) &&
      hexRegex.test(authTagHex) &&
      hexRegex.test(encrypted) &&
      ivHex.length === this.ivLength * 2 && // IV must be 16 bytes = 32 hex chars
      authTagHex.length === 32 // Auth tag is 16 bytes = 32 hex chars
    );
  }
}
