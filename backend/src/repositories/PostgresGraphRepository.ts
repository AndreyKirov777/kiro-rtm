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
    sourceId: string,
    targetId: string,
    maxDepth: number = 20
  ): Promise<Path[]> {
    const query = `
      WITH RECURSIVE paths AS (
        -- Base case: start from source
        SELECT 
          $1::uuid as source_id,
          r.id as current_id,
          ARRAY[r.id::text] as path,
          ARRAY[]::uuid[] as link_ids,
          0 as depth
        FROM requirements r
        WHERE r.id = $1
        
        UNION ALL
        
        -- Recursive case: extend path
        SELECT 
          p.source_id,
          tl.target_id::uuid,
          p.path || tl.target_id::text,
          p.link_ids || tl.id,
          p.depth + 1
        FROM paths p
        JOIN traceability_links tl ON tl.source_id::text = p.current_id::text
        WHERE 
          NOT (tl.target_id::text = ANY(p.path))
          AND p.depth < $3
          AND tl.target_type = 'requirement'
      )
      SELECT 
        path,
        link_ids,
        depth
      FROM paths
      WHERE current_id = $2
      ORDER BY depth ASC;
    `;

    const result = await this.pool.query(query, [sourceId, targetId, maxDepth]);

    // Convert each path result to Path object
    const paths: Path[] = [];
    for (const row of result.rows) {
      const requirementIds = row.path;
      const linkIds = row.link_ids;

      // Fetch all requirements in the path
      const reqQuery = `SELECT * FROM requirements WHERE id = ANY($1)`;
      const reqResult = await this.pool.query(reqQuery, [requirementIds]);
      const reqMap = new Map(reqResult.rows.map(r => [r.id, this.mapRowToRequirement(r)]));
      const nodes = requirementIds.map((id: string) => reqMap.get(id)!);

      // Fetch all links in the path
      const linkQuery = `SELECT * FROM traceability_links WHERE id = ANY($1)`;
      const linkResult = await this.pool.query(linkQuery, [linkIds]);
      const links = linkResult.rows.map(l => ({
        id: l.id,
        sourceId: l.source_id,
        targetId: l.target_id,
        targetType: l.target_type,
        linkType: l.link_type,
        externalSystem: l.external_system,
        externalId: l.external_id,
        externalMetadata: l.external_metadata,
        createdAt: new Date(l.created_at),
        createdBy: l.created_by,
      }));

      paths.push({
        nodes,
        links,
        totalDepth: row.depth,
      });
    }

    return paths;
  }

  async findShortestPath(sourceId: string, targetId: string): Promise<Path | null> {
    const query = `
      WITH RECURSIVE paths AS (
        -- Base case: start from source
        SELECT 
          $1::uuid as source_id,
          r.id as current_id,
          ARRAY[r.id::text] as path,
          ARRAY[]::uuid[] as link_ids,
          0 as depth
        FROM requirements r
        WHERE r.id = $1
        
        UNION ALL
        
        -- Recursive case: extend path
        SELECT 
          p.source_id,
          tl.target_id::uuid,
          p.path || tl.target_id::text,
          p.link_ids || tl.id,
          p.depth + 1
        FROM paths p
        JOIN traceability_links tl ON tl.source_id::text = p.current_id::text
        WHERE 
          NOT (tl.target_id::text = ANY(p.path))
          AND p.depth < 20
          AND tl.target_type = 'requirement'
      )
      SELECT 
        path,
        link_ids,
        depth
      FROM paths
      WHERE current_id = $2
      ORDER BY depth ASC
      LIMIT 1;
    `;

    const result = await this.pool.query(query, [sourceId, targetId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const requirementIds = row.path;
    const linkIds = row.link_ids;

    // Fetch all requirements in the path
    const reqQuery = `SELECT * FROM requirements WHERE id = ANY($1)`;
    const reqResult = await this.pool.query(reqQuery, [requirementIds]);
    const reqMap = new Map(reqResult.rows.map(r => [r.id, this.mapRowToRequirement(r)]));
    const nodes = requirementIds.map((id: string) => reqMap.get(id)!);

    // Fetch all links in the path
    const linkQuery = `SELECT * FROM traceability_links WHERE id = ANY($1)`;
    const linkResult = await this.pool.query(linkQuery, [linkIds]);
    const links = linkResult.rows.map(l => ({
      id: l.id,
      sourceId: l.source_id,
      targetId: l.target_id,
      targetType: l.target_type,
      linkType: l.link_type,
      externalSystem: l.external_system,
      externalId: l.external_id,
      externalMetadata: l.external_metadata,
      createdAt: new Date(l.created_at),
      createdBy: l.created_by,
    }));

    return {
      nodes,
      links,
      totalDepth: row.depth,
    };
  }

  async detectCycles(projectId: string): Promise<Cycle[]> {
    const query = `
      WITH RECURSIVE cycle_detection AS (
        -- Start from each requirement
        SELECT 
          r.id as start_id,
          r.id as current_id,
          ARRAY[r.id::text] as path,
          ARRAY[]::uuid[] as link_ids,
          false as has_cycle
        FROM requirements r
        WHERE r.project_id = $1
        
        UNION ALL
        
        -- Follow links and detect cycles
        SELECT 
          cd.start_id,
          tl.target_id::uuid,
          cd.path || tl.target_id::text,
          cd.link_ids || tl.id,
          tl.target_id::text = cd.start_id::text as has_cycle
        FROM cycle_detection cd
        JOIN traceability_links tl ON tl.source_id::text = cd.current_id::text
        WHERE 
          NOT (tl.target_id::text = ANY(cd.path))
          AND tl.target_type = 'requirement'
          AND array_length(cd.path, 1) < 100
      )
      SELECT DISTINCT
        start_id,
        path,
        link_ids
      FROM cycle_detection
      WHERE has_cycle = true;
    `;

    const result = await this.pool.query(query, [projectId]);

    const cycles: Cycle[] = [];
    for (const row of result.rows) {
      const requirementIds = row.path;
      const linkIds = row.link_ids;

      // Fetch all requirements in the cycle
      const reqQuery = `SELECT * FROM requirements WHERE id = ANY($1)`;
      const reqResult = await this.pool.query(reqQuery, [requirementIds]);
      const reqMap = new Map(reqResult.rows.map(r => [r.id, this.mapRowToRequirement(r)]));
      const nodes = requirementIds.map((id: string) => reqMap.get(id)!);

      // Fetch all links in the cycle
      const linkQuery = `SELECT * FROM traceability_links WHERE id = ANY($1)`;
      const linkResult = await this.pool.query(linkQuery, [linkIds]);
      const links = linkResult.rows.map(l => ({
        id: l.id,
        sourceId: l.source_id,
        targetId: l.target_id,
        targetType: l.target_type,
        linkType: l.link_type,
        externalSystem: l.external_system,
        externalId: l.external_id,
        externalMetadata: l.external_metadata,
        createdAt: new Date(l.created_at),
        createdBy: l.created_by,
      }));

      cycles.push({ nodes, links });
    }

    return cycles;
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

  async calculateCoverageStatus(requirementId: string): Promise<CoverageStatus> {
    // Check if requirement has any test links
    const query = `
      SELECT 
        tl.external_metadata->>'status' as test_status
      FROM traceability_links tl
      WHERE 
        tl.source_id = $1
        AND tl.link_type = 'verified_by'
        AND tl.target_type = 'external'
    `;

    const result = await this.pool.query(query, [requirementId]);

    if (result.rows.length === 0) {
      return 'no_test';
    }

    // Aggregate test statuses
    const statuses = result.rows.map(row => row.test_status);
    
    if (statuses.some(s => s === 'failed')) {
      return 'failed';
    }
    
    if (statuses.every(s => s === 'passed')) {
      return 'passed';
    }
    
    return 'not_run';
  }

  async traceToSource(
    requirementId: string,
    sourceTypes: string[]
  ): Promise<TraceabilityChain[]> {
    const query = `
      WITH RECURSIVE full_trace AS (
        -- Base case: start with requirement
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
          1 as level,
          ARRAY[r.type] as type_path,
          ARRAY[r.id::text] as id_path,
          tl.link_type
        FROM requirements r
        LEFT JOIN traceability_links tl ON false
        WHERE r.id = $1
        
        UNION ALL
        
        -- Recursive case: follow upstream links
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
          ft.level + 1,
          ft.type_path || r.type,
          ft.id_path || r.id::text,
          tl.link_type
        FROM full_trace ft
        JOIN traceability_links tl ON tl.target_id::text = ft.id::text
        JOIN requirements r ON r.id::text = tl.source_id::text
        WHERE 
          NOT (r.id::text = ANY(ft.id_path))
          AND ft.level < 10
          AND tl.target_type = 'requirement'
      )
      SELECT * FROM full_trace
      WHERE level > 1
      ORDER BY level, type;
    `;

    const result = await this.pool.query(query, [requirementId]);

    // Group by chains that reach source types
    const chains: TraceabilityChain[] = [];
    const sourceReq = await this.pool.query('SELECT * FROM requirements WHERE id = $1', [requirementId]);
    
    if (sourceReq.rows.length === 0) {
      return chains;
    }

    const source = this.mapRowToRequirement(sourceReq.rows[0]);

    // Find requirements that match source types
    const matchingTargets = result.rows.filter(row => sourceTypes.includes(row.type));

    for (const target of matchingTargets) {
      chains.push({
        source,
        target: this.mapRowToRequirement(target),
        intermediateNodes: [],
        complete: true,
      });
    }

    return chains;
  }

  async traceToImplementation(
    requirementId: string,
    targetTypes: string[]
  ): Promise<TraceabilityChain[]> {
    const query = `
      WITH RECURSIVE full_trace AS (
        -- Base case: start with requirement
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
          1 as level,
          ARRAY[r.type] as type_path,
          ARRAY[r.id::text] as id_path,
          tl.link_type
        FROM requirements r
        LEFT JOIN traceability_links tl ON false
        WHERE r.id = $1
        
        UNION ALL
        
        -- Recursive case: follow downstream links
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
          ft.level + 1,
          ft.type_path || r.type,
          ft.id_path || r.id::text,
          tl.link_type
        FROM full_trace ft
        JOIN traceability_links tl ON tl.source_id::text = ft.id::text
        JOIN requirements r ON r.id::text = tl.target_id::text
        WHERE 
          NOT (r.id::text = ANY(ft.id_path))
          AND ft.level < 10
          AND tl.target_type = 'requirement'
      )
      SELECT * FROM full_trace
      WHERE level > 1
      ORDER BY level, type;
    `;

    const result = await this.pool.query(query, [requirementId]);

    // Group by chains that reach target types
    const chains: TraceabilityChain[] = [];
    const sourceReq = await this.pool.query('SELECT * FROM requirements WHERE id = $1', [requirementId]);
    
    if (sourceReq.rows.length === 0) {
      return chains;
    }

    const source = this.mapRowToRequirement(sourceReq.rows[0]);

    // Find requirements that match target types
    const matchingTargets = result.rows.filter(row => targetTypes.includes(row.type));

    for (const target of matchingTargets) {
      chains.push({
        source,
        target: this.mapRowToRequirement(target),
        intermediateNodes: [],
        complete: true,
      });
    }

    return chains;
  }

  async bulkFindDownstream(
    sourceIds: string[]
  ): Promise<Map<string, RequirementNode[]>> {
    if (sourceIds.length === 0) {
      return new Map();
    }

    const maxDepth = 100;
    const query = `
      WITH RECURSIVE downstream AS (
        -- Base case: start with all source requirements
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
          r.id as source_id,
          'relates_to'::link_type as link_type,
          0 as depth,
          ARRAY[r.id::text] as path
        FROM requirements r
        WHERE r.id = ANY($1)
        
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
          d.source_id,
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
      )
      SELECT DISTINCT ON (source_id, id) *
      FROM downstream
      WHERE depth > 0
      ORDER BY source_id, id, depth ASC;
    `;

    const result = await this.pool.query(query, [sourceIds, maxDepth]);

    // Group results by source_id
    const resultMap = new Map<string, RequirementNode[]>();
    
    for (const sourceId of sourceIds) {
      resultMap.set(sourceId, []);
    }

    for (const row of result.rows) {
      const node: RequirementNode = {
        requirement: this.mapRowToRequirement(row),
        depth: row.depth,
        path: row.path,
        linkType: row.link_type,
      };

      const sourceId = row.source_id;
      const nodes = resultMap.get(sourceId) || [];
      nodes.push(node);
      resultMap.set(sourceId, nodes);
    }

    return resultMap;
  }

  async getGraphMetrics(projectId: string): Promise<GraphMetrics> {
    // Get total nodes (requirements)
    const nodesQuery = `
      SELECT COUNT(*) as count
      FROM requirements
      WHERE project_id = $1 AND status != 'deprecated'
    `;
    const nodesResult = await this.pool.query(nodesQuery, [projectId]);
    const totalNodes = parseInt(nodesResult.rows[0].count);

    // Get total edges (traceability links)
    const edgesQuery = `
      SELECT COUNT(*) as count
      FROM traceability_links tl
      JOIN requirements r ON r.id = tl.source_id
      WHERE r.project_id = $1 AND tl.target_type = 'requirement'
    `;
    const edgesResult = await this.pool.query(edgesQuery, [projectId]);
    const totalEdges = parseInt(edgesResult.rows[0].count);

    // Calculate average degree
    const averageDegree = totalNodes > 0 ? (totalEdges * 2) / totalNodes : 0;

    // Get max depth (longest path in the graph)
    const maxDepthQuery = `
      WITH RECURSIVE depths AS (
        SELECT 
          r.id,
          0 as depth
        FROM requirements r
        LEFT JOIN traceability_links tl ON tl.target_id::text = r.id::text AND tl.target_type = 'requirement'
        WHERE r.project_id = $1 AND tl.id IS NULL
        
        UNION ALL
        
        SELECT 
          tl.target_id::uuid,
          d.depth + 1
        FROM depths d
        JOIN traceability_links tl ON tl.source_id::text = d.id::text
        WHERE tl.target_type = 'requirement' AND d.depth < 100
      )
      SELECT COALESCE(MAX(depth), 0) as max_depth
      FROM depths
    `;
    const maxDepthResult = await this.pool.query(maxDepthQuery, [projectId]);
    const maxDepth = parseInt(maxDepthResult.rows[0].max_depth);

    // Detect cycles
    const cycles = await this.detectCycles(projectId);
    const cycleCount = cycles.length;

    // Count orphaned requirements
    const orphanedReqs = await this.findOrphanedRequirements(projectId, 'downstream');
    const orphanCount = orphanedReqs.length;

    // Calculate connected components (simplified - count requirements with no links)
    const componentsQuery = `
      SELECT COUNT(DISTINCT r.id) as isolated_count
      FROM requirements r
      LEFT JOIN traceability_links tl1 ON tl1.source_id::text = r.id::text
      LEFT JOIN traceability_links tl2 ON tl2.target_id::text = r.id::text
      WHERE r.project_id = $1 
        AND r.status != 'deprecated'
        AND tl1.id IS NULL 
        AND tl2.id IS NULL
    `;
    const componentsResult = await this.pool.query(componentsQuery, [projectId]);
    const isolatedCount = parseInt(componentsResult.rows[0].isolated_count);
    
    // Simplified: connected components = 1 (main graph) + isolated nodes
    const connectedComponents = isolatedCount + (totalNodes > isolatedCount ? 1 : 0);

    return {
      totalNodes,
      totalEdges,
      averageDegree,
      maxDepth,
      cycleCount,
      orphanCount,
      connectedComponents,
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
