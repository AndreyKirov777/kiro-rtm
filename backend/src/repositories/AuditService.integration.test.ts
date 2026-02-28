/**
 * Integration test for automatic audit logging triggers
 * 
 * This test verifies that database triggers automatically create audit entries
 * for all changes to requirements and traceability links without explicit
 * AuditService calls.
 * 
 * **Validates: Requirements 14.1-14.4**
 */

import pool from '../config/database';
import { RequirementRepository } from './RequirementRepository';
import { TraceabilityLinkRepository } from './TraceabilityLinkRepository';
import { AuditService } from './AuditService';

describe('AuditService - Automatic Trigger Integration Tests', () => {
  let requirementRepository: RequirementRepository;
  let traceabilityLinkRepository: TraceabilityLinkRepository;
  let auditService: AuditService;
  let testProjectId: string;
  let testUserId: string;

  beforeAll(async () => {
    requirementRepository = new RequirementRepository(pool);
    traceabilityLinkRepository = new TraceabilityLinkRepository(pool);
    auditService = new AuditService(pool);

    // Clean up any existing test data
    const existingProject = await pool.query(`SELECT id FROM projects WHERE name = 'Trigger Integration Test Project'`);
    if (existingProject.rows.length > 0) {
      const projectId = existingProject.rows[0].id;
      await pool.query(`DELETE FROM requirements WHERE project_id = $1`, [projectId]);
      await pool.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
    }
    
    const existingUser = await pool.query(`SELECT id FROM users WHERE email = 'trigger-integration@example.com'`);
    if (existingUser.rows.length > 0) {
      const userId = existingUser.rows[0].id;
      await pool.query('ALTER TABLE audit_entries DISABLE TRIGGER prevent_audit_entry_delete');
      await pool.query(`DELETE FROM audit_entries WHERE actor_id = $1`, [userId]);
      await pool.query('ALTER TABLE audit_entries ENABLE TRIGGER prevent_audit_entry_delete');
      await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    }

    // Create test user with unique email
    const uniqueEmail = `trigger-integration-${Date.now()}@example.com`;
    const userResult = await pool.query(`
      INSERT INTO users (email, name, role)
      VALUES ($1, 'Trigger Integration User', 'author')
      RETURNING id
    `, [uniqueEmail]);
    testUserId = userResult.rows[0].id;

    // Create test project
    const projectResult = await pool.query(`
      INSERT INTO projects (name, description, created_by)
      VALUES ('Trigger Integration Test Project', 'For testing automatic audit triggers', $1)
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

  describe('Automatic Requirement Audit Logging', () => {
    it('should automatically create audit entry when requirement is created', async () => {
      // Create a requirement using the repository (no explicit audit call)
      const requirement = await requirementRepository.create({
        displayId: `REQ-AUTO-${Date.now()}`,
        projectId: testProjectId,
        parentId: null,
        title: 'Automatically Audited Requirement',
        description: 'This should trigger automatic audit logging',
        type: 'system_requirement',
        status: 'draft',
        priority: 'high',
        tags: ['auto-audit'],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      // Verify audit entry was created automatically by the trigger
      const auditEntries = await auditService.getEntityHistory('requirement', requirement.id);
      
      expect(auditEntries.length).toBeGreaterThanOrEqual(1);
      const createEntry = auditEntries.find(e => e.action === 'create_requirement');
      
      expect(createEntry).toBeDefined();
      expect(createEntry!.actorId).toBe(testUserId);
      expect(createEntry!.actorType).toBe('user');
      expect(createEntry!.changeDescription).toContain('Created requirement');
      expect(createEntry!.previousValue).toBeNull();
      expect(createEntry!.newValue).toBeDefined();
      expect(createEntry!.newValue.title).toBe('Automatically Audited Requirement');
    });

    it('should automatically create audit entry when requirement status is updated', async () => {
      // Create a requirement
      const requirement = await requirementRepository.create({
        displayId: `REQ-STATUS-${Date.now()}`,
        projectId: testProjectId,
        parentId: null,
        title: 'Status Change Test',
        description: 'Testing automatic status change audit',
        type: 'system_requirement',
        status: 'draft',
        priority: 'medium',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      // Clear the create audit entry
      await pool.query('ALTER TABLE audit_entries DISABLE TRIGGER prevent_audit_entry_delete');
      await pool.query('DELETE FROM audit_entries WHERE entity_id = $1', [requirement.id]);
      await pool.query('ALTER TABLE audit_entries ENABLE TRIGGER prevent_audit_entry_delete');

      // Update the requirement status (no explicit audit call)
      await requirementRepository.update(requirement.id, {
        status: 'approved',
        updatedBy: testUserId,
      });

      // Verify audit entry was created automatically
      const auditEntries = await auditService.getEntityHistory('requirement', requirement.id);
      
      expect(auditEntries.length).toBeGreaterThanOrEqual(1);
      const statusEntry = auditEntries.find(e => e.action === 'update_status');
      
      expect(statusEntry).toBeDefined();
      expect(statusEntry!.changeDescription).toContain('Status changed from draft to approved');
      expect(statusEntry!.previousValue.status).toBe('draft');
      expect(statusEntry!.newValue.status).toBe('approved');
    });

    it('should automatically create audit entry when requirement is deleted (soft delete)', async () => {
      // Create a requirement
      const requirement = await requirementRepository.create({
        displayId: `REQ-DELETE-${Date.now()}`,
        projectId: testProjectId,
        parentId: null,
        title: 'To Be Deleted',
        description: 'Testing automatic delete audit',
        type: 'system_requirement',
        status: 'draft',
        priority: 'low',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      const requirementId = requirement.id;

      // Clear the create audit entry
      await pool.query('ALTER TABLE audit_entries DISABLE TRIGGER prevent_audit_entry_delete');
      await pool.query('DELETE FROM audit_entries WHERE entity_id = $1', [requirementId]);
      await pool.query('ALTER TABLE audit_entries ENABLE TRIGGER prevent_audit_entry_delete');

      // Delete the requirement (soft delete - sets status to deprecated)
      await requirementRepository.delete(requirementId, testUserId);

      // Verify audit entry was created automatically
      const auditEntries = await auditService.getEntityHistory('requirement', requirementId);
      
      expect(auditEntries.length).toBeGreaterThanOrEqual(1);
      // Soft delete triggers an update_status action (draft -> deprecated)
      const statusEntry = auditEntries.find(e => e.action === 'update_status');
      
      expect(statusEntry).toBeDefined();
      expect(statusEntry!.changeDescription).toContain('Status changed');
      expect(statusEntry!.changeDescription).toContain('deprecated');
      expect(statusEntry!.newValue.status).toBe('deprecated');
    });
  });

  describe('Automatic Traceability Link Audit Logging', () => {
    it('should automatically create audit entry when traceability link is created', async () => {
      // Create two requirements
      const req1 = await requirementRepository.create({
        displayId: `REQ-LINK-SRC-${Date.now()}`,
        projectId: testProjectId,
        parentId: null,
        title: 'Source Requirement',
        description: 'Source for link',
        type: 'system_requirement',
        status: 'draft',
        priority: 'medium',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      const req2 = await requirementRepository.create({
        displayId: `REQ-LINK-TGT-${Date.now()}`,
        projectId: testProjectId,
        parentId: null,
        title: 'Target Requirement',
        description: 'Target for link',
        type: 'system_requirement',
        status: 'draft',
        priority: 'medium',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      // Create a traceability link (no explicit audit call)
      const link = await traceabilityLinkRepository.createLink({
        sourceId: req1.id,
        targetId: req2.id,
        targetType: 'requirement',
        linkType: 'derives_from',
        createdBy: testUserId,
      });

      // Verify audit entry was created automatically
      const auditEntries = await auditService.getEntityHistory('traceability_link', link.id);
      
      expect(auditEntries.length).toBeGreaterThanOrEqual(1);
      const createEntry = auditEntries.find(e => e.action === 'create_link');
      
      expect(createEntry).toBeDefined();
      expect(createEntry!.actorId).toBe(testUserId);
      expect(createEntry!.changeDescription).toContain('Created derives_from link');
      expect(createEntry!.previousValue).toBeNull();
      expect(createEntry!.newValue.linkType).toBe('derives_from');
    });

    it('should automatically create audit entry when traceability link is deleted', async () => {
      // Create two requirements
      const req1 = await requirementRepository.create({
        displayId: `REQ-LINK-DEL-SRC-${Date.now()}`,
        projectId: testProjectId,
        parentId: null,
        title: 'Source Requirement 2',
        description: 'Source for link deletion',
        type: 'system_requirement',
        status: 'draft',
        priority: 'medium',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      const req2 = await requirementRepository.create({
        displayId: `REQ-LINK-DEL-TGT-${Date.now()}`,
        projectId: testProjectId,
        parentId: null,
        title: 'Target Requirement 2',
        description: 'Target for link deletion',
        type: 'system_requirement',
        status: 'draft',
        priority: 'medium',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      // Create a traceability link
      const link = await traceabilityLinkRepository.createLink({
        sourceId: req1.id,
        targetId: req2.id,
        targetType: 'requirement',
        linkType: 'satisfies',
        createdBy: testUserId,
      });

      const linkId = link.id;

      // Clear the create audit entry
      await pool.query('ALTER TABLE audit_entries DISABLE TRIGGER prevent_audit_entry_delete');
      await pool.query('DELETE FROM audit_entries WHERE entity_id = $1', [linkId]);
      await pool.query('ALTER TABLE audit_entries ENABLE TRIGGER prevent_audit_entry_delete');

      // Delete the link (no explicit audit call)
      await traceabilityLinkRepository.deleteLink(linkId);

      // Verify audit entry was created automatically
      const auditEntries = await auditService.getEntityHistory('traceability_link', linkId);
      
      expect(auditEntries.length).toBeGreaterThanOrEqual(1);
      const deleteEntry = auditEntries.find(e => e.action === 'delete_link');
      
      expect(deleteEntry).toBeDefined();
      expect(deleteEntry!.changeDescription).toContain('Deleted satisfies link');
      expect(deleteEntry!.previousValue.linkType).toBe('satisfies');
      expect(deleteEntry!.newValue).toBeNull();
    });
  });

  describe('Audit Trail Completeness', () => {
    it('should capture complete audit trail for requirement lifecycle', async () => {
      // Create a requirement
      const requirement = await requirementRepository.create({
        displayId: `REQ-LIFECYCLE-${Date.now()}`,
        projectId: testProjectId,
        parentId: null,
        title: 'Lifecycle Test',
        description: 'Testing complete lifecycle audit',
        type: 'system_requirement',
        status: 'draft',
        priority: 'high',
        tags: ['lifecycle'],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      // Update status
      await requirementRepository.update(requirement.id, {
        status: 'in_review',
        updatedBy: testUserId,
      });

      // Update fields
      await requirementRepository.update(requirement.id, {
        title: 'Updated Lifecycle Test',
        description: 'Updated description',
        updatedBy: testUserId,
      });

      // Update status again
      await requirementRepository.update(requirement.id, {
        status: 'approved',
        updatedBy: testUserId,
      });

      // Get complete audit trail
      const auditEntries = await auditService.getEntityHistory('requirement', requirement.id);
      
      // Should have at least 4 entries: create + 3 updates
      expect(auditEntries.length).toBeGreaterThanOrEqual(4);
      
      // Verify chronological order
      for (let i = 1; i < auditEntries.length; i++) {
        expect(auditEntries[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          auditEntries[i - 1].timestamp.getTime()
        );
      }
      
      // Verify all actions are captured
      const actions = auditEntries.map(e => e.action);
      expect(actions).toContain('create_requirement');
      expect(actions).toContain('update_status');
      expect(actions).toContain('update_field');
    });
  });
});
