import { Pool } from 'pg';
import {
  IGraphRepository,
  TraversalOptions,
  RequirementNode,
  Path,
  Cycle,
  ImpactTree,
  TraceabilityChain,
  GraphMetrics,
} from './IGraphRepository';
import { Requirement, CoverageStatus } from '../types';

/**
 * PostgreSQL implementation of the Graph Repository
 * 
 * Uses recursive CTEs to perform graph traversal operations on requirements traceability.
 */
export class PostgresGraphRepository implements IGraphRepository {
  constructor(private pool: Pool) {}

  async findDownstreamRequirements(
    sourceId: string,
    options?: TraversalOptions
  ): Promise<RequirementNode[]> {
    const maxDepth = options?.maxDepth || 100;
    const linkTypes = options?.linkTypes;
    // includeExternal option will be used in future implementation
    // const includeExternal = options?.includeExternal ?? true;

    let linkTypeFilter = '';
    const params: any[] = [sourceId, maxDepth];

    if (linkTypes && linkTypes.length > 0) {
      linkTypeFilter = `AND tl.link_type = ANY($3)`;
      params.push(linkTypes);
    }

    const query = `
      WITH RECURSIVE downstream AS (
        -- Base case: start with the source requirement
        SELECT 
          r.id,
          r.display_id,
          r.title,
          r.description,
          r.type,
          r.status,
          r.priority,
          r.version,
          r.tags,
          r.custom_fields,
          r.project_id,
          r.parent_id,
          r.created_at,
          r.updated_at,
          r.created_by,
          r.updated_by,
          'relates_to'::link_type as link_type,
          0 as depth,
          ARRAY[r.id::text] as path
        FROM requirements r
        WHERE r.id = $1
        
        UNION ALL
        
        -- Recursive case: find requirements linked from current level
        SELECT 
          r.id,
          r.display_id,
          r.title,
          r.description,
          r.type,
          r.status,
          r.priority,
          r.version,
          r.tags,
          r.custom_fields,
          r.project_id,
          r.parent_id,
          r.created_at,
          r.updated_at,
          r.created_by,
          r.updated_by,
          tl.link_type,
          d.depth + 1,
          d.path || r.id::text
        FROM downstream d
        JOIN traceability_links tl ON tl.source_id::text = d.id::text
        JOIN requirements r ON r.id::text = tl.target_id::text
        WHERE 
          d.depth < $2
          AND NOT (r.id::text = ANY(d.path))
          AND tl.target_type = 'requirement'
          ${linkTypeFilter}
      )
      SELECT DISTINCT ON (id) *
      FROM downstream
      WHERE depth > 0
      ORDER BY id, depth ASC;
    `;

    const result = await this.pool.query(query, params);

    return result.rows.map(row => ({
      requirement: this.mapRowToRequirement(row),
      depth: row.depth,
      path: row.path,
      linkType: row.link_type,
    }));
  }

  async findUpstreamRequirements(
    targetId: string,
    options?: TraversalOptions
  ): Promise<RequirementNode[]> {
    const maxDepth = options?.maxDepth || 100;
    const linkTypes = options?.linkTypes;

    let linkTypeFilter = '';
    const params: any[] = [targetId, maxDepth];

    if (linkTypes && linkTypes.length > 0) {
      linkTypeFilter = `AND tl.link_type = ANY($3)`;
      params.push(linkTypes);
    }

    const query = `
      WITH RECURSIVE upstream AS (
        -- Base case: start with the target requirement
        SELECT 
          r.id,
          r.display_id,
          r.title,
          r.description,
          r.type,
          r.status,
          r.priority,
          r.version,
          r.tags,
          r.custom_fields,
          r.project_id,
          r.parent_id,
          r.created_at,
          r.updated_at,
          r.created_by,
          r.updated_by,
          'relates_to'::link_type as link_type,
          0 as depth,
          ARRAY[r.id::text] as path
        FROM requirements r
        WHERE r.id = $1
        
        UNION ALL
        
        -- Recursive case: find requirements that link to current level
        SELECT 
          r.id,
          r.display_id,
          r.title,
          r.description,
          r.type,
          r.status,
          r.priority,
          r.version,
          r.tags,
          r.custom_fields,
          r.project_id,
          r.parent_id,
          r.created_at,
          r.updated_at,
          r.created_by,
          r.updated_by,
          tl.link_type,
          u.depth + 1,
          u.path || r.id::text
        FROM upstream u
        JOIN traceability_links tl ON tl.target_id::text = u.id::text
        JOIN requirements r ON r.id::text = tl.source_id::text
        WHERE 
          u.depth < $2
          AND NOT (r.id::text = ANY(u.path))
          AND tl.target_type = 'requirement'
          ${linkTypeFilter}
      )
      SELECT DISTINCT ON (id) *
      FROM upstream
      WHERE depth > 0
      ORDER BY id, depth ASC;
    `;

    const result = await this.pool.query(query, params);

    return result.rows.map(row => ({
      requirement: this.mapRowToRequirement(row),
      depth: row.depth,
      path: row.path,
      linkType: row.link_type,
    }));
  }

