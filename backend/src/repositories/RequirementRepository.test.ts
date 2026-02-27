import { RequirementRepository } from './RequirementRepository';
import { RequirementType, RequirementStatus, Priority } from '../types';
import pool from '../config/database';

describe('RequirementRepository', () => {
  let repository: RequirementRepository;
  let testProjectId: string;
  let testUserId: string;

  beforeAll(async () => {
    repository = new RequirementRepository(pool);

    // Create a test user
    const userResult = await pool.query(`
      INSERT INTO users (email, name, role)
      VALUES ('test@example.com', 'Test User', 'author')
      RETURNING id
    `);
    testUserId = userResult.rows[0].id;

    // Create a test project
    const projectResult = await pool.query(`
      INSERT INTO projects (name, description, created_by)
      VALUES ('Test Project', 'A test project', $1)
      RETURNING id
    `, [testUserId]);
    testProjectId = projectResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM requirements WHERE project_id = $1', [testProjectId]);
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  });

  afterEach(async () => {
    // Clean up requirements after each test
    await pool.query('DELETE FROM requirements WHERE project_id = $1', [testProjectId]);
  });

  describe('create', () => {
    it('should create a new requirement with auto-generated id', async () => {
      const requirementData = {
        displayId: 'REQ-001',
        projectId: testProjectId,
        parentId: null,
        title: 'Test Requirement',
        description: 'This is a test requirement',
        type: 'system_requirement' as RequirementType,
        status: 'draft' as RequirementStatus,
        priority: 'high' as Priority,
        tags: ['test', 'important'],
        customFields: { category: 'security' },
        createdBy: testUserId,
        updatedBy: testUserId,
      };

      const created = await repository.create(requirementData);

      expect(created.id).toBeDefined();
      expect(created.displayId).toBe('REQ-001');
      expect(created.title).toBe('Test Requirement');
      expect(created.version).toBe(1);
      expect(created.tags).toEqual(['test', 'important']);
      expect(created.customFields).toEqual({ category: 'security' });
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
    });

    it('should create requirement with empty tags and customFields', async () => {
      const requirementData = {
        displayId: 'REQ-002',
        projectId: testProjectId,
        parentId: null,
        title: 'Minimal Requirement',
        description: 'Minimal test',
        type: 'software_requirement' as RequirementType,
        status: 'draft' as RequirementStatus,
        priority: 'low' as Priority,
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      };

      const created = await repository.create(requirementData);

      expect(created.tags).toEqual([]);
      expect(created.customFields).toEqual({});
    });
  });

  describe('findById', () => {
    it('should find a requirement by id', async () => {
      const created = await repository.create({
        displayId: 'REQ-003',
        projectId: testProjectId,
        parentId: null,
        title: 'Findable Requirement',
        description: 'Test finding',
        type: 'system_requirement' as RequirementType,
        status: 'draft' as RequirementStatus,
        priority: 'medium' as Priority,
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      const found = await repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.title).toBe('Findable Requirement');
    });

    it('should return null for non-existent id', async () => {
      const found = await repository.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });
  });

  describe('findByProject', () => {
    it('should find all requirements for a project', async () => {
      // Create multiple requirements
      await repository.create({
        displayId: 'REQ-004',
        projectId: testProjectId,
        parentId: null,
        title: 'First Requirement',
        description: 'First',
        type: 'system_requirement' as RequirementType,
        status: 'draft' as RequirementStatus,
        priority: 'high' as Priority,
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      await repository.create({
        displayId: 'REQ-005',
        projectId: testProjectId,
        parentId: null,
        title: 'Second Requirement',
        description: 'Second',
        type: 'software_requirement' as RequirementType,
        status: 'approved' as RequirementStatus,
        priority: 'low' as Priority,
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      const requirements = await repository.findByProject(testProjectId);

      expect(requirements).toHaveLength(2);
      expect(requirements[0].title).toBe('Second Requirement'); // Most recent first
      expect(requirements[1].title).toBe('First Requirement');
    });

    it('should return empty array for project with no requirements', async () => {
      // Create another project
      const emptyProjectResult = await pool.query(`
        INSERT INTO projects (name, description, created_by)
        VALUES ('Empty Project', 'No requirements', $1)
        RETURNING id
      `, [testUserId]);
      const emptyProjectId = emptyProjectResult.rows[0].id;

      const requirements = await repository.findByProject(emptyProjectId);

      expect(requirements).toEqual([]);

      // Clean up
      await pool.query('DELETE FROM projects WHERE id = $1', [emptyProjectId]);
    });
  });

  describe('update', () => {
    it('should update requirement and increment version', async () => {
      const created = await repository.create({
        displayId: 'REQ-006',
        projectId: testProjectId,
        parentId: null,
        title: 'Original Title',
        description: 'Original description',
        type: 'system_requirement' as RequirementType,
        status: 'draft' as RequirementStatus,
        priority: 'medium' as Priority,
        tags: ['original'],
        customFields: { key: 'value' },
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      expect(created.version).toBe(1);

      const updated = await repository.update(created.id, {
        title: 'Updated Title',
        status: 'in_review' as RequirementStatus,
        updatedBy: testUserId,
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('Updated Title');
      expect(updated!.status).toBe('in_review');
      expect(updated!.version).toBe(2);
      expect(updated!.description).toBe('Original description'); // Unchanged
      expect(updated!.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });

    it('should increment version on each update', async () => {
      const created = await repository.create({
        displayId: 'REQ-007',
        projectId: testProjectId,
        parentId: null,
        title: 'Version Test',
        description: 'Testing versions',
        type: 'system_requirement' as RequirementType,
        status: 'draft' as RequirementStatus,
        priority: 'medium' as Priority,
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      const update1 = await repository.update(created.id, {
        title: 'Version 2',
        updatedBy: testUserId,
      });
      expect(update1!.version).toBe(2);

      const update2 = await repository.update(created.id, {
        title: 'Version 3',
        updatedBy: testUserId,
      });
      expect(update2!.version).toBe(3);

      const update3 = await repository.update(created.id, {
        title: 'Version 4',
        updatedBy: testUserId,
      });
      expect(update3!.version).toBe(4);
    });

    it('should update tags and customFields', async () => {
      const created = await repository.create({
        displayId: 'REQ-008',
        projectId: testProjectId,
        parentId: null,
        title: 'Fields Test',
        description: 'Testing field updates',
        type: 'system_requirement' as RequirementType,
        status: 'draft' as RequirementStatus,
        priority: 'medium' as Priority,
        tags: ['old'],
        customFields: { old: 'value' },
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      const updated = await repository.update(created.id, {
        tags: ['new', 'tags'],
        customFields: { new: 'data', nested: { key: 'value' } },
        updatedBy: testUserId,
      });

      expect(updated!.tags).toEqual(['new', 'tags']);
      expect(updated!.customFields).toEqual({ new: 'data', nested: { key: 'value' } });
    });

    it('should return null for non-existent id', async () => {
      const updated = await repository.update('00000000-0000-0000-0000-000000000000', {
        title: 'Should not work',
        updatedBy: testUserId,
      });

      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should deprecate a requirement', async () => {
      const created = await repository.create({
        displayId: 'REQ-009',
        projectId: testProjectId,
        parentId: null,
        title: 'To Be Deleted',
        description: 'This will be deprecated',
        type: 'system_requirement' as RequirementType,
        status: 'draft' as RequirementStatus,
        priority: 'low' as Priority,
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      const deleted = await repository.delete(created.id, testUserId);

      expect(deleted).toBe(true);

      // Verify it's deprecated, not hard deleted
      const found = await repository.findById(created.id);
      expect(found).not.toBeNull();
      expect(found!.status).toBe('deprecated');
      expect(found!.version).toBe(2); // Version incremented
    });

    it('should return false for non-existent id', async () => {
      const deleted = await repository.delete('00000000-0000-0000-0000-000000000000', testUserId);
      expect(deleted).toBe(false);
    });
  });

  describe('version management', () => {
    it('should maintain version history through multiple updates', async () => {
      const created = await repository.create({
        displayId: 'REQ-010',
        projectId: testProjectId,
        parentId: null,
        title: 'Version History Test',
        description: 'Testing version management',
        type: 'system_requirement' as RequirementType,
        status: 'draft' as RequirementStatus,
        priority: 'medium' as Priority,
        tags: [],
        customFields: {},
        createdBy: testUserId,
        updatedBy: testUserId,
      });

      expect(created.version).toBe(1);

      // Update status
      const v2 = await repository.update(created.id, {
        status: 'in_review' as RequirementStatus,
        updatedBy: testUserId,
      });
      expect(v2!.version).toBe(2);

      // Update priority
      const v3 = await repository.update(created.id, {
        priority: 'high' as Priority,
        updatedBy: testUserId,
      });
      expect(v3!.version).toBe(3);

      // Update title and description
      const v4 = await repository.update(created.id, {
        title: 'Updated Title',
        description: 'Updated description',
        updatedBy: testUserId,
      });
      expect(v4!.version).toBe(4);

      // Approve
      const v5 = await repository.update(created.id, {
        status: 'approved' as RequirementStatus,
        updatedBy: testUserId,
      });
      expect(v5!.version).toBe(5);
    });
  });

  describe('connection pooling', () => {
    it('should use connection pool for concurrent operations', async () => {
      // Create multiple requirements concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        repository.create({
          displayId: `REQ-POOL-${i}`,
          projectId: testProjectId,
          parentId: null,
          title: `Concurrent Requirement ${i}`,
          description: `Testing connection pool ${i}`,
          type: 'system_requirement' as RequirementType,
          status: 'draft' as RequirementStatus,
          priority: 'medium' as Priority,
          tags: [],
          customFields: {},
          createdBy: testUserId,
          updatedBy: testUserId,
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((req, i) => {
        expect(req.displayId).toBe(`REQ-POOL-${i}`);
        expect(req.version).toBe(1);
      });
    });
  });
});
