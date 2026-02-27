#!/usr/bin/env node

/**
 * Test script for core tables migration
 * 
 * This script validates the migration structure and logic by executing
 * it with a mock pgm object and verifying the operations.
 */

const migration = require('../migrations/1709000000001_create-core-tables');

// Mock pgm object that records all operations
class MockPgm {
  constructor() {
    this.operations = [];
  }

  createTable(tableName, columns, options) {
    this.operations.push({ type: 'createTable', tableName, columns, options });
  }

  createIndex(tableName, columns, options) {
    this.operations.push({ type: 'createIndex', tableName, columns, options });
  }

  sql(query) {
    this.operations.push({ type: 'sql', query });
  }

  dropTable(tableName, options) {
    this.operations.push({ type: 'dropTable', tableName, options });
  }

  func(funcName) {
    return { __func: funcName };
  }
}

function runTests() {
  console.log('Testing core tables migration...\n');
  
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (error) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
      failed++;
    }
  }

  function expect(value) {
    return {
      toBe: (expected) => {
        if (value !== expected) {
          throw new Error(`Expected ${expected}, got ${value}`);
        }
      },
      toEqual: (expected) => {
        if (JSON.stringify(value) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
        }
      },
      toContain: (item) => {
        if (!value.includes(item)) {
          throw new Error(`Expected array to contain ${item}`);
        }
      },
      toBeGreaterThan: (expected) => {
        if (value <= expected) {
          throw new Error(`Expected ${value} to be greater than ${expected}`);
        }
      },
      toBeDefined: () => {
        if (value === undefined) {
          throw new Error('Expected value to be defined');
        }
      }
    };
  }

  // Test up migration
  console.log('Testing UP migration:');
  console.log('='.repeat(60));
  
  const upPgm = new MockPgm();
  migration.up(upPgm);
  const upOps = upPgm.operations;

  test('Creates exactly 4 tables', () => {
    const createTableOps = upOps.filter(op => op.type === 'createTable');
    expect(createTableOps.length).toBe(4);
  });

  test('Creates tables in correct order', () => {
    const createTableOps = upOps.filter(op => op.type === 'createTable');
    const tableNames = createTableOps.map(op => op.tableName);
    expect(tableNames).toEqual(['projects', 'users', 'api_tokens', 'requirements']);
  });

  test('Projects table has required columns', () => {
    const projectsTable = upOps.find(
      op => op.type === 'createTable' && op.tableName === 'projects'
    );
    const columns = Object.keys(projectsTable.columns);
    expect(columns).toContain('id');
    expect(columns).toContain('name');
    expect(columns).toContain('custom_field_definitions');
  });

  test('Users table email is unique', () => {
    const usersTable = upOps.find(
      op => op.type === 'createTable' && op.tableName === 'users'
    );
    expect(usersTable.columns.email.unique).toBe(true);
  });

  test('API tokens table references users', () => {
    const apiTokensTable = upOps.find(
      op => op.type === 'createTable' && op.tableName === 'api_tokens'
    );
    expect(apiTokensTable.columns.user_id.references).toBe('users');
  });

  test('Requirements table has all required columns', () => {
    const requirementsTable = upOps.find(
      op => op.type === 'createTable' && op.tableName === 'requirements'
    );
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

  test('Requirements table has correct foreign keys', () => {
    const requirementsTable = upOps.find(
      op => op.type === 'createTable' && op.tableName === 'requirements'
    );
    expect(requirementsTable.columns.project_id.references).toBe('projects');
    expect(requirementsTable.columns.parent_id.references).toBe('requirements');
    expect(requirementsTable.columns.created_by.references).toBe('users');
  });

  test('Requirements table has correct defaults', () => {
    const requirementsTable = upOps.find(
      op => op.type === 'createTable' && op.tableName === 'requirements'
    );
    expect(requirementsTable.columns.status.default).toBe('draft');
    expect(requirementsTable.columns.priority.default).toBe('medium');
    expect(requirementsTable.columns.version.default).toBe(1);
  });

  test('Creates unique index on project_id and display_id', () => {
    const uniqueIndex = upOps.find(
      op => op.type === 'createIndex' && 
      op.options?.name === 'idx_requirements_project_display_id'
    );
    expect(uniqueIndex).toBeDefined();
    expect(uniqueIndex.options.unique).toBe(true);
  });

  test('Creates GIN indexes for JSONB columns', () => {
    const ginIndexes = upOps.filter(
      op => op.type === 'createIndex' && 
      op.options?.method === 'gin'
    );
    expect(ginIndexes.length).toBeGreaterThan(2);
  });

  test('Adds search_vector column', () => {
    const searchVectorSql = upOps.find(
      op => op.type === 'sql' && 
      op.query.includes('search_vector')
    );
    expect(searchVectorSql).toBeDefined();
  });

  test('Creates updated_at trigger', () => {
    const triggerSql = upOps.find(
      op => op.type === 'sql' && 
      op.query.includes('CREATE TRIGGER')
    );
    expect(triggerSql).toBeDefined();
  });

  // Test down migration
  console.log('\nTesting DOWN migration:');
  console.log('='.repeat(60));
  
  const downPgm = new MockPgm();
  migration.down(downPgm);
  const downOps = downPgm.operations;

  test('Drops all 4 tables', () => {
    const dropTableOps = downOps.filter(op => op.type === 'dropTable');
    expect(dropTableOps.length).toBe(4);
  });

  test('Drops tables in reverse order', () => {
    const dropTableOps = downOps.filter(op => op.type === 'dropTable');
    const tableNames = dropTableOps.map(op => op.tableName);
    expect(tableNames).toEqual(['requirements', 'api_tokens', 'users', 'projects']);
  });

  test('Uses cascade option when dropping tables', () => {
    const dropTableOps = downOps.filter(op => op.type === 'dropTable');
    dropTableOps.forEach(op => {
      expect(op.options?.cascade).toBe(true);
    });
  });

  test('Drops trigger before dropping table', () => {
    const dropTriggerSql = downOps.find(
      op => op.type === 'sql' && 
      op.query.includes('DROP TRIGGER')
    );
    expect(dropTriggerSql).toBeDefined();
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`Tests passed: ${passed}`);
  console.log(`Tests failed: ${failed}`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('✗ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests();
