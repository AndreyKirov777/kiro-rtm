/**
 * Unit tests for create-baseline-workflow-tables migration
 * 
 * These tests verify the migration structure and logic without requiring
 * a database connection. They use a mock pgm object to capture the operations.
 */

const migration = require('./1709000000003_create-baseline-workflow-tables');

describe('Migration: create-baseline-workflow-tables', () => {
  let mockPgm;
  let operations;

  beforeEach(() => {
    operations = [];
    
    // Mock pgm object that records all operations
    mockPgm = {
      createTable: (tableName, columns, options) => {
        operations.push({ type: 'createTable', tableName, columns, options });
      },
      createIndex: (tableName, columns, options) => {
        operations.push({ type: 'createIndex', tableName, columns, options });
      },
      sql: (query) => {
        operations.push({ type: 'sql', query });
      },
      dropTable: (tableName, options) => {
        operations.push({ type: 'dropTable', tableName, options });
      },
      func: (funcName) => ({ __func: funcName })
    };
  });

  describe('up migration', () => {
    beforeEach(() => {
      migration.up(mockPgm);
    });

    test('creates exactly 3 tables', () => {
      const createTableOps = operations.filter(op => op.type === 'createTable');
      expect(createTableOps).toHaveLength(3);
    });

    test('creates tables in correct order', () => {
      const createTableOps = operations.filter(op => op.type === 'createTable');
      const tableNames = createTableOps.map(op => op.tableName);
      
      expect(tableNames).toEqual([
        'baselines',
        'comments',
        'attachments'
      ]);
    });

    describe('baselines table', () => {
      let baselinesTable;

      beforeEach(() => {
        baselinesTable = operations.find(
          op => op.type === 'createTable' && op.tableName === 'baselines'
        );
      });

      test('has correct columns', () => {
        const columns = Object.keys(baselinesTable.columns);
        expect(columns).toContain('id');
        expect(columns).toContain('project_id');
        expect(columns).toContain('name');
        expect(columns).toContain('description');
        expect(columns).toContain('locked');
        expect(columns).toContain('locked_at');
        expect(columns).toContain('locked_by');
        expect(columns).toContain('snapshot_data');
        expect(columns).toContain('created_at');
        expect(columns).toContain('created_by');
      });

      test('id is UUID primary key', () => {
        expect(baselinesTable.columns.id.type).toBe('uuid');
        expect(baselinesTable.columns.id.primaryKey).toBe(true);
      });

      test('project_id references projects', () => {
        expect(baselinesTable.columns.project_id.references).toBe('projects');
        expect(baselinesTable.columns.project_id.onDelete).toBe('CASCADE');
      });

      test('name is required', () => {
        expect(baselinesTable.columns.name.notNull).toBe(true);
      });

      test('locked has default false', () => {
        expect(baselinesTable.columns.locked.default).toBe(false);
      });

      test('snapshot_data is JSONB and required', () => {
        expect(baselinesTable.columns.snapshot_data.type).toBe('jsonb');
        expect(baselinesTable.columns.snapshot_data.notNull).toBe(true);
      });

      test('locked_by references users', () => {
        expect(baselinesTable.columns.locked_by.references).toBe('users');
        expect(baselinesTable.columns.locked_by.onDelete).toBe('RESTRICT');
      });

      test('created_by references users', () => {
        expect(baselinesTable.columns.created_by.references).toBe('users');
        expect(baselinesTable.columns.created_by.onDelete).toBe('RESTRICT');
      });
    });

    describe('comments table', () => {
      let commentsTable;

      beforeEach(() => {
        commentsTable = operations.find(
          op => op.type === 'createTable' && op.tableName === 'comments'
        );
      });

      test('has correct columns', () => {
        const columns = Object.keys(commentsTable.columns);
        expect(columns).toContain('id');
        expect(columns).toContain('requirement_id');
        expect(columns).toContain('parent_comment_id');
        expect(columns).toContain('content');
        expect(columns).toContain('author_id');
        expect(columns).toContain('is_clarification_request');
        expect(columns).toContain('assigned_to');
        expect(columns).toContain('resolved');
        expect(columns).toContain('created_at');
        expect(columns).toContain('updated_at');
      });

      test('id is UUID primary key', () => {
        expect(commentsTable.columns.id.type).toBe('uuid');
        expect(commentsTable.columns.id.primaryKey).toBe(true);
      });

      test('requirement_id references requirements', () => {
        expect(commentsTable.columns.requirement_id.references).toBe('requirements');
        expect(commentsTable.columns.requirement_id.onDelete).toBe('CASCADE');
      });

      test('parent_comment_id is self-referencing', () => {
        expect(commentsTable.columns.parent_comment_id.references).toBe('comments');
        expect(commentsTable.columns.parent_comment_id.onDelete).toBe('CASCADE');
        expect(commentsTable.columns.parent_comment_id.notNull).toBe(false);
      });

      test('content is required', () => {
        expect(commentsTable.columns.content.notNull).toBe(true);
      });

      test('author_id references users', () => {
        expect(commentsTable.columns.author_id.references).toBe('users');
        expect(commentsTable.columns.author_id.onDelete).toBe('RESTRICT');
      });

      test('has default values for boolean fields', () => {
        expect(commentsTable.columns.is_clarification_request.default).toBe(false);
        expect(commentsTable.columns.resolved.default).toBe(false);
      });

      test('assigned_to references users', () => {
        expect(commentsTable.columns.assigned_to.references).toBe('users');
        expect(commentsTable.columns.assigned_to.onDelete).toBe('SET NULL');
      });
    });

    describe('attachments table', () => {
      let attachmentsTable;

      beforeEach(() => {
        attachmentsTable = operations.find(
          op => op.type === 'createTable' && op.tableName === 'attachments'
        );
      });

      test('has correct columns', () => {
        const columns = Object.keys(attachmentsTable.columns);
        expect(columns).toContain('id');
        expect(columns).toContain('requirement_id');
        expect(columns).toContain('filename');
        expect(columns).toContain('mime_type');
        expect(columns).toContain('size_bytes');
        expect(columns).toContain('storage_path');
        expect(columns).toContain('uploaded_by');
        expect(columns).toContain('uploaded_at');
      });

      test('id is UUID primary key', () => {
        expect(attachmentsTable.columns.id.type).toBe('uuid');
        expect(attachmentsTable.columns.id.primaryKey).toBe(true);
      });

      test('requirement_id references requirements', () => {
        expect(attachmentsTable.columns.requirement_id.references).toBe('requirements');
        expect(attachmentsTable.columns.requirement_id.onDelete).toBe('CASCADE');
      });

      test('all file metadata fields are required', () => {
        expect(attachmentsTable.columns.filename.notNull).toBe(true);
        expect(attachmentsTable.columns.mime_type.notNull).toBe(true);
        expect(attachmentsTable.columns.size_bytes.notNull).toBe(true);
        expect(attachmentsTable.columns.storage_path.notNull).toBe(true);
      });

      test('size_bytes is bigint', () => {
        expect(attachmentsTable.columns.size_bytes.type).toBe('bigint');
      });

      test('uploaded_by references users', () => {
        expect(attachmentsTable.columns.uploaded_by.references).toBe('users');
        expect(attachmentsTable.columns.uploaded_by.onDelete).toBe('RESTRICT');
      });
    });

    describe('baselines indexes', () => {
      test('creates indexes on baselines table', () => {
        const indexOps = operations.filter(
          op => op.type === 'createIndex' && op.tableName === 'baselines'
        );
        
        expect(indexOps.length).toBeGreaterThanOrEqual(5);
      });

      test('creates index on project_id', () => {
        const projectIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.tableName === 'baselines' &&
          op.options?.name === 'idx_baselines_project_id'
        );
        
        expect(projectIndex).toBeDefined();
      });

      test('creates index on locked', () => {
        const lockedIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.tableName === 'baselines' &&
          op.options?.name === 'idx_baselines_locked'
        );
        
        expect(lockedIndex).toBeDefined();
      });

      test('creates composite index on project_id and locked', () => {
        const compositeIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.tableName === 'baselines' &&
          op.options?.name === 'idx_baselines_project_locked'
        );
        
        expect(compositeIndex).toBeDefined();
        expect(compositeIndex.columns).toEqual(['project_id', 'locked']);
      });

      test('creates partial index on locked_by', () => {
        const lockedByIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.tableName === 'baselines' &&
          op.columns === 'locked_by'
        );
        
        expect(lockedByIndex).toBeDefined();
        expect(lockedByIndex.options?.where).toBe('locked_by IS NOT NULL');
      });
    });

    describe('comments indexes', () => {
      test('creates indexes on comments table', () => {
        const indexOps = operations.filter(
          op => op.type === 'createIndex' && op.tableName === 'comments'
        );
        
        expect(indexOps.length).toBeGreaterThanOrEqual(7);
      });

      test('creates index on requirement_id', () => {
        const reqIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.tableName === 'comments' &&
          op.options?.name === 'idx_comments_requirement_id'
        );
        
        expect(reqIndex).toBeDefined();
      });

      test('creates partial index on parent_comment_id', () => {
        const parentIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.tableName === 'comments' &&
          op.options?.name === 'idx_comments_parent_comment_id'
        );
        
        expect(parentIndex).toBeDefined();
        expect(parentIndex.options?.where).toBe('parent_comment_id IS NOT NULL');
      });

      test('creates partial index on is_clarification_request', () => {
        const clarificationIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.tableName === 'comments' &&
          op.options?.name === 'idx_comments_clarification_request'
        );
        
        expect(clarificationIndex).toBeDefined();
        expect(clarificationIndex.options?.where).toBe('is_clarification_request = true');
      });

      test('creates composite index on requirement_id and created_at', () => {
        const compositeIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.tableName === 'comments' &&
          op.options?.name === 'idx_comments_requirement_created'
        );
        
        expect(compositeIndex).toBeDefined();
        expect(compositeIndex.columns).toEqual(['requirement_id', 'created_at']);
      });
    });

    describe('attachments indexes', () => {
      test('creates indexes on attachments table', () => {
        const indexOps = operations.filter(
          op => op.type === 'createIndex' && op.tableName === 'attachments'
        );
        
        expect(indexOps.length).toBeGreaterThanOrEqual(4);
      });

      test('creates index on requirement_id', () => {
        const reqIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.tableName === 'attachments' &&
          op.options?.name === 'idx_attachments_requirement_id'
        );
        
        expect(reqIndex).toBeDefined();
      });

      test('creates unique index on storage_path', () => {
        const storageIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.tableName === 'attachments' &&
          op.options?.name === 'idx_attachments_storage_path'
        );
        
        expect(storageIndex).toBeDefined();
        expect(storageIndex.options?.unique).toBe(true);
      });

      test('creates composite index on requirement_id and uploaded_at', () => {
        const compositeIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.tableName === 'attachments' &&
          op.options?.name === 'idx_attachments_requirement_uploaded'
        );
        
        expect(compositeIndex).toBeDefined();
        expect(compositeIndex.columns).toEqual(['requirement_id', 'uploaded_at']);
      });
    });

    describe('triggers', () => {
      test('creates updated_at trigger for comments', () => {
        const triggerSql = operations.find(
          op => op.type === 'sql' && 
          op.query.includes('CREATE TRIGGER') &&
          op.query.includes('update_comments_updated_at')
        );
        
        expect(triggerSql).toBeDefined();
        expect(triggerSql.query).toContain('update_updated_at_column');
      });
    });
  });

  describe('down migration', () => {
    beforeEach(() => {
      migration.down(mockPgm);
    });

    test('drops all 3 tables', () => {
      const dropTableOps = operations.filter(op => op.type === 'dropTable');
      expect(dropTableOps).toHaveLength(3);
    });

    test('drops tables in reverse order', () => {
      const dropTableOps = operations.filter(op => op.type === 'dropTable');
      const tableNames = dropTableOps.map(op => op.tableName);
      
      // Should drop in reverse order to respect foreign keys
      expect(tableNames).toEqual([
        'attachments',
        'comments',
        'baselines'
      ]);
    });

    test('uses cascade option', () => {
      const dropTableOps = operations.filter(op => op.type === 'dropTable');
      
      dropTableOps.forEach(op => {
        expect(op.options?.cascade).toBe(true);
      });
    });

    test('drops trigger', () => {
      const dropTriggerSql = operations.find(
        op => op.type === 'sql' && 
        op.query.includes('DROP TRIGGER')
      );
      
      expect(dropTriggerSql).toBeDefined();
      expect(dropTriggerSql.query).toContain('update_comments_updated_at');
    });
  });

  describe('migration metadata', () => {
    test('exports shorthands', () => {
      expect(migration).toHaveProperty('shorthands');
    });

    test('has up function', () => {
      expect(typeof migration.up).toBe('function');
    });

    test('has down function', () => {
      expect(typeof migration.down).toBe('function');
    });
  });
});