  async findAllPaths(
    _sourceId: string,
    _targetId: string,
    _maxDepth: number = 20
  ): Promise<Path[]> {
    // Stub implementation - to be completed in task 4.2
    return [];
  }

  async findShortestPath(_sourceId: string, _targetId: string): Promise<Path | null> {
    // Stub implementation - to be completed in task 4.2
    return null;
  }

  async detectCycles(_projectId: string): Promise<Cycle[]> {
    // Stub implementation - to be completed in task 4.2
    return [];
  }

  async findOrphanedRequirements(
    projectId: string,
    direction: 'upstream' | 'downstream' | 'both'
  ): Promise<Requirement[]> {
    let query = '';

    if (direction === 'downstream' || direction === 'both') {
      // Requirements with no downstream links (no implementation)
      query = `
        SELECT r.*
        FROM requirements r
        LEFT JOIN traceability_links tl ON tl.source_id = r.id
        WHERE 
          r.project_id = $1
          AND tl.id IS NULL
          AND r.status != 'deprecated'
      `;
    } else if (direction === 'upstream') {
      // Requirements with no upstream links (no source)
      query = `
        SELECT r.*
        FROM requirements r
        LEFT JOIN traceability_links tl ON tl.target_id = r.id
        WHERE 
          r.project_id = $1
          AND tl.id IS NULL
          AND r.status != 'deprecated'
      `;
    }

    const result = await this.pool.query(query, [projectId]);
    return result.rows.map(row => this.mapRowToRequirement(row));
  }

  async calculateImpactAnalysis(
    requirementId: string,
    maxDepth: number = 100
  ): Promise<ImpactTree> {
    const impactedNodes = await this.findDownstreamRequirements(requirementId, {
      maxDepth,
    });

    // Get the root requirement
    const rootResult = await this.pool.query(
      'SELECT * FROM requirements WHERE id = $1',
      [requirementId]
    );

    if (rootResult.rows.length === 0) {
      throw new Error(`Requirement ${requirementId} not found`);
    }

    const root = this.mapRowToRequirement(rootResult.rows[0]);

    const maxDepthFound = impactedNodes.reduce(
      (max, node) => Math.max(max, node.depth),
      0
    );

    return {
      root,
      impactedNodes,
      totalImpacted: impactedNodes.length,
      maxDepth: maxDepthFound,
    };
  }

  async calculateCoverageStatus(_requirementId: string): Promise<CoverageStatus> {
    // Stub implementation - to be completed in task 4.2
    return 'no_test';
  }

  async traceToSource(
    _requirementId: string,
    _sourceTypes: string[]
  ): Promise<TraceabilityChain[]> {
    // Stub implementation - to be completed in task 4.2
    return [];
  }

  async traceToImplementation(
    _requirementId: string,
    _targetTypes: string[]
  ): Promise<TraceabilityChain[]> {
    // Stub implementation - to be completed in task 4.2
    return [];
  }

  async bulkFindDownstream(
    _sourceIds: string[]
  ): Promise<Map<string, RequirementNode[]>> {
    // Stub implementation - to be completed in task 4.2
    return new Map();
  }

  async getGraphMetrics(_projectId: string): Promise<GraphMetrics> {
    // Stub implementation - to be completed in task 4.2
    return {
      totalNodes: 0,
      totalEdges: 0,
      averageDegree: 0,
      maxDepth: 0,
      cycleCount: 0,
      orphanCount: 0,
      connectedComponents: 0,
    };
  }

  private mapRowToRequirement(row: any): Requirement {
    return {
      id: row.id,
      displayId: row.display_id,
      projectId: row.project_id,
      parentId: row.parent_id,
      title: row.title,
      description: row.description,
      type: row.type,
      status: row.status,
      priority: row.priority,
      version: row.version,
      tags: row.tags || [],
      customFields: row.custom_fields || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }
}
