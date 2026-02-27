/* eslint-disable camelcase */

/**
 * Create retired_display_ids table migration
 * 
 * This migration creates a table to track retired display IDs to ensure
 * they are never reused, even after hard deletion of requirements.
 * 
 * Requirements: 18.1-18.3
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create retired_display_ids table
  pgm.createTable('retired_display_ids', {
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
    retired_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    original_requirement_id: {
      type: 'uuid',
      notNull: true
    },
    retired_by: {
      type: 'uuid',
      notNull: false,
      references: 'users',
      onDelete: 'SET NULL'
    }
  });

  // Add unique constraint on (project_id, display_id)
  pgm.addConstraint('retired_display_ids', 'unique_retired_display_id_per_project', {
    unique: ['project_id', 'display_id']
  });

  // Add indexes
  pgm.createIndex('retired_display_ids', 'project_id');
  pgm.createIndex('retired_display_ids', ['project_id', 'display_id'], {
    name: 'idx_retired_display_ids_lookup'
  });

  // Create trigger function to automatically retire display IDs when requirements are deleted
  pgm.sql(`
    CREATE OR REPLACE FUNCTION retire_display_id()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Only retire if status is deprecated or if it's a hard delete
      IF (TG_OP = 'DELETE') OR (NEW.status = 'deprecated' AND OLD.status != 'deprecated') THEN
        INSERT INTO retired_display_ids (display_id, project_id, original_requirement_id, retired_by)
        VALUES (
          COALESCE(OLD.display_id, NEW.display_id),
          COALESCE(OLD.project_id, NEW.project_id),
          COALESCE(OLD.id, NEW.id),
          COALESCE(NEW.updated_by, OLD.updated_by)
        )
        ON CONFLICT (project_id, display_id) DO NOTHING;
      END IF;
      
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger on requirements table
  pgm.sql(`
    CREATE TRIGGER retire_display_id_on_delete
    BEFORE DELETE ON requirements
    FOR EACH ROW
    EXECUTE FUNCTION retire_display_id();
  `);

  pgm.sql(`
    CREATE TRIGGER retire_display_id_on_deprecate
    AFTER UPDATE ON requirements
    FOR EACH ROW
    WHEN (NEW.status = 'deprecated' AND OLD.status != 'deprecated')
    EXECUTE FUNCTION retire_display_id();
  `);
};

exports.down = (pgm) => {
  // Drop triggers
  pgm.sql('DROP TRIGGER IF EXISTS retire_display_id_on_deprecate ON requirements;');
  pgm.sql('DROP TRIGGER IF EXISTS retire_display_id_on_delete ON requirements;');
  
  // Drop trigger function
  pgm.sql('DROP FUNCTION IF EXISTS retire_display_id();');
  
  // Drop table
  pgm.dropTable('retired_display_ids', { cascade: true });
};
