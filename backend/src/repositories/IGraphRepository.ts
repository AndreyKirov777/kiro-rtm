import { Requirement, TraceabilityLink, LinkType, CoverageStatus } from '../types';

/**
 * Graph Repository Interface
 * 
 * Provides an abstraction layer for graph operations on requirements traceability.
 * This interface allows swapping the underlying storage mechanism (PostgreSQL, Neo4j, etc.)
 * without changing application code.
 */

export interface TraversalOptions {
  maxDepth?: number;
  linkTypes?: LinkType[];
  includeExternal?: boolean;
  stopCondition?: (node: RequirementNode) => boolean;
}

export interface RequirementNode {
  requirement: Requirement;
  depth: number;
  path: string[];
  linkType: LinkType;
}

export interface Path {
  nodes: Requirement[];
  links: TraceabilityLink[];
  totalDepth: number;
}

export interface Cycle {
  nodes: Requirement[];
  links: TraceabilityLink[];
}

export interface ImpactTree {
  root: Requirement;
  impactedNodes: RequirementNode[];
  totalImpacted: number;
  maxDepth: number;
}

export interface TraceabilityChain {
  source: Requirement;
  target: Requirement | ExternalItem;
  intermediateNodes: RequirementNode[];
  complete: boolean;
}

export interface ExternalItem {
  id: string;
  type: 'external';
  externalSystem: string;
  externalId: string;
  title: string;
  status: string;
  url: string;
}

export interface GraphMetrics {
  totalNodes: number;
  totalEdges: number;
  averageDegree: number;
  maxDepth: number;
  cycleCount: number;
  orphanCount: number;
  connectedComponents: number;
}

export interface IGraphRepository {
  // Traversal Operations
  findDownstreamRequirements(
    sourceId: string,
    options?: TraversalOptions
  ): Promise<RequirementNode[]>;

  findUpstreamRequirements(
    targetId: string,
    options?: TraversalOptions
  ): Promise<RequirementNode[]>;

  findAllPaths(
    sourceId: string,
    targetId: string,
    maxDepth?: number
  ): Promise<Path[]>;

  findShortestPath(
    sourceId: string,
    targetId: string
  ): Promise<Path | null>;

  // Analysis Operations
  detectCycles(projectId: string): Promise<Cycle[]>;

  findOrphanedRequirements(
    projectId: string,
    direction: 'upstream' | 'downstream' | 'both'
  ): Promise<Requirement[]>;

  calculateImpactAnalysis(
    requirementId: string,
    maxDepth?: number
  ): Promise<ImpactTree>;

  calculateCoverageStatus(requirementId: string): Promise<CoverageStatus>;

  // Multi-Level Traceability
  traceToSource(
    requirementId: string,
    sourceTypes: string[]
  ): Promise<TraceabilityChain[]>;

  traceToImplementation(
    requirementId: string,
    targetTypes: string[]
  ): Promise<TraceabilityChain[]>;

  // Bulk Operations
  bulkFindDownstream(sourceIds: string[]): Promise<Map<string, RequirementNode[]>>;

  // Graph Statistics
  getGraphMetrics(projectId: string): Promise<GraphMetrics>;
}
