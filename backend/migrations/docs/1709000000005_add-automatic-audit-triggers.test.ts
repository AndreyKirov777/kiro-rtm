/**
 * Integration test for automatic audit logging triggers
 * 
 * This test verifies that database triggers automatically create audit entries
 * for all changes to requirements and traceability links.
 */

import { Pool } from 'pg';

describe('Migration 1709000000005: Automatic Audit Triggers', () => {
  let pool: Pool;
  let testUserId: string;
  let testProjectId: string;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://rmt_user:rmt_password@localhost:5432/rmt_dev'
    });

    // Create test user
    const userResult = await pool.query(`
      INSERT INTO users (email, name, role)
      VALUES ('trigger-test@example.com', 'Trigger Test User', 'author')
      RETURNING id
    `);
    testUserId = userResult.rows[0].id;

    // Create test project
    const projectResult = await pool.query(`
      INSERT INTO projects (name, description, created_by)
      VALUES ('Trigger Test Project', 'For testing automatic audit triggers', $1)
      RETURNING id
    `, [testUserId]);
    testProjectId = projectResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('ALTER TABLE audit_entries DISABLE TRIGGER prevent_audit_entry_delete');
    await pool.query('DELETE FROM audit_entries WHERE actor_id = $1', [testUserId]);
    await pool.query('ALTER TABLE audit_entries ENABLE TRIGGER prevent_audit_entry_delete');
    
    await pool.query('DELETE FROM requirements WHERE project_id = $1', [testProjectId]);
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  });

  afterEach(async () => {
    // Clean up after each test
    await pool.query('ALTER TABLE audit_entries DISABLE TRIGGER prevent_audit_entry_delete');
    await pool.query('DELETE FROM audit_entries WHERE actor_id = $1', [testUserId]);
    await pool.query('ALTER TABLE audit_entries ENABLE TRIGGER prevent_audit_entry_delete');
    
    await pool.query('DELETE FROM traceability_links WHERE created_by = $1', [testUserId]);
    await pool.query('DELETE FROM requirements WHERE project_id = $1', [testProjectId]);
  });

  describe('Requirement Triggers', () => {
    it('should automatically create audit entry on requirement INSERT', async () => {
      // Insert a requirement
      const reqResult = await pool.query(`
        INSERT INTO requirements (
          display_id, project_id, title, description, type, status, priority,
          tags, custom_fields, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        'REQ-TRIGGER-001',
        testProjectId,
        'Test Requirement',
        'Test description',
        'system_requirement',
        'draft',
        'medium',
        JSON.stringify(['test']),
        JSON.stringify({}),
        testUserId,
        testUserId
      ]);

      const requirementId = reqResult.rows[0].id;

      // Check that audit entry was created automatically
      const auditResult = await pool.query(`
        SELECT * FROM audit_entries
        WHERE entity_type = 'requirement' AND entity_id = $1
      `, [requirementId]);

      expect(auditResult.rows.length).toBe(1);
      const auditEntry = auditResult.rows[0];
      
      expect(auditEntry.actor_id).toBe(testUserId);
      expect(auditEntry.actor_type).toBe('user');
      expect(auditEntry.action).toBe('create_requirement');
      expect(auditEntry.change_description).toContain('Created requirement: Test Requirement');
      expect(auditEntry.previous_value).toBeNull();
      expect(auditEntry.new_value).toBeDefined();
      expect(auditEntry.new_value.displayId).toBe('REQ-TRIGGER-001');
      expect(auditEntry.new_value.title).toBe('Test Requirement');
    });

    it('should automatically create audit entry on requirement status UPDATE', async () => {
      // Insert a requirement
      const reqResult = await pool.query(`
        INSERT INTO requirements (
          display_id, project_id, title, description, type, status, priority,
          tags, custom_fields, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        'REQ-TRIGGER-002',
        testProjectId,
        'Test Requirement 2',
        'Test description',
        'system_requirement',
        'draft',
        'medium',
        JSON.stringify(['test']),
        JSON.stringify({}),
        testUserId,
        testUserId
      ]);

      const requirementId = reqResult.rows[0].id;

      // Clear audit entries from INSERT
      await pool.query('ALTER TABLE audit_entries DISABLE TRIGGER prevent_audit_entry_delete');
      await pool.query('DELETE FROM audit_entries WHERE entity_id = $1', [requirementId]);
      await pool.query('ALTER TABLE audit_entries ENABLE TRIGGER prevent_audit_entry_delete');

      // Update the requirement status
      await pool.query(`
        UPDATE requirements
        SET status = 'approved', updated_by = $1
        WHERE id = $2
      `, [testUserId, requirementId]);

      // Check that audit entry was created automatically
      const auditResult = await pool.query(`
        SELECT * FROM audit_entries
        WHERE entity_type = 'requirement' AND entity_id = $1
        ORDER BY timestamp DESC
      `, [requirementId]);

      expect(auditResult.rows.length).toBeGreaterThanOrEqual(1);
      const auditEntry = auditResult.rows[0];
      
      expect(auditEntry.actor_id).toBe(testUserId);
      expect(auditEntry.action).toBe('update_status');
      expect(auditEntry.change_description).toContain('Status changed from draft to approved');
      expect(auditEntry.previous_value.status).toBe('draft');
      expect(auditEntry.new_value.status).toBe('approved');
    });

    it('should automatically create audit entry on requirement field UPDATE', async () => {
      // Insert a requirement
      const reqResult = await pool.query(`
        INSERT INTO requirements (
          display_id, project_id, title, description, type, status, priority,
          tags, custom_fields, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        'REQ-TRIGGER-003',
        testProjectId,
        'Original Title',
        'Original description',
        'system_requirement',
        'draft',
        'medium',
        JSON.stringify(['test']),
        JSON.stringify({}),
        testUserId,
        testUserId
      ]);

      const requirementId = reqResult.rows[0].id;

      // Clear audit entries from INSERT
      await pool.query('ALTER TABLE audit_entries DISABLE TRIGGER prevent_audit_entry_delete');
      await pool.query('DELETE FROM audit_entries WHERE entity_id = $1', [requirementId]);
      await pool.query('ALTER TABLE audit_entries ENABLE TRIGGER prevent_audit_entry_delete');

      // Update the requirement title and description
      await pool.query(`
        UPDATE requirements
        SET title = 'Updated Title', description = 'Updated description', updated_by = $1
        WHERE id = $2
      `, [testUserId, requirementId]);

      // Check that audit entry was created automatically
      const auditResult = await pool.query(`
        SELECT * FROM audit_entries
        WHERE entity_type = 'requirement' AND entity_id = $1
        ORDER BY timestamp DESC
      `, [requirementId]);

      expect(auditResult.rows.length).toBeGreaterThanOrEqual(1);
      const auditEntry = auditResult.rows[0];
      
      expect(auditEntry.action).toBe('update_field');
      expect(auditEntry.change_description).toContain('Updated requirement fields');
      expect(auditEntry.previous_value.title).toBe('Original Title');
      expect(auditEntry.new_value.title).toBe('Updated Title');
    });

    it('should automatically create audit entry on requirement DELETE', async () => {
      // Insert a requirement
      const reqResult = await pool.query(`
        INSERT INTO requirements (
          display_id, project_id, title, description, type, status, priority,
          tags, custom_fields, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        'REQ-TRIGGER-004',
        testProjectId,
        'To Be Deleted',
        'Test description',
        'system_requirement',
        'draft',
        'medium',
        JSON.stringify(['test']),
        JSON.stringify({}),
        testUserId,
        testUserId
      ]);

      const requirementId = reqResult.rows[0].id;

      // Clear audit entries from INSERT
      await pool.query('ALTER TABLE audit_entries DISABLE TRIGGER prevent_audit_entry_delete');
      await pool.query('DELETE FROM audit_entries WHERE entity_id = $1', [requirementId]);
      await pool.query('ALTER TABLE audit_entries ENABLE TRIGGER prevent_audit_entry_delete');

      // Delete the requirement
      await pool.query('DELETE FROM requirements WHERE id = $1', [requirementId]);

      // Check that audit entry was created automatically
      const auditResult = await pool.query(`
        SELECT * FROM audit_entries
        WHERE entity_type = 'requirement' AND entity_id = $1
        ORDER BY timestamp DESC
      `, [requirementId]);

      expect(auditResult.rows.length).toBeGreaterThanOrEqual(1);
      const auditEntry = auditResult.rows[0];
      
      expect(auditEntry.action).toBe('delete_requirement');
      expect(auditEntry.change_description).toContain('Deleted requirement: To Be Deleted');
      expect(auditEntry.previous_value.displayId).toBe('REQ-TRIGGER-004');
      expect(auditEntry.new_value).toBeNull();
    });
  });

  describe('Traceability Link Triggers', () => {
    it('should automatically create audit entry on traceability link INSERT', async () => {
      // Create two requirements
      const req1Result = await pool.query(`
        INSERT INTO requirements (
          display_id, project_id, title, description, type, status, priority,
          tags, custom_fields, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        'REQ-LINK-001',
        testProjectId,
        'Source Requirement',
        'Test description',
        'system_requirement',
        'draft',
        'medium',
        JSON.stringify([]),
        JSON.stringify({}),
        testUserId,
        testUserId
      ]);

      const req2Result = await pool.query(`
        INSERT INTO requirements (
          display_id, project_id, title, description, type, status, priority,
          tags, custom_fields, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        'REQ-LINK-002',
        testProjectId,
        'Target Requirement',
        'Test description',
        'system_requirement',
        'draft',
        'medium',
        JSON.stringify([]),
        JSON.stringify({}),
        testUserId,
        testUserId
      ]);

      const sourceId = req1Result.rows[0].id;
      const targetId = req2Result.rows[0].id;

      // Create a traceability link
      const linkResult = await pool.query(`
        INSERT INTO traceability_links (
          source_id, target_id, target_type, link_type, created_by
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [sourceId, targetId, 'requirement', 'derives_from', testUserId]);

      const linkId = linkResult.rows[0].id;

      // Check that audit entry was created automatically
      const auditResult = await pool.query(`
        SELECT * FROM audit_entries
        WHERE entity_type = 'traceability_link' AND entity_id = $1
      `, [linkId]);

      expect(auditResult.rows.length).toBe(1);
      const auditEntry = auditResult.rows[0];
      
      expect(auditEntry.actor_id).toBe(testUserId);
      expect(auditEntry.action).toBe('create_link');
      expect(auditEntry.change_description).toContain('Created derives_from link');
      expect(auditEntry.change_description).toContain('REQ-LINK-001');
      expect(auditEntry.change_description).toContain('REQ-LINK-002');
      expect(auditEntry.previous_value).toBeNull();
      expect(auditEntry.new_value.linkType).toBe('derives_from');
    });

    it('should automatically create audit entry on traceability link DELETE', async () => {
      // Create two requirements
      const req1Result = await pool.query(`
        INSERT INTO requirements (
          display_id, project_id, title, description, type, status, priority,
          tags, custom_fields, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        'REQ-LINK-003',
        testProjectId,
        'Source Requirement 2',
        'Test description',
        'system_requirement',
        'draft',
        'medium',
        JSON.stringify([]),
        JSON.stringify({}),
        testUserId,
        testUserId
      ]);

      const req2Result = await pool.query(`
        INSERT INTO requirements (
          display_id, project_id, title, description, type, status, priority,
          tags, custom_fields, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        'REQ-LINK-004',
        testProjectId,
        'Target Requirement 2',
        'Test description',
        'system_requirement',
        'draft',
        'medium',
        JSON.stringify([]),
        JSON.stringify({}),
        testUserId,
        testUserId
      ]);

      const sourceId = req1Result.rows[0].id;
      const targetId = req2Result.rows[0].id;

      // Create a traceability link
      const linkResult = await pool.query(`
        INSERT INTO traceability_links (
          source_id, target_id, target_type, link_type, created_by
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [sourceId, targetId, 'requirement', 'satisfies', testUserId]);

      const linkId = linkResult.rows[0].id;

      // Clear audit entries from INSERT
      await pool.query('ALTER TABLE audit_entries DISABLE TRIGGER prevent_audit_entry_delete');
      await pool.query('DELETE FROM audit_entries WHERE entity_id = $1', [linkId]);
      await pool.query('ALTER TABLE audit_entries ENABLE TRIGGER prevent_audit_entry_delete');

      // Delete the traceability link
      await pool.query('DELETE FROM traceability_links WHERE id = $1', [linkId]);

      // Check that audit entry was created automatically
      const auditResult = await pool.query(`
        SELECT * FROM audit_entries
        WHERE entity_type = 'traceability_link' AND entity_id = $1
      `, [linkId]);

      expect(auditResult.rows.length).toBe(1);
      const auditEntry = auditResult.rows[0];
      
      expect(auditEntry.action).toBe('delete_link');
      expect(auditEntry.change_description).toContain('Deleted satisfies link');
      expect(auditEntry.change_description).toContain('REQ-LINK-003');
      expect(auditEntry.change_description).toContain('REQ-LINK-004');
      expect(auditEntry.previous_value.linkType).toBe('satisfies');
      expect(auditEntry.new_value).toBeNull();
    });
  });

  describe('Audit Entry Completeness', () => {
    it('should capture all required fields in audit entries', async () => {
      // Insert a requirement
      const reqResult = await pool.query(`
        INSERT INTO requirements (
          display_id, project_id, title, description, type, status, priority,
          tags, custom_fields, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        'REQ-COMPLETE-001',
        testProjectId,
        'Complete Test',
        'Test description',
        'system_requirement',
        'draft',
        'medium',
        JSON.stringify(['test']),
        JSON.stringify({}),
        testUserId,
        testUserId
      ]);

      const requirementId = reqResult.rows[0].id;

      // Get the audit entry
      const auditResult = await pool.query(`
        SELECT * FROM audit_entries
        WHERE entity_type = 'requirement' AND entity_id = $1
      `, [requirementId]);

      const auditEntry = auditResult.rows[0];

      // Verify all required fields are present (Requirement 14.5)
      expect(auditEntry.id).toBeDefined();
      expect(auditEntry.timestamp).toBeDefined();
      expect(auditEntry.actor_id).toBe(testUserId);
      expect(auditEntry.actor_type).toBe('user');
      expect(auditEntry.entity_type).toBe('requirement');
      expect(auditEntry.entity_id).toBe(requirementId);
      expect(auditEntry.action).toBeDefined();
      expect(auditEntry.change_description).toBeDefined();
      // previous_value can be null for INSERT
      expect(auditEntry.new_value).toBeDefined();
    });
  });
});
