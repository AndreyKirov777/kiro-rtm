import { Pool } from 'pg';
import { Baseline, Requirement } from '../types';

/**
 * BaselineService - Manages baseline creation, locking, and comparison
 * 
 * A baseline is a named, immutable snapshot of all requirements in a project
 * at a specific point in time. Baselines are used for regulatory submissions,
 * release management, and change tracking.
 * 
 * **Validates: Requirements 16.1-16.5, 17.1-17.4**
 */
export class BaselineService {
  constructor(private pool: Pool) {}

  /**
   * Create a baseline by capturing a snapshot of all requirements in a project
   * 
   * **Validates: Requirements 16.1-16.2**
   * 
   * @param projectId - Project UUID
   * @param name - Baseline name
   * @param description - Optional baseline description
   * @param createdBy - User ID creating the baseline
   * @returns Created baseline with snapshot data
   */
  async createBaseline(
    projectId: string,
    name: string,
    description: string | null,
    createdBy: string
  ): Promise<Baseline> {
    // Fetch all requirements for the project at this moment
    const requirementsResult = await this.pool.query(
      `SELECT 
        id, display_id as "displayId", project_id as "projectId", 
        parent_id as "parentId", title, description, type, status, 
        priority, version, tags, custom_fields as "customFields",
        created_at as "createdAt", updated_at as "updatedAt",
        created_by as "createdBy", updated_by as "updatedBy"
      FROM requirements 
      WHERE project_id = $1 
      ORDER BY display_id`,
      [projectId]
    );

    // Store requirements as JSONB (PostgreSQL will handle serialization)
    const snapshotData = requirementsResult.rows;

    // Insert baseline
    const result = await this.pool.query(
      `INSERT INTO baselines (
        project_id, name, description, locked, snapshot_data, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id, project_id as "projectId", name, description, locked,
        locked_at as "lockedAt", locked_by as "lockedBy",
        snapshot_data as "snapshotData",
        created_at as "createdAt", created_by as "createdBy"`,
      [projectId, name, description, false, JSON.stringify(snapshotData), createdBy]
    );

    return this.mapRowToBaseline(result.rows[0]);
  }

  /**
   * Lock a baseline to make it immutable
   * 
   * **Validates: Requirements 16.3-16.5**
   * 
   * @param baselineId - Baseline UUID
   * @param lockedBy - User ID locking the baseline
   * @returns Updated baseline with lock information
   * @throws Error if baseline is already locked or not found
   */
  async lockBaseline(baselineId: string, lockedBy: string): Promise<Baseline> {
    // Check if baseline exists and is not already locked
    const checkResult = await this.pool.query(
      'SELECT locked FROM baselines WHERE id = $1',
      [baselineId]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Baseline not found');
    }

    if (checkResult.rows[0].locked) {
      throw new Error('Baseline is already locked');
    }

    // Lock the baseline
    const result = await this.pool.query(
      `UPDATE baselines 
       SET locked = true, locked_at = CURRENT_TIMESTAMP, locked_by = $1
       WHERE id = $2
       RETURNING 
         id, project_id as "projectId", name, description, locked,
         locked_at as "lockedAt", locked_by as "lockedBy",
         snapshot_data as "snapshotData",
         created_at as "createdAt", created_by as "createdBy"`,
      [lockedBy, baselineId]
    );

    return this.mapRowToBaseline(result.rows[0]);
  }

