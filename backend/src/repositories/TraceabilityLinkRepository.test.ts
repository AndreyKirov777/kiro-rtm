import { TraceabilityLinkRepository } from './TraceabilityLinkRepository';
import { LinkType } from '../types';
import pool from '../config/database';

describe('TraceabilityLinkRepository', () => {
  let repository: TraceabilityLinkRepository;
  let testProjectId: string;
  let testUserId: string;
  let testRequirement1Id: string;
  let testRequirement2Id: string;
  let testRequirement3Id: string;

  beforeAll(async () => {
    repository = new TraceabilityLinkRepository(pool);

    // Create a test user
    const userResult = await pool.query(`
      INSERT INTO users (email, name, role)
      VALUES ('test-link@example.com', 'Test Link User', 'author')
      RETURNING id
    `);
    testUserId = userResult.rows[0].id;

    // Create a test project
    const projectResult = await pool.query(`
      INSERT INTO projects (name, description, created_by)
      VALUES ('Test Link Project', 'A test project for links', $1)
      RETURNING id
    `, [testUserId]);
    testProjectId = projectResult.rows[0].id;

    // Create test requirements
    const req1Result = await pool.query(`
      INSERT INTO requirements (
        display_id, project_id, title, description, type, status, priority,
        created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, ['REQ-LINK-001', testProjectId, 'Source Requirement', 'Test source', 
        'system_requirement', 'draft', 'high', testUserId, testUserId]);
    testRequirement1Id = req1Result.rows[0].id;

    const req2Result = await pool.query(`
      INSERT INTO requirements (
        display_id, project_id, title, description, type, status, priority,
        created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, ['REQ-LINK-002', testProjectId, 'Target Requirement', 'Test target', 
        'software_requirement', 'draft', 'medium', testUserId, testUserId]);
    testRequirement2Id = req2Result.rows[0].id;

    const req3Result = await pool.query(`
      INSERT INTO requirements (
        display_id, project_id, title, description, type, status, priority,
        created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, ['REQ-LINK-003', testProjectId, 'Another Requirement', 'Test another', 
        'software_requirement', 'draft', 'low', testUserId, testUserId]);
    testRequirement3Id = req3Result.rows[0].id;
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
    // Clean up links after each test
    await pool.query('DELETE FROM traceability_links WHERE created_by = $1', [testUserId]);
  });

  describe('createLink', () => {
    it('should create a link between two requirements', async () => {
      const linkData = {
        sourceId: testRequirement1Id,
        targetId: testRequirement2Id,
        targetType: 'requirement' as const,
        linkType: 'derives_from' as LinkType,
        createdBy: testUserId,
      };

      const created = await repository.createLink(linkData);

      expect(created.id).toBeDefined();
      expect(created.sourceId).toBe(testRequirement1Id);
      expect(created.targetId).toBe(testRequirement2Id);
      expect(created.targetType).toBe('requirement');
      expect(created.linkType).toBe('derives_from');
      expect(created.createdBy).toBe(testUserId);
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.externalSystem).toBeUndefined();
      expect(created.externalId).toBeUndefined();
      expect(created.externalMetadata).toBeUndefined();
    });

    it('should create a link to an external item with metadata', async () => {
      const linkData = {
        sourceId: testRequirement1Id,
        targetId: 'JIRA-123',
        targetType: 'external' as const,
        linkType: 'verified_by' as LinkType,
        externalSystem: 'jira' as const,
        externalId: 'JIRA-123',
        externalMetadata: {
          title: 'Test Case for Requirement',
          status: 'passed',
          url: 'https://jira.example.com/browse/JIRA-123',
          lastSyncedAt: new Date('2024-01-15T10:00:00Z'),
        },
        createdBy: testUserId,
      };

      const created = await repository.createLink(linkData);

      expect(created.id).toBeDefined();
      expect(created.sourceId).toBe(testRequirement1Id);
      expect(created.targetId).toBe('JIRA-123');
      expect(created.targetType).toBe('external');
      expect(created.linkType).toBe('verified_by');
      expect(created.externalSystem).toBe('jira');
      expect(created.externalId).toBe('JIRA-123');
      expect(created.externalMetadata).toBeDefined();
      expect(created.externalMetadata?.title).toBe('Test Case for Requirement');
      expect(created.externalMetadata?.status).toBe('passed');
      expect(created.externalMetadata?.url).toBe('https://jira.example.com/browse/JIRA-123');
      expect(created.externalMetadata?.lastSyncedAt).toBeInstanceOf(Date);
    });

    it('should create links with different link types', async () => {
      const linkTypes: LinkType[] = [
        'derives_from',
        'refines',
        'satisfies',
        'verified_by',
        'conflicts_with',
        'relates_to',
      ];

      for (const linkType of linkTypes) {
        const linkData = {
          sourceId: testRequirement1Id,
          targetId: testRequirement2Id,
          targetType: 'requirement' as const,
          linkType,
          createdBy: testUserId,
        };

        const created = await repository.createLink(linkData);
        expect(created.linkType).toBe(linkType);

        // Clean up for next iteration
        await repository.deleteLink(created.id);
      }
    });

    it('should prevent duplicate links with unique constraint', async () => {
      const linkData = {
        sourceId: testRequirement1Id,
        targetId: testRequirement2Id,
        targetType: 'requirement' as const,
        linkType: 'derives_from' as LinkType,
        createdBy: testUserId,
      };

      await repository.createLink(linkData);

      // Attempt to create duplicate link
      await expect(repository.createLink(linkData)).rejects.toThrow();
    });
  });

  describe('deleteLink', () => {
    it('should delete an existing link', async () => {
      const linkData = {
        sourceId: testRequirement1Id,
        targetId: testRequirement2Id,
        targetType: 'requirement' as const,
        linkType: 'satisfies' as LinkType,
        createdBy: testUserId,
      };

      const created = await repository.createLink(linkData);
      const deleted = await repository.deleteLink(created.id);

      expect(deleted).toBe(true);

      // Verify link is gone
      const links = await repository.findBySource(testRequirement1Id);
      expect(links).toHaveLength(0);
    });

    it('should return false when deleting non-existent link', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const deleted = await repository.deleteLink(fakeId);

      expect(deleted).toBe(false);
    });
  });

  describe('findBySource', () => {
    it('should find all links from a source requirement', async () => {
      // Create multiple links from the same source
      await repository.createLink({
        sourceId: testRequirement1Id,
        targetId: testRequirement2Id,
        targetType: 'requirement',
        linkType: 'derives_from',
        createdBy: testUserId,
      });

      await repository.createLink({
        sourceId: testRequirement1Id,
        targetId: testRequirement3Id,
        targetType: 'requirement',
        linkType: 'relates_to',
        createdBy: testUserId,
      });

      await repository.createLink({
        sourceId: testRequirement1Id,
        targetId: 'GITHUB-456',
        targetType: 'external',
        linkType: 'verified_by',
        externalSystem: 'github',
        externalId: 'GITHUB-456',
        createdBy: testUserId,
      });

      const links = await repository.findBySource(testRequirement1Id);

      expect(links).toHaveLength(3);
      expect(links.every(link => link.sourceId === testRequirement1Id)).toBe(true);
      
      // Verify different link types
      const linkTypes = links.map(link => link.linkType);
      expect(linkTypes).toContain('derives_from');
      expect(linkTypes).toContain('relates_to');
      expect(linkTypes).toContain('verified_by');
    });

    it('should return empty array when source has no links', async () => {
      const links = await repository.findBySource(testRequirement3Id);
      expect(links).toHaveLength(0);
    });

    it('should return links ordered by creation date (newest first)', async () => {
      // Create links with slight delay
      const link1 = await repository.createLink({
        sourceId: testRequirement1Id,
        targetId: testRequirement2Id,
        targetType: 'requirement',
        linkType: 'derives_from',
        createdBy: testUserId,
      });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const link2 = await repository.createLink({
        sourceId: testRequirement1Id,
        targetId: testRequirement3Id,
        targetType: 'requirement',
        linkType: 'relates_to',
        createdBy: testUserId,
      });

      const links = await repository.findBySource(testRequirement1Id);

      expect(links).toHaveLength(2);
      // Newest first
      expect(links[0].id).toBe(link2.id);
      expect(links[1].id).toBe(link1.id);
    });
  });

  describe('findByTarget', () => {
    it('should find all links pointing to a target requirement', async () => {
      // Create multiple links to the same target
      await repository.createLink({
        sourceId: testRequirement1Id,
        targetId: testRequirement2Id,
        targetType: 'requirement',
        linkType: 'derives_from',
        createdBy: testUserId,
      });

      await repository.createLink({
        sourceId: testRequirement3Id,
        targetId: testRequirement2Id,
        targetType: 'requirement',
        linkType: 'refines',
        createdBy: testUserId,
      });

      const links = await repository.findByTarget(testRequirement2Id);

      expect(links).toHaveLength(2);
      expect(links.every(link => link.targetId === testRequirement2Id)).toBe(true);
      
      // Verify different sources
      const sourceIds = links.map(link => link.sourceId);
      expect(sourceIds).toContain(testRequirement1Id);
      expect(sourceIds).toContain(testRequirement3Id);
    });

    it('should find links to external items by external reference', async () => {
      await repository.createLink({
        sourceId: testRequirement1Id,
        targetId: 'LINEAR-789',
        targetType: 'external',
        linkType: 'satisfies',
        externalSystem: 'linear',
        externalId: 'LINEAR-789',
        createdBy: testUserId,
      });

      await repository.createLink({
        sourceId: testRequirement2Id,
        targetId: 'LINEAR-789',
        targetType: 'external',
        linkType: 'satisfies',
        externalSystem: 'linear',
        externalId: 'LINEAR-789',
        createdBy: testUserId,
      });

      const links = await repository.findByTarget('LINEAR-789');

      expect(links).toHaveLength(2);
      expect(links.every(link => link.targetId === 'LINEAR-789')).toBe(true);
      expect(links.every(link => link.targetType === 'external')).toBe(true);
    });

    it('should return empty array when target has no links', async () => {
      const links = await repository.findByTarget('NONEXISTENT-123');
      expect(links).toHaveLength(0);
    });
  });

  describe('bidirectional queries', () => {
    it('should support bidirectional link queries', async () => {
      // Create a link from req1 to req2
      await repository.createLink({
        sourceId: testRequirement1Id,
        targetId: testRequirement2Id,
        targetType: 'requirement',
        linkType: 'derives_from',
        createdBy: testUserId,
      });

      // Query from source perspective
      const fromSource = await repository.findBySource(testRequirement1Id);
      expect(fromSource).toHaveLength(1);
      expect(fromSource[0].targetId).toBe(testRequirement2Id);

      // Query from target perspective (bidirectional)
      const fromTarget = await repository.findByTarget(testRequirement2Id);
      expect(fromTarget).toHaveLength(1);
      expect(fromTarget[0].sourceId).toBe(testRequirement1Id);

      // Both queries should return the same link
      expect(fromSource[0].id).toBe(fromTarget[0].id);
    });
  });
});
