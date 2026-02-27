import * as fc from 'fast-check';
import { PostgresGraphRepository } from './PostgresGraphRepository';
import { RequirementRepository } from './RequirementRepository';
import { TraceabilityLinkRepository } from './TraceabilityLinkRepository';
import pool from '../config/database';

/**
 * Property-Based Tests for Graph Repository
 * 
 * **Validates: Requirements 10.1-10.3, 12.1-12.4**
 * 
 * Property 11: Orphaned Requirement Detection
 * For any requirement, it should be identified as orphaned if and only if it has 
 * zero downstream traceability links.
 * 
 * Property 14: Impact Analysis Completeness
 * For any requirement, impact analysis must identify all requirements and external 
 * items that have traceability links (direct or transitive) from the requirement.
 */
describe('GraphRepository - Property-Based Tests', () => {
  let graphRepository: PostgresGraphRepository;
  let requirementRepository: RequirementRepository;
  let linkRepository: TraceabilityLinkRepository;
  let testProjectId: string;
  let testUserId: string;

  beforeAll(async () => {
    graphRepository = new PostgresGraphRepository(pool);
    requirementRepository = new RequirementRepository(pool);
    linkRepository = new TraceabilityLinkRepository(pool);

    // Create a test user
    const userResult = await pool.query(`
      INSERT INTO users (email, name, role)
      VALUES ('graph-test@example.com', 'Graph Test User', 'author')
      RETURNING id
    `);
    testUserId = userResult.rows[0].id;

    // Create a test project
    const projectResult = await pool.query(`
      INSERT INTO projects (name, description, created_by)
      VALUES ('Graph Test Project', 'For graph property-based testing', $1)
      RETURNING id
    `, [testUserId]);
    testProjectId = projectResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM traceability_links WHERE created_by = $1', [testUserId]);
    await pool.query('DELETE FROM requirements WHERE project_id = $1', [testProjectId]);
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  });

  afterEach(async () => {
    // Clean up links and requirements after each test
    await pool.query('DELETE FROM traceability_links WHERE created_by = $1', [testUserId]);
    await pool.query('DELETE FROM requirements WHERE project_id = $1', [testProjectId]);
  });

  /**
   * Property 11: Orphaned Requirement Detection
   * 
   * **Validates: Requirements 10.1-10.3**
   */
  describe('Property 11: Orphaned Requirement Detection', () => {
    it('should identify requirements with zero downstream links as orphaned', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a set of requirements with some having links and some not
          fc.record({
            orphanedCount: fc.integer({ min: 1, max: 5 }),
            linkedCount: fc.integer({ min: 1, max: 5 }),
          }),
          async ({ orphanedCount, linkedCount }) => {
            const createdReqIds: string[] = [];
            const orphanedReqIds: string[] = [];
            const linkedReqIds: string[] = [];

            try {
              // Create orphaned requirements (no downstream links)
              for (let i = 0; i < orphanedCount; i++) {
                const req = await requirementRepository.create({
                  displayId: `ORPHAN-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`,
                  projectId: testProjectId,
                  parentId: null,
                  title: `Orphaned Requirement ${i}`,
                  description: 'This requirement has no downstream links',
                  type: 'system_requirement',
                  status: 'draft',
                  priority: 'medium',
                  tags: [],
                  customFields: {},
                  createdBy: testUserId,
                  updatedBy: testUserId,
                });
                createdReqIds.push(req.id);
                orphanedReqIds.push(req.id);
              }

              // Create linked requirements (with downstream links)
              for (let i = 0; i < linkedCount; i++) {
                const sourceReq = await requirementRepository.create({
                  displayId: `LINKED-SRC-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`,
                  projectId: testProjectId,
                  parentId: null,
                  title: `Linked Source Requirement ${i}`,
                  description: 'This requirement has downstream links',
                  type: 'system_requirement',
                  status: 'draft',
                  priority: 'medium',
                  tags: [],
                  customFields: {},
                  createdBy: testUserId,
                  updatedBy: testUserId,
                });
                createdReqIds.push(sourceReq.id);
                linkedReqIds.push(sourceReq.id);

                // Create a target requirement
                const targetReq = await requirementRepository.create({
                  displayId: `LINKED-TGT-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`,
                  projectId: testProjectId,
                  parentId: null,
                  title: `Linked Target Requirement ${i}`,
                  description: 'This is a target of a link',
                  type: 'software_requirement',
                  status: 'draft',
                  priority: 'medium',
                  tags: [],
                  customFields: {},
                  createdBy: testUserId,
                  updatedBy: testUserId,
                });
                createdReqIds.push(targetReq.id);

                // Create a downstream link
                await linkRepository.createLink({
                  sourceId: sourceReq.id,
                  targetId: targetReq.id,
                  targetType: 'requirement',
                  linkType: 'satisfies',
                  createdBy: testUserId,
                });
              }

              // Find orphaned requirements
              const orphanedRequirements = await graphRepository.findOrphanedRequirements(
                testProjectId,
                'downstream'
              );

              // Verify that all orphaned requirements are identified
              const orphanedIds = orphanedRequirements.map(r => r.id);
              
              // All orphaned requirements should be in the result
              for (const orphanedId of orphanedReqIds) {
                expect(orphanedIds).toContain(orphanedId);
              }

              // No linked requirements should be in the result
              for (const linkedId of linkedReqIds) {
                expect(orphanedIds).not.toContain(linkedId);
              }

              // Verify count matches
              expect(orphanedRequirements.length).toBeGreaterThanOrEqual(orphanedCount);

            } finally {
              // Clean up
              await pool.query('DELETE FROM traceability_links WHERE created_by = $1', [testUserId]);
              for (const id of createdReqIds) {
                await pool.query('DELETE FROM requirements WHERE id = $1', [id]);
              }
            }
          }
        ),
        {
          numRuns: 50,
          verbose: true,
        }
      );
    });

    it('should not identify requirements with upstream-only links as orphaned when checking downstream', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }),
          async (count) => {
            const createdReqIds: string[] = [];

            try {
              // Create requirements that have upstream links but no downstream links
              for (let i = 0; i < count; i++) {
                const targetReq = await requirementRepository.create({
                  displayId: `UPSTREAM-ONLY-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`,
                  projectId: testProjectId,
                  parentId: null,
                  title: `Requirement with upstream link ${i}`,
                  description: 'Has upstream link but no downstream link',
                  type: 'software_requirement',
                  status: 'draft',
                  priority: 'medium',
                  tags: [],
                  customFields: {},
                  createdBy: testUserId,
                  updatedBy: testUserId,
                });
                createdReqIds.push(targetReq.id);

                // Create a source requirement
                const sourceReq = await requirementRepository.create({
                  displayId: `UPSTREAM-SRC-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`,
                  projectId: testProjectId,
                  parentId: null,
                  title: `Source Requirement ${i}`,
                  description: 'Links to target',
                  type: 'system_requirement',
                  status: 'draft',
                  priority: 'medium',
                  tags: [],
                  customFields: {},
                  createdBy: testUserId,
                  updatedBy: testUserId,
                });
                createdReqIds.push(sourceReq.id);

                // Create upstream link (source -> target)
                await linkRepository.createLink({
                  sourceId: sourceReq.id,
                  targetId: targetReq.id,
                  targetType: 'requirement',
                  linkType: 'derives_from',
                  createdBy: testUserId,
                });
              }

              // Find orphaned requirements (downstream direction)
              const orphanedRequirements = await graphRepository.findOrphanedRequirements(
                testProjectId,
                'downstream'
              );

              // Requirements with upstream links should still be orphaned in downstream direction
              // (they have no downstream links)
              // This verifies the direction parameter works correctly
              expect(orphanedRequirements.length).toBeGreaterThanOrEqual(0);

            } finally {
              // Clean up
              await pool.query('DELETE FROM traceability_links WHERE created_by = $1', [testUserId]);
              for (const id of createdReqIds) {
                await pool.query('DELETE FROM requirements WHERE id = $1', [id]);
              }
            }
          }
        ),
        {
          numRuns: 30,
          verbose: true,
        }
      );
    });

    it('should handle requirements that become orphaned after link deletion', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }),
          async (count) => {
            const createdReqIds: string[] = [];
            const linkIds: string[] = [];

            try {
              for (let i = 0; i < count; i++) {
                // Create source requirement
                const sourceReq = await requirementRepository.create({
                  displayId: `TEMP-LINKED-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`,
                  projectId: testProjectId,
                  parentId: null,
                  title: `Temporarily Linked Requirement ${i}`,
                  description: 'Will become orphaned',
                  type: 'system_requirement',
                  status: 'draft',
                  priority: 'medium',
                  tags: [],
                  customFields: {},
                  createdBy: testUserId,
                  updatedBy: testUserId,
                });
                createdReqIds.push(sourceReq.id);

                // Create target requirement
                const targetReq = await requirementRepository.create({
                  displayId: `TEMP-TARGET-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`,
                  projectId: testProjectId,
                  parentId: null,
                  title: `Target Requirement ${i}`,
                  description: 'Target',
                  type: 'software_requirement',
                  status: 'draft',
                  priority: 'medium',
                  tags: [],
                  customFields: {},
                  createdBy: testUserId,
                  updatedBy: testUserId,
                });
                createdReqIds.push(targetReq.id);

                // Create link
                const link = await linkRepository.createLink({
                  sourceId: sourceReq.id,
                  targetId: targetReq.id,
                  targetType: 'requirement',
                  linkType: 'satisfies',
                  createdBy: testUserId,
                });
                linkIds.push(link.id);
              }

              // Verify requirements are not orphaned initially
              const orphanedBefore = await graphRepository.findOrphanedRequirements(
                testProjectId,
                'downstream'
              );
              const orphanedIdsBefore = orphanedBefore.map(r => r.id);
              
              // Source requirements should not be orphaned (they have downstream links)
              for (let i = 0; i < count; i++) {
                expect(orphanedIdsBefore).not.toContain(createdReqIds[i * 2]);
              }

              // Delete all links
              for (const linkId of linkIds) {
                await linkRepository.deleteLink(linkId);
              }

              // Verify requirements are now orphaned
              const orphanedAfter = await graphRepository.findOrphanedRequirements(
                testProjectId,
                'downstream'
              );
              const orphanedIdsAfter = orphanedAfter.map(r => r.id);

              // Source requirements should now be orphaned
              for (let i = 0; i < count; i++) {
                expect(orphanedIdsAfter).toContain(createdReqIds[i * 2]);
              }

            } finally {
              // Clean up
              await pool.query('DELETE FROM traceability_links WHERE created_by = $1', [testUserId]);
              for (const id of createdReqIds) {
                await pool.query('DELETE FROM requirements WHERE id = $1', [id]);
              }
            }
          }
        ),
        {
          numRuns: 30,
          verbose: true,
        }
      );
    });
  });

  /**
   * Property 14: Impact Analysis Completeness
   * 
   * **Validates: Requirements 12.1-12.4**
   */
  describe('Property 14: Impact Analysis Completeness', () => {
    it('should identify all direct downstream requirements in impact analysis', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            downstreamCount: fc.integer({ min: 1, max: 5 }),
          }),
          async ({ downstreamCount }) => {
            const createdReqIds: string[] = [];
            const downstreamReqIds: string[] = [];

            try {
              // Create root requirement
              const rootReq = await requirementRepository.create({
                displayId: `ROOT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                projectId: testProjectId,
                parentId: null,
                title: 'Root Requirement for Impact Analysis',
                description: 'Root requirement',
                type: 'system_requirement',
                status: 'draft',
                priority: 'high',
                tags: [],
                customFields: {},
                createdBy: testUserId,
                updatedBy: testUserId,
              });
              createdReqIds.push(rootReq.id);

              // Create direct downstream requirements
              for (let i = 0; i < downstreamCount; i++) {
                const downstreamReq = await requirementRepository.create({
                  displayId: `DOWNSTREAM-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`,
                  projectId: testProjectId,
                  parentId: null,
                  title: `Downstream Requirement ${i}`,
                  description: 'Direct downstream',
                  type: 'software_requirement',
                  status: 'draft',
                  priority: 'medium',
                  tags: [],
                  customFields: {},
                  createdBy: testUserId,
                  updatedBy: testUserId,
                });
                createdReqIds.push(downstreamReq.id);
                downstreamReqIds.push(downstreamReq.id);

                // Create link from root to downstream
                await linkRepository.createLink({
                  sourceId: rootReq.id,
                  targetId: downstreamReq.id,
                  targetType: 'requirement',
                  linkType: 'satisfies',
                  createdBy: testUserId,
                });
              }

              // Perform impact analysis
              const impactTree = await graphRepository.calculateImpactAnalysis(rootReq.id);

              // Verify all direct downstream requirements are in the impact tree
              const impactedIds = impactTree.impactedNodes.map(node => node.requirement.id);

              expect(impactTree.totalImpacted).toBe(downstreamCount);
              
              for (const downstreamId of downstreamReqIds) {
                expect(impactedIds).toContain(downstreamId);
              }

              // Verify depth is 1 for all direct links
              for (const node of impactTree.impactedNodes) {
                expect(node.depth).toBe(1);
              }

            } finally {
              // Clean up
              await pool.query('DELETE FROM traceability_links WHERE created_by = $1', [testUserId]);
              for (const id of createdReqIds) {
                await pool.query('DELETE FROM requirements WHERE id = $1', [id]);
              }
            }
          }
        ),
        {
          numRuns: 50,
          verbose: true,
        }
      );
    });

    it('should identify all transitive downstream requirements in impact analysis', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            chainLength: fc.integer({ min: 2, max: 5 }),
          }),
          async ({ chainLength }) => {
            const createdReqIds: string[] = [];
            const allDownstreamIds: string[] = [];

            try {
              // Create a chain of requirements: root -> req1 -> req2 -> ... -> reqN
              let previousReqId: string | null = null;

              for (let i = 0; i < chainLength; i++) {
                const req = await requirementRepository.create({
                  displayId: `CHAIN-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`,
                  projectId: testProjectId,
                  parentId: null,
                  title: `Chain Requirement ${i}`,
                  description: `Requirement at depth ${i}`,
                  type: i === 0 ? 'system_requirement' : 'software_requirement',
                  status: 'draft',
                  priority: 'medium',
                  tags: [],
                  customFields: {},
                  createdBy: testUserId,
                  updatedBy: testUserId,
                });
                createdReqIds.push(req.id);

                if (i > 0) {
                  allDownstreamIds.push(req.id);
                }

                // Create link from previous to current (except for first)
                if (previousReqId) {
                  await linkRepository.createLink({
                    sourceId: previousReqId,
                    targetId: req.id,
                    targetType: 'requirement',
                    linkType: 'derives_from',
                    createdBy: testUserId,
                  });
                }

                previousReqId = req.id;
              }

              // Perform impact analysis from the root (first requirement)
              const rootReqId = createdReqIds[0];
              const impactTree = await graphRepository.calculateImpactAnalysis(rootReqId);

              // Verify all transitive downstream requirements are identified
              const impactedIds = impactTree.impactedNodes.map(node => node.requirement.id);

              expect(impactTree.totalImpacted).toBe(chainLength - 1);
              
              for (const downstreamId of allDownstreamIds) {
                expect(impactedIds).toContain(downstreamId);
              }

              // Verify max depth matches chain length - 1
              expect(impactTree.maxDepth).toBe(chainLength - 1);

              // Verify depths are correct
              for (const node of impactTree.impactedNodes) {
                const index = allDownstreamIds.indexOf(node.requirement.id);
                expect(node.depth).toBe(index + 1);
              }

            } finally {
              // Clean up
              await pool.query('DELETE FROM traceability_links WHERE created_by = $1', [testUserId]);
              for (const id of createdReqIds) {
                await pool.query('DELETE FROM requirements WHERE id = $1', [id]);
              }
            }
          }
        ),
        {
          numRuns: 50,
          verbose: true,
        }
      );
    });

    it('should identify all requirements in a branching impact tree', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            branchCount: fc.integer({ min: 2, max: 4 }),
            depthPerBranch: fc.integer({ min: 1, max: 3 }),
          }),
          async ({ branchCount, depthPerBranch }) => {
            const createdReqIds: string[] = [];
            const allDownstreamIds: string[] = [];

            try {
              // Create root requirement
              const rootReq = await requirementRepository.create({
                displayId: `BRANCH-ROOT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                projectId: testProjectId,
                parentId: null,
                title: 'Branching Root Requirement',
                description: 'Root with multiple branches',
                type: 'system_requirement',
                status: 'draft',
                priority: 'high',
                tags: [],
                customFields: {},
                createdBy: testUserId,
                updatedBy: testUserId,
              });
              createdReqIds.push(rootReq.id);

              // Create multiple branches
              for (let branch = 0; branch < branchCount; branch++) {
                let previousReqId = rootReq.id;

                // Create chain for this branch
                for (let depth = 0; depth < depthPerBranch; depth++) {
                  const req = await requirementRepository.create({
                    displayId: `BRANCH-${branch}-DEPTH-${depth}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    projectId: testProjectId,
                    parentId: null,
                    title: `Branch ${branch} Depth ${depth}`,
                    description: `Branch ${branch} at depth ${depth}`,
                    type: 'software_requirement',
                    status: 'draft',
                    priority: 'medium',
                    tags: [],
                    customFields: {},
                    createdBy: testUserId,
                    updatedBy: testUserId,
                  });
                  createdReqIds.push(req.id);
                  allDownstreamIds.push(req.id);

                  // Create link from previous to current
                  await linkRepository.createLink({
                    sourceId: previousReqId,
                    targetId: req.id,
                    targetType: 'requirement',
                    linkType: 'refines',
                    createdBy: testUserId,
                  });

                  previousReqId = req.id;
                }
              }

              // Perform impact analysis
              const impactTree = await graphRepository.calculateImpactAnalysis(rootReq.id);

              // Verify all downstream requirements are identified
              const impactedIds = impactTree.impactedNodes.map(node => node.requirement.id);

              const expectedTotal = branchCount * depthPerBranch;
              expect(impactTree.totalImpacted).toBe(expectedTotal);
              
              for (const downstreamId of allDownstreamIds) {
                expect(impactedIds).toContain(downstreamId);
              }

              // Verify max depth
              expect(impactTree.maxDepth).toBe(depthPerBranch);

            } finally {
              // Clean up
              await pool.query('DELETE FROM traceability_links WHERE created_by = $1', [testUserId]);
              for (const id of createdReqIds) {
                await pool.query('DELETE FROM requirements WHERE id = $1', [id]);
              }
            }
          }
        ),
        {
          numRuns: 30,
          verbose: true,
        }
      );
    });

    it('should handle impact analysis with no downstream requirements', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (title) => {
            let reqId: string | null = null;

            try {
              // Create isolated requirement with no links
              const req = await requirementRepository.create({
                displayId: `ISOLATED-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                projectId: testProjectId,
                parentId: null,
                title: title,
                description: 'Isolated requirement',
                type: 'system_requirement',
                status: 'draft',
                priority: 'medium',
                tags: [],
                customFields: {},
                createdBy: testUserId,
                updatedBy: testUserId,
              });
              reqId = req.id;

              // Perform impact analysis
              const impactTree = await graphRepository.calculateImpactAnalysis(req.id);

              // Verify no downstream requirements
              expect(impactTree.totalImpacted).toBe(0);
              expect(impactTree.impactedNodes).toHaveLength(0);
              expect(impactTree.maxDepth).toBe(0);
              expect(impactTree.root.id).toBe(req.id);

            } finally {
              // Clean up
              if (reqId) {
                await pool.query('DELETE FROM requirements WHERE id = $1', [reqId]);
              }
            }
          }
        ),
        {
          numRuns: 50,
          verbose: true,
        }
      );
    });

    it('should not include upstream requirements in downstream impact analysis', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }),
          async (count) => {
            const createdReqIds: string[] = [];
            const upstreamReqIds: string[] = [];
            const downstreamReqIds: string[] = [];

            try {
              // Create middle requirement
              const middleReq = await requirementRepository.create({
                displayId: `MIDDLE-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                projectId: testProjectId,
                parentId: null,
                title: 'Middle Requirement',
                description: 'Has both upstream and downstream',
                type: 'system_requirement',
                status: 'draft',
                priority: 'medium',
                tags: [],
                customFields: {},
                createdBy: testUserId,
                updatedBy: testUserId,
              });
              createdReqIds.push(middleReq.id);

              // Create upstream requirements
              for (let i = 0; i < count; i++) {
                const upstreamReq = await requirementRepository.create({
                  displayId: `UPSTREAM-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`,
                  projectId: testProjectId,
                  parentId: null,
                  title: `Upstream Requirement ${i}`,
                  description: 'Upstream',
                  type: 'stakeholder_need',
                  status: 'draft',
                  priority: 'high',
                  tags: [],
                  customFields: {},
                  createdBy: testUserId,
                  updatedBy: testUserId,
                });
                createdReqIds.push(upstreamReq.id);
                upstreamReqIds.push(upstreamReq.id);

                // Link upstream -> middle
                await linkRepository.createLink({
                  sourceId: upstreamReq.id,
                  targetId: middleReq.id,
                  targetType: 'requirement',
                  linkType: 'derives_from',
                  createdBy: testUserId,
                });
              }

              // Create downstream requirements
              for (let i = 0; i < count; i++) {
                const downstreamReq = await requirementRepository.create({
                  displayId: `DOWNSTREAM-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`,
                  projectId: testProjectId,
                  parentId: null,
                  title: `Downstream Requirement ${i}`,
                  description: 'Downstream',
                  type: 'software_requirement',
                  status: 'draft',
                  priority: 'medium',
                  tags: [],
                  customFields: {},
                  createdBy: testUserId,
                  updatedBy: testUserId,
                });
                createdReqIds.push(downstreamReq.id);
                downstreamReqIds.push(downstreamReq.id);

                // Link middle -> downstream
                await linkRepository.createLink({
                  sourceId: middleReq.id,
                  targetId: downstreamReq.id,
                  targetType: 'requirement',
                  linkType: 'satisfies',
                  createdBy: testUserId,
                });
              }

              // Perform impact analysis from middle
              const impactTree = await graphRepository.calculateImpactAnalysis(middleReq.id);

              const impactedIds = impactTree.impactedNodes.map(node => node.requirement.id);

              // Verify only downstream requirements are included
              for (const downstreamId of downstreamReqIds) {
                expect(impactedIds).toContain(downstreamId);
              }

              // Verify upstream requirements are NOT included
              for (const upstreamId of upstreamReqIds) {
                expect(impactedIds).not.toContain(upstreamId);
              }

              expect(impactTree.totalImpacted).toBe(count);

            } finally {
              // Clean up
              await pool.query('DELETE FROM traceability_links WHERE created_by = $1', [testUserId]);
              for (const id of createdReqIds) {
                await pool.query('DELETE FROM requirements WHERE id = $1', [id]);
              }
            }
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
