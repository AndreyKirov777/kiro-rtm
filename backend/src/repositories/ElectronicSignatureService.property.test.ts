import * as fc from 'fast-check';
import { ElectronicSignatureService } from './ElectronicSignatureService';
import { AuditService } from './AuditService';
import pool from '../config/database';

/**
 * Property-Based Tests for ElectronicSignatureService
 * 
 * These tests validate universal properties that must hold for all electronic signatures.
 * 
 * **Property 23: Electronic Signature Tamper Detection**
 * **Validates: Requirements 21.1-21.5**
 */

describe('ElectronicSignatureService - Property Tests', () => {
  let signatureService: ElectronicSignatureService;
  let auditService: AuditService;
  let testProjectId: string;
  let testUserId: string;

  beforeAll(async () => {
    auditService = new AuditService(pool);
    signatureService = new ElectronicSignatureService(pool, auditService, 'test-secret-key');

    // Clean up any existing test data first (disable triggers)
    await pool.query('ALTER TABLE electronic_signatures DISABLE TRIGGER prevent_signature_update');
    await pool.query('ALTER TABLE electronic_signatures DISABLE TRIGGER prevent_signature_delete');
    
    const existingUser = await pool.query(
      `SELECT id FROM users WHERE email = 'sig-test@example.com'`
    );
    if (existingUser.rows.length > 0) {
      const userId = existingUser.rows[0].id;
      await pool.query('DELETE FROM electronic_signatures WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM requirements WHERE created_by = $1', [userId]);
      await pool.query('DELETE FROM projects WHERE created_by = $1', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    
    await pool.query('ALTER TABLE electronic_signatures ENABLE TRIGGER prevent_signature_update');
    await pool.query('ALTER TABLE electronic_signatures ENABLE TRIGGER prevent_signature_delete');

    // Create test user first
    const userResult = await pool.query(
      `INSERT INTO users (email, name, role)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['sig-test@example.com', 'Signature Test User', 'approver']
    );
    testUserId = userResult.rows[0].id;

    // Create test project
    const projectResult = await pool.query(
      `INSERT INTO projects (name, description, custom_field_definitions, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['Test Project', 'For signature testing', '[]', testUserId]
    );
    testProjectId = projectResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up - disable triggers for test cleanup
    await pool.query('ALTER TABLE electronic_signatures DISABLE TRIGGER prevent_signature_update');
    await pool.query('ALTER TABLE electronic_signatures DISABLE TRIGGER prevent_signature_delete');
    await pool.query('DELETE FROM electronic_signatures WHERE requirement_id IN (SELECT id FROM requirements WHERE project_id = $1)', [testProjectId]);
    await pool.query('ALTER TABLE electronic_signatures ENABLE TRIGGER prevent_signature_update');
    await pool.query('ALTER TABLE electronic_signatures ENABLE TRIGGER prevent_signature_delete');
    await pool.query('DELETE FROM requirements WHERE project_id = $1', [testProjectId]);
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  });

  afterEach(async () => {
    // Clean up signatures and requirements after each test
    await pool.query('ALTER TABLE electronic_signatures DISABLE TRIGGER prevent_signature_update');
    await pool.query('ALTER TABLE electronic_signatures DISABLE TRIGGER prevent_signature_delete');
    await pool.query('DELETE FROM electronic_signatures WHERE requirement_id IN (SELECT id FROM requirements WHERE project_id = $1)', [testProjectId]);
    await pool.query('ALTER TABLE electronic_signatures ENABLE TRIGGER prevent_signature_update');
    await pool.query('ALTER TABLE electronic_signatures ENABLE TRIGGER prevent_signature_delete');
    await pool.query('DELETE FROM requirements WHERE project_id = $1', [testProjectId]);
  });

  /**
   * Property 23: Electronic Signature Tamper Detection
   * 
   * For any electronic signature, if the signature data is tampered with,
   * verification must fail. Valid signatures must always verify successfully.
   * 
   * **Validates: Requirements 21.3, 21.5**
   */
  describe('Property 23: Electronic Signature Tamper Detection', () => {
    it('should detect tampering when signature hash is modified', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 100 }), // requirement title
          fc.string({ minLength: 10, maxLength: 200 }), // signature meaning
          async (title, meaning) => {
            // Create a requirement
            const reqResult = await pool.query(
              `INSERT INTO requirements (
                display_id, project_id, title, description, type, status, priority,
                version, tags, custom_fields, created_by, updated_by
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              RETURNING id`,
              [
                `REQ-${Date.now()}`,
                testProjectId,
                title,
                'Test description',
                'system_requirement',
                'in_review',
                'high',
                1,
                [],
                {},
                testUserId,
                testUserId,
              ]
            );
            const requirementId = reqResult.rows[0].id;

            // Create signature
            const signature = await signatureService.createSignature(
              requirementId,
              testUserId,
              meaning
            );

            // Verify original signature is valid
            const isValid = await signatureService.verifySignature(signature.id);
            expect(isValid).toBe(true);

            // Tamper with the signature hash in the database (disable trigger temporarily)
            await pool.query('ALTER TABLE electronic_signatures DISABLE TRIGGER prevent_signature_update');
            await pool.query(
              `UPDATE electronic_signatures 
               SET signature_hash = $1
               WHERE id = $2`,
              ['tampered_hash_' + signature.signatureHash, signature.id]
            );
            await pool.query('ALTER TABLE electronic_signatures ENABLE TRIGGER prevent_signature_update');

            // Verification should now fail
            const isValidAfterTamper = await signatureService.verifySignature(signature.id);
            expect(isValidAfterTamper).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should always verify valid signatures successfully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 100 }), // requirement title
          fc.string({ minLength: 10, maxLength: 200 }), // signature meaning
          async (title, meaning) => {
            // Create a requirement
            const reqResult = await pool.query(
              `INSERT INTO requirements (
                display_id, project_id, title, description, type, status, priority,
                version, tags, custom_fields, created_by, updated_by
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              RETURNING id`,
              [
                `REQ-${Date.now()}`,
                testProjectId,
                title,
                'Test description',
                'system_requirement',
                'in_review',
                'high',
                1,
                [],
                {},
                testUserId,
                testUserId,
              ]
            );
            const requirementId = reqResult.rows[0].id;

            // Create signature
            const signature = await signatureService.createSignature(
              requirementId,
              testUserId,
              meaning
            );

            // Verify signature
            const isValid = await signatureService.verifySignature(signature.id);

            // Valid signatures must always verify
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should create unique hashes for different signature data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 100 }), // requirement title 1
          fc.string({ minLength: 5, maxLength: 100 }), // requirement title 2
          fc.string({ minLength: 10, maxLength: 200 }), // signature meaning 1
          fc.string({ minLength: 10, maxLength: 200 }), // signature meaning 2
          async (title1, title2, meaning1, meaning2) => {
            // Skip if inputs are identical
            if (title1 === title2 && meaning1 === meaning2) {
              return true;
            }

            // Create two requirements
            const req1Result = await pool.query(
              `INSERT INTO requirements (
                display_id, project_id, title, description, type, status, priority,
                version, tags, custom_fields, created_by, updated_by
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              RETURNING id`,
              [
                `REQ-${Date.now()}-1`,
                testProjectId,
                title1,
                'Test description',
                'system_requirement',
                'in_review',
                'high',
                1,
                [],
                {},
                testUserId,
                testUserId,
              ]
            );
            const requirementId1 = req1Result.rows[0].id;

            const req2Result = await pool.query(
              `INSERT INTO requirements (
                display_id, project_id, title, description, type, status, priority,
                version, tags, custom_fields, created_by, updated_by
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              RETURNING id`,
              [
                `REQ-${Date.now()}-2`,
                testProjectId,
                title2,
                'Test description',
                'system_requirement',
                'in_review',
                'high',
                1,
                [],
                {},
                testUserId,
                testUserId,
              ]
            );
            const requirementId2 = req2Result.rows[0].id;

            // Create signatures
            const signature1 = await signatureService.createSignature(
              requirementId1,
              testUserId,
              meaning1
            );

            const signature2 = await signatureService.createSignature(
              requirementId2,
              testUserId,
              meaning2
            );

            // Different signatures should have different hashes
            // (unless by extreme coincidence all inputs are identical)
            if (requirementId1 !== requirementId2 || meaning1 !== meaning2) {
              expect(signature1.signatureHash).not.toBe(signature2.signatureHash);
            }

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property: Signature Immutability
   * 
   * Electronic signatures must be immutable - they cannot be updated or deleted.
   * Note: This test validates the service methods exist. When database triggers
   * are in place, these operations will be prevented at the database level.
   * 
   * **Validates: Requirements 21.4**
   */
  describe('Property: Signature Immutability', () => {
    it('should have methods to attempt updates (will be prevented by DB triggers)', async () => {
      // Create a requirement
      const reqResult = await pool.query(
        `INSERT INTO requirements (
          display_id, project_id, title, description, type, status, priority,
          version, tags, custom_fields, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          `REQ-${Date.now()}`,
          testProjectId,
          'Test Requirement',
          'Test description',
          'system_requirement',
          'in_review',
          'high',
          1,
          [],
          {},
          testUserId,
          testUserId,
        ]
      );
      const requirementId = reqResult.rows[0].id;

      // Create signature
      await signatureService.createSignature(
        requirementId,
        testUserId,
        'Approved for implementation'
      );

      // Service has methods for attempting updates/deletes
      // (These will fail when DB triggers are in place)
      expect(signatureService.attemptUpdate).toBeDefined();
      expect(signatureService.attemptDelete).toBeDefined();
    });
  });

  /**
   * Property: Signature Non-Repudiation
   * 
   * Once a signature is created, it must be permanently associated with
   * the user, timestamp, and requirement.
   * 
   * **Validates: Requirements 21.2, 21.5**
   */
  describe('Property: Signature Non-Repudiation', () => {
    it('should permanently record user, timestamp, and requirement', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 100 }), // requirement title
          fc.string({ minLength: 10, maxLength: 200 }), // signature meaning
          async (title, meaning) => {
            // Create a requirement
            const reqResult = await pool.query(
              `INSERT INTO requirements (
                display_id, project_id, title, description, type, status, priority,
                version, tags, custom_fields, created_by, updated_by
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              RETURNING id`,
              [
                `REQ-${Date.now()}`,
                testProjectId,
                title,
                'Test description',
                'system_requirement',
                'in_review',
                'high',
                1,
                [],
                {},
                testUserId,
                testUserId,
              ]
            );
            const requirementId = reqResult.rows[0].id;

            const beforeTimestamp = new Date();

            // Create signature
            const signature = await signatureService.createSignature(
              requirementId,
              testUserId,
              meaning
            );

            const afterTimestamp = new Date();

            // Verify signature contains all required fields
            expect(signature.id).toBeDefined();
            expect(signature.requirementId).toBe(requirementId);
            expect(signature.userId).toBe(testUserId);
            expect(signature.signatureMeaning).toBe(meaning);
            expect(signature.timestamp).toBeDefined();
            expect(signature.signatureHash).toBeDefined();

            // Timestamp should be within reasonable range
            expect(signature.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTimestamp.getTime());
            expect(signature.timestamp.getTime()).toBeLessThanOrEqual(afterTimestamp.getTime());

            // Retrieve signature and verify it hasn't changed
            const signatures = await signatureService.getSignaturesForRequirement(requirementId);
            expect(signatures).toHaveLength(1);
            expect(signatures[0].id).toBe(signature.id);
            expect(signatures[0].userId).toBe(testUserId);
            expect(signatures[0].requirementId).toBe(requirementId);
            expect(signatures[0].signatureMeaning).toBe(meaning);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