  /**
   * Get a baseline by ID
   * 
   * @param baselineId - Baseline UUID
   * @returns Baseline or null if not found
   */
  async getBaseline(baselineId: string): Promise<Baseline | null> {
    const result = await this.pool.query(
      `SELECT 
        id, project_id as "projectId", name, description, locked,
        locked_at as "lockedAt", locked_by as "lockedBy",
        snapshot_data as "snapshotData",
        created_at as "createdAt", created_by as "createdBy"
      FROM baselines 
      WHERE id = $1`,
      [baselineId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToBaseline(result.rows[0]);
  }

  /**
   * Get all baselines for a project
   * 
   * @param projectId - Project UUID
   * @returns Array of baselines
   */
  async getBaselinesByProject(projectId: string): Promise<Baseline[]> {
    const result = await this.pool.query(
      `SELECT 
        id, project_id as "projectId", name, description, locked,
        locked_at as "lockedAt", locked_by as "lockedBy",
        snapshot_data as "snapshotData",
        created_at as "createdAt", created_by as "createdBy"
      FROM baselines 
      WHERE project_id = $1
      ORDER BY created_at DESC`,
      [projectId]
    );

    return result.rows.map(row => this.mapRowToBaseline(row));
  }

  /**
   * Compare two baselines or a baseline against current state
   * 
   * **Validates: Requirements 17.1-17.4**
   * 
   * @param baselineId - First baseline UUID
   * @param targetId - Second baseline UUID or 'current' for current state
   * @returns Comparison result with added, modified, and deleted requirements
   */
  async compareBaselines(
    baselineId: string,
    targetId: string
  ): Promise<BaselineComparison> {
    // Get the first baseline
    const baseline = await this.getBaseline(baselineId);
    if (!baseline) {
      throw new Error('Baseline not found');
    }

    // Parse snapshot data (handle both string and object from JSONB)
    const baselineRequirements: Requirement[] = 
      typeof baseline.snapshotData === 'string' 
        ? JSON.parse(baseline.snapshotData) 
        : baseline.snapshotData;

    let targetRequirements: Requirement[];

    if (targetId === 'current') {
      // Compare against current state
      const currentResult = await this.pool.query(
        `SELECT 
          id, display_id as "displayId", project_id as "projectId", 
          parent_id as "parentId", title, description, type, status, 
          priority, version, tags, custom_fields as "customFields",
          created_at as "createdAt", updated_at as "updatedAt",
          created_by as "createdBy", updated_by as "updatedBy"
        FROM requirements 
        WHERE project_id = $1`,
        [baseline.projectId]
      );
      targetRequirements = currentResult.rows;
    } else {
      // Compare against another baseline
      const targetBaseline = await this.getBaseline(targetId);
      if (!targetBaseline) {
        throw new Error('Target baseline not found');
      }
      // Parse target snapshot data
      targetRequirements = 
        typeof targetBaseline.snapshotData === 'string'
          ? JSON.parse(targetBaseline.snapshotData)
          : targetBaseline.snapshotData;
    }

    // Create maps for efficient lookup
    const baselineMap = new Map(baselineRequirements.map(r => [r.id, r]));
    const targetMap = new Map(targetRequirements.map(r => [r.id, r]));

    const added: Requirement[] = [];
    const modified: RequirementDiff[] = [];
    const deleted: Requirement[] = [];

    // Find added and modified requirements
    for (const targetReq of targetRequirements) {
      const baselineReq = baselineMap.get(targetReq.id);
      
      if (!baselineReq) {
        // Requirement exists in target but not in baseline - it was added
        added.push(targetReq);
      } else {
        // Check if requirement was modified
        const diff = this.compareRequirements(baselineReq, targetReq);
        if (diff.changes.length > 0) {
          modified.push(diff);
        }
      }
    }

    // Find deleted requirements
    for (const baselineReq of baselineRequirements) {
      if (!targetMap.has(baselineReq.id)) {
        // Requirement exists in baseline but not in target - it was deleted
        deleted.push(baselineReq);
      }
    }

    return {
      baselineId,
      targetId,
      added,
      modified,
      deleted,
    };
  }

  /**
   * Compare two requirement versions and identify field-level changes
   * 
   * @param baseline - Baseline requirement
   * @param target - Target requirement
   * @returns Diff with field-level changes
   */
  private compareRequirements(baseline: Requirement, target: Requirement): RequirementDiff {
    const changes: FieldChange[] = [];

    // Compare each field
    if (baseline.displayId !== target.displayId) {
      changes.push({ field: 'displayId', oldValue: baseline.displayId, newValue: target.displayId });
    }
    if (baseline.title !== target.title) {
      changes.push({ field: 'title', oldValue: baseline.title, newValue: target.title });
    }
    if (baseline.description !== target.description) {
      changes.push({ field: 'description', oldValue: baseline.description, newValue: target.description });
    }
    if (baseline.type !== target.type) {
      changes.push({ field: 'type', oldValue: baseline.type, newValue: target.type });
    }
    if (baseline.status !== target.status) {
      changes.push({ field: 'status', oldValue: baseline.status, newValue: target.status });
    }
    if (baseline.priority !== target.priority) {
      changes.push({ field: 'priority', oldValue: baseline.priority, newValue: target.priority });
    }
    if (baseline.version !== target.version) {
      changes.push({ field: 'version', oldValue: baseline.version, newValue: target.version });
    }
    if (JSON.stringify(baseline.tags) !== JSON.stringify(target.tags)) {
      changes.push({ field: 'tags', oldValue: baseline.tags, newValue: target.tags });
    }
    if (JSON.stringify(baseline.customFields) !== JSON.stringify(target.customFields)) {
      changes.push({ field: 'customFields', oldValue: baseline.customFields, newValue: target.customFields });
    }
    if (baseline.parentId !== target.parentId) {
      changes.push({ field: 'parentId', oldValue: baseline.parentId, newValue: target.parentId });
    }

    return {
      requirementId: baseline.id,
      displayId: baseline.displayId,
      changes,
    };
  }

  /**
   * Attempt to modify a locked baseline (should fail)
   * 
   * This method is provided for testing immutability constraints.
   * 
   * @param baselineId - Baseline UUID
   * @param updates - Attempted updates
   * @throws Error if baseline is locked
   */
  async attemptModifyLockedBaseline(
    baselineId: string,
    updates: { name?: string; description?: string }
  ): Promise<void> {
    const baseline = await this.getBaseline(baselineId);
    if (!baseline) {
      throw new Error('Baseline not found');
    }

    if (baseline.locked) {
      throw new Error('Cannot modify locked baseline');
    }

    // If not locked, allow modification
    await this.pool.query(
      `UPDATE baselines 
       SET name = COALESCE($1, name), description = COALESCE($2, description)
       WHERE id = $3`,
      [updates.name, updates.description, baselineId]
    );
  }

  /**
   * Map database row to Baseline interface
   * 
   * @param row - Database row
   * @returns Baseline object
   */
  private mapRowToBaseline(row: any): Baseline {
    return {
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      description: row.description,
      locked: row.locked,
      lockedAt: row.lockedAt ? new Date(row.lockedAt) : null,
      lockedBy: row.lockedBy,
      snapshotData: row.snapshotData,
      createdAt: new Date(row.createdAt),
      createdBy: row.createdBy,
    };
  }
}

/**
 * Result of comparing two baselines
 */
export interface BaselineComparison {
  baselineId: string;
  targetId: string;
  added: Requirement[];
  modified: RequirementDiff[];
  deleted: Requirement[];
}

/**
 * Diff for a single requirement showing field-level changes
 */
export interface RequirementDiff {
  requirementId: string;
  displayId: string;
  changes: FieldChange[];
}

/**
 * A single field change
 */
export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}
