import { Pool } from 'pg';
import { TraceabilityLink, LinkType, ExternalSystem } from '../types';
import pool from '../config/database';

/**
 * Repository for managing traceability links in the database
 * Provides operations for creating, deleting, and querying bidirectional links
 * 
 * Requirements: 8.1-8.7
 */
export class TraceabilityLinkRepository {
  private pool: Pool;

  constructor(dbPool: Pool = pool) {
    this.pool = dbPool;
  }

  /**
   * Create a new traceability link
   * Auto-generates UUID for the link
   * 
   * @param link - Traceability link data (id will be auto-generated if not provided)
   * @returns Created traceability link with generated id
   */
  async createLink(
    link: Omit<TraceabilityLink, 'id' | 'createdAt'>
  ): Promise<TraceabilityLink> {
    const query = `
      INSERT INTO traceability_links (
        source_id, target_id, target_type, link_type,
        external_system, external_id, external_metadata,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      link.sourceId,
      link.targetId,
      link.targetType,
      link.linkType,
      link.externalSystem || null,
      link.externalId || null,
      link.externalMetadata ? JSON.stringify(link.externalMetadata) : null,
      link.createdBy,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToTraceabilityLink(result.rows[0]);
  }

  /**
   * Delete a traceability link by its UUID
   * 
   * @param id - Traceability link UUID
   * @returns true if deleted, false if not found
   */
  async deleteLink(id: string): Promise<boolean> {
    const query = 'DELETE FROM traceability_links WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Find all traceability links originating from a source requirement
   * 
   * @param sourceId - Source requirement UUID
   * @returns Array of traceability links
   */
  async findBySource(sourceId: string): Promise<TraceabilityLink[]> {
    const query = `
      SELECT * FROM traceability_links 
      WHERE source_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [sourceId]);

    return result.rows.map(row => this.mapRowToTraceabilityLink(row));
  }

  /**
   * Find all traceability links pointing to a target requirement or external item
   * Supports bidirectional link queries
   * 
   * @param targetId - Target requirement UUID or external reference string
   * @returns Array of traceability links
   */
  async findByTarget(targetId: string): Promise<TraceabilityLink[]> {
    const query = `
      SELECT * FROM traceability_links 
      WHERE target_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [targetId]);

    return result.rows.map(row => this.mapRowToTraceabilityLink(row));
  }

  /**
   * Map database row to TraceabilityLink interface
   * Handles snake_case to camelCase conversion and JSON parsing
   * 
   * @param row - Database row
   * @returns TraceabilityLink object
   */
  private mapRowToTraceabilityLink(row: any): TraceabilityLink {
    const link: TraceabilityLink = {
      id: row.id,
      sourceId: row.source_id,
      targetId: row.target_id,
      targetType: row.target_type as 'requirement' | 'external',
      linkType: row.link_type as LinkType,
      createdAt: new Date(row.created_at),
      createdBy: row.created_by,
    };

    // Add optional external system fields if present
    if (row.external_system) {
      link.externalSystem = row.external_system as ExternalSystem;
    }
    if (row.external_id) {
      link.externalId = row.external_id;
    }
    if (row.external_metadata) {
      const metadata = typeof row.external_metadata === 'string' 
        ? JSON.parse(row.external_metadata) 
        : row.external_metadata;
      
      link.externalMetadata = {
        title: metadata.title,
        status: metadata.status,
        url: metadata.url,
        lastSyncedAt: new Date(metadata.lastSyncedAt),
      };
    }

    return link;
  }
}

export default TraceabilityLinkRepository;
