import { PostgresGraphRepository } from './PostgresGraphRepository';
import { RequirementRepository } from './RequirementRepository';
import { TraceabilityLinkRepository } from './TraceabilityLinkRepository';
import pool from '../config/database';

/**
 * Integration Tests for PostgreSQL Graph Repository
 * 
 * Tests the graph operations with actual database queries
 */
describe('PostgresGraphRepository - Integration Tests', () => {
  let graphRepository: PostgresGraphRepository;
  let requirementRepository: RequirementRepository;
  let linkRepository: TraceabilityLinkRepository;
  let testProjectId: string;
  let testUserId: string;

  beforeAll(async () => {
    graphRepository = new PostgresGraphRepository(pool);
    requirementRepository = new RequirementRepository(pool);
    linkRepository = new TraceabilityLinkRepository(pool);

    // Create test user with unique email
    const uniqueEmail = `graph-integration-test-${Date.now()}@example.com`;
    const userResult = await pool.query(`
      INSERT INTO users (email, name, role)
      VALUES ($1, 'Graph Integration Test User', 'author')
      RETURNING id
    `, [uniqueEmail]);
    testUserId = userResult.rows[0].id;

    // Create test project
    const projectResult = await pool.query(`
      INSERT INTO projects (name, description, created_by)
      VALUES ('Graph Integration Test Project', 'For graph integration testing', $1)
      RETURNING id
    `, [testUserId]);
    testProjectId = projectResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM traceability_links WHERE created_by = $1', [testUserId]);
    await pool.query('DELETE FROM requirements WHERE project_id = $1', [testProjectId]);
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  });

  afterEach(async () => {
    // Clean up after each test
    await pool.query('DELETE FROM traceability_links WHERE created_by = $1', [testUserId]);
    await pool.query('DELETE FROM requirements WHERE project_id = $1', [testProjectId]);
  });

  describe('findDownstreamRequirements', () => {
    it('should find direct downstream requirements', async () => {
      // Create requirements
      const req1 = await requirementRepository.create({
        displayId: 'REQ-001',
        projectId: testProjectId,
        parentId: null,
        title: 'Parent Requirement',
        description: 'Parent',
        type: 'system_requirement',
        status: 'draft',
        priority: 'high',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      const req2 = await requirementRepository.create({
        displayId: 'REQ-002',
        projectId: testProjectId,
        parentId: null,
        title: 'Child Requirement',
        description: 'Child',
        type: 'software_requirement',
        status: 'draft',
        priority: 'medium',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      // Create link
      await linkRepository.createLink({
        sourceId: req1.id,
        targetId: req2.id,
        targetType: 'requirement',
        linkType: 'derives_from',
        createdBy: testUserId,
      });

      // Find downstream
      const downstream = await graphRepository.findDownstreamRequirements(req1.id);

      expect(downstream).toHaveLength(1);
      expect(downstream[0].requirement.id).toBe(req2.id);
      expect(downstream[0].depth).toBe(1);
    });

    it('should find transitive downstream requirements', async () => {
      // Create chain: req1 -> req2 -> req3
      const req1 = await requirementRepository.create({
        displayId: 'REQ-001',
        projectId: testProjectId,
        parentId: null,
        title: 'Root',
        description: 'Root',
        type: 'stakeholder_need',
        status: 'draft',
        priority: 'high',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      const req2 = await requirementRepository.create({
        displayId: 'REQ-002',
        projectId: testProjectId,
        parentId: null,
        title: 'Middle',
        description: 'Middle',
        type: 'system_requirement',
        status: 'draft',
        priority: 'medium',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      const req3 = await requirementRepository.create({
        displayId: 'REQ-003',
        projectId: testProjectId,
        parentId: null,
        title: 'Leaf',
        description: 'Leaf',
        type: 'software_requirement',
        status: 'draft',
        priority: 'low',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      await linkRepository.createLink({
        sourceId: req1.id,
        targetId: req2.id,
        targetType: 'requirement',
        linkType: 'derives_from',
        createdBy: testUserId,
      });

      await linkRepository.createLink({
        sourceId: req2.id,
        targetId: req3.id,
        targetType: 'requirement',
        linkType: 'refines',
        createdBy: testUserId,
      });

      // Find downstream from root
      const downstream = await graphRepository.findDownstreamRequirements(req1.id);

      expect(downstream).toHaveLength(2);
      const ids = downstream.map(n => n.requirement.id);
      expect(ids).toContain(req2.id);
      expect(ids).toContain(req3.id);

      const req2Node = downstream.find(n => n.requirement.id === req2.id);
      const req3Node = downstream.find(n => n.requirement.id === req3.id);
      expect(req2Node?.depth).toBe(1);
      expect(req3Node?.depth).toBe(2);
    });
  });

  describe('findUpstreamRequirements', () => {
    it('should find upstream requirements', async () => {
      const req1 = await requirementRepository.create({
        displayId: 'REQ-001',
        projectId: testProjectId,
        parentId: null,
        title: 'Source',
        description: 'Source',
        type: 'stakeholder_need',
        status: 'draft',
        priority: 'high',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      const req2 = await requirementRepository.create({
        displayId: 'REQ-002',
        projectId: testProjectId,
        parentId: null,
        title: 'Target',
        description: 'Target',
        type: 'system_requirement',
        status: 'draft',
        priority: 'medium',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      await linkRepository.createLink({
        sourceId: req1.id,
        targetId: req2.id,
        targetType: 'requirement',
        linkType: 'satisfies',
        createdBy: testUserId,
      });

      // Find upstream from req2
      const upstream = await graphRepository.findUpstreamRequirements(req2.id);

      expect(upstream).toHaveLength(1);
      expect(upstream[0].requirement.id).toBe(req1.id);
      expect(upstream[0].depth).toBe(1);
    });
  });

  describe('findShortestPath', () => {
    it('should find shortest path between two requirements', async () => {
      const req1 = await requirementRepository.create({
        displayId: 'REQ-001',
        projectId: testProjectId,
        parentId: null,
        title: 'Start',
        description: 'Start',
        type: 'system_requirement',
        status: 'draft',
        priority: 'high',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      const req2 = await requirementRepository.create({
        displayId: 'REQ-002',
        projectId: testProjectId,
        parentId: null,
        title: 'End',
        description: 'End',
        type: 'software_requirement',
        status: 'draft',
        priority: 'medium',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      await linkRepository.createLink({
        sourceId: req1.id,
        targetId: req2.id,
        targetType: 'requirement',
        linkType: 'derives_from',
        createdBy: testUserId,
      });

      const path = await graphRepository.findShortestPath(req1.id, req2.id);

      expect(path).not.toBeNull();
      expect(path!.nodes).toHaveLength(2);
      expect(path!.nodes[0].id).toBe(req1.id);
      expect(path!.nodes[1].id).toBe(req2.id);
      expect(path!.totalDepth).toBe(1);
    });

    it('should return null when no path exists', async () => {
      const req1 = await requirementRepository.create({
        displayId: 'REQ-001',
        projectId: testProjectId,
        parentId: null,
        title: 'Isolated 1',
        description: 'Isolated',
        type: 'system_requirement',
        status: 'draft',
        priority: 'high',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      const req2 = await requirementRepository.create({
        displayId: 'REQ-002',
        projectId: testProjectId,
        parentId: null,
        title: 'Isolated 2',
        description: 'Isolated',
        type: 'software_requirement',
        status: 'draft',
        priority: 'medium',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      const path = await graphRepository.findShortestPath(req1.id, req2.id);

      expect(path).toBeNull();
    });
  });

  describe('calculateImpactAnalysis', () => {
    it('should calculate complete impact tree', async () => {
      const root = await requirementRepository.create({
        displayId: 'REQ-ROOT',
        projectId: testProjectId,
        parentId: null,
        title: 'Root',
        description: 'Root',
        type: 'system_requirement',
        status: 'approved',
        priority: 'critical',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      const child1 = await requirementRepository.create({
        displayId: 'REQ-CHILD1',
        projectId: testProjectId,
        parentId: null,
        title: 'Child 1',
        description: 'Child 1',
        type: 'software_requirement',
        status: 'draft',
        priority: 'high',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      const child2 = await requirementRepository.create({
        displayId: 'REQ-CHILD2',
        projectId: testProjectId,
        parentId: null,
        title: 'Child 2',
        description: 'Child 2',
        type: 'software_requirement',
        status: 'draft',
        priority: 'medium',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      await linkRepository.createLink({
        sourceId: root.id,
        targetId: child1.id,
        targetType: 'requirement',
        linkType: 'satisfies',
        createdBy: testUserId,
      });

      await linkRepository.createLink({
        sourceId: root.id,
        targetId: child2.id,
        targetType: 'requirement',
        linkType: 'satisfies',
        createdBy: testUserId,
      });

      const impactTree = await graphRepository.calculateImpactAnalysis(root.id);

      expect(impactTree.root.id).toBe(root.id);
      expect(impactTree.totalImpacted).toBe(2);
      expect(impactTree.maxDepth).toBe(1);
      expect(impactTree.impactedNodes).toHaveLength(2);
    });
  });

  describe('getGraphMetrics', () => {
    it('should calculate graph metrics for a project', async () => {
      // Create a small graph
      const req1 = await requirementRepository.create({
        displayId: 'REQ-001',
        projectId: testProjectId,
        parentId: null,
        title: 'Req 1',
        description: 'Req 1',
        type: 'system_requirement',
        status: 'draft',
        priority: 'high',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      const req2 = await requirementRepository.create({
        displayId: 'REQ-002',
        projectId: testProjectId,
        parentId: null,
        title: 'Req 2',
        description: 'Req 2',
        type: 'software_requirement',
        status: 'draft',
        priority: 'medium',
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      await linkRepository.createLink({
        sourceId: req1.id,
        targetId: req2.id,
        targetType: 'requirement',
        linkType: 'derives_from',
        createdBy: testUserId,
      });

      const metrics = await graphRepository.getGraphMetrics(testProjectId);

      expect(metrics.totalNodes).toBe(2);
      expect(metrics.totalEdges).toBe(1);
      expect(metrics.averageDegree).toBeGreaterThan(0);
      expect(metrics.orphanCount).toBeGreaterThanOrEqual(0);
    });
  });
});
