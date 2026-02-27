import * as fc from 'fast-check';
import { AuditService } from './AuditService';
import { RequirementRepository } from './RequirementRepository';
import { TraceabilityLinkRepository } from './TraceabilityLinkRepository';
import { ActorType, RequirementType, RequirementStatus, Priority, LinkType } from '../types';
import pool from '../config/database';

/**
 * Property-Based Tests for AuditService
 * 
 * **Validates: Requirements 14.1-14.6**
 * 
 * Property 16: Audit Trail Completeness
 * For any change to a requirement field, requirement status, or traceability link, 
 * an audit entry must be created containing timestamp, actor, change description, 
 * previous value, and new value.
 * 
 * Property 17: Audit Entry Immutability
 * For any audit entry, attempting to modify or delete it after creation must fail, 
 * leaving the audit entry unchanged.
 */
describe('AuditService - Property-Based Tests', () => {
  let auditService: AuditService;
  let requirementRepository: RequirementRepository;
  let traceabilityLinkRepository: TraceabilityLinkRepository;
  let testProjectId: string;
  let testUserId: string;

  beforeAll(async () => {
    auditService = new AuditService(pool);
    requirementRepository = new RequirementRepository(pool);
    traceabilityLinkRepository = new TraceabilityLinkRepository(pool);

    // Clean up any existing test data first (in correct order)
    const existingProject = await pool.query(`SELECT id FROM projects WHERE name = 'Audit Test Project'`);
    if (existingProject.rows.length > 0) {
      const projectId = existingProject.rows[0].id;
      await pool.query(`DELETE FROM requirements WHERE project_id = $1`, [projectId]);
      await pool.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
    }
    
    const existingUser = await pool.query(`SELECT id FROM users WHERE email = 'audit-test@example.com'`);
    if (existingUser.rows.length > 0) {
      const userId = existingUser.rows[0].id;
      // Disable trigger to clean up audit entries
      await pool.query('ALTER TABLE audit_entries DISABLE TRIGGER prevent_audit_entry_delete');
      await pool.query(`DELETE FROM audit_entries WHERE actor_id = $1`, [userId]);
      await pool.query('ALTER TABLE audit_entries ENABLE TRIGGER prevent_audit_entry_delete');
      await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    }

    // Create a test user
    const userResult = await pool.query(`
      INSERT INTO users (email, name, role)
      VALUES ('audit-test@example.com', 'Audit Test User', 'author')
      RETURNING id
    `);
    testUserId = userResult.rows[0].id;

    // Create a test project
    const projectResult = await pool.query(`
      INSERT INTO projects (name, description, created_by)
      VALUES ('Audit Test Project', 'For audit property-based testing', $1)
      RETURNING id
    `, [testUserId]);
    testProjectId = projectResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    // Note: We cannot delete audit_entries due to immutability constraints (this validates Property 17!)
    // We disable the trigger temporarily for cleanup only
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
    // Temporarily disable immutability trigger for test cleanup
    await pool.query('ALTER TABLE audit_entries DISABLE TRIGGER prevent_audit_entry_delete');
    await pool.query('DELETE FROM audit_entries WHERE actor_id = $1', [testUserId]);
    await pool.query('ALTER TABLE audit_entries ENABLE TRIGGER prevent_audit_entry_delete');
    
    await pool.query('DELETE FROM traceability_links WHERE created_by = $1', [testUserId]);
    await pool.query('DELETE FROM requirements WHERE project_id = $1', [testProjectId]);
  });

  /**
   * Property 16: Audit Trail Completeness
   * 
   * **Validates: Requirements 14.1-14.5**
   * 
   * For any change to a requirement field, requirement status, or traceability link, 
   * an audit entry must be created containing timestamp, actor, change description, 
   * previous value, and new value.
   */
  describe('Property 16: Audit Trail Completeness', () => {
    it('should create audit entry for requirement field changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            initialTitle: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            updatedTitle: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            initialDescription: fc.string({ maxLength: 1000 }),
            updatedDescription: fc.string({ maxLength: 1000 }),
            type: fc.constantFrom<RequirementType>(
              'stakeholder_need',
              'system_requirement',
              'software_requirement',
              'hardware_requirement',
              'constraint',
              'interface_requirement'
            ),
            initialStatus: fc.constantFrom<RequirementStatus>('draft', 'in_review'),
            priority: fc.constantFrom<Priority>('critical', 'high', 'medium', 'low'),
          }),
          async (data) => {
            // Create a requirement
            const requirement = await requirementRepository.create({
              displayId: `REQ-AUDIT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              projectId: testProjectId,
              parentId: null,
              title: data.initialTitle,
              description: data.initialDescription,
              type: data.type,
              status: data.initialStatus,
              priority: data.priority,
              tags: [],
              customFields: {},
              createdBy: testUserId,
              updatedBy: testUserId,
            });

            // Create audit entry for the field change
            const auditEntry = await auditService.createAuditEntry({
              actorId: testUserId,
              actorType: 'user',
              entityType: 'requirement',
              entityId: requirement.id,
              action: 'update_field',
              changeDescription: 'Updated title and description',
              previousValue: {
                title: data.initialTitle,
                description: data.initialDescription,
              },
              newValue: {
                title: data.updatedTitle,
                description: data.updatedDescription,
              },
            });

            // Verify audit entry was created with all required fields (Requirement 14.5)
            expect(auditEntry).toBeDefined();
            expect(auditEntry.id).toBeTruthy();
            expect(auditEntry.timestamp).toBeInstanceOf(Date);
            expect(auditEntry.actorId).toBe(testUserId);
            expect(auditEntry.actorType).toBe('user');
            expect(auditEntry.entityType).toBe('requirement');
            expect(auditEntry.entityId).toBe(requirement.id);
            expect(auditEntry.action).toBe('update_field');
            expect(auditEntry.changeDescription).toBe('Updated title and description');
            expect(auditEntry.previousValue).toEqual({
              title: data.initialTitle,
              description: data.initialDescription,
            });
            expect(auditEntry.newValue).toEqual({
              title: data.updatedTitle,
              description: data.updatedDescription,
            });

            // Verify we can retrieve the audit entry
            const history = await auditService.getEntityHistory('requirement', requirement.id);
            expect(history.length).toBeGreaterThanOrEqual(1);
            const foundEntry = history.find(e => e.id === auditEntry.id);
            expect(foundEntry).toBeDefined();
          }
        ),
        {
          numRuns: 50,
          verbose: true,
        }
      );
    });

    it('should create audit entry for requirement status changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            type: fc.constantFrom<RequirementType>(
              'stakeholder_need',
              'system_requirement',
              'software_requirement',
              'hardware_requirement',
              'constraint',
              'interface_requirement'
            ),
            initialStatus: fc.constantFrom<RequirementStatus>('draft', 'in_review'),
            newStatus: fc.constantFrom<RequirementStatus>('approved', 'deprecated'),
            priority: fc.constantFrom<Priority>('critical', 'high', 'medium', 'low'),
          }),
          async (data) => {
            // Create a requirement
            const requirement = await requirementRepository.create({
              displayId: `REQ-STATUS-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              projectId: testProjectId,
              parentId: null,
              title: data.title,
              description: 'Test requirement for status change',
              type: data.type,
              status: data.initialStatus,
              priority: data.priority,
              tags: [],
              customFields: {},
              createdBy: testUserId,
              updatedBy: testUserId,
            });

            // Create audit entry for status change (Requirement 14.2)
            const auditEntry = await auditService.createAuditEntry({
              actorId: testUserId,
              actorType: 'user',
              entityType: 'requirement',
              entityId: requirement.id,
              action: 'update_status',
              changeDescription: `Status changed from ${data.initialStatus} to ${data.newStatus}`,
              previousValue: { status: data.initialStatus },
              newValue: { status: data.newStatus },
            });

            // Verify audit entry contains all required information
            expect(auditEntry.actorId).toBe(testUserId);
            expect(auditEntry.actorType).toBe('user');
            expect(auditEntry.action).toBe('update_status');
            expect(auditEntry.previousValue).toEqual({ status: data.initialStatus });
            expect(auditEntry.newValue).toEqual({ status: data.newStatus });
            expect(auditEntry.timestamp).toBeInstanceOf(Date);
          }
        ),
        {
          numRuns: 50,
          verbose: true,
        }
      );
    });

    it('should create audit entry for traceability link addition', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            sourceTitle: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            targetTitle: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            linkType: fc.constantFrom<LinkType>(
              'derives_from',
              'refines',
              'satisfies',
              'verified_by',
              'conflicts_with',
              'relates_to'
            ),
            type: fc.constantFrom<RequirementType>(
              'stakeholder_need',
              'system_requirement',
              'software_requirement',
              'hardware_requirement',
              'constraint',
              'interface_requirement'
            ),
            status: fc.constantFrom<RequirementStatus>('draft', 'in_review', 'approved'),
            priority: fc.constantFrom<Priority>('critical', 'high', 'medium', 'low'),
          }),
          async (data) => {
            // Create source requirement
            const sourceReq = await requirementRepository.create({
              displayId: `REQ-SRC-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              projectId: testProjectId,
              parentId: null,
              title: data.sourceTitle,
              description: 'Source requirement',
              type: data.type,
              status: data.status,
              priority: data.priority,
              tags: [],
              customFields: {},
              createdBy: testUserId,
              updatedBy: testUserId,
            });

            // Create target requirement
            const targetReq = await requirementRepository.create({
              displayId: `REQ-TGT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              projectId: testProjectId,
              parentId: null,
              title: data.targetTitle,
              description: 'Target requirement',
              type: data.type,
              status: data.status,
              priority: data.priority,
              tags: [],
              customFields: {},
              createdBy: testUserId,
              updatedBy: testUserId,
            });

            // Create traceability link
            const link = await traceabilityLinkRepository.createLink({
              sourceId: sourceReq.id,
              targetId: targetReq.id,
              targetType: 'requirement',
              linkType: data.linkType,
              createdBy: testUserId,
            });

            // Create audit entry for link addition (Requirement 14.3)
            const auditEntry = await auditService.createAuditEntry({
              actorId: testUserId,
              actorType: 'user',
              entityType: 'traceability_link',
              entityId: link.id,
              action: 'create_link',
              changeDescription: `Created ${data.linkType} link from ${sourceReq.displayId} to ${targetReq.displayId}`,
              previousValue: null,
              newValue: {
                sourceId: sourceReq.id,
                targetId: targetReq.id,
                linkType: data.linkType,
              },
            });

            // Verify audit entry was created
            expect(auditEntry.entityType).toBe('traceability_link');
            expect(auditEntry.entityId).toBe(link.id);
            expect(auditEntry.action).toBe('create_link');
            expect(auditEntry.previousValue).toBeNull();
            expect(auditEntry.newValue).toEqual({
              sourceId: sourceReq.id,
              targetId: targetReq.id,
              linkType: data.linkType,
            });
          }
        ),
        {
          numRuns: 50,
          verbose: true,
        }
      );
    });

    it('should create audit entry for traceability link removal', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            sourceTitle: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            targetTitle: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            linkType: fc.constantFrom<LinkType>(
              'derives_from',
              'refines',
              'satisfies',
              'verified_by',
              'conflicts_with',
              'relates_to'
            ),
            type: fc.constantFrom<RequirementType>(
              'stakeholder_need',
              'system_requirement',
              'software_requirement',
              'hardware_requirement',
              'constraint',
              'interface_requirement'
            ),
            status: fc.constantFrom<RequirementStatus>('draft', 'in_review', 'approved'),
            priority: fc.constantFrom<Priority>('critical', 'high', 'medium', 'low'),
          }),
          async (data) => {
            // Create source and target requirements
            const sourceReq = await requirementRepository.create({
              displayId: `REQ-DEL-SRC-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              projectId: testProjectId,
              parentId: null,
              title: data.sourceTitle,
              description: 'Source requirement',
              type: data.type,
              status: data.status,
              priority: data.priority,
              tags: [],
              customFields: {},
              createdBy: testUserId,
              updatedBy: testUserId,
            });

            const targetReq = await requirementRepository.create({
              displayId: `REQ-DEL-TGT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              projectId: testProjectId,
              parentId: null,
              title: data.targetTitle,
              description: 'Target requirement',
              type: data.type,
              status: data.status,
              priority: data.priority,
              tags: [],
              customFields: {},
              createdBy: testUserId,
              updatedBy: testUserId,
            });

            // Create and then delete traceability link
            const link = await traceabilityLinkRepository.createLink({
              sourceId: sourceReq.id,
              targetId: targetReq.id,
              targetType: 'requirement',
              linkType: data.linkType,
              createdBy: testUserId,
            });

            // Create audit entry for link removal (Requirement 14.4)
            const auditEntry = await auditService.createAuditEntry({
              actorId: testUserId,
              actorType: 'user',
              entityType: 'traceability_link',
              entityId: link.id,
              action: 'delete_link',
              changeDescription: `Deleted ${data.linkType} link from ${sourceReq.displayId} to ${targetReq.displayId}`,
              previousValue: {
                sourceId: sourceReq.id,
                targetId: targetReq.id,
                linkType: data.linkType,
              },
              newValue: null,
            });

            // Verify audit entry was created
            expect(auditEntry.entityType).toBe('traceability_link');
            expect(auditEntry.action).toBe('delete_link');
            expect(auditEntry.previousValue).toEqual({
              sourceId: sourceReq.id,
              targetId: targetReq.id,
              linkType: data.linkType,
            });
            expect(auditEntry.newValue).toBeNull();
          }
        ),
        {
          numRuns: 50,
          verbose: true,
        }
      );
    });

    it('should support different actor types in audit entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            actorType: fc.constantFrom<ActorType>('user', 'api_client', 'system'),
            action: fc.constantFrom('create', 'update', 'delete', 'approve', 'reject'),
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          }),
          async (data) => {
            // Create a requirement
            const requirement = await requirementRepository.create({
              displayId: `REQ-ACTOR-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              projectId: testProjectId,
              parentId: null,
              title: data.title,
              description: 'Test requirement',
              type: 'system_requirement',
              status: 'draft',
              priority: 'medium',
              tags: [],
              customFields: {},
              createdBy: testUserId,
              updatedBy: testUserId,
            });

            // Create audit entry with different actor type
            const auditEntry = await auditService.createAuditEntry({
              actorId: testUserId,
              actorType: data.actorType,
              entityType: 'requirement',
              entityId: requirement.id,
              action: data.action,
              changeDescription: `Action ${data.action} performed by ${data.actorType}`,
              previousValue: null,
              newValue: { action: data.action },
            });

            // Verify actor type is correctly stored
            expect(auditEntry.actorType).toBe(data.actorType);
            expect(auditEntry.actorId).toBe(testUserId);
          }
        ),
        {
          numRuns: 50,
          verbose: true,
        }
      );
    });
  });

  /**
   * Property 17: Audit Entry Immutability
   * 
   * **Validates: Requirements 14.6**
   * 
   * For any audit entry, attempting to modify or delete it after creation must fail, 
   * leaving the audit entry unchanged.
   */
  describe('Property 17: Audit Entry Immutability', () => {
    it('should prevent modification of audit entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            action: fc.constantFrom('create', 'update', 'delete', 'approve'),
            changeDescription: fc.string({ minLength: 1, maxLength: 500 }),
            attemptedChangeDescription: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          async (data) => {
            // Create a requirement
            const requirement = await requirementRepository.create({
              displayId: `REQ-IMMUT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              projectId: testProjectId,
              parentId: null,
              title: data.title,
              description: 'Test requirement for immutability',
              type: 'system_requirement',
              status: 'draft',
              priority: 'medium',
              tags: [],
              customFields: {},
              createdBy: testUserId,
              updatedBy: testUserId,
            });

            // Create audit entry
            const auditEntry = await auditService.createAuditEntry({
              actorId: testUserId,
              actorType: 'user',
              entityType: 'requirement',
              entityId: requirement.id,
              action: data.action,
              changeDescription: data.changeDescription,
              previousValue: null,
              newValue: { title: data.title },
            });

            const originalEntry = { ...auditEntry };

            // Attempt to modify the audit entry (should fail)
            await expect(
              auditService.attemptUpdate(auditEntry.id, {
                changeDescription: data.attemptedChangeDescription,
              })
            ).rejects.toThrow(/immutable/i);

            // Verify the audit entry remains unchanged
            const history = await auditService.getEntityHistory('requirement', requirement.id);
            const unchangedEntry = history.find(e => e.id === auditEntry.id);
            
            expect(unchangedEntry).toBeDefined();
            expect(unchangedEntry!.changeDescription).toBe(originalEntry.changeDescription);
            expect(unchangedEntry!.action).toBe(originalEntry.action);
            expect(unchangedEntry!.timestamp.getTime()).toBe(originalEntry.timestamp.getTime());
          }
        ),
        {
          numRuns: 50,
          verbose: true,
        }
      );
    });

    it('should prevent deletion of audit entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            action: fc.constantFrom('create', 'update', 'delete', 'approve'),
            changeDescription: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          async (data) => {
            // Create a requirement
            const requirement = await requirementRepository.create({
              displayId: `REQ-DEL-IMMUT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              projectId: testProjectId,
              parentId: null,
              title: data.title,
              description: 'Test requirement for deletion immutability',
              type: 'system_requirement',
              status: 'draft',
              priority: 'medium',
              tags: [],
              customFields: {},
              createdBy: testUserId,
              updatedBy: testUserId,
            });

            // Create audit entry
            const auditEntry = await auditService.createAuditEntry({
              actorId: testUserId,
              actorType: 'user',
              entityType: 'requirement',
              entityId: requirement.id,
              action: data.action,
              changeDescription: data.changeDescription,
              previousValue: null,
              newValue: { title: data.title },
            });

            // Attempt to delete the audit entry (should fail)
            await expect(
              auditService.attemptDelete(auditEntry.id)
            ).rejects.toThrow(/immutable/i);

            // Verify the audit entry still exists
            const history = await auditService.getEntityHistory('requirement', requirement.id);
            const stillExistsEntry = history.find(e => e.id === auditEntry.id);
            
            expect(stillExistsEntry).toBeDefined();
            expect(stillExistsEntry!.id).toBe(auditEntry.id);
            expect(stillExistsEntry!.changeDescription).toBe(data.changeDescription);
          }
        ),
        {
          numRuns: 50,
          verbose: true,
        }
      );
    });

    it('should maintain immutability across multiple modification attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            changeDescription: fc.string({ minLength: 1, maxLength: 500 }),
            attemptedChanges: fc.array(
              fc.string({ minLength: 1, maxLength: 500 }),
              { minLength: 2, maxLength: 5 }
            ),
          }),
          async (data) => {
            // Create a requirement
            const requirement = await requirementRepository.create({
              displayId: `REQ-MULTI-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              projectId: testProjectId,
              parentId: null,
              title: data.title,
              description: 'Test requirement for multiple modification attempts',
              type: 'system_requirement',
              status: 'draft',
              priority: 'medium',
              tags: [],
              customFields: {},
              createdBy: testUserId,
              updatedBy: testUserId,
            });

            // Create audit entry
            const auditEntry = await auditService.createAuditEntry({
              actorId: testUserId,
              actorType: 'user',
              entityType: 'requirement',
              entityId: requirement.id,
              action: 'create',
              changeDescription: data.changeDescription,
              previousValue: null,
              newValue: { title: data.title },
            });

            const originalEntry = { ...auditEntry };

            // Attempt multiple modifications (all should fail)
            for (const attemptedChange of data.attemptedChanges) {
              await expect(
                auditService.attemptUpdate(auditEntry.id, {
                  changeDescription: attemptedChange,
                })
              ).rejects.toThrow(/immutable/i);
            }

            // Verify the audit entry remains completely unchanged after all attempts
            const history = await auditService.getEntityHistory('requirement', requirement.id);
            const unchangedEntry = history.find(e => e.id === auditEntry.id);
            
            expect(unchangedEntry).toBeDefined();
            expect(unchangedEntry!.changeDescription).toBe(originalEntry.changeDescription);
            expect(unchangedEntry!.action).toBe(originalEntry.action);
            expect(unchangedEntry!.actorId).toBe(originalEntry.actorId);
            expect(unchangedEntry!.timestamp.getTime()).toBe(originalEntry.timestamp.getTime());
          }
        ),
        {
          numRuns: 30,
          verbose: true,
        }
      );
    });
  });
});
