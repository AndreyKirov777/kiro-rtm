/* eslint-disable camelcase */

/**
 * Create core tables migration
 * 
 * This migration creates the core tables for the RMT application:
 * - projects: Project management
 * - users: User accounts
 * - api_tokens: API authentication tokens
 * - requirements: Core requirements table with all fields
 * 
 * Requirements: 1.1-1.12, 2.1-2.3, 4.1-4.3
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create projects table
  pgm.createTable('projects', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    name: {
      type: 'varchar(255)',
      notNull: true
    },
    description: {
      type: 'text',
      notNull: false
    },
    custom_field_definitions: {
      type: 'jsonb',
      notNull: true,
      default: '[]'
    },
    approval_workflow: {
      type: 'jsonb',
      notNull: false
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    created_by: {
      type: 'uuid',
      notNull: true
    }
  });

  // Create users table
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true
    },
    name: {
      type: 'varchar(255)',
      notNull: true
    },
    role: {
      type: 'user_role',
      notNull: true,
      default: 'viewer'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    last_login_at: {
      type: 'timestamp',
      notNull: false
    }
  });

  // Create api_tokens table
  pgm.createTable('api_tokens', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE'
    },
    name: {
      type: 'varchar(255)',
      notNull: true
    },
    token_hash: {
      type: 'varchar(255)',
      notNull: true,
      unique: true
    },
    scopes: {
      type: 'jsonb',
      notNull: true,
      default: '[]'
    },
    expires_at: {
      type: 'timestamp',
      notNull: false
    },
    last_used_at: {
      type: 'timestamp',
      notNull: false
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  // Create requirements table
  pgm.createTable('requirements', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    display_id: {
      type: 'varchar(50)',
      notNull: true
    },
    project_id: {
      type: 'uuid',
      notNull: true,
      references: 'projects',
      onDelete: 'CASCADE'
    },
    parent_id: {
      type: 'uuid',
      notNull: false,
      references: 'requirements',
      onDelete: 'SET NULL'
    },
    title: {
      type: 'varchar(500)',
      notNull: true
    },
    description: {
      type: 'text',
      notNull: true,
      default: ''
    },
    type: {
      type: 'requirement_type',
      notNull: true
    },
    status: {
      type: 'requirement_status',
      notNull: true,
      default: 'draft'
    },
    priority: {
      type: 'priority',
      notNull: true,
      default: 'medium'
    },
    version: {
      type: 'integer',
      notNull: true,
      default: 1
    },
    tags: {
      type: 'jsonb',
      notNull: true,
      default: '[]'
    },
    custom_fields: {
      type: 'jsonb',
      notNull: true,
      default: '{}'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    created_by: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'RESTRICT'
    },
    updated_by: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'RESTRICT'
    }
  });

  // Add indexes on requirements table
  // Index for project queries
  pgm.createIndex('requirements', 'project_id');
  
  // Unique index for display_id within a project
  pgm.createIndex('requirements', ['project_id', 'display_id'], {
    unique: true,
    name: 'idx_requirements_project_display_id'
  });
  
  // Index for parent-child relationships
  pgm.createIndex('requirements', 'parent_id');
  
  // Index for frequently queried fields
  pgm.createIndex('requirements', 'status');
  pgm.createIndex('requirements', 'type');
  pgm.createIndex('requirements', 'priority');
  
  // Composite index for common filter combinations
  pgm.createIndex('requirements', ['project_id', 'status', 'type'], {
    name: 'idx_requirements_project_status_type'
  });
  
  // Index for user references
  pgm.createIndex('requirements', 'created_by');
  pgm.createIndex('requirements', 'updated_by');
  
  // GIN index for tags array
  pgm.createIndex('requirements', 'tags', {
    method: 'gin',
    name: 'idx_requirements_tags'
  });
  
  // GIN index for custom_fields JSONB
  pgm.createIndex('requirements', 'custom_fields', {
    method: 'gin',
    name: 'idx_requirements_custom_fields'
  });
  
  // Full-text search index on title and description
  pgm.sql(`
    ALTER TABLE requirements 
    ADD COLUMN search_vector tsvector 
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'B')
    ) STORED;
  `);
  
  pgm.createIndex('requirements', 'search_vector', {
    method: 'gin',
    name: 'idx_requirements_search'
  });

  // Add trigger to automatically update updated_at timestamp
  pgm.sql(`
    CREATE TRIGGER update_requirements_updated_at
    BEFORE UPDATE ON requirements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // Add indexes on api_tokens table
  pgm.createIndex('api_tokens', 'user_id');
  pgm.createIndex('api_tokens', 'token_hash', { unique: true });

  // Add index on users email
  pgm.createIndex('users', 'email', { unique: true });
};

exports.down = (pgm) => {
  // Drop trigger
  pgm.sql('DROP TRIGGER IF EXISTS update_requirements_updated_at ON requirements;');

  // Drop tables in reverse order (respecting foreign key constraints)
  pgm.dropTable('requirements', { cascade: true });
  pgm.dropTable('api_tokens', { cascade: true });
  pgm.dropTable('users', { cascade: true });
  pgm.dropTable('projects', { cascade: true });
};
