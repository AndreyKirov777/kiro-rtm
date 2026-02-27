/**
 * Unit tests for create-core-tables migration
 * 
 * These tests verify the migration structure and logic without requiring
 * a database connection. They use a mock pgm object to capture the operations.
 */

const migration = require('./1709000000001_create-core-tables');

describe('Migration: create-core-tables', () => {
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

    test('creates exactly 4 tables', () => {
      const createTableOps = operations.filter(op => op.type === 'createTable');
      expect(createTableOps).toHaveLength(4);
    });

    test('creates tables in correct order', () => {
      const createTableOps = operations.filter(op => op.type === 'createTable');
      const tableNames = createTableOps.map(op => op.tableName);
      
      expect(tableNames).toEqual([
        'projects',
        'users',
        'api_tokens',
        'requirements'
      ]);
    });

    describe('projects table', () => {
      let projectsTable;

      beforeEach(() => {
        projectsTable = operations.find(
          op => op.type === 'createTable' && op.tableName === 'projects'
        );
      });

      test('has correct columns', () => {
        const columns = Object.keys(projectsTable.columns);
        expect(columns).toContain('id');
        expect(columns).toContain('name');
        expect(columns).toContain('description');
        expect(columns).toContain('custom_field_definitions');
        expect(columns).toContain('approval_workflow');
        expect(columns).toContain('created_at');
        expect(columns).toContain('created_by');
      });

      test('id is UUID primary key', () => {
        expect(projectsTable.columns.id.type).toBe('uuid');
        expect(projectsTable.columns.id.primaryKey).toBe(true);
      });

      test('name is required', () => {
        expect(projectsTable.columns.name.notNull).toBe(true);
      });

      test('custom_field_definitions has default', () => {
        expect(projectsTable.columns.custom_field_definitions.default).toBe('[]');
      });
    });

    describe('users table', () => {
      let usersTable;

      beforeEach(() => {
        usersTable = operations.find(
          op => op.type === 'createTable' && op.tableName === 'users'
        );
      });

      test('has correct columns', () => {
        const columns = Object.keys(usersTable.columns);
        expect(columns).toContain('id');
        expect(columns).toContain('email');
        expect(columns).toContain('name');
        expect(columns).toContain('role');
        expect(columns).toContain('created_at');
        expect(columns).toContain('last_login_at');
      });

      test('email is unique', () => {
        expect(usersTable.columns.email.unique).toBe(true);
      });

      test('role has default value', () => {
        expect(usersTable.columns.role.default).toBe('viewer');
      });

      test('role uses user_role enum', () => {
        expect(usersTable.columns.role.type).toBe('user_role');
      });
    });

    describe('api_tokens table', () => {
      let apiTokensTable;

      beforeEach(() => {
        apiTokensTable = operations.find(
          op => op.type === 'createTable' && op.tableName === 'api_tokens'
        );
      });

      test('has correct columns', () => {
        const columns = Object.keys(apiTokensTable.columns);
        expect(columns).toContain('id');
        expect(columns).toContain('user_id');
        expect(columns).toContain('name');
        expect(columns).toContain('token_hash');
        expect(columns).toContain('scopes');
        expect(columns).toContain('expires_at');
        expect(columns).toContain('last_used_at');
        expect(columns).toContain('created_at');
      });

      test('user_id references users table', () => {
        expect(apiTokensTable.columns.user_id.references).toBe('users');
        expect(apiTokensTable.columns.user_id.onDelete).toBe('CASCADE');
      });

      test('token_hash is unique', () => {
        expect(apiTokensTable.columns.token_hash.unique).toBe(true);
      });

      test('scopes has default empty array', () => {
        expect(apiTokensTable.columns.scopes.default).toBe('[]');
      });
    });

    describe('requirements table', () => {
      let requirementsTable;

      beforeEach(() => {
        requirementsTable = operations.find(
          op => op.type === 'createTable' && op.tableName === 'requirements'
        );
      });

      test('has all required columns', () => {
        const columns = Object.keys(requirementsTable.columns);
        const expectedColumns = [
          'id', 'display_id', 'project_id', 'parent_id',
          'title', 'description', 'type', 'status', 'priority',
          'version', 'tags', 'custom_fields',
          'created_at', 'updated_at', 'created_by', 'updated_by'
        ];
        
        expectedColumns.forEach(col => {
          expect(columns).toContain(col);
        });
      });

      test('id is UUID primary key', () => {
        expect(requirementsTable.columns.id.type).toBe('uuid');
        expect(requirementsTable.columns.id.primaryKey).toBe(true);
      });

      test('display_id is required', () => {
        expect(requirementsTable.columns.display_id.notNull).toBe(true);
      });

      test('project_id references projects', () => {
        expect(requirementsTable.columns.project_id.references).toBe('projects');
        expect(requirementsTable.columns.project_id.onDelete).toBe('CASCADE');
      });

      test('parent_id is self-referencing', () => {
        expect(requirementsTable.columns.parent_id.references).toBe('requirements');
        expect(requirementsTable.columns.parent_id.onDelete).toBe('SET NULL');
        expect(requirementsTable.columns.parent_id.notNull).toBe(false);
      });

      test('uses correct enum types', () => {
        expect(requirementsTable.columns.type.type).toBe('requirement_type');
        expect(requirementsTable.columns.status.type).toBe('requirement_status');
        expect(requirementsTable.columns.priority.type).toBe('priority');
      });

      test('has default values', () => {
        expect(requirementsTable.columns.status.default).toBe('draft');
        expect(requirementsTable.columns.priority.default).toBe('medium');
        expect(requirementsTable.columns.version.default).toBe(1);
        expect(requirementsTable.columns.tags.default).toBe('[]');
        expect(requirementsTable.columns.custom_fields.default).toBe('{}');
      });

      test('created_by and updated_by reference users', () => {
        expect(requirementsTable.columns.created_by.references).toBe('users');
        expect(requirementsTable.columns.created_by.onDelete).toBe('RESTRICT');
        expect(requirementsTable.columns.updated_by.references).toBe('users');
        expect(requirementsTable.columns.updated_by.onDelete).toBe('RESTRICT');
      });
    });

    describe('indexes', () => {
      test('creates indexes on requirements table', () => {
        const indexOps = operations.filter(
          op => op.type === 'createIndex' && op.tableName === 'requirements'
        );
        
        // Should have multiple indexes
        expect(indexOps.length).toBeGreaterThan(5);
      });

      test('creates unique index on project_id and display_id', () => {
        const uniqueIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.options?.name === 'idx_requirements_project_display_id'
        );
        
        expect(uniqueIndex).toBeDefined();
        expect(uniqueIndex.options.unique).toBe(true);
        expect(uniqueIndex.columns).toEqual(['project_id', 'display_id']);
      });

      test('creates GIN indexes for JSONB columns', () => {
        const ginIndexes = operations.filter(
          op => op.type === 'createIndex' && 
          op.options?.method === 'gin'
        );
        
        expect(ginIndexes.length).toBeGreaterThanOrEqual(3); // tags, custom_fields, search_vector
      });

      test('creates composite index for common queries', () => {
        const compositeIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.options?.name === 'idx_requirements_project_status_type'
        );
        
        expect(compositeIndex).toBeDefined();
        expect(compositeIndex.columns).toEqual(['project_id', 'status', 'type']);
      });
    });

    describe('full-text search', () => {
      test('adds search_vector column', () => {
        const searchVectorSql = operations.find(
          op => op.type === 'sql' && 
          op.query.includes('search_vector')
        );
        
        expect(searchVectorSql).toBeDefined();
        expect(searchVectorSql.query).toContain('tsvector');
        expect(searchVectorSql.query).toContain('GENERATED ALWAYS');
      });

      test('creates GIN index on search_vector', () => {
        const searchIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.options?.name === 'idx_requirements_search'
        );
        
        expect(searchIndex).toBeDefined();
        expect(searchIndex.options.method).toBe('gin');
      });
    });

    describe('triggers', () => {
      test('creates updated_at trigger', () => {
        const triggerSql = operations.find(
          op => op.type === 'sql' && 
          op.query.includes('CREATE TRIGGER')
        );
        
        expect(triggerSql).toBeDefined();
        expect(triggerSql.query).toContain('update_requirements_updated_at');
        expect(triggerSql.query).toContain('update_updated_at_column');
      });
    });
  });

  describe('down migration', () => {
    beforeEach(() => {
      migration.down(mockPgm);
    });

    test('drops all 4 tables', () => {
      const dropTableOps = operations.filter(op => op.type === 'dropTable');
      expect(dropTableOps).toHaveLength(4);
    });

    test('drops tables in reverse order', () => {
      const dropTableOps = operations.filter(op => op.type === 'dropTable');
      const tableNames = dropTableOps.map(op => op.tableName);
      
      // Should drop in reverse order to respect foreign keys
      expect(tableNames).toEqual([
        'requirements',
        'api_tokens',
        'users',
        'projects'
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
      expect(dropTriggerSql.query).toContain('update_requirements_updated_at');
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
