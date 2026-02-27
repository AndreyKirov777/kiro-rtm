/* eslint-disable camelcase */

/**
 * Initial database setup migration
 * 
 * This migration creates the basic database extensions and helper functions
 * that will be used by subsequent migrations.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Enable UUID extension for generating UUIDs
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

  // Enable pg_trgm extension for full-text search
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "pg_trgm";');

  // Create a function to automatically update updated_at timestamp
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Create a function to generate display IDs
  pgm.sql(`
    CREATE OR REPLACE FUNCTION generate_display_id(prefix TEXT, project_id UUID)
    RETURNS TEXT AS $$
    DECLARE
      next_number INTEGER;
      display_id TEXT;
    BEGIN
      -- Get the next number for this project
      SELECT COALESCE(MAX(CAST(SUBSTRING(display_id FROM '[0-9]+$') AS INTEGER)), 0) + 1
      INTO next_number
      FROM requirements
      WHERE requirements.project_id = generate_display_id.project_id
        AND display_id ~ ('^' || prefix || '-[0-9]+$');
      
      -- Format as PREFIX-NNN (e.g., REQ-001)
      display_id := prefix || '-' || LPAD(next_number::TEXT, 3, '0');
      
      RETURN display_id;
    END;
    $$ language 'plpgsql';
  `);

  // Create enum types that will be used across tables
  pgm.createType('requirement_type', [
    'stakeholder_need',
    'system_requirement',
    'software_requirement',
    'hardware_requirement',
    'constraint',
    'interface_requirement'
  ]);

  pgm.createType('requirement_status', [
    'draft',
    'in_review',
    'approved',
    'deprecated'
  ]);

  pgm.createType('priority', [
    'critical',
    'high',
    'medium',
    'low'
  ]);

  pgm.createType('link_type', [
    'derives_from',
    'refines',
    'satisfies',
    'verified_by',
    'conflicts_with',
    'relates_to'
  ]);

  pgm.createType('coverage_status', [
    'passed',
    'failed',
    'not_run',
    'no_test'
  ]);

  pgm.createType('actor_type', [
    'user',
    'api_client',
    'system'
  ]);

  pgm.createType('user_role', [
    'viewer',
    'author',
    'reviewer',
    'approver',
    'administrator'
  ]);
};

exports.down = (pgm) => {
  // Drop enum types
  pgm.dropType('user_role');
  pgm.dropType('actor_type');
  pgm.dropType('coverage_status');
  pgm.dropType('link_type');
  pgm.dropType('priority');
  pgm.dropType('requirement_status');
  pgm.dropType('requirement_type');

  // Drop functions
  pgm.sql('DROP FUNCTION IF EXISTS generate_display_id(TEXT, UUID);');
  pgm.sql('DROP FUNCTION IF EXISTS update_updated_at_column();');

  // Drop extensions (be careful with this in production)
  pgm.sql('DROP EXTENSION IF EXISTS "pg_trgm";');
  pgm.sql('DROP EXTENSION IF EXISTS "uuid-ossp";');
};
