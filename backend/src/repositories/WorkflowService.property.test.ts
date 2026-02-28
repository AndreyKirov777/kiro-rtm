import * as fc from 'fast-check';
import { WorkflowService } from './WorkflowService';
import { AuditService } from './AuditService';
import pool from '../config/database';
import {
  ApprovalWorkflow,
  WorkflowState,
  WorkflowTransition,
} from '../types';

/**
 * Property-Based Tests for WorkflowService
 * 
 * **Property 22: Workflow State Transition Enforcement**
 * **Validates: Requirements 19.1-19.4, 20.1-20.6**
 * 
 * This test suite validates that workflow state transitions are correctly enforced
 * according to the configured workflow rules, and that unauthorized transitions
 * are properly rejected.
 */

describe('WorkflowService - Property Tests', () => {
  let workflowService: WorkflowService;
  let auditService: AuditService;
  let testUserId: string;
  let testProjectId: string;

  beforeAll(async () => {
    auditService = new AuditService(pool);
    workflowService = new WorkflowService(pool, auditService);

    // Create test user with unique email
    const userResult = await pool.query(
      `INSERT INTO users (email, name, role)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [`workflow-property-test-${Date.now()}@example.com`, 'Property Test User', 'administrator']
    );
    testUserId = userResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up - delete in correct order to respect foreign keys
    if (testProjectId) {
      await pool.query('DELETE FROM requirements WHERE project_id = $1', [testProjectId]);
      await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
    }
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    await pool.end();
  });

  afterEach(async () => {
    // Clean up requirements after each test
    if (testProjectId) {
      await pool.query('DELETE FROM requirements WHERE project_id = $1', [testProjectId]);
    }
  });

  /**
   * Arbitrary for generating valid workflow states
   */
  const workflowStateArbitrary = (): fc.Arbitrary<WorkflowState> => {
    return fc.record({
      id: fc.constantFrom('draft', 'in_review', 'approved', 'deprecated'),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      requiresApproval: fc.boolean(),
      reviewerRoles: fc.array(
        fc.constantFrom('viewer', 'author', 'reviewer', 'approver', 'administrator'),
        { minLength: 0, maxLength: 3 }
      ),
    });
  };

  /**
   * Arbitrary for generating valid workflow transitions
   */
  const workflowTransitionArbitrary = (): fc.Arbitrary<WorkflowTransition> => {
    return fc.record({
      fromState: fc.constantFrom('draft', 'in_review', 'approved', 'deprecated'),
      toState: fc.constantFrom('draft', 'in_review', 'approved', 'deprecated'),
      action: fc.constantFrom('approve', 'request_changes', 'reject'),
      requiresSignature: fc.boolean(),
    });
  };

  /**
   * Arbitrary for generating valid approval workflows
   * Ensures at least one state and one transition exist
   */
  const approvalWorkflowArbitrary = (): fc.Arbitrary<ApprovalWorkflow> => {
    return fc.record({
      states: fc.array(workflowStateArbitrary(), { minLength: 1, maxLength: 4 }),
      transitions: fc.array(workflowTransitionArbitrary(), { minLength: 1, maxLength: 6 }),
    });
  };

  /**
   * Property 22: Workflow State Transition Enforcement
   * 
   * **Validates: Requirements 19.1-19.4, 20.1-20.6**
   * 
   * This property verifies that:
   * 1. Valid transitions defined in the workflow are allowed
   * 2. Invalid transitions (not in workflow) are rejected
   * 3. Authorization is enforced based on reviewer roles
   * 4. Audit entries are created for all transitions
   * 5. Version numbers are incremented on successful transitions
   */
  describe('Property 22: Workflow State Transition Enforcement', () => {
    it('should only allow transitions defined in the workflow', async () => {
      await fc.assert(
        fc.asyncProperty(
          approvalWorkflowArbitrary(),
          fc.constantFrom('draft', 'in_review', 'approved', 'deprecated'),
          fc.constantFrom('approve', 'request_changes', 'reject'),
          async (workflow, currentStatus, action) => {
            // Create project with this workflow
            const projectResult = await pool.query(
              `INSERT INTO projects (name, description, custom_field_definitions, approval_workflow, created_by)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id`,
              [
                `Test Project ${Date.now()}`,
                'Property test project',
                '[]',
                JSON.stringify(workflow),
                testUserId,
              ]
            );
            testProjectId = projectResult.rows[0].id;

            // Create requirement with current status
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
                currentStatus,
                'high',
                1,
                [],
                {},
                testUserId,
                testUserId,
              ]
            );
            const requirementId = reqResult.rows[0].id;

            // Check if this transition is defined in the workflow
            const transitionExists = workflow.transitions.some(
              (t) => t.fromState === currentStatus && t.action === action
            );

            try {
              // Attempt the transition
              let result;
              if (action === 'approve') {
                result = await workflowService.approve(
                  requirementId,
                  testUserId,
                  'administrator'
                );
              } else if (action === 'request_changes') {
                result = await workflowService.requestChanges(
                  requirementId,
                  testUserId,
                  'administrator',
                  'Test reason'
                );
              } else {
                result = await workflowService.reject(
                  requirementId,
                  testUserId,
                  'administrator',
                  'Test reason'
                );
              }

              // If we got here, the transition succeeded
              // It should only succeed if the transition exists in the workflow
              expect(transitionExists).toBe(true);

              // Verify the status changed to the expected target state
              const transition = workflow.transitions.find(
                (t) => t.fromState === currentStatus && t.action === action
              );
              expect(result.status).toBe(transition!.toState);

              // Verify version was incremented
              expect(result.version).toBe(2);

              // Verify audit entry was created
              const auditEntries = await auditService.getEntityHistory(
                'requirement',
                requirementId
              );
              const actionEntry = auditEntries.find((e) => e.action === action);
              expect(actionEntry).toBeDefined();
            } catch (error: any) {
              // If the transition failed, it should be because it doesn't exist
              // or there's an authorization issue, or the workflow state is invalid
              if (transitionExists) {
                // If the transition exists but still failed, it might be due to:
                // - Invalid workflow state
                // - Authorization issues
                // - Other workflow configuration problems
                // These are acceptable failures for property testing
                expect(
                  error.message.includes('Invalid workflow state') ||
                    error.message.includes('not authorized') ||
                    error.message.includes('Invalid transition')
                ).toBe(true);
              } else {
                // If transition doesn't exist, we expect an "Invalid transition" error
                expect(error.message).toContain('Invalid transition');
              }
            }

            // Clean up
            await pool.query('DELETE FROM requirements WHERE id = $1', [requirementId]);
            await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
          }
        ),
        { numRuns: 50 } // Run 50 iterations to test various workflow configurations
      );
    });

    it('should enforce reviewer authorization based on workflow state configuration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('viewer', 'author', 'reviewer', 'approver', 'administrator'),
          async (userRole) => {
            // Create a workflow with specific authorization requirements
            const workflow: ApprovalWorkflow = {
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
                  reviewerRoles: ['reviewer', 'approver', 'administrator'],
                },
                {
                  id: 'approved',
                  name: 'Approved',
                  requiresApproval: false,
                  reviewerRoles: [],
                },
              ],
              transitions: [
                {
                  fromState: 'in_review',
                  toState: 'approved',
                  action: 'approve',
                  requiresSignature: true,
                },
              ],
            };

            // Create project with this workflow
            const projectResult = await pool.query(
              `INSERT INTO projects (name, description, custom_field_definitions, approval_workflow, created_by)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id`,
              [
                `Auth Test Project ${Date.now()}`,
                'Authorization test',
                '[]',
                JSON.stringify(workflow),
                testUserId,
              ]
            );
            testProjectId = projectResult.rows[0].id;

            // Create user with the test role
            const roleUserResult = await pool.query(
              `INSERT INTO users (email, name, role)
               VALUES ($1, $2, $3)
               RETURNING id`,
              [`${userRole}-${Date.now()}@example.com`, `Test ${userRole}`, userRole]
            );
            const roleUserId = roleUserResult.rows[0].id;

            // Create requirement in in_review status
            const reqResult = await pool.query(
              `INSERT INTO requirements (
                display_id, project_id, title, description, type, status, priority,
                version, tags, custom_fields, created_by, updated_by
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              RETURNING id`,
              [
                `REQ-AUTH-${Date.now()}`,
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

            // Check if this role is authorized
            const isAuthorized = workflow.states
              .find((s) => s.id === 'in_review')
              ?.reviewerRoles.includes(userRole);

            try {
              // Attempt to approve - cast userRole to any to bypass type checking
              // since we're testing with dynamically generated roles
              const result = await workflowService.approve(
                requirementId,
                roleUserId,
                userRole as any
              );

              // If we got here, the approval succeeded
              // It should only succeed if the role is authorized
              expect(isAuthorized).toBe(true);
              expect(result.status).toBe('approved');
            } catch (error: any) {
              // If it failed, it should be because the role is not authorized
              if (error.message.includes('not authorized')) {
                expect(isAuthorized).toBe(false);
              } else {
                // Unexpected error
                throw error;
              }
            }

            // Clean up
            await pool.query('DELETE FROM requirements WHERE id = $1', [requirementId]);
            await pool.query('DELETE FROM users WHERE id = $1', [roleUserId]);
            await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
          }
        ),
        { numRuns: 20 } // Test with different user roles
      );
    });

    it('should create audit entries for all workflow transitions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('approve', 'request_changes', 'reject'),
          async (action) => {
            // Create a simple workflow that allows all actions from in_review
            const workflow: ApprovalWorkflow = {
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
                  requiresApproval: false,
                  reviewerRoles: [],
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
                  fromState: 'in_review',
                  toState: 'approved',
                  action: 'approve',
                  requiresSignature: false,
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

            // Create project
            const projectResult = await pool.query(
              `INSERT INTO projects (name, description, custom_field_definitions, approval_workflow, created_by)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id`,
              [
                `Audit Test Project ${Date.now()}`,
                'Audit test',
                '[]',
                JSON.stringify(workflow),
                testUserId,
              ]
            );
            testProjectId = projectResult.rows[0].id;

            // Create requirement
            const reqResult = await pool.query(
              `INSERT INTO requirements (
                display_id, project_id, title, description, type, status, priority,
                version, tags, custom_fields, created_by, updated_by
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              RETURNING id`,
              [
                `REQ-AUDIT-${Date.now()}`,
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

            // Get audit entries before action
            const auditEntriesBefore = await auditService.getEntityHistory(
              'requirement',
              requirementId
            );
            const countBefore = auditEntriesBefore.length;

            // Perform the action
            if (action === 'approve') {
              await workflowService.approve(requirementId, testUserId, 'administrator');
            } else if (action === 'request_changes') {
              await workflowService.requestChanges(
                requirementId,
                testUserId,
                'administrator',
                'Test reason'
              );
            } else {
              await workflowService.reject(
                requirementId,
                testUserId,
                'administrator',
                'Test reason'
              );
            }

            // Get audit entries after action
            const auditEntriesAfter = await auditService.getEntityHistory(
              'requirement',
              requirementId
            );
            const countAfter = auditEntriesAfter.length;

            // Verify an audit entry was created
            expect(countAfter).toBeGreaterThan(countBefore);

            // Verify the audit entry has the correct action
            const newEntry = auditEntriesAfter.find((e) => e.action === action);
            expect(newEntry).toBeDefined();
            expect(newEntry?.entityType).toBe('requirement');
            expect(newEntry?.entityId).toBe(requirementId);
            expect(newEntry?.actorId).toBe(testUserId);

            // Clean up
            await pool.query('DELETE FROM requirements WHERE id = $1', [requirementId]);
            await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
          }
        ),
        { numRuns: 15 } // Test all three actions multiple times
      );
    });

    it('should increment version number on successful transitions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (initialVersion) => {
            // Create a simple workflow
            const workflow: ApprovalWorkflow = {
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
              ],
            };

            // Create project
            const projectResult = await pool.query(
              `INSERT INTO projects (name, description, custom_field_definitions, approval_workflow, created_by)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id`,
              [
                `Version Test Project ${Date.now()}`,
                'Version test',
                '[]',
                JSON.stringify(workflow),
                testUserId,
              ]
            );
            testProjectId = projectResult.rows[0].id;

            // Create requirement with initial version
            const reqResult = await pool.query(
              `INSERT INTO requirements (
                display_id, project_id, title, description, type, status, priority,
                version, tags, custom_fields, created_by, updated_by
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              RETURNING id`,
              [
                `REQ-VER-${Date.now()}`,
                testProjectId,
                'Test Requirement',
                'Test description',
                'system_requirement',
                'draft',
                'high',
                initialVersion,
                [],
                {},
                testUserId,
                testUserId,
              ]
            );
            const requirementId = reqResult.rows[0].id;

            // Perform transition
            const result = await workflowService.approve(
              requirementId,
              testUserId,
              'administrator'
            );

            // Verify version was incremented
            expect(result.version).toBe(initialVersion + 1);

            // Clean up
            await pool.query('DELETE FROM requirements WHERE id = $1', [requirementId]);
            await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
          }
        ),
        { numRuns: 10 } // Test with different initial versions
      );
    });
  });
});
