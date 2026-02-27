/**
 * Unit tests for create-traceability-audit-tables migration
 * 
 * These tests verify the migration structure and logic without requiring
 * a database connection. They use a mock pgm object to capture the operations.
 */

const migration = require('./1709000000002_create-traceability-audit-tables');

describe('Migration: create-traceability-audit-tables', () => {
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
        'traceability_links',
        'audit_entries',
        'electronic_signatures'
      ]);
    });

    describe('traceability_links table', () => {
      let traceabilityTable;

      beforeEach(() => {
        traceabilityTable = operations.find(
          op => op.type === 'createTable' && op.tableName === 'traceability_links'
        );
      });

      test('has correct columns', () => {
        const columns = Object.keys(traceabilityTable.columns);
        expect(columns).toContain('id');
        expect(columns).toContain('source_id');
        expect(columns).toContain('target_id');
        expect(columns).toContain('target_type');
        expect(columns).toContain('link_type');
        expect(columns).toContain('external_system');
        expect(columns).toContain('external_id');
        expect(columns).toContain('external_metadata');
        expect(columns).toContain('created_at');
        expect(columns).toContain('created_by');
      });

      test('id is UUID primary key', () => {
        expect(traceabilityTable.columns.id.type).toBe('uuid');
        expect(traceabilityTable.columns.id.primaryKey).toBe(true);
      });

      test('source_id references requirements', () => {
        expect(traceabilityTable.columns.source_id.references).toBe('requirements');
        expect(traceabilityTable.columns.source_id.onDelete).toBe('CASCADE');
        expect(traceabilityTable.columns.source_id.notNull).toBe(true);
      });

      test('target_id is varchar for flexibility', () => {
        expect(traceabilityTable.columns.target_id.type).toBe('varchar(255)');
        expect(traceabilityTable.columns.target_id.notNull).toBe(true);
      });

      test('target_type has check constraint', () => {
        expect(traceabilityTable.columns.target_type.check).toContain('requirement');
        expect(traceabilityTable.columns.target_type.check).toContain('external');
      });

      test('link_type uses enum', () => {
        expect(traceabilityTable.columns.link_type.type).toBe('link_type');
        expect(traceabilityTable.columns.link_type.notNull).toBe(true);
      });

      test('external_system has check constraint', () => {
        expect(traceabilityTable.columns.external_system.check).toContain('jira');
        expect(traceabilityTable.columns.external_system.check).toContain('github');
        expect(traceabilityTable.columns.external_system.check).toContain('linear');
      });

      test('external fields are nullable', () => {
        expect(traceabilityTable.columns.external_system.notNull).toBe(false);
        expect(traceabilityTable.columns.external_id.notNull).toBe(false);
        expect(traceabilityTable.columns.external_metadata.notNull).toBe(false);
      });

      test('external_metadata is JSONB', () => {
        expect(traceabilityTable.columns.external_metadata.type).toBe('jsonb');
      });

      test('created_by references users', () => {
        expect(traceabilityTable.columns.created_by.references).toBe('users');
        expect(traceabilityTable.columns.created_by.onDelete).toBe('RESTRICT');
      });
    });

    describe('traceability_links indexes', () => {
      test('creates index on source_id', () => {
        const sourceIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.options?.name === 'idx_traceability_links_source_id'
        );
        
        expect(sourceIndex).toBeDefined();
        expect(sourceIndex.tableName).toBe('traceability_links');
        expect(sourceIndex.columns).toBe('source_id');
      });

      test('creates index on target_id', () => {
        const targetIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.options?.name === 'idx_traceability_links_target_id'
        );
        
        expect(targetIndex).toBeDefined();
        expect(targetIndex.tableName).toBe('traceability_links');
        expect(targetIndex.columns).toBe('target_id');
      });

      test('creates index on link_type', () => {
        const linkTypeIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.options?.name === 'idx_traceability_links_link_type'
        );
        
        expect(linkTypeIndex).toBeDefined();
      });

      test('creates composite index on source_id and link_type', () => {
        const compositeIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.options?.name === 'idx_traceability_links_source_link_type'
        );
        
        expect(compositeIndex).toBeDefined();
        expect(compositeIndex.columns).toEqual(['source_id', 'link_type']);
      });

      test('creates unique constraint on source, target, and link_type', () => {
        const uniqueIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.options?.name === 'idx_traceability_links_unique'
        );
        
        expect(uniqueIndex).toBeDefined();
        expect(uniqueIndex.options.unique).toBe(true);
        expect(uniqueIndex.columns).toEqual(['source_id', 'target_id', 'link_type']);
      });

      test('creates partial index on external_system', () => {
        const externalIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.options?.name === 'idx_traceability_links_external_system'
        );
        
        expect(externalIndex).toBeDefined();
        expect(externalIndex.options.where).toBe('external_system IS NOT NULL');
      });

      test('creates at least 7 indexes', () => {
        const indexOps = operations.filter(
          op => op.type === 'createIndex' && op.tableName === 'traceability_links'
        );
        
        expect(indexOps.length).toBeGreaterThanOrEqual(7);
      });
    });

    describe('audit_entries table', () => {
      let auditTable;

      beforeEach(() => {
        auditTable = operations.find(
          op => op.type === 'createTable' && op.tableName === 'audit_entries'
        );
      });

      test('has correct columns', () => {
        const columns = Object.keys(auditTable.columns);
        expect(columns).toContain('id');
        expect(columns).toContain('timestamp');
        expect(columns).toContain('actor_id');
        expect(columns).toContain('actor_type');
        expect(columns).toContain('entity_type');
        expect(columns).toContain('entity_id');
        expect(columns).toContain('action');
        expect(columns).toContain('change_description');
        expect(columns).toContain('previous_value');
        expect(columns).toContain('new_value');
      });

      test('id is UUID primary key', () => {
        expect(auditTable.columns.id.type).toBe('uuid');
        expect(auditTable.columns.id.primaryKey).toBe(true);
      });

      test('timestamp has default', () => {
        expect(auditTable.columns.timestamp.notNull).toBe(true);
        expect(auditTable.columns.timestamp.default).toBeDefined();
      });

      test('actor_type uses enum', () => {
        expect(auditTable.columns.actor_type.type).toBe('actor_type');
        expect(auditTable.columns.actor_type.notNull).toBe(true);
      });

      test('entity_type has check constraint', () => {
        expect(auditTable.columns.entity_type.check).toContain('requirement');
        expect(auditTable.columns.entity_type.check).toContain('traceability_link');
        expect(auditTable.columns.entity_type.check).toContain('baseline');
        expect(auditTable.columns.entity_type.check).toContain('comment');
      });

      test('previous_value and new_value are JSONB and nullable', () => {
        expect(auditTable.columns.previous_value.type).toBe('jsonb');
        expect(auditTable.columns.previous_value.notNull).toBe(false);
        expect(auditTable.columns.new_value.type).toBe('jsonb');
        expect(auditTable.columns.new_value.notNull).toBe(false);
      });

      test('required fields are not null', () => {
        expect(auditTable.columns.actor_id.notNull).toBe(true);
        expect(auditTable.columns.entity_id.notNull).toBe(true);
        expect(auditTable.columns.action.notNull).toBe(true);
        expect(auditTable.columns.change_description.notNull).toBe(true);
      });
    });

    describe('audit_entries indexes', () => {
      test('creates composite index on entity_type and entity_id', () => {
        const entityIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.options?.name === 'idx_audit_entries_entity'
        );
        
        expect(entityIndex).toBeDefined();
        expect(entityIndex.columns).toEqual(['entity_type', 'entity_id']);
      });

      test('creates index on timestamp', () => {
        const timestampIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.options?.name === 'idx_audit_entries_timestamp'
        );
        
        expect(timestampIndex).toBeDefined();
      });

      test('creates composite index on actor', () => {
        const actorIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.options?.name === 'idx_audit_entries_actor'
        );
        
        expect(actorIndex).toBeDefined();
        expect(actorIndex.columns).toEqual(['actor_id', 'actor_type']);
      });

      test('creates index on action', () => {
        const actionIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.options?.name === 'idx_audit_entries_action'
        );
        
        expect(actionIndex).toBeDefined();
      });

      test('creates composite index on entity and timestamp', () => {
        const compositeIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.options?.name === 'idx_audit_entries_entity_timestamp'
        );
        
        expect(compositeIndex).toBeDefined();
        expect(compositeIndex.columns).toEqual(['entity_type', 'entity_id', 'timestamp']);
      });

      test('creates at least 5 indexes', () => {
        const indexOps = operations.filter(
          op => op.type === 'createIndex' && op.tableName === 'audit_entries'
        );
        
        expect(indexOps.length).toBeGreaterThanOrEqual(5);
      });
    });

    describe('audit_entries immutability', () => {
      test('creates immutability function', () => {
        const functionSql = operations.find(
          op => op.type === 'sql' && 
          op.query.includes('prevent_audit_entry_modification')
        );
        
        expect(functionSql).toBeDefined();
        expect(functionSql.query).toContain('CREATE OR REPLACE FUNCTION');
        expect(functionSql.query).toContain('RAISE EXCEPTION');
        expect(functionSql.query).toContain('immutable');
      });

      test('creates UPDATE trigger', () => {
        const updateTrigger = operations.find(
          op => op.type === 'sql' && 
          op.query.includes('prevent_audit_entry_update')
        );
        
        expect(updateTrigger).toBeDefined();
        expect(updateTrigger.query).toContain('CREATE TRIGGER');
        expect(updateTrigger.query).toContain('BEFORE UPDATE');
        expect(updateTrigger.query).toContain('audit_entries');
      });

      test('creates DELETE trigger', () => {
        const deleteTrigger = operations.find(
          op => op.type === 'sql' && 
          op.query.includes('prevent_audit_entry_delete')
        );
        
        expect(deleteTrigger).toBeDefined();
        expect(deleteTrigger.query).toContain('CREATE TRIGGER');
        expect(deleteTrigger.query).toContain('BEFORE DELETE');
        expect(deleteTrigger.query).toContain('audit_entries');
      });
    });

    describe('electronic_signatures table', () => {
      let signaturesTable;

      beforeEach(() => {
        signaturesTable = operations.find(
          op => op.type === 'createTable' && op.tableName === 'electronic_signatures'
        );
      });

      test('has correct columns', () => {
        const columns = Object.keys(signaturesTable.columns);
        expect(columns).toContain('id');
        expect(columns).toContain('requirement_id');
        expect(columns).toContain('user_id');
        expect(columns).toContain('signature_meaning');
        expect(columns).toContain('timestamp');
        expect(columns).toContain('signature_hash');
      });

      test('id is UUID primary key', () => {
        expect(signaturesTable.columns.id.type).toBe('uuid');
        expect(signaturesTable.columns.id.primaryKey).toBe(true);
      });

      test('requirement_id references requirements', () => {
        expect(signaturesTable.columns.requirement_id.references).toBe('requirements');
        expect(signaturesTable.columns.requirement_id.onDelete).toBe('CASCADE');
        expect(signaturesTable.columns.requirement_id.notNull).toBe(true);
      });

      test('user_id references users', () => {
        expect(signaturesTable.columns.user_id.references).toBe('users');
        expect(signaturesTable.columns.user_id.onDelete).toBe('RESTRICT');
        expect(signaturesTable.columns.user_id.notNull).toBe(true);
      });

      test('signature_meaning is text and required', () => {
        expect(signaturesTable.columns.signature_meaning.type).toBe('text');
        expect(signaturesTable.columns.signature_meaning.notNull).toBe(true);
      });

      test('timestamp has default', () => {
        expect(signaturesTable.columns.timestamp.notNull).toBe(true);
        expect(signaturesTable.columns.timestamp.default).toBeDefined();
      });

      test('signature_hash is required', () => {
        expect(signaturesTable.columns.signature_hash.type).toBe('varchar(255)');
        expect(signaturesTable.columns.signature_hash.notNull).toBe(true);
      });
    });

    describe('electronic_signatures indexes', () => {
      test('creates index on requirement_id', () => {
        const reqIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.options?.name === 'idx_electronic_signatures_requirement_id'
        );
        
        expect(reqIndex).toBeDefined();
      });

      test('creates index on user_id', () => {
        const userIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.options?.name === 'idx_electronic_signatures_user_id'
        );
        
        expect(userIndex).toBeDefined();
      });

      test('creates index on timestamp', () => {
        const timestampIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.options?.name === 'idx_electronic_signatures_timestamp'
        );
        
        expect(timestampIndex).toBeDefined();
      });

      test('creates composite index on requirement and timestamp', () => {
        const compositeIndex = operations.find(
          op => op.type === 'createIndex' && 
          op.options?.name === 'idx_electronic_signatures_requirement_timestamp'
        );
        
        expect(compositeIndex).toBeDefined();
        expect(compositeIndex.columns).toEqual(['requirement_id', 'timestamp']);
      });

      test('creates at least 4 indexes', () => {
        const indexOps = operations.filter(
          op => op.type === 'createIndex' && op.tableName === 'electronic_signatures'
        );
        
        expect(indexOps.length).toBeGreaterThanOrEqual(4);
      });
    });

    describe('electronic_signatures immutability', () => {
      test('creates immutability function', () => {
        const functionSql = operations.find(
          op => op.type === 'sql' && 
          op.query.includes('prevent_signature_modification')
        );
        
        expect(functionSql).toBeDefined();
        expect(functionSql.query).toContain('CREATE OR REPLACE FUNCTION');
        expect(functionSql.query).toContain('RAISE EXCEPTION');
        expect(functionSql.query).toContain('immutable');
      });

      test('creates UPDATE trigger', () => {
        const updateTrigger = operations.find(
          op => op.type === 'sql' && 
          op.query.includes('prevent_signature_update')
        );
        
        expect(updateTrigger).toBeDefined();
        expect(updateTrigger.query).toContain('CREATE TRIGGER');
        expect(updateTrigger.query).toContain('BEFORE UPDATE');
        expect(updateTrigger.query).toContain('electronic_signatures');
      });

      test('creates DELETE trigger', () => {
        const deleteTrigger = operations.find(
          op => op.type === 'sql' && 
          op.query.includes('prevent_signature_delete')
        );
        
        expect(deleteTrigger).toBeDefined();
        expect(deleteTrigger.query).toContain('CREATE TRIGGER');
        expect(deleteTrigger.query).toContain('BEFORE DELETE');
        expect(deleteTrigger.query).toContain('electronic_signatures');
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
        'electronic_signatures',
        'audit_entries',
        'traceability_links'
      ]);
    });

    test('uses cascade option', () => {
      const dropTableOps = operations.filter(op => op.type === 'dropTable');
      
      dropTableOps.forEach(op => {
        expect(op.options?.cascade).toBe(true);
      });
    });

    test('drops signature triggers', () => {
      const dropTriggers = operations.filter(
        op => op.type === 'sql' && 
        op.query.includes('DROP TRIGGER') &&
        op.query.includes('signature')
      );
      
      expect(dropTriggers.length).toBeGreaterThanOrEqual(2);
    });

    test('drops audit triggers', () => {
      const dropTriggers = operations.filter(
        op => op.type === 'sql' && 
        op.query.includes('DROP TRIGGER') &&
        op.query.includes('audit_entry')
      );
      
      expect(dropTriggers.length).toBeGreaterThanOrEqual(2);
    });

    test('drops signature function', () => {
      const dropFunction = operations.find(
        op => op.type === 'sql' && 
        op.query.includes('DROP FUNCTION') &&
        op.query.includes('prevent_signature_modification')
      );
      
      expect(dropFunction).toBeDefined();
    });

    test('drops audit function', () => {
      const dropFunction = operations.find(
        op => op.type === 'sql' && 
        op.query.includes('DROP FUNCTION') &&
        op.query.includes('prevent_audit_entry_modification')
      );
      
      expect(dropFunction).toBeDefined();
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
