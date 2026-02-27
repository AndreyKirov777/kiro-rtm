import { Pool } from 'pg';
import { AuditEntry, ActorType } from '../types';

/**
 * AuditService - Manages immutable audit trail for all system changes
 * 
 * This service provides append-only audit logging with immutability guarantees.
 * Audit entries cannot be modified or deleted once created.
 * 
 * **Validates: Requirements 14.1-14.7**
 */
export class AuditService {
  constructor(private pool: Pool) {}

  /**
   * Create an audit entry for a change
   * 
   * **Validates: Requirements 14.1-14.5**
   * 
   * @param entry - Audit entry data (without id and timestamp)
   * @returns Created audit entry with id and timestamp
   */
  async createAuditEntry(entry: {
    actorId: string;
    actorType: ActorType;
    entityType: 'requirement' | 'traceability_link' | 'baseline' | 'comment';
    entityId: string;
    action: string;
    changeDescription: string;
    previousValue?: any;
    newValue?: any;
  }): Promise<AuditEntry> {
    const result = await this.pool.query(
      `INSERT INTO audit_entries (
        actor_id, actor_type, entity_type, entity_id, 
        action, change_description, previous_value, new_value
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id, timestamp, actor_id as "actorId", actor_type as "actorType",
        entity_type as "entityType", entity_id as "entityId",
        action, change_description as "changeDescription",
        previous_value as "previousValue", new_value as "newValue"`,
      [
        entry.actorId,
        entry.actorType,
        entry.entityType,
        entry.entityId,
        entry.action,
        entry.changeDescription,
        entry.previousValue ? JSON.stringify(entry.previousValue) : null,
        entry.newValue ? JSON.stringify(entry.newValue) : null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Query audit trail with filtering
   * 
   * **Validates: Requirements 14.7, 15.1**
   * 
   * @param filters - Optional filters for querying audit entries
   * @returns Array of audit entries matching the filters
   */
  async queryAuditTrail(filters?: {
    entityType?: 'requirement' | 'traceability_link' | 'baseline' | 'comment';
    entityId?: string;
    actorId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AuditEntry[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.entityType) {
      conditions.push(`entity_type = $${paramIndex++}`);
      params.push(filters.entityType);
    }

    if (filters?.entityId) {
      conditions.push(`entity_id = $${paramIndex++}`);
      params.push(filters.entityId);
    }

    if (filters?.actorId) {
      conditions.push(`actor_id = $${paramIndex++}`);
      params.push(filters.actorId);
    }

    if (filters?.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(filters.action);
    }

    if (filters?.startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(filters.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    const result = await this.pool.query(
      `SELECT 
        id, timestamp, actor_id as "actorId", actor_type as "actorType",
        entity_type as "entityType", entity_id as "entityId",
        action, change_description as "changeDescription",
        previous_value as "previousValue", new_value as "newValue"
      FROM audit_entries
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return result.rows;
  }

  /**
   * Get audit history for a specific entity
   * 
   * **Validates: Requirements 15.1**
   * 
   * @param entityType - Type of entity
   * @param entityId - ID of entity
   * @returns Array of audit entries for the entity in chronological order
   */
  async getEntityHistory(
    entityType: 'requirement' | 'traceability_link' | 'baseline' | 'comment',
    entityId: string
  ): Promise<AuditEntry[]> {
    const result = await this.pool.query(
      `SELECT 
        id, timestamp, actor_id as "actorId", actor_type as "actorType",
        entity_type as "entityType", entity_id as "entityId",
        action, change_description as "changeDescription",
        previous_value as "previousValue", new_value as "newValue"
      FROM audit_entries
      WHERE entity_type = $1 AND entity_id = $2
      ORDER BY timestamp ASC`,
      [entityType, entityId]
    );

    return result.rows;
  }

  /**
   * Attempt to update an audit entry (should always fail due to immutability)
   * 
   * This method is provided for testing immutability constraints.
   * It should always throw an error due to database triggers.
   * 
   * **Validates: Requirements 14.6**
   * 
   * @param id - Audit entry ID
   * @param updates - Attempted updates
   * @throws Error - Always throws due to immutability constraint
   */
  async attemptUpdate(id: string, updates: Partial<AuditEntry>): Promise<void> {
    // This should fail due to the database trigger
    await this.pool.query(
      `UPDATE audit_entries 
       SET change_description = $1
       WHERE id = $2`,
      [updates.changeDescription || 'attempted update', id]
    );
  }

  /**
   * Attempt to delete an audit entry (should always fail due to immutability)
   * 
   * This method is provided for testing immutability constraints.
   * It should always throw an error due to database triggers.
   * 
   * **Validates: Requirements 14.6**
   * 
   * @param id - Audit entry ID
   * @throws Error - Always throws due to immutability constraint
   */
  async attemptDelete(id: string): Promise<void> {
    // This should fail due to the database trigger
    await this.pool.query('DELETE FROM audit_entries WHERE id = $1', [id]);
  }
}
