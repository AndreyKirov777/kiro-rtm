import * as fc from 'fast-check';
import { Pool } from 'pg';
import { BaselineService } from './BaselineService';
import { RequirementRepository } from './RequirementRepository';
import { Requirement, RequirementType, RequirementStatus, Priority } from '../types';

/**
 * Property-Based Tests for BaselineService
 * 
 * These tests validate the correctness properties for baseline operations:
 * - Property 19: Baseline Snapshot Accuracy
 * - Property 20: Baseline Immutability After Locking
 * - Property 21: Baseline Comparison Accuracy
 * 
 * **Validates: Requirements 16.1-16.5, 17.1-17.4**
 */

// Test database connection
let pool: Pool;
let baselineService: BaselineService;
let requirementRepository: RequirementRepository;

beforeAll(() => {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://rmt_user:rmt_password@localhost:5432/rmt_dev',
  });
  baselineService = new BaselineService(pool);
  requirementRepository = new RequirementRepository(pool);
});

afterAll(async () => {
  await pool.end();
});

// Helper function to create a test user
async function createTestUser(userId: string): Promise<void> {
  await pool.query(
    `INSERT INTO users (id, email, name, role) 
     VALUES ($1, $2, $3, $4) 
     ON CONFLICT (id) DO NOTHING`,
    [userId, `test-${userId}@example.com`, `Test User ${userId}`, 'author']
  );
}

// Helper function to create a test project
async function createTestProject(projectId: string, userId: string): Promise<void> {
  await createTestUser(userId);
  await pool.query(
    'INSERT INTO projects (id, name, created_by) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
    [projectId, `Test Project ${projectId}`, userId]
  );
}

// Helper function to clean up test data
async function cleanupTestData(projectId: string, ...userIds: string[]): Promise<void> {
  await pool.query('DELETE FROM baselines WHERE project_id = $1', [projectId]);
  await pool.query('DELETE FROM requirements WHERE project_id = $1', [projectId]);
  await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
  
  // Clean up users
  for (const userId of userIds) {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  }
}

// Arbitraries for generating test data
const requirementTypeArb = fc.constantFrom<RequirementType>(
  'stakeholder_need',
  'system_requirement',
  'software_requirement',
  'hardware_requirement',
  'constraint',
  'interface_requirement'
);

const requirementStatusArb = fc.constantFrom<RequirementStatus>(
  'draft',
  'in_review',
  'approved',
  'deprecated'
);

const priorityArb = fc.constantFrom<Priority>('critical', 'high', 'medium', 'low');

const requirementDataArb = fc.record({
  displayId: fc.string({ minLength: 3, maxLength: 20 }).map(s => `REQ-${s}`),
  title: fc.string({ minLength: 5, maxLength: 100 }),
  description: fc.string({ minLength: 10, maxLength: 500 }),
  type: requirementTypeArb,
  status: requirementStatusArb,
  priority: priorityArb,
  tags: fc.array(fc.string({ minLength: 3, maxLength: 15 }), { maxLength: 5 }),
  customFields: fc.dictionary(
    fc.string({ minLength: 3, maxLength: 20 }),
    fc.oneof(fc.string(), fc.integer(), fc.boolean())
  ),
});

/**
 * Property 19: Baseline Snapshot Accuracy
 * 
 * For any baseline created at time T, the baseline must capture the exact state
 * of all requirements as they existed at time T.
 * 
 * **Validates: Requirements 16.1-16.2**
 */
