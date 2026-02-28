import * as fc from 'fast-check';
import { TraceabilityLinkRepository } from './TraceabilityLinkRepository';
import { RequirementRepository } from './RequirementRepository';
import { LinkType } from '../types';
import pool from '../config/database';

/**
 * Property-Based Tests for TraceabilityLinkRepository
 * 
 * **Validates: Requirements 8.1-8.7**
 * 
 * Property 9: Traceability Link Bidirectionality
 * For any traceability link created from source requirement A to target B, 
 * querying links from A should include the link to B, and querying links to B 
 * should include the link from A.
 */
describe('TraceabilityLinkRepository - Property-Based Tests', () => {
  let linkRepository: TraceabilityLinkRepository;
  let requirementRepository: RequirementRepository;
  let testProjectId: string;
  let testUserId: string;

  beforeAll(async () => {
    linkRepository = new TraceabilityLinkRepository(pool);
    requirementRepository = new RequirementRepository(pool);

    // Create a test user with unique email
    const uniqueEmail = `traceability-test-${Date.now()}@example.com`;
    const userResult = await pool.query(`
      INSERT INTO users (email, name, role)
      VALUES ($1, 'Traceability Test User', 'author')
      RETURNING id
    `, [uniqueEmail]);
    testUserId = userResult.rows[0].id;

    // Create a test project
    const projectResult = await pool.query(`
      INSERT INTO projects (name, description, created_by)
      VALUES ('Traceability Test Project', 'For traceability property-based testing', $1)
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
   * Property 9: Traceability Link Bidirectionality
   * 
   * **Validates: Requirements 8.1-8.7**
   */
  describe('Property 9: Traceability Link Bidirectionality', () => {
    it('should make links discoverable from both source and target directions', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary link data
          fc.record({
            linkType: fc.constantFrom<LinkType>(
              'derives_from',
              'refines',
              'satisfies',
              'verified_by',
              'conflicts_with',
              'relates_to'
            ),
            sourceTitle: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            targetTitle: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          }),
          async (linkData) => {
            let sourceReqId: string | null = null;
            let targetReqId: string | null = null;
            let linkId: string | null = null;

            try {
              // Create source requirement
              const sourceReq = await requirementRepository.create({
                displayId: `SRC-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                projectId: testProjectId,
                parentId: null,
                title: linkData.sourceTitle,
                description: 'Source requirement for bidirectionality test',
                type: 'system_requirement',
                status: 'draft',
                priority: 'medium',
                tags: [],
                customFields: {},
                createdBy: testUserId,
                updatedBy: testUserId,
              });
              sourceReqId = sourceReq.id;

              // Create target requirement
              const targetReq = await requirementRepository.create({
                displayId: `TGT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                projectId: testProjectId,
                parentId: null,
                title: linkData.targetTitle,
                description: 'Target requirement for bidirectionality test',
                type: 'software_requirement',
                status: 'draft',
                priority: 'medium',
                tags: [],
                customFields: {},
                createdBy: testUserId,
                updatedBy: testUserId,
              });
              targetReqId = targetReq.id;

              // Create traceability link from source to target
              const link = await linkRepository.createLink({
                sourceId: sourceReqId,
                targetId: targetReqId,
                targetType: 'requirement',
                linkType: linkData.linkType,
                createdBy: testUserId,
              });
              linkId = link.id;

              // Query links from source (forward direction)
              const linksFromSource = await linkRepository.findBySource(sourceReqId);
              
              // Query links to target (backward direction)
              const linksToTarget = await linkRepository.findByTarget(targetReqId);

              // Verify bidirectionality: link should be discoverable from both directions
              
              // Forward direction: querying from source should find the link
              expect(linksFromSource.length).toBeGreaterThan(0);
              const foundFromSource = linksFromSource.find(l => l.id === linkId);
              expect(foundFromSource).toBeDefined();
              expect(foundFromSource!.sourceId).toBe(sourceReqId);
              expect(foundFromSource!.targetId).toBe(targetReqId);
              expect(foundFromSource!.linkType).toBe(linkData.linkType);

              // Backward direction: querying to target should find the same link
              expect(linksToTarget.length).toBeGreaterThan(0);
              const foundToTarget = linksToTarget.find(l => l.id === linkId);
              expect(foundToTarget).toBeDefined();
              expect(foundToTarget!.sourceId).toBe(sourceReqId);
              expect(foundToTarget!.targetId).toBe(targetReqId);
              expect(foundToTarget!.linkType).toBe(linkData.linkType);

              // Verify both queries return the same link data
              expect(foundFromSource).toEqual(foundToTarget);

            } finally {
              // Clean up
              if (linkId) await pool.query('DELETE FROM traceability_links WHERE id = $1', [linkId]);
              if (sourceReqId) await pool.query('DELETE FROM requirements WHERE id = $1', [sourceReqId]);
              if (targetReqId) await pool.query('DELETE FROM requirements WHERE id = $1', [targetReqId]);
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should maintain bidirectionality when deleting links', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            linkType: fc.constantFrom<LinkType>(
              'derives_from',
              'refines',
              'satisfies',
              'verified_by',
              'conflicts_with',
              'relates_to'
            ),
          }),
          async (linkData) => {
            let sourceReqId: string | null = null;
            let targetReqId: string | null = null;
            let linkId: string | null = null;

            try {
              // Create source and target requirements
              const sourceReq = await requirementRepository.create({
                displayId: `SRC-DEL-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                projectId: testProjectId,
                parentId: null,
                title: 'Source for deletion test',
                description: 'Source requirement',
                type: 'system_requirement',
                status: 'draft',
                priority: 'medium',
                tags: [],
                customFields: {},
                createdBy: testUserId,
                updatedBy: testUserId,
              });
              sourceReqId = sourceReq.id;

              const targetReq = await requirementRepository.create({
                displayId: `TGT-DEL-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                projectId: testProjectId,
                parentId: null,
                title: 'Target for deletion test',
                description: 'Target requirement',
                type: 'software_requirement',
                status: 'draft',
                priority: 'medium',
                tags: [],
                customFields: {},
                createdBy: testUserId,
                updatedBy: testUserId,
              });
              targetReqId = targetReq.id;

              // Create link
              const link = await linkRepository.createLink({
                sourceId: sourceReqId,
                targetId: targetReqId,
                targetType: 'requirement',
                linkType: linkData.linkType,
                createdBy: testUserId,
              });
              linkId = link.id;

              // Verify link exists in both directions
              const linksFromSourceBefore = await linkRepository.findBySource(sourceReqId);
              const linksToTargetBefore = await linkRepository.findByTarget(targetReqId);
              expect(linksFromSourceBefore.some(l => l.id === linkId)).toBe(true);
              expect(linksToTargetBefore.some(l => l.id === linkId)).toBe(true);

              // Delete the link
              const deleted = await linkRepository.deleteLink(linkId);
              expect(deleted).toBe(true);
              linkId = null; // Mark as cleaned up

              // Verify link is removed from both directions
              const linksFromSourceAfter = await linkRepository.findBySource(sourceReqId);
              const linksToTargetAfter = await linkRepository.findByTarget(targetReqId);
              expect(linksFromSourceAfter.some(l => l.id === link.id)).toBe(false);
              expect(linksToTargetAfter.some(l => l.id === link.id)).toBe(false);

            } finally {
              // Clean up
              if (linkId) await pool.query('DELETE FROM traceability_links WHERE id = $1', [linkId]);
              if (sourceReqId) await pool.query('DELETE FROM requirements WHERE id = $1', [sourceReqId]);
              if (targetReqId) await pool.query('DELETE FROM requirements WHERE id = $1', [targetReqId]);
            }
          }
        ),
        {
          numRuns: 50,
          verbose: true,
        }
      );
    });

    it('should handle multiple links between same requirements bidirectionally', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multiple unique link types (no duplicates due to unique constraint)
          fc.uniqueArray(
            fc.constantFrom<LinkType>(
              'derives_from',
              'refines',
              'satisfies',
              'verified_by',
              'conflicts_with',
              'relates_to'
            ),
            { minLength: 2, maxLength: 5 }
          ),
          async (linkTypes) => {
            let sourceReqId: string | null = null;
            let targetReqId: string | null = null;
            const linkIds: string[] = [];

            try {
              // Create source and target requirements
              const sourceReq = await requirementRepository.create({
                displayId: `SRC-MULTI-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                projectId: testProjectId,
                parentId: null,
                title: 'Source for multiple links test',
                description: 'Source requirement',
                type: 'system_requirement',
                status: 'draft',
                priority: 'medium',
                tags: [],
                customFields: {},
                createdBy: testUserId,
                updatedBy: testUserId,
              });
              sourceReqId = sourceReq.id;

              const targetReq = await requirementRepository.create({
                displayId: `TGT-MULTI-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                projectId: testProjectId,
                parentId: null,
                title: 'Target for multiple links test',
                description: 'Target requirement',
                type: 'software_requirement',
                status: 'draft',
                priority: 'medium',
                tags: [],
                customFields: {},
                createdBy: testUserId,
                updatedBy: testUserId,
              });
              targetReqId = targetReq.id;

              // Create multiple links with different types
              for (const linkType of linkTypes) {
                const link = await linkRepository.createLink({
                  sourceId: sourceReqId,
                  targetId: targetReqId,
                  targetType: 'requirement',
                  linkType: linkType,
                  createdBy: testUserId,
                });
                linkIds.push(link.id);
              }

              // Query from both directions
              const linksFromSource = await linkRepository.findBySource(sourceReqId);
              const linksToTarget = await linkRepository.findByTarget(targetReqId);

              // Verify all links are discoverable from both directions
              expect(linksFromSource.length).toBeGreaterThanOrEqual(linkIds.length);
              expect(linksToTarget.length).toBeGreaterThanOrEqual(linkIds.length);

              for (const linkId of linkIds) {
                const foundFromSource = linksFromSource.find(l => l.id === linkId);
                const foundToTarget = linksToTarget.find(l => l.id === linkId);

                expect(foundFromSource).toBeDefined();
                expect(foundToTarget).toBeDefined();
                expect(foundFromSource).toEqual(foundToTarget);
              }

            } finally {
              // Clean up
              for (const linkId of linkIds) {
                await pool.query('DELETE FROM traceability_links WHERE id = $1', [linkId]);
              }
              if (sourceReqId) await pool.query('DELETE FROM requirements WHERE id = $1', [sourceReqId]);
              if (targetReqId) await pool.query('DELETE FROM requirements WHERE id = $1', [targetReqId]);
            }
          }
        ),
        {
          numRuns: 50,
          verbose: true,
        }
      );
    });

    it('should handle bidirectional queries with external targets', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            linkType: fc.constantFrom<LinkType>(
              'derives_from',
              'refines',
              'satisfies',
              'verified_by',
              'conflicts_with',
              'relates_to'
            ),
            externalId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            externalTitle: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          }),
          async (linkData) => {
            let sourceReqId: string | null = null;
            let linkId: string | null = null;

            try {
              // Create source requirement
              const sourceReq = await requirementRepository.create({
                displayId: `SRC-EXT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                projectId: testProjectId,
                parentId: null,
                title: 'Source for external link test',
                description: 'Source requirement',
                type: 'system_requirement',
                status: 'draft',
                priority: 'medium',
                tags: [],
                customFields: {},
                createdBy: testUserId,
                updatedBy: testUserId,
              });
              sourceReqId = sourceReq.id;

              // Create link to external target
              const externalTargetId = `JIRA-${linkData.externalId}`;
              const link = await linkRepository.createLink({
                sourceId: sourceReqId,
                targetId: externalTargetId,
                targetType: 'external',
                linkType: linkData.linkType,
                externalSystem: 'jira',
                externalId: linkData.externalId,
                externalMetadata: {
                  title: linkData.externalTitle,
                  status: 'open',
                  url: `https://jira.example.com/browse/${linkData.externalId}`,
                  lastSyncedAt: new Date(),
                },
                createdBy: testUserId,
              });
              linkId = link.id;

              // Query from source
              const linksFromSource = await linkRepository.findBySource(sourceReqId);
              
              // Query to external target
              const linksToTarget = await linkRepository.findByTarget(externalTargetId);

              // Verify bidirectionality with external targets
              expect(linksFromSource.length).toBeGreaterThan(0);
              const foundFromSource = linksFromSource.find(l => l.id === linkId);
              expect(foundFromSource).toBeDefined();
              expect(foundFromSource!.targetType).toBe('external');
              expect(foundFromSource!.externalSystem).toBe('jira');
              expect(foundFromSource!.externalId).toBe(linkData.externalId);

              expect(linksToTarget.length).toBeGreaterThan(0);
              const foundToTarget = linksToTarget.find(l => l.id === linkId);
              expect(foundToTarget).toBeDefined();
              expect(foundToTarget!.targetType).toBe('external');

              // Verify both queries return the same link
              expect(foundFromSource).toEqual(foundToTarget);

            } finally {
              // Clean up
              if (linkId) await pool.query('DELETE FROM traceability_links WHERE id = $1', [linkId]);
              if (sourceReqId) await pool.query('DELETE FROM requirements WHERE id = $1', [sourceReqId]);
            }
          }
        ),
        {
          numRuns: 50,
          verbose: true,
        }
      );
    });
  });
});
