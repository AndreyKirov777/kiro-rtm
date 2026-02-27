# Repository Layer

This directory contains the data access layer for the Requirements Management & Traceability application.

## Overview

The repository pattern provides an abstraction layer between the application logic and the database, making it easier to test, maintain, and potentially swap out the underlying storage mechanism.

## Repositories

### RequirementRepository

Handles CRUD operations for requirements.

**Key Features:**
- Create, read, update, and delete requirements
- Automatic version increment on updates
- Display ID stability (never changes when requirement is moved)
- Display ID retirement (never reused after deletion)

**Property Tests:**
- Property 1: Requirement Data Round-Trip
- Property 2: Internal ID Uniqueness
- Property 3: Display ID Stability
- Property 4: Display ID Non-Reuse

### TraceabilityLinkRepository

Manages bidirectional traceability links between requirements and external items.

**Key Features:**
- Create and delete traceability links
- Find links by source or target
- Support for external system integration (Jira, GitHub, Linear)

**Property Tests:**
- Property 9: Traceability Link Bidirectionality

### PostgresGraphRepository

Implements graph operations for requirements traceability using PostgreSQL recursive CTEs.

**Key Features:**
- Downstream traversal (impact analysis)
- Upstream traversal (traceability to source)
- Shortest path finding
- Cycle detection
- Orphaned requirement detection
- Coverage status calculation
- Graph metrics (nodes, edges, depth, etc.)

**Property Tests:**
- Property 11: Orphaned Requirement Detection
- Property 14: Impact Analysis Completeness

**Implementation Details:**
- Uses recursive Common Table Expressions (CTEs) for graph traversal
- Optimized with proper indexes on traceability_links table
- Prevents infinite loops with path tracking
- Configurable max depth limits

**Graph Operations:**

1. **findDownstreamRequirements**: Find all requirements linked from a source requirement
   - Supports max depth limiting
   - Supports link type filtering
   - Returns nodes with depth and path information

2. **findUpstreamRequirements**: Find all requirements that link to a target requirement
   - Traces back to source requirements
   - Useful for understanding requirement origins

3. **findAllPaths**: Find all possible paths between two requirements
   - Returns multiple paths if they exist
   - Useful for understanding different traceability routes

4. **findShortestPath**: Find the shortest path between two requirements
   - Returns single optimal path
   - Returns null if no path exists

5. **detectCycles**: Detect circular dependencies in requirement links
   - Identifies problematic cycles
   - Returns all cycles found in a project

6. **findOrphanedRequirements**: Find requirements with no links
   - Supports upstream, downstream, or both directions
   - Excludes deprecated requirements

7. **calculateImpactAnalysis**: Calculate full impact tree from a requirement
   - Returns all downstream requirements
   - Includes depth and path information
   - Useful for change impact assessment

8. **calculateCoverageStatus**: Determine test coverage status
   - Checks for verified_by links to test cases
   - Returns: passed, failed, not_run, or no_test

9. **bulkFindDownstream**: Batch operation for multiple requirements
   - Optimized for bulk queries
   - Returns map of source ID to downstream nodes

10. **getGraphMetrics**: Calculate project-wide graph statistics
    - Total nodes and edges
    - Average degree
    - Max depth
    - Cycle count
    - Orphan count
    - Connected components

### AuditService

Manages immutable audit trail for all requirement changes.

**Key Features:**
- Append-only audit log
- Automatic audit entry creation via database triggers
- Query audit trail with filtering
- 10-year retention policy

**Property Tests:**
- Property 16: Audit Trail Completeness
- Property 17: Audit Entry Immutability

## Testing Strategy

### Unit Tests
Test individual methods in isolation with mocked dependencies.

### Integration Tests
Test repository methods with actual database connections.

### Property-Based Tests
Test universal properties and invariants using fast-check:
- Generate random test data
- Verify properties hold for all inputs
- Run 30-100 iterations per property

## Database Schema

All repositories interact with PostgreSQL tables:
- `requirements`: Core requirement data
- `traceability_links`: Bidirectional links between requirements
- `audit_entries`: Immutable audit log
- `projects`, `users`, `api_tokens`: Supporting tables

## Performance Considerations

### Indexes
Strategic indexes on foreign keys and frequently queried fields:
- `idx_traceability_links_source` on (source_id, target_type, link_type)
- `idx_traceability_links_target` on (target_id, target_type, link_type)
- `idx_requirements_project_status` on (project_id, status, type)

### Connection Pooling
All repositories use a shared connection pool (10-20 connections recommended).

### Query Optimization
- Use `DISTINCT ON` to eliminate duplicates
- Set reasonable max depth limits (default: 100)
- Add WHERE filters early in recursive queries
- Use parameterized queries to prevent SQL injection

## Future Enhancements

### Graph Database Migration
The IGraphRepository interface allows swapping PostgreSQL for a dedicated graph database:
- Neo4j: Native graph database with Cypher query language
- Amazon Neptune: Managed graph database service
- ArangoDB: Multi-model database with graph support

The abstraction layer ensures application code remains unchanged during migration.

### Caching
Consider adding Redis caching for frequently accessed graph traversals:
- Cache key format: `graph:{operation}:{requirementId}:{options_hash}`
- TTL: 5 minutes
- Invalidate on link creation/deletion

### Materialized Views
For read-heavy workloads, pre-compute common graph metrics:
- Direct descendant counts
- Requirement depths
- Coverage status aggregations

## Usage Examples

### Finding Impact of a Requirement Change

```typescript
const graphRepo = new PostgresGraphRepository(pool);

// Find all downstream requirements affected by a change
const impactTree = await graphRepo.calculateImpactAnalysis('req-123');

console.log(`Total impacted: ${impactTree.totalImpacted}`);
console.log(`Max depth: ${impactTree.maxDepth}`);

for (const node of impactTree.impactedNodes) {
  console.log(`- ${node.requirement.displayId}: ${node.requirement.title} (depth: ${node.depth})`);
}
```

### Detecting Orphaned Requirements

```typescript
const graphRepo = new PostgresGraphRepository(pool);

// Find requirements with no downstream links
const orphaned = await graphRepo.findOrphanedRequirements('project-123', 'downstream');

console.log(`Found ${orphaned.length} orphaned requirements`);
for (const req of orphaned) {
  console.log(`- ${req.displayId}: ${req.title}`);
}
```

### Tracing Requirements to Source

```typescript
const graphRepo = new PostgresGraphRepository(pool);

// Find all upstream requirements
const upstream = await graphRepo.findUpstreamRequirements('req-456');

console.log('Traceability chain:');
for (const node of upstream) {
  console.log(`${'  '.repeat(node.depth)}- ${node.requirement.displayId}: ${node.requirement.title}`);
}
```

### Checking for Circular Dependencies

```typescript
const graphRepo = new PostgresGraphRepository(pool);

// Detect cycles in the project
const cycles = await graphRepo.detectCycles('project-123');

if (cycles.length > 0) {
  console.log(`Warning: Found ${cycles.length} circular dependencies`);
  for (const cycle of cycles) {
    const ids = cycle.nodes.map(n => n.displayId).join(' -> ');
    console.log(`- ${ids}`);
  }
}
```

## Contributing

When adding new repository methods:
1. Add method signature to interface (if applicable)
2. Implement method with proper error handling
3. Add unit tests for specific examples
4. Add integration tests with database
5. Add property tests for universal invariants
6. Update this README with usage examples
