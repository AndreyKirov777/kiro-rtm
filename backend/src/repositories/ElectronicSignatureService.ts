import { Pool } from 'pg';
import { createHmac } from 'crypto';
import { ElectronicSignature } from '../types';
import { AuditService } from './AuditService';

/**
 * ElectronicSignatureService - Manages tamper-evident electronic signatures
 * 
 * This service provides electronic signature capture and verification with
 * HMAC-SHA256 hashing for tamper detection. Signatures are immutable and
 * non-repudiable once created.
 * 
 * **Validates: Requirements 21.1-21.5**
 */
export class ElectronicSignatureService {
  private readonly SECRET_KEY: string;

  constructor(
    private pool: Pool,
    private auditService: AuditService,
    secretKey?: string
  ) {
    // Use provided secret key or fall back to environment variable
    this.SECRET_KEY = secretKey || process.env.SIGNATURE_SECRET_KEY || 'dev-secret-key';
    
    if (this.SECRET_KEY === 'dev-secret-key' && process.env.NODE_ENV === 'production') {
      throw new Error('SIGNATURE_SECRET_KEY must be set in production environment');
    }
  }

  /**
   * Compute HMAC-SHA256 hash for signature data
   * 
   * **Validates: Requirements 21.3**
   * 
   * @param userId - ID of the user signing
   * @param timestamp - Timestamp of the signature
   * @param requirementId - ID of the requirement being signed
   * @param meaning - Meaning of the signature
   * @returns HMAC-SHA256 hash
   */
  private computeSignatureHash(
    userId: string,
    timestamp: Date,
    requirementId: string,
    meaning: string
  ): string {
    const data = `${userId}|${timestamp.toISOString()}|${requirementId}|${meaning}`;
    const hmac = createHmac('sha256', this.SECRET_KEY);
    hmac.update(data);
    return hmac.digest('hex');
  }

  /**
   * Create an electronic signature
   * 
   * **Validates: Requirements 21.1-21.4**
   * 
   * @param requirementId - ID of the requirement being signed
   * @param userId - ID of the user signing
   * @param signatureMeaning - Meaning of the signature (e.g., "Approved for implementation")
   * @returns Created electronic signature
   */
  async createSignature(
    requirementId: string,
    userId: string,
    signatureMeaning: string
  ): Promise<ElectronicSignature> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify requirement exists
      const reqResult = await client.query(
        'SELECT id FROM requirements WHERE id = $1',
        [requirementId]
      );

      if (reqResult.rows.length === 0) {
        throw new Error(`Requirement ${requirementId} not found`);
      }

      // Create timestamp
      const timestamp = new Date();

      // Compute tamper-evident hash
      const signatureHash = this.computeSignatureHash(
        userId,
        timestamp,
        requirementId,
        signatureMeaning
      );

      // Insert signature
      const result = await client.query(
        `INSERT INTO electronic_signatures (
          requirement_id, user_id, signature_meaning, timestamp, signature_hash
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING 
          id, requirement_id as "requirementId", user_id as "userId",
          signature_meaning as "signatureMeaning", timestamp, signature_hash as "signatureHash"`,
        [requirementId, userId, signatureMeaning, timestamp, signatureHash]
      );

      const signature = result.rows[0];

      // Create audit entry
      await this.auditService.createAuditEntry({
        actorId: userId,
        actorType: 'user',
        entityType: 'requirement',
        entityId: requirementId,
        action: 'electronic_signature',
        changeDescription: `Electronic signature captured: ${signatureMeaning}`,
        previousValue: null,
        newValue: {
          signatureId: signature.id,
          meaning: signatureMeaning,
          timestamp: timestamp.toISOString(),
        },
      });

      await client.query('COMMIT');

      return signature;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verify an electronic signature
   * 
   * **Validates: Requirements 21.3, 21.5**
   * 
   * @param signatureId - ID of the signature to verify
   * @returns true if signature is valid, false if tampered
   */
  async verifySignature(signatureId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 
        id, requirement_id as "requirementId", user_id as "userId",
        signature_meaning as "signatureMeaning", timestamp, signature_hash as "signatureHash"
      FROM electronic_signatures
      WHERE id = $1`,
      [signatureId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Signature ${signatureId} not found`);
    }

    const signature = result.rows[0];

    // Recompute hash
    const expectedHash = this.computeSignatureHash(
      signature.userId,
      signature.timestamp,
      signature.requirementId,
      signature.signatureMeaning
    );

    // Compare with stored hash
    return signature.signatureHash === expectedHash;
  }

  /**
   * Get all signatures for a requirement
   * 
   * @param requirementId - ID of the requirement
   * @returns Array of electronic signatures
   */
  async getSignaturesForRequirement(
    requirementId: string
  ): Promise<ElectronicSignature[]> {
    const result = await this.pool.query(
      `SELECT 
        id, requirement_id as "requirementId", user_id as "userId",
        signature_meaning as "signatureMeaning", timestamp, signature_hash as "signatureHash"
      FROM electronic_signatures
      WHERE requirement_id = $1
      ORDER BY timestamp DESC`,
      [requirementId]
    );

    return result.rows;
  }

  /**
   * Attempt to update a signature (should always fail due to immutability)
   * 
   * This method is provided for testing immutability constraints.
   * It should always throw an error due to database constraints.
   * 
   * **Validates: Requirements 21.4**
   * 
   * @param signatureId - Signature ID
   * @param updates - Attempted updates
   * @throws Error - Always throws due to immutability constraint
   */
  async attemptUpdate(
    signatureId: string,
    updates: Partial<ElectronicSignature>
  ): Promise<void> {
    // This should fail due to database trigger or constraint
    await this.pool.query(
      `UPDATE electronic_signatures 
       SET signature_meaning = $1
       WHERE id = $2`,
      [updates.signatureMeaning || 'attempted update', signatureId]
    );
  }

  /**
   * Attempt to delete a signature (should always fail due to immutability)
   * 
   * This method is provided for testing immutability constraints.
   * It should always throw an error due to database constraints.
   * 
   * **Validates: Requirements 21.4**
   * 
   * @param signatureId - Signature ID
   * @throws Error - Always throws due to immutability constraint
   */
  async attemptDelete(signatureId: string): Promise<void> {
    // This should fail due to database trigger or constraint
    await this.pool.query(
      'DELETE FROM electronic_signatures WHERE id = $1',
      [signatureId]
    );
  }
}
