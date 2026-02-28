import { WorkflowService } from './WorkflowService';
import { AuditService } from './AuditService';
import pool from '../config/database';
import { ApprovalWorkflow } from '../types';

/**
 * Integration Tests for WorkflowService
 * 
 * **Validates: Requirements 19.1-19.4, 20.1-20.6**
 */

describe('WorkflowService - Integration Tests', () => {
  let workflowService: WorkflowService;
  let auditService: AuditService;
  let testProjectId: string;
  let testUserId: string;
  let testApproverUserId: string;

  const testWorkflow: ApprovalWorkflow = {
    states: [
      {
        id: 'draft',
        name: 'Draft',
        requiresApproval: false,
        reviewerRoles: [],
      },
      {
        id: 'in_review',
        name: 'In Review',
        requiresApproval: true,
        reviewerRoles: ['reviewer', 'approver'],
      },
      {
        id: 'approved',
        name: 'Approved',
        requiresApproval: false,
        reviewerRoles: [],
      },
      {
        id: 'deprecated',
        name: 'Deprecated',
        requiresApproval: false,
        reviewerRoles: [],
      },
    ],
    transitions: [
      {
        fromState: 'draft',
        toState: 'in_review',
        action: 'approve',
        requiresSignature: false,
      },
      {
        fromState: 'in_review',
        toState: 'approved',
        action: 'approve',
        requiresSignature: true,
      },
      {
        fromState: 'in_review',
        toState: 'draft',
        action: 'request_changes',
        requiresSignature: false,
      },
      {
        fromState: 'in_review',
        toState: 'deprecated',
        action: 'reject',
        requiresSignature: false,
      },
    ],
  };

  beforeAll(async () => {
    auditService = new AuditService(pool);
    workflowService = new WorkflowService(pool, auditService);

    // Create test users with unique emails
    const uniqueTimestamp = Date.now();
    const userResult = await pool.query(
      `INSERT INTO users (email, name, role)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [`author-${uniqueTimestamp}@example.com`, 'Test Author', 'author']
    );
    testUserId = userResult.rows[0].id;

    const approverResult = await pool.query(
      `INSERT INTO users (email, name, role)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [`approver-${uniqueTimestamp}@example.com`, 'Test Approver', 'approver']
    );
    testApproverUserId = approverResult.rows[0].id;

    // Create test project with workflow
    const projectResult = await pool.query(
      `INSERT INTO projects (name, description, custom_field_definitions, approval_workflow, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        'Test Project',
        'For workflow testing',
        '[]',
        JSON.stringify(testWorkflow),
        testUserId,
      ]
    );
    testProjectId = projectResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM requirements WHERE project_id = $1', [testProjectId]);
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [testUserId, testApproverUserId]);
    await pool.end();
  });

  afterEach(async () => {
    // Clean up requirements after each test
    await pool.query('DELETE FROM requirements WHERE project_id = $1', [testProjectId]);
  });

  describe('approve', () => {
    it('should approve a requirement and transition to next state', async () => {
      // Create requirement in draft status
      const reqResult = await pool.query(
        `INSERT INTO requirements (
          display_id, project_id, title, description, type, status, priority,
          version, tags, custom_fields, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          'REQ-001',
          testProjectId,
          'Test Requirement',
          'Test description',
          'system_requirement',
          'draft',
          'high',
          1,
          [],
          {},
          testUserId,
          testUserId,
        ]
      );
      const requirementId = reqResult.rows[0].id;

      // Approve (draft -> in_review)
      const updatedReq = await workflowService.approve(
        requirementId,
        testUserId,
        'author'
      );

      expect(updatedReq.status).toBe('in_review');
      expect(updatedReq.version).toBe(2);

      // Verify audit entry was created
      const auditEntries = await auditService.getEntityHistory('requirement', requirementId);
      expect(auditEntries.length).toBeGreaterThan(0);
      const approvalEntry = auditEntries.find((e) => e.action === 'approve');
      expect(approvalEntry).toBeDefined();
    });

    it('should enforce reviewer authorization', async () => {
      // Create requirement in in_review status
      const reqResult = await pool.query(
        `INSERT INTO requirements (
          display_id, project_id, title, description, type, status, priority,
          version, tags, custom_fields, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          'REQ-002',
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

      // Try to approve with unauthorized role (author cannot approve in_review)
      await expect(
        workflowService.approve(requirementId, testUserId, 'author')
      ).rejects.toThrow(/not authorized/);
    });

    it('should allow authorized reviewer to approve', async () => {
      // Create requirement in in_review status
      const reqResult = await pool.query(
        `INSERT INTO requirements (
          display_id, project_id, title, description, type, status, priority,
          version, tags, custom_fields, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          'REQ-003',
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

      // Approve with authorized role (approver can approve in_review)
      const updatedReq = await workflowService.approve(
        requirementId,
        testApproverUserId,
        'approver'
      );

      expect(updatedReq.status).toBe('approved');
    });

    it('should reject invalid transitions', async () => {
      // Create requirement in approved status
      const reqResult = await pool.query(
        `INSERT INTO requirements (
          display_id, project_id, title, description, type, status, priority,
          version, tags, custom_fields, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          'REQ-004',
          testProjectId,
          'Test Requirement',
          'Test description',
          'system_requirement',
          'approved',
          'high',
          1,
          [],
          {},
          testUserId,
          testUserId,
        ]
      );
      const requirementId = reqResult.rows[0].id;

      // Try to approve from approved status (no such transition)
      await expect(
        workflowService.approve(requirementId, testApproverUserId, 'approver')
      ).rejects.toThrow(/Invalid transition/);
    });
  });

  describe('requestChanges', () => {
    it('should request changes and transition to draft', async () => {
      // Create requirement in in_review status
      const reqResult = await pool.query(
        `INSERT INTO requirements (
          display_id, project_id, title, description, type, status, priority,
          version, tags, custom_fields, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          'REQ-005',
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

      // Request changes
      const updatedReq = await workflowService.requestChanges(
        requirementId,
        testApproverUserId,
        'approver',
        'Missing acceptance criteria'
      );

      expect(updatedReq.status).toBe('draft');
      expect(updatedReq.version).toBe(2);

      // Verify audit entry
      const auditEntries = await auditService.getEntityHistory('requirement', requirementId);
      const changeEntry = auditEntries.find((e) => e.action === 'request_changes');
      expect(changeEntry).toBeDefined();
      expect(changeEntry?.changeDescription).toContain('Missing acceptance criteria');
    });
  });

  describe('reject', () => {
    it('should reject a requirement and transition to deprecated', async () => {
      // Create requirement in in_review status
      const reqResult = await pool.query(
        `INSERT INTO requirements (
          display_id, project_id, title, description, type, status, priority,
          version, tags, custom_fields, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          'REQ-006',
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

      // Reject
      const updatedReq = await workflowService.reject(
        requirementId,
        testApproverUserId,
        'approver',
        'Out of scope'
      );

      expect(updatedReq.status).toBe('deprecated');
      expect(updatedReq.version).toBe(2);

      // Verify audit entry
      const auditEntries = await auditService.getEntityHistory('requirement', requirementId);
      const rejectEntry = auditEntries.find((e) => e.action === 'reject');
      expect(rejectEntry).toBeDefined();
      expect(rejectEntry?.changeDescription).toContain('Out of scope');
    });
  });

  describe('workflow without approval configuration', () => {
    it('should throw error if project has no workflow', async () => {
      // Create project without workflow
      const projectResult = await pool.query(
        `INSERT INTO projects (name, description, custom_field_definitions, approval_workflow, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['No Workflow Project', 'No workflow', '[]', null, testUserId]
      );
      const noWorkflowProjectId = projectResult.rows[0].id;

      // Create requirement
      const reqResult = await pool.query(
        `INSERT INTO requirements (
          display_id, project_id, title, description, type, status, priority,
          version, tags, custom_fields, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          'REQ-007',
          noWorkflowProjectId,
          'Test Requirement',
          'Test description',
          'system_requirement',
          'draft',
          'high',
          1,
          [],
          {},
          testUserId,
          testUserId,
        ]
      );
      const requirementId = reqResult.rows[0].id;

      // Try to approve
      await expect(
        workflowService.approve(requirementId, testUserId, 'author')
      ).rejects.toThrow(/does not have an approval workflow/);

      // Clean up
      await pool.query('DELETE FROM requirements WHERE project_id = $1', [noWorkflowProjectId]);
      await pool.query('DELETE FROM projects WHERE id = $1', [noWorkflowProjectId]);
    });
  });
});
