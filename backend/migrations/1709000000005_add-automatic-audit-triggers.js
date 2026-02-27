/* eslint-disable camelcase */

/**
 * Add automatic audit logging triggers
 * 
 * This migration creates database triggers that automatically log changes to:
 * - requirements table (INSERT, UPDATE, DELETE)
 * - traceability_links table (INSERT, DELETE)
 * 
 * These triggers ensure complete audit trail coverage without requiring
 * application code to explicitly create audit entries for every change.
 * 
 * IMPORTANT NOTES:
 * - Triggers execute synchronously and will cause the operation to fail if audit insert fails
 * - This is intentional for audit integrity - no changes without audit trail
 * - UPDATE detection captures first changed field only (performance trade-off)
 * - Display ID lookups in link triggers add latency but improve audit readability
 * 
 * Requirements: 14.1-14.4
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create function to log requirement changes
  pgm.sql(`
    CREATE OR REPLACE FUNCTION log_requirement_change()
    RETURNS TRIGGER AS $$
    DECLARE
      actor_id_val uuid;
      actor_type_val actor_type;
      action_val varchar(100);
      change_desc text;
      prev_val jsonb;
      new_val jsonb;
    BEGIN
      -- Determine actor (use updated_by for UPDATE, created_by for INSERT)
      IF TG_OP = 'INSERT' THEN
        actor_id_val := NEW.created_by;
        actor_type_val := 'user';
        action_val := 'create_requirement';
        change_desc := format('Created requirement: %s', NEW.title);
        prev_val := NULL;
        new_val := jsonb_build_object(
          'displayId', NEW.display_id,
          'title', NEW.title,
          'description', NEW.description,
          'type', NEW.type,
          'status', NEW.status,
          'priority', NEW.priority,
          'version', NEW.version
        );
      ELSIF TG_OP = 'UPDATE' THEN
        actor_id_val := NEW.updated_by;
        actor_type_val := 'user';
        
        -- Determine what changed (captures first change only for performance)
        IF OLD.status != NEW.status THEN
          action_val := 'update_status';
          change_desc := format('Status changed from %s to %s', OLD.status, NEW.status);
          prev_val := jsonb_build_object('status', OLD.status);
          new_val := jsonb_build_object('status', NEW.status);
        ELSIF OLD.title != NEW.title OR OLD.description != NEW.description THEN
          action_val := 'update_field';
          change_desc := 'Updated requirement fields';
          prev_val := jsonb_build_object(
            'title', OLD.title,
            'description', OLD.description
          );
          new_val := jsonb_build_object(
            'title', NEW.title,
            'description', NEW.description
          );
        ELSIF OLD.type != NEW.type THEN
          action_val := 'update_type';
          change_desc := format('Type changed from %s to %s', OLD.type, NEW.type);
          prev_val := jsonb_build_object('type', OLD.type);
          new_val := jsonb_build_object('type', NEW.type);
        ELSIF OLD.priority != NEW.priority THEN
          action_val := 'update_priority';
          change_desc := 'Priority changed from ' || OLD.priority || ' to ' || NEW.priority;
          prev_val := jsonb_build_object('priority', OLD.priority);
          new_val := jsonb_build_object('priority', NEW.priority);
        ELSIF OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
          action_val := 'update_hierarchy';
          change_desc := 'Parent changed';
          prev_val := jsonb_build_object('parentId', OLD.parent_id);
          new_val := jsonb_build_object('parentId', NEW.parent_id);
        ELSIF OLD.tags::text != NEW.tags::text THEN
          action_val := 'update_tags';
          change_desc := 'Tags updated';
          prev_val := jsonb_build_object('tags', OLD.tags);
          new_val := jsonb_build_object('tags', NEW.tags);
        ELSIF OLD.custom_fields::text != NEW.custom_fields::text THEN
          action_val := 'update_custom_fields';
          change_desc := 'Custom fields updated';
          prev_val := OLD.custom_fields;
          new_val := NEW.custom_fields;
        ELSE
          action_val := 'update_requirement';
          change_desc := 'Requirement updated';
          prev_val := jsonb_build_object('version', OLD.version);
          new_val := jsonb_build_object('version', NEW.version);
        END IF;
      ELSIF TG_OP = 'DELETE' THEN
        actor_id_val := OLD.updated_by;
        actor_type_val := 'user';
        action_val := 'delete_requirement';
        change_desc := 'Deleted requirement: ' || OLD.title;
        prev_val := jsonb_build_object(
          'displayId', OLD.display_id,
          'title', OLD.title,
          'status', OLD.status
        );
        new_val := NULL;
      END IF;

      -- Insert audit entry
      INSERT INTO audit_entries (
        actor_id, actor_type, entity_type, entity_id,
        action, change_description, previous_value, new_value
      ) VALUES (
        actor_id_val, actor_type_val, 'requirement',
        COALESCE(NEW.id, OLD.id),
        action_val, change_desc, prev_val, new_val
      );

      -- Return appropriate value based on operation
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create triggers for requirements table
  pgm.sql(`
    CREATE TRIGGER audit_requirement_insert
    AFTER INSERT ON requirements
    FOR EACH ROW
    EXECUTE FUNCTION log_requirement_change();
  `);

  pgm.sql(`
    CREATE TRIGGER audit_requirement_update
    AFTER UPDATE ON requirements
    FOR EACH ROW
    EXECUTE FUNCTION log_requirement_change();
  `);

  pgm.sql(`
    CREATE TRIGGER audit_requirement_delete
    AFTER DELETE ON requirements
    FOR EACH ROW
    EXECUTE FUNCTION log_requirement_change();
  `);

  // Create function to log traceability link changes
  pgm.sql(`
    CREATE OR REPLACE FUNCTION log_traceability_link_change()
    RETURNS TRIGGER AS $$
    DECLARE
      actor_id_val uuid;
      actor_type_val actor_type;
      action_val varchar(100);
      change_desc text;
      prev_val jsonb;
      new_val jsonb;
      source_display_id varchar(50);
      target_display_id varchar(50);
    BEGIN
      IF TG_OP = 'INSERT' THEN
        actor_id_val := NEW.created_by;
        actor_type_val := 'user';
        action_val := 'create_link';
        
        -- Get display IDs for better audit messages
        SELECT display_id INTO source_display_id 
        FROM requirements WHERE id = NEW.source_id;
        
        IF NEW.target_type = 'requirement' THEN
          SELECT display_id INTO target_display_id 
          FROM requirements WHERE id = NEW.target_id::uuid;
          change_desc := 'Created ' || NEW.link_type || ' link from ' || 
                        COALESCE(source_display_id, NEW.source_id::text) || ' to ' || 
                        COALESCE(target_display_id, NEW.target_id);
        ELSE
          change_desc := 'Created ' || NEW.link_type || ' link from ' || 
                        COALESCE(source_display_id, NEW.source_id::text) || ' to external item ' || 
                        NEW.target_id;
        END IF;
        
        prev_val := NULL;
        new_val := jsonb_build_object(
          'sourceId', NEW.source_id,
          'targetId', NEW.target_id,
          'targetType', NEW.target_type,
          'linkType', NEW.link_type
        );
      ELSIF TG_OP = 'DELETE' THEN
        actor_id_val := OLD.created_by;
        actor_type_val := 'user';
        action_val := 'delete_link';
        
        -- Get display IDs for better audit messages
        SELECT display_id INTO source_display_id 
        FROM requirements WHERE id = OLD.source_id;
        
        IF OLD.target_type = 'requirement' THEN
          SELECT display_id INTO target_display_id 
          FROM requirements WHERE id = OLD.target_id::uuid;
          change_desc := 'Deleted ' || OLD.link_type || ' link from ' || 
                        COALESCE(source_display_id, OLD.source_id::text) || ' to ' || 
                        COALESCE(target_display_id, OLD.target_id);
        ELSE
          change_desc := 'Deleted ' || OLD.link_type || ' link from ' || 
                        COALESCE(source_display_id, OLD.source_id::text) || ' to external item ' || 
                        OLD.target_id;
        END IF;
        
        prev_val := jsonb_build_object(
          'sourceId', OLD.source_id,
          'targetId', OLD.target_id,
          'targetType', OLD.target_type,
          'linkType', OLD.link_type
        );
        new_val := NULL;
      END IF;

      -- Insert audit entry
      INSERT INTO audit_entries (
        actor_id, actor_type, entity_type, entity_id,
        action, change_description, previous_value, new_value
      ) VALUES (
        actor_id_val, actor_type_val, 'traceability_link',
        COALESCE(NEW.id, OLD.id),
        action_val, change_desc, prev_val, new_val
      );

      -- Return appropriate value based on operation
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create triggers for traceability_links table
  pgm.sql(`
    CREATE TRIGGER audit_traceability_link_insert
    AFTER INSERT ON traceability_links
    FOR EACH ROW
    EXECUTE FUNCTION log_traceability_link_change();
  `);

  pgm.sql(`
    CREATE TRIGGER audit_traceability_link_delete
    AFTER DELETE ON traceability_links
    FOR EACH ROW
    EXECUTE FUNCTION log_traceability_link_change();
  `);
};

exports.down = (pgm) => {
  // Drop triggers for traceability_links
  pgm.sql('DROP TRIGGER IF EXISTS audit_traceability_link_delete ON traceability_links;');
  pgm.sql('DROP TRIGGER IF EXISTS audit_traceability_link_insert ON traceability_links;');
  pgm.sql('DROP FUNCTION IF EXISTS log_traceability_link_change();');

  // Drop triggers for requirements
  pgm.sql('DROP TRIGGER IF EXISTS audit_requirement_delete ON requirements;');
  pgm.sql('DROP TRIGGER IF EXISTS audit_requirement_update ON requirements;');
  pgm.sql('DROP TRIGGER IF EXISTS audit_requirement_insert ON requirements;');
  pgm.sql('DROP FUNCTION IF EXISTS log_requirement_change();');
};
