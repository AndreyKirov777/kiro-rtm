/* eslint-disable camelcase */

/**
 * Create traceability and audit tables migration
 * 
 * This migration creates the traceability, audit, and signature tables:
 * - traceability_links: Bidirectional links between requirements and external items
 * - audit_entries: Immutable audit trail for all changes
 * - electronic_signatures: Tamper-evident signatures for approvals
 * 
 * Requirements: 8.1-8.7, 14.1-14.7, 21.1-21.5
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create traceability_links table
  pgm.createTable('traceability_links', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    source_id: {
      type: 'uuid',
      notNull: true,
      references: 'requirements',
      onDelete: 'CASCADE'
    },
    target_id: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'UUID for internal requirements or external reference string'
    },
    target_type: {
      type: 'varchar(50)',
      notNull: true,
      check: "target_type IN ('requirement', 'external')"
    },
    link_type: {
      type: 'link_type',
      notNull: true
    },
    // External system fields (optional, for external integrations)
    external_system: {
      type: 'varchar(50)',
      notNull: false,
      check: "external_system IS NULL OR external_system IN ('jira', 'github', 'linear')"
    },
    external_id: {
      type: 'varchar(255)',
      notNull: false
    },
    external_metadata: {
      type: 'jsonb',
      notNull: false,
      comment: 'Stores title, status, url, lastSyncedAt for external items'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    created_by: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'RESTRICT'
    }
  });

  // Add indexes for traceability queries
  // Index for finding all links from a source requirement
  pgm.createIndex('traceability_links', 'source_id', {
    name: 'idx_traceability_links_source_id'
  });
  
  // Index for finding all links to a target (for bidirectional queries)
  pgm.createIndex('traceability_links', 'target_id', {
    name: 'idx_traceability_links_target_id'
  });
  
  // Index for filtering by link type
  pgm.createIndex('traceability_links', 'link_type', {
    name: 'idx_traceability_links_link_type'
  });
  
  // Composite index for common queries (source + link type)
  pgm.createIndex('traceability_links', ['source_id', 'link_type'], {
    name: 'idx_traceability_links_source_link_type'
  });
  
  // Unique constraint to prevent duplicate links
  pgm.createIndex('traceability_links', ['source_id', 'target_id', 'link_type'], {
    unique: true,
    name: 'idx_traceability_links_unique'
  });
  
  // Index for external system queries
  pgm.createIndex('traceability_links', 'external_system', {
    name: 'idx_traceability_links_external_system',
    where: 'external_system IS NOT NULL'
  });
  
  // Index for created_by
  pgm.createIndex('traceability_links', 'created_by');

  // Create audit_entries table (append-only with immutability constraints)
  pgm.createTable('audit_entries', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    timestamp: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    actor_id: {
      type: 'uuid',
      notNull: true,
      comment: 'User ID or API client ID'
    },
    actor_type: {
      type: 'actor_type',
      notNull: true
    },
    entity_type: {
      type: 'varchar(50)',
      notNull: true,
      check: "entity_type IN ('requirement', 'traceability_link', 'baseline', 'comment')"
    },
    entity_id: {
      type: 'uuid',
      notNull: true
    },
    action: {
      type: 'varchar(100)',
      notNull: true,
      comment: 'e.g., "update_status", "create_link", "delete_requirement"'
    },
    change_description: {
      type: 'text',
      notNull: true
    },
    previous_value: {
      type: 'jsonb',
      notNull: false
    },
    new_value: {
      type: 'jsonb',
      notNull: false
    }
  });

  // Add indexes for audit trail queries
  // Index for querying by entity
  pgm.createIndex('audit_entries', ['entity_type', 'entity_id'], {
    name: 'idx_audit_entries_entity'
  });
  
  // Index for querying by timestamp (for date range queries)
  pgm.createIndex('audit_entries', 'timestamp', {
    name: 'idx_audit_entries_timestamp'
  });
  
  // Index for querying by actor
  pgm.createIndex('audit_entries', ['actor_id', 'actor_type'], {
    name: 'idx_audit_entries_actor'
  });
  
  // Index for querying by action type
  pgm.createIndex('audit_entries', 'action', {
    name: 'idx_audit_entries_action'
  });
  
  // Composite index for common queries (entity + timestamp)
  pgm.createIndex('audit_entries', ['entity_type', 'entity_id', 'timestamp'], {
    name: 'idx_audit_entries_entity_timestamp'
  });

  // Add immutability constraint: prevent updates and deletes on audit_entries
  pgm.sql(`
    CREATE OR REPLACE FUNCTION prevent_audit_entry_modification()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'Audit entries are immutable and cannot be modified or deleted';
    END;
    $$ language 'plpgsql';
  `);

  pgm.sql(`
    CREATE TRIGGER prevent_audit_entry_update
    BEFORE UPDATE ON audit_entries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_entry_modification();
  `);

  pgm.sql(`
    CREATE TRIGGER prevent_audit_entry_delete
    BEFORE DELETE ON audit_entries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_entry_modification();
  `);

  // Create electronic_signatures table
  pgm.createTable('electronic_signatures', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    requirement_id: {
      type: 'uuid',
      notNull: true,
      references: 'requirements',
      onDelete: 'CASCADE'
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'RESTRICT'
    },
    signature_meaning: {
      type: 'text',
      notNull: true,
      comment: 'e.g., "Approved for implementation", "Reviewed and accepted"'
    },
    timestamp: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    signature_hash: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'HMAC-SHA256 hash for tamper detection'
    }
  });

  // Add indexes for electronic signatures
  // Index for finding signatures by requirement
  pgm.createIndex('electronic_signatures', 'requirement_id', {
    name: 'idx_electronic_signatures_requirement_id'
  });
  
  // Index for finding signatures by user
  pgm.createIndex('electronic_signatures', 'user_id', {
    name: 'idx_electronic_signatures_user_id'
  });
  
  // Index for timestamp queries
  pgm.createIndex('electronic_signatures', 'timestamp', {
    name: 'idx_electronic_signatures_timestamp'
  });
  
  // Composite index for common queries (requirement + timestamp)
  pgm.createIndex('electronic_signatures', ['requirement_id', 'timestamp'], {
    name: 'idx_electronic_signatures_requirement_timestamp'
  });

  // Add immutability constraint: prevent updates and deletes on electronic_signatures
  pgm.sql(`
    CREATE OR REPLACE FUNCTION prevent_signature_modification()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'Electronic signatures are immutable and cannot be modified or deleted';
    END;
    $$ language 'plpgsql';
  `);

  pgm.sql(`
    CREATE TRIGGER prevent_signature_update
    BEFORE UPDATE ON electronic_signatures
    FOR EACH ROW
    EXECUTE FUNCTION prevent_signature_modification();
  `);

  pgm.sql(`
    CREATE TRIGGER prevent_signature_delete
    BEFORE DELETE ON electronic_signatures
    FOR EACH ROW
    EXECUTE FUNCTION prevent_signature_modification();
  `);
};

exports.down = (pgm) => {
  // Drop triggers and functions
  pgm.sql('DROP TRIGGER IF EXISTS prevent_signature_delete ON electronic_signatures;');
  pgm.sql('DROP TRIGGER IF EXISTS prevent_signature_update ON electronic_signatures;');
  pgm.sql('DROP FUNCTION IF EXISTS prevent_signature_modification();');
  
  pgm.sql('DROP TRIGGER IF EXISTS prevent_audit_entry_delete ON audit_entries;');
  pgm.sql('DROP TRIGGER IF EXISTS prevent_audit_entry_update ON audit_entries;');
  pgm.sql('DROP FUNCTION IF EXISTS prevent_audit_entry_modification();');

  // Drop tables in reverse order
  pgm.dropTable('electronic_signatures', { cascade: true });
  pgm.dropTable('audit_entries', { cascade: true });
  pgm.dropTable('traceability_links', { cascade: true });
};