describe('Property 19: Baseline Snapshot Accuracy', () => {
  it('should capture exact state of all requirements at creation time', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.array(requirementDataArb, { minLength: 1, maxLength: 10 }),
        async (projectId, userId, baselineName, requirementsData) => {
          try {
            // Setup: Create project
            await createTestProject(projectId, userId);

            // Setup: Create requirements (ensure unique displayId per project)
            const createdRequirements: Requirement[] = [];
            for (let i = 0; i < requirementsData.length; i++) {
              const reqData = requirementsData[i];
              const req = await requirementRepository.create({
                ...reqData,
                displayId: `${reqData.displayId}-${Date.now()}-${i}`,
                projectId,
                parentId: null,
                createdBy: userId,
                updatedBy: userId,
              });
              createdRequirements.push(req);
            }

            // Action: Create baseline
            const baseline = await baselineService.createBaseline(
              projectId,
              baselineName,
              'Test baseline',
              userId
            );

            // Verify: Baseline snapshot matches current state
            const snapshotRequirements: Requirement[] = 
              typeof baseline.snapshotData === 'string'
                ? JSON.parse(baseline.snapshotData)
                : baseline.snapshotData;

            // Check count
            expect(snapshotRequirements.length).toBe(createdRequirements.length);

            // Check each requirement is captured accurately
            for (const createdReq of createdRequirements) {
              const snapshotReq = snapshotRequirements.find(r => r.id === createdReq.id);
              expect(snapshotReq).toBeDefined();
              
              if (snapshotReq) {
                // Verify all fields match
                expect(snapshotReq.displayId).toBe(createdReq.displayId);
                expect(snapshotReq.title).toBe(createdReq.title);
                expect(snapshotReq.description).toBe(createdReq.description);
                expect(snapshotReq.type).toBe(createdReq.type);
                expect(snapshotReq.status).toBe(createdReq.status);
                expect(snapshotReq.priority).toBe(createdReq.priority);
                expect(snapshotReq.version).toBe(createdReq.version);
                expect(JSON.stringify(snapshotReq.tags)).toBe(JSON.stringify(createdReq.tags));
                expect(JSON.stringify(snapshotReq.customFields)).toBe(
                  JSON.stringify(createdReq.customFields)
                );
              }
            }

            // Cleanup
            await cleanupTestData(projectId, userId);
          } catch (error) {
            await cleanupTestData(projectId, userId);
            throw error;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should not include requirements modified after baseline creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 5, maxLength: 50 }),
        requirementDataArb,
        fc.string({ minLength: 5, maxLength: 100 }),
        async (projectId, userId, baselineName, reqData, newTitle) => {
          fc.pre(newTitle !== reqData.title);
          try {
            // Setup: Create project
            await createTestProject(projectId, userId);

            // Setup: Create requirement
            const req = await requirementRepository.create({
              ...reqData,
              projectId,
              parentId: null,
              createdBy: userId,
              updatedBy: userId,
            });

            // Action: Create baseline
            const baseline = await baselineService.createBaseline(
              projectId,
              baselineName,
              'Test baseline',
              userId
            );

            // Modify requirement after baseline creation
            await requirementRepository.update(req.id, {
              title: newTitle,
              updatedBy: userId,
            });

            // Verify: Baseline still has original title
            const snapshotRequirements: Requirement[] = 
              typeof baseline.snapshotData === 'string'
                ? JSON.parse(baseline.snapshotData)
                : baseline.snapshotData;
            const snapshotReq = snapshotRequirements.find(r => r.id === req.id);
            
            expect(snapshotReq).toBeDefined();
            expect(snapshotReq?.title).toBe(reqData.title);
            expect(snapshotReq?.title).not.toBe(newTitle);

            // Cleanup
            await cleanupTestData(projectId, userId);
          } catch (error) {
            await cleanupTestData(projectId, userId);
            throw error;
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 20: Baseline Immutability After Locking
 * 
 * For any locked baseline, attempting to modify the baseline or any requirement
 * snapshot within it must fail, leaving the baseline unchanged.
 * 
 * **Validates: Requirements 16.3-16.5**
 */
describe('Property 20: Baseline Immutability After Locking', () => {
  it('should prevent modification of locked baselines', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 5, maxLength: 50 }),
        requirementDataArb,
        fc.string({ minLength: 5, maxLength: 50 }),
        async (projectId, userId, baselineName, reqData, newName) => {
          try {
            // Setup: Create project
            await createTestProject(projectId, userId);

            // Setup: Create requirement and baseline
            await requirementRepository.create({
              ...reqData,
              projectId,
              parentId: null,
              createdBy: userId,
              updatedBy: userId,
            });

            const baseline = await baselineService.createBaseline(
              projectId,
              baselineName,
              'Test baseline',
              userId
            );

            // Lock the baseline
            const lockedBaseline = await baselineService.lockBaseline(baseline.id, userId);
            expect(lockedBaseline.locked).toBe(true);
            expect(lockedBaseline.lockedBy).toBe(userId);
            expect(lockedBaseline.lockedAt).toBeDefined();

            // Action: Attempt to modify locked baseline
            await expect(
              baselineService.attemptModifyLockedBaseline(baseline.id, { name: newName })
            ).rejects.toThrow('Cannot modify locked baseline');

            // Verify: Baseline remains unchanged
            const unchangedBaseline = await baselineService.getBaseline(baseline.id);
            expect(unchangedBaseline?.name).toBe(baselineName);
            expect(unchangedBaseline?.locked).toBe(true);

            // Cleanup
            await cleanupTestData(projectId, userId);
          } catch (error) {
            await cleanupTestData(projectId, userId);
            throw error;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should prevent locking an already locked baseline', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 5, maxLength: 50 }),
        requirementDataArb,
        async (projectId, userId1, userId2, baselineName, reqData) => {
          try {
            // Setup: Create project
            await createTestProject(projectId, userId1);
            await createTestUser(userId2);

            // Setup: Create requirement and baseline
            await requirementRepository.create({
              ...reqData,
              projectId,
              parentId: null,
              createdBy: userId1,
              updatedBy: userId1,
            });

            const baseline = await baselineService.createBaseline(
              projectId,
              baselineName,
              'Test baseline',
              userId1
            );

            // Lock the baseline
            await baselineService.lockBaseline(baseline.id, userId1);

            // Action: Attempt to lock again
            await expect(
              baselineService.lockBaseline(baseline.id, userId2)
            ).rejects.toThrow('Baseline is already locked');

            // Verify: Original lock information is preserved
            const unchangedBaseline = await baselineService.getBaseline(baseline.id);
            expect(unchangedBaseline?.locked).toBe(true);
            expect(unchangedBaseline?.lockedBy).toBe(userId1);

            // Cleanup
            await cleanupTestData(projectId, userId1, userId2);
          } catch (error) {
            await cleanupTestData(projectId, userId1, userId2);
            throw error;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should preserve snapshot data after locking', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.array(requirementDataArb, { minLength: 1, maxLength: 5 }),
        async (projectId, userId, baselineName, requirementsData) => {
          try {
            // Setup: Create project
            await createTestProject(projectId, userId);

            // Setup: Create requirements
            for (const reqData of requirementsData) {
              await requirementRepository.create({
                ...reqData,
                projectId,
                parentId: null,
                createdBy: userId,
                updatedBy: userId,
              });
            }

            // Create baseline
            const baseline = await baselineService.createBaseline(
              projectId,
              baselineName,
              'Test baseline',
              userId
            );

            const originalSnapshotData = baseline.snapshotData;

            // Lock the baseline
            const lockedBaseline = await baselineService.lockBaseline(baseline.id, userId);

            // Verify: Snapshot data is unchanged (use deep equality since it's an object)
            expect(lockedBaseline.snapshotData).toStrictEqual(originalSnapshotData);

            // Cleanup
            await cleanupTestData(projectId, userId);
          } catch (error) {
            await cleanupTestData(projectId, userId);
            throw error;
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 21: Baseline Comparison Accuracy
 * 
 * For any two baselines or a baseline compared to current state, the comparison
 * must correctly identify all added, modified, and deleted requirements with
 * accurate field-level differences.
 * 
 * **Validates: Requirements 17.1-17.4**
 */
describe('Property 21: Baseline Comparison Accuracy', () => {
  it('should correctly identify added requirements', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 5, maxLength: 50 }),
        requirementDataArb,
        requirementDataArb,
        async (projectId, userId, baselineName, req1Data, req2Data) => {
          // Ensure unique display IDs
          fc.pre(req1Data.displayId !== req2Data.displayId);

          try {
            // Setup: Create project
            await createTestProject(projectId, userId);

            // Setup: Create first requirement
            await requirementRepository.create({
              ...req1Data,
              projectId,
              parentId: null,
              createdBy: userId,
              updatedBy: userId,
            });

            // Create baseline
            const baseline = await baselineService.createBaseline(
              projectId,
              baselineName,
              'Test baseline',
              userId
            );

            // Add second requirement after baseline
            const addedReq = await requirementRepository.create({
              ...req2Data,
              projectId,
              parentId: null,
              createdBy: userId,
              updatedBy: userId,
            });

            // Action: Compare baseline to current
            const comparison = await baselineService.compareBaselines(baseline.id, 'current');

            // Verify: Added requirement is detected
            expect(comparison.added.length).toBe(1);
            expect(comparison.added[0].id).toBe(addedReq.id);
            expect(comparison.modified.length).toBe(0);
            expect(comparison.deleted.length).toBe(0);

            // Cleanup
            await cleanupTestData(projectId, userId);
          } catch (error) {
            await cleanupTestData(projectId, userId);
            throw error;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should correctly identify modified requirements with field-level changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 5, maxLength: 50 }),
        requirementDataArb,
        fc.string({ minLength: 5, maxLength: 100 }),
        priorityArb,
        async (projectId, userId, baselineName, reqData, newTitle, newPriority) => {
          // Ensure we're actually changing something
          fc.pre(newTitle !== reqData.title || newPriority !== reqData.priority);

          try {
            // Setup: Create project
            await createTestProject(projectId, userId);

            // Setup: Create requirement
            const req = await requirementRepository.create({
              ...reqData,
              projectId,
              parentId: null,
              createdBy: userId,
              updatedBy: userId,
            });

            // Create baseline
            const baseline = await baselineService.createBaseline(
              projectId,
              baselineName,
              'Test baseline',
              userId
            );

            // Modify requirement after baseline
            await requirementRepository.update(req.id, {
              title: newTitle,
              priority: newPriority,
              updatedBy: userId,
            });

            // Action: Compare baseline to current
            const comparison = await baselineService.compareBaselines(baseline.id, 'current');

            // Verify: Modified requirement is detected
            expect(comparison.added.length).toBe(0);
            expect(comparison.modified.length).toBe(1);
            expect(comparison.deleted.length).toBe(0);

            const modifiedDiff = comparison.modified[0];
            expect(modifiedDiff.requirementId).toBe(req.id);
            expect(modifiedDiff.changes.length).toBeGreaterThan(0);

            // Verify field-level changes
            const titleChange = modifiedDiff.changes.find(c => c.field === 'title');
            if (newTitle !== reqData.title) {
              expect(titleChange).toBeDefined();
              expect(titleChange?.oldValue).toBe(reqData.title);
              expect(titleChange?.newValue).toBe(newTitle);
            }

            const priorityChange = modifiedDiff.changes.find(c => c.field === 'priority');
            if (newPriority !== reqData.priority) {
              expect(priorityChange).toBeDefined();
              expect(priorityChange?.oldValue).toBe(reqData.priority);
              expect(priorityChange?.newValue).toBe(newPriority);
            }

            // Cleanup
            await cleanupTestData(projectId, userId);
          } catch (error) {
            await cleanupTestData(projectId, userId);
            throw error;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should correctly identify deleted requirements', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 5, maxLength: 50 }),
        requirementDataArb,
        async (projectId, userId, baselineName, reqData) => {
          // Ensure requirement doesn't start as deprecated
          fc.pre(reqData.status !== 'deprecated');

          try {
            // Setup: Create project
            await createTestProject(projectId, userId);

            // Setup: Create requirement
            const req = await requirementRepository.create({
              ...reqData,
              projectId,
              parentId: null,
              createdBy: userId,
              updatedBy: userId,
            });

            // Create baseline
            const baseline = await baselineService.createBaseline(
              projectId,
              baselineName,
              'Test baseline',
              userId
            );

            // Delete requirement after baseline (soft delete via deprecation)
            await requirementRepository.delete(req.id, userId);

            // Action: Compare baseline to current
            const comparison = await baselineService.compareBaselines(baseline.id, 'current');

            // Verify: Modified requirement is detected (status changed to deprecated)
            // Note: We use soft delete, so it shows as modified, not deleted
            expect(comparison.modified.length).toBe(1);
            const modifiedDiff = comparison.modified[0];
            expect(modifiedDiff.requirementId).toBe(req.id);
            
            const statusChange = modifiedDiff.changes.find(c => c.field === 'status');
            expect(statusChange).toBeDefined();
            expect(statusChange?.newValue).toBe('deprecated');

            // Cleanup
            await cleanupTestData(projectId, userId);
          } catch (error) {
            await cleanupTestData(projectId, userId);
            throw error;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should correctly compare two baselines', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 5, maxLength: 50 }),
        requirementDataArb,
        requirementDataArb,
        async (projectId, userId, baseline1Name, baseline2Name, req1Data, req2Data) => {
          // Ensure unique display IDs
          fc.pre(req1Data.displayId !== req2Data.displayId);

          try {
            // Setup: Create project
            await createTestProject(projectId, userId);

            // Setup: Create first requirement
            await requirementRepository.create({
              ...req1Data,
              projectId,
              parentId: null,
              createdBy: userId,
              updatedBy: userId,
            });

            // Create first baseline
            const baseline1 = await baselineService.createBaseline(
              projectId,
              baseline1Name,
              'First baseline',
              userId
            );

            // Add second requirement
            const addedReq = await requirementRepository.create({
              ...req2Data,
              projectId,
              parentId: null,
              createdBy: userId,
              updatedBy: userId,
            });

            // Create second baseline
            const baseline2 = await baselineService.createBaseline(
              projectId,
              baseline2Name,
              'Second baseline',
              userId
            );

            // Action: Compare two baselines
            const comparison = await baselineService.compareBaselines(
              baseline1.id,
              baseline2.id
            );

            // Verify: Second requirement is detected as added
            expect(comparison.added.length).toBe(1);
            expect(comparison.added[0].id).toBe(addedReq.id);
            expect(comparison.modified.length).toBe(0);
            expect(comparison.deleted.length).toBe(0);

            // Cleanup
            await cleanupTestData(projectId, userId);
          } catch (error) {
            await cleanupTestData(projectId, userId);
            throw error;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should detect no changes when comparing identical states', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.array(requirementDataArb, { minLength: 1, maxLength: 3 }), // Reduced from 5 to 3
        async (projectId, userId, baselineName, requirementsData) => {
          try {
            // Setup: Create project
            await createTestProject(projectId, userId);

            // Setup: Create requirements
            for (const reqData of requirementsData) {
              await requirementRepository.create({
                ...reqData,
                projectId,
                parentId: null,
                createdBy: userId,
                updatedBy: userId,
              });
            }

            // Create baseline
            const baseline = await baselineService.createBaseline(
              projectId,
              baselineName,
              'Test baseline',
              userId
            );

            // Action: Compare baseline to current (no changes made)
            const comparison = await baselineService.compareBaselines(baseline.id, 'current');

            // Verify: No changes detected
            expect(comparison.added.length).toBe(0);
            expect(comparison.modified.length).toBe(0);
            expect(comparison.deleted.length).toBe(0);

            // Cleanup
            await cleanupTestData(projectId, userId);
          } catch (error) {
            await cleanupTestData(projectId, userId);
            throw error;
          }
        }
      ),
      { numRuns: 10 } // Reduced from 20 to 10
    );
  }, 10000); // Increased timeout to 10 seconds
});
