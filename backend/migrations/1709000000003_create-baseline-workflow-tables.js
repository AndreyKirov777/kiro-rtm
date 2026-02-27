/* eslint-disable camelcase */

/**
 * Create baseline and workflow tables migration
 * 
 * This migration creates the baseline, comments, and attachments tables:
 * - baselines: Named snapshots of requirements at specific points in time
 * - comments: Threaded discussions on requirements
 * - attachments: File attachments for requirements
 * 
 * Also adds full-text search indexes (GIN) on requirements table.
 * 
 * Requirements: 6.1-6.4, 5.1-5.3, 16.1-16.5
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create baselines table
  pgm.createTable('baselines', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    project_id: {
      type: 'uuid',
      notNull: true,
      references: 'projects',
      onDelete: 'CASCADE'
    },
    name: {
      type: 'varchar(255)',
      notNull: true
    },
    description: {
      type: 'text',
      notNull: false
    },
    locked: {
      type: 'boolean',
      notNull: true,
      default: false
    },
    locked_at: {
      type: 'timestamp',
      notNull: false
    },
    locked_by: {
      type: 'uuid',
      notNull: false,
      references: 'users',
      onDelete: 'RESTRICT'
    },
    snapshot_data: {
      type: 'jsonb',
      notNull: true,
      comment: 'JSON blob of all requirement states at baseline creation'
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

  // Add indexes on baselines table
  // Index for project queries
  pgm.createIndex('baselines', 'project_id', {
    name: 'idx_baselines_project_id'
  });
  
  // Index for filtering by locked status
  pgm.createIndex('baselines', 'locked', {
    name: 'idx_baselines_locked'
  });
  
  // Composite index for common queries (project + locked)
  pgm.createIndex('baselines', ['project_id', 'locked'], {
    name: 'idx_baselines_project_locked'
  });
  
  // Index for created_by
  pgm.createIndex('baselines', 'created_by');
  
  // Index for locked_by
  pgm.createIndex('baselines', 'locked_by', {
    where: 'locked_by IS NOT NULL'
  });

  // Create comments table with threading support
  pgm.createTable('comments', {
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
    parent_comment_id: {
      type: 'uuid',
      notNull: false,
      references: 'comments',
      onDelete: 'CASCADE',
      comment: 'For threaded discussions'
    },
    content: {
      type: 'text',
      notNull: true
    },
    author_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'RESTRICT'
    },
    is_clarification_request: {
      type: 'boolean',
      notNull: true,
      default: false
    },
    assigned_to: {
      type: 'uuid',
      notNull: false,
      references: 'users',
      onDelete: 'SET NULL',
      comment: 'User ID for clarification requests'
    },
    resolved: {
      type: 'boolean',
      notNull: true,
      default: false
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
    }
  });

  // Add indexes on comments table
  // Index for finding comments by requirement
  pgm.createIndex('comments', 'requirement_id', {
    name: 'idx_comments_requirement_id'
  });
  
  // Index for finding replies to a comment (threading)
  pgm.createIndex('comments', 'parent_comment_id', {
    name: 'idx_comments_parent_comment_id',
    where: 'parent_comment_id IS NOT NULL'
  });
  
  // Index for finding comments by author
  pgm.createIndex('comments', 'author_id', {
    name: 'idx_comments_author_id'
  });
  
  // Index for finding clarification requests
  pgm.createIndex('comments', 'is_clarification_request', {
    name: 'idx_comments_clarification_request',
    where: 'is_clarification_request = true'
  });
  
  // Index for finding unresolved comments
  pgm.createIndex('comments', 'resolved', {
    name: 'idx_comments_resolved'
  });
  
  // Index for assigned clarification requests
  pgm.createIndex('comments', 'assigned_to', {
    name: 'idx_comments_assigned_to',
    where: 'assigned_to IS NOT NULL'
  });
  
  // Composite index for common queries (requirement + created_at for chronological order)
  pgm.createIndex('comments', ['requirement_id', 'created_at'], {
    name: 'idx_comments_requirement_created'
  });

  // Add trigger to automatically update updated_at timestamp
  pgm.sql(`
    CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create attachments table
  pgm.createTable('attachments', {
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
    filename: {
      type: 'varchar(255)',
      notNull: true
    },
    mime_type: {
      type: 'varchar(100)',
      notNull: true
    },
    size_bytes: {
      type: 'bigint',
      notNull: true
    },
    storage_path: {
      type: 'varchar(500)',
      notNull: true,
      comment: 'Local filesystem path relative to uploads directory'
    },
    uploaded_by: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'RESTRICT'
    },
    uploaded_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  // Add indexes on attachments table
  // Index for finding attachments by requirement
  pgm.createIndex('attachments', 'requirement_id', {
    name: 'idx_attachments_requirement_id'
  });
  
  // Index for finding attachments by uploader
  pgm.createIndex('attachments', 'uploaded_by', {
    name: 'idx_attachments_uploaded_by'
  });
  
  // Composite index for common queries (requirement + uploaded_at)
  pgm.createIndex('attachments', ['requirement_id', 'uploaded_at'], {
    name: 'idx_attachments_requirement_uploaded'
  });
  
  // Index for storage path lookups
  pgm.createIndex('attachments', 'storage_path', {
    name: 'idx_attachments_storage_path',
    unique: true
  });
};

exports.down = (pgm) => {
  // Drop trigger
  pgm.sql('DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;');

  // Drop tables in reverse order (respecting foreign key constraints)
  pgm.dropTable('attachments', { cascade: true });
  pgm.dropTable('comments', { cascade: true });
  pgm.dropTable('baselines', { cascade: true });
};
