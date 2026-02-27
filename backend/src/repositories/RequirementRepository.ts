import { Pool } from 'pg';
import { Requirement, RequirementType, RequirementStatus, Priority } from '../types';
import pool from '../config/database';

/**
 * Repository for managing requirements in the database
 * Provides CRUD operations with version management and connection pooling
 * 
 * Requirements: 1.1-1.12
 */
export class RequirementRepository {
  private pool: Pool;

  constructor(dbPool: Pool = pool) {
    this.pool = dbPool;
  }

  /**
   * Create a new requirement
   * Auto-generates UUID and sets version to 1
   * 
   * @param requirement - Requirement data (id will be auto-generated if not provided)
   * @returns Created requirement with generated id
   */
  async create(requirement: Omit<Requirement, 'id' | 'version' | 'createdAt' | 'updatedAt'>): Promise<Requirement> {
    const query = `
      INSERT INTO requirements (
        display_id, project_id, parent_id, title, description,
        type, status, priority, version, tags, custom_fields,
        created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      requirement.displayId,
      requirement.projectId,
      requirement.parentId,
      requirement.title,
      requirement.description,
      requirement.type,
      requirement.status,
      requirement.priority,
      1, // version starts at 1
      JSON.stringify(requirement.tags),
      JSON.stringify(requirement.customFields),
      requirement.createdBy,
      requirement.updatedBy,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToRequirement(result.rows[0]);
  }

  /**
   * Find a requirement by its UUID
   * 
   * @param id - Requirement UUID
   * @returns Requirement or null if not found
   */
  async findById(id: string): Promise<Requirement | null> {
    const query = 'SELECT * FROM requirements WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToRequirement(result.rows[0]);
  }

  /**
   * Find all requirements for a project
   * 
   * @param projectId - Project UUID
   * @returns Array of requirements
   */
  async findByProject(projectId: string): Promise<Requirement[]> {
    const query = `
      SELECT * FROM requirements 
      WHERE project_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [projectId]);

    return result.rows.map(row => this.mapRowToRequirement(row));
  }

  /**
   * Update a requirement
   * Automatically increments version number
   * 
   * @param id - Requirement UUID
   * @param updates - Partial requirement data to update
   * @returns Updated requirement or null if not found
   */
  async update(id: string, updates: Partial<Omit<Requirement, 'id' | 'createdAt' | 'createdBy'>>): Promise<Requirement | null> {
    // First, get the current requirement to check if it exists
    const current = await this.findById(id);
    if (!current) {
      return null;
    }

    // Build dynamic update query based on provided fields
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.displayId !== undefined) {
      updateFields.push(`display_id = $${paramIndex++}`);
      values.push(updates.displayId);
    }
    if (updates.projectId !== undefined) {
      updateFields.push(`project_id = $${paramIndex++}`);
      values.push(updates.projectId);
    }
    if (updates.parentId !== undefined) {
      updateFields.push(`parent_id = $${paramIndex++}`);
      values.push(updates.parentId);
    }
    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`);
      values.push(updates.type);
    }
    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.priority !== undefined) {
      updateFields.push(`priority = $${paramIndex++}`);
      values.push(updates.priority);
    }
    if (updates.tags !== undefined) {
      updateFields.push(`tags = $${paramIndex++}`);
      values.push(JSON.stringify(updates.tags));
    }
    if (updates.customFields !== undefined) {
      updateFields.push(`custom_fields = $${paramIndex++}`);
      values.push(JSON.stringify(updates.customFields));
    }
    if (updates.updatedBy !== undefined) {
      updateFields.push(`updated_by = $${paramIndex++}`);
      values.push(updates.updatedBy);
    }

    // Always increment version
    updateFields.push(`version = version + 1`);
    
    // Always update updated_at (handled by trigger, but we can be explicit)
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updateFields.length === 2) {
      // Only version and updated_at, no actual changes
      return current;
    }

    // Add the id parameter at the end
    values.push(id);

    const query = `
      UPDATE requirements 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return this.mapRowToRequirement(result.rows[0]);
  }

  /**
   * Delete (deprecate) a requirement
   * Sets status to 'deprecated' rather than hard delete
   * 
   * @param id - Requirement UUID
   * @param updatedBy - User ID performing the deletion
   * @returns true if deleted, false if not found
   */
  async delete(id: string, updatedBy: string): Promise<boolean> {
    const result = await this.update(id, {
      status: 'deprecated' as RequirementStatus,
      updatedBy,
    });

    return result !== null;
  }

  /**
   * Map database row to Requirement interface
   * Handles snake_case to camelCase conversion and JSON parsing
   * 
   * @param row - Database row
   * @returns Requirement object
   */
  private mapRowToRequirement(row: any): Requirement {
    return {
      id: row.id,
      displayId: row.display_id,
      projectId: row.project_id,
      parentId: row.parent_id,
      title: row.title,
      description: row.description,
      type: row.type as RequirementType,
      status: row.status as RequirementStatus,
      priority: row.priority as Priority,
      version: row.version,
      tags: Array.isArray(row.tags) ? row.tags : [],
      customFields: typeof row.custom_fields === 'object' ? row.custom_fields : {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }
}

export default RequirementRepository;
