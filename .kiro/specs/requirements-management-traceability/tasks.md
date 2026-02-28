# Implementation Plan: Requirements Management & Traceability Application

## Overview

This implementation plan breaks down the Requirements Management & Traceability (RMT) Application into discrete coding tasks. The system is a full-stack web application with a React/TypeScript frontend, Node.js/Express backend, and PostgreSQL database, designed to run locally via Docker Compose.

The implementation follows an **iterative, UI-first approach**: After setting up the database schema and data models, we build the complete frontend with mock data to enable early UX testing and validation. Then we progressively connect backend services, allowing parallel frontend/backend development and early user feedback. Each phase delivers working, testable functionality.

## Tasks

- [x] 1. Set up project structure and development environment
  - Create monorepo structure with backend and frontend directories
  - Set up Docker Compose configuration for PostgreSQL, backend API, and frontend
  - Configure TypeScript for both backend and frontend
  - Set up ESLint and Prettier for code quality
  - Create package.json files with dependencies (Express, React, pg, Jest, fast-check)
  - Create .env.example files with environment variable templates
  - Set up testing frameworks (Jest for unit/integration, fast-check for property tests)
  - _Requirements: All (foundational setup)_

- [x] 2. Implement database schema and migrations
  - [x] 2.1 Create PostgreSQL migration system
    - Set up migration framework (node-pg-migrate or similar)
    - Create initial migration structure
    - _Requirements: All (foundational)_
  
  - [x] 2.2 Create core tables schema
    - Create requirements table with all fields (id, display_id, project_id, parent_id, title, description, type, status, priority, version, tags, custom_fields, timestamps, user references)
    - Create projects table
    - Create users table
    - Create api_tokens table
    - Add indexes on foreign keys and frequently queried fields
    - _Requirements: 1.1-1.12, 2.1-2.3, 4.1-4.3_
  
  - [x] 2.3 Create traceability and audit tables
    - Create traceability_links table with source_id, target_id, link_type, external system fields
    - Create audit_entries table (append-only with immutability constraints)
    - Create electronic_signatures table
    - Add indexes for traceability queries
    - _Requirements: 8.1-8.7, 14.1-14.7, 21.1-21.5_
  
  - [x] 2.4 Create baseline and workflow tables
    - Create baselines table with snapshot_data JSON field
    - Create comments table with threading support
    - Create attachments table
    - Add full-text search indexes (GIN) on requirements
    - _Requirements: 6.1-6.4, 5.1-5.3, 16.1-16.5_


- [x] 3. Implement core data models and repositories
  - [x] 3.1 Create TypeScript interfaces for all data models
    - Define Requirement, TraceabilityLink, Baseline, AuditEntry, ElectronicSignature, Comment, Attachment, Project, User, ApiToken interfaces
    - Define enum types (RequirementType, RequirementStatus, Priority, LinkType, CoverageStatus)
    - _Requirements: 1.1-1.12, 8.1-8.7_
  
  - [x] 3.2 Write property test for data model round-trip
    - **Property 1: Requirement Data Round-Trip**
    - **Validates: Requirements 1.3-1.12, 2.1-2.3, 4.1-4.3**
  
  - [x] 3.3 Implement requirement repository
    - Create RequirementRepository class with CRUD methods
    - Implement create, findById, findByProject, update, delete methods
    - Implement version increment logic on updates
    - Use connection pooling for PostgreSQL
    - _Requirements: 1.1-1.12_
  
  - [x] 3.4 Write property tests for requirement repository
    - **Property 2: Internal ID Uniqueness**
    - **Property 3: Display ID Stability**
    - **Property 4: Display ID Non-Reuse**
    - **Validates: Requirements 1.1, 1.2, 3.3, 18.1-18.3**
  
  - [x] 3.5 Implement traceability link repository
    - Create TraceabilityLinkRepository class
    - Implement createLink, deleteLink, findBySource, findByTarget methods
    - _Requirements: 8.1-8.7_
  
  - [x] 3.6 Write property test for traceability bidirectionality
    - **Property 9: Traceability Link Bidirectionality**
    - **Validates: Requirements 8.1-8.7**

- [x] 4. Implement graph abstraction layer for traceability
  - [x] 4.1 Create IGraphRepository interface
    - Define interface with methods: findDownstreamRequirements, findUpstreamRequirements, detectCycles, findOrphanedRequirements, calculateImpactAnalysis, calculateCoverageStatus
    - Define supporting types: RequirementNode, Path, Cycle, ImpactTree, TraversalOptions
    - _Requirements: 9.1-9.2, 10.1-10.3, 12.1-12.4_
  
  - [x] 4.2 Implement PostgreSQL graph repository with recursive CTEs
    - Implement PostgresGraphRepository class
    - Write recursive CTE queries for downstream traversal
    - Write recursive CTE queries for upstream traversal
    - Implement cycle detection query
    - Implement orphan detection queries
    - _Requirements: 9.1-9.2, 10.1-10.3, 12.1-12.4_
  
  - [x] 4.3 Write property tests for graph operations
    - **Property 11: Orphaned Requirement Detection**
    - **Property 14: Impact Analysis Completeness**
    - **Validates: Requirements 10.1-10.3, 12.1-12.4**

- [x] 5. Implement audit trail service
  - [x] 5.1 Create AuditService class
    - Implement createAuditEntry method
    - Implement queryAuditTrail method with filtering
    - Ensure append-only behavior (no update/delete methods)
    - _Requirements: 14.1-14.7_
  
  - [x] 5.2 Write property tests for audit trail
    - **Property 16: Audit Trail Completeness**
    - **Property 17: Audit Entry Immutability**
    - **Validates: Requirements 14.1-14.6**
  
  - [x] 5.3 Implement database triggers for automatic audit logging
    - Create PostgreSQL triggers on requirements table for INSERT, UPDATE, DELETE
    - Create triggers on traceability_links table
    - Triggers should call audit entry creation
    - _Requirements: 14.1-14.4_

- [x] 6. Implement baseline service
  - [x] 6.1 Create BaselineService class
    - Implement createBaseline method (snapshot all requirements to JSON)
    - Implement lockBaseline method with authorization check
    - Implement compareBaselines method with diff algorithm
    - Implement getBaseline method
    - _Requirements: 16.1-16.5, 17.1-17.4_
  
  - [x] 6.2 Write property tests for baseline operations
    - **Property 19: Baseline Snapshot Accuracy**
    - **Property 20: Baseline Immutability After Locking**
    - **Property 21: Baseline Comparison Accuracy**
    - **Validates: Requirements 16.1-16.5, 17.1-17.4**

- [x] 7. Implement workflow and approval service
  - [x] 7.1 Create WorkflowService class
    - Implement state transition validation
    - Implement approve, requestChanges, reject methods
    - Implement reviewer authorization checks
    - _Requirements: 19.1-19.4, 20.1-20.6_
  
  - [x] 7.2 Implement electronic signature capture
    - Create ElectronicSignatureService class
    - Implement signature creation with HMAC-SHA256 hash
    - Implement signature verification method
    - Ensure immutability of signature records
    - _Requirements: 21.1-21.5_
  
  - [x] 7.3 Write property test for electronic signatures
    - **Property 23: Electronic Signature Tamper Detection**
    - **Validates: Requirements 21.1-21.5**
  
  - [x] 7.4 Write property test for workflow transitions
    - **Property 22: Workflow State Transition Enforcement**
    - **Validates: Requirements 19.1-19.4, 20.1-20.6**

- [x] 8. Checkpoint - Ensure all core services pass tests
  - Run all unit tests and property tests
  - Verify database schema is correctly created
  - Ensure all tests pass, ask the user if questions arise


## PHASE 1: Frontend with Mock Data (Early UI Testing)

This phase builds the complete UI using mock/hardcoded data, enabling early UX validation and testing before backend APIs are fully implemented. You'll have a fully clickable prototype to test workflows and gather feedback.

- [x] 9. Set up React frontend project structure
  - [x] 9.1 Create React app with TypeScript
    - Initialize React project with Create React App or Vite
    - Configure TypeScript
    - Set up React Router for navigation
    - Configure Axios for API calls
    - _Requirements: All (frontend foundation)_
  
  - [x] 9.2 Create shared UI components
    - Create Button, Input, Select, Textarea, Modal, Dropdown components
    - Create Table component with sorting and pagination
    - Create Loading spinner and error message components
    - Set up CSS/styling framework (Tailwind CSS or similar)
    - _Requirements: All (UI foundation)_
  
  - [x] 9.3 Create mock data service
    - Create mockData.ts with sample requirements, projects, users, links, baselines
    - Create MockApiClient class that returns mock data with simulated delays
    - Implement localStorage persistence for mock data changes
    - _Requirements: All (mock data for UI development)_
  
  - [x] 9.4 Create authentication context and hooks (mock)
    - Create AuthContext for managing user session
    - Create useAuth hook
    - Implement mock login/logout functionality
    - Store mock user in localStorage
    - _Requirements: 37.1-37.5_

- [x] 10. Implement frontend - Requirement list and detail views (with mocks)
  - [x] 10.1 Create requirement list page
    - Display requirements in a table with columns: Display ID, Title, Type, Status, Priority
    - Implement pagination with mock data
    - Implement sorting by columns
    - Add "Create Requirement" button
    - _Requirements: 1.1-1.12, 34.3_
  
  - [x] 10.2 Create requirement detail page
    - Display all requirement fields
    - Show requirement hierarchy (parent and children)
    - Display comments section with mock comments
    - Display attachments section with mock files
    - Display traceability links section with mock links
    - Add "Edit" and "Delete" buttons
    - _Requirements: 1.1-1.12, 3.1-3.3, 6.1-6.4, 5.1-5.3, 8.1-8.7_
  
  - [x] 10.3 Create requirement create/edit form
    - Form fields for title, description (rich text editor), type, status, priority, tags, custom fields
    - Implement form validation
    - Save to mock data service
    - _Requirements: 1.1-1.12, 2.1-2.3, 4.1-4.3_
  
  - [x] 10.4 Implement hierarchical tree view
    - Create tree component for requirement hierarchy
    - Support drag-and-drop reordering (updates mock data)
    - Expand/collapse nodes
    - _Requirements: 3.1-3.3_

- [x] 11. Implement frontend - Search, filter, and saved views (with mocks)
  - [x] 11.1 Create search bar component
    - Full-text search input
    - Display search results with highlighting (client-side filtering)
    - _Requirements: 23.1-23.4_
  
  - [x] 11.2 Create filter panel
    - Filter controls for status, type, priority, tags, assignee, custom fields, coverage status
    - Support multiple filter combinations
    - Apply filters to requirement list (client-side)
    - _Requirements: 24.1-24.8_
  
  - [x] 11.3 Create saved views feature
    - "Save View" button to save current filters and sort
    - Display list of saved views (stored in localStorage)
    - Load saved view on click
    - Share view with team members (mock)
    - _Requirements: 25.1-25.4_

- [x] 12. Implement frontend - Traceability features (with mocks)
  - [x] 12.1 Create traceability link creation UI
    - "Add Link" button on requirement detail page
    - Modal to select target requirement or external item
    - Select link type dropdown
    - Save to mock data service
    - _Requirements: 8.1-8.7_
  
  - [x] 12.2 Create traceability matrix view
    - Display matrix with requirements as rows and test cases as columns
    - Color-code cells by coverage status (Passed, Failed, Not Run, No Test)
    - Support filtering and export (mock)
    - _Requirements: 9.1-9.2_
  
  - [x] 12.3 Create dependency graph visualization
    - Use D3.js or similar library for graph rendering
    - Display requirements as nodes and links as edges
    - Support zoom, pan, and node selection
    - Click node to navigate to requirement detail
    - _Requirements: 26.1-26.4_
  
  - [x] 12.4 Create impact analysis view
    - Display impact tree when requirement is selected
    - Show all downstream requirements and external items (from mock data)
    - Highlight affected items
    - _Requirements: 12.1-12.4_
  
  - [x] 12.5 Create orphaned requirements view
    - Display list of orphaned requirements (calculated from mock data)
    - Support filtering and sorting
    - _Requirements: 10.1-10.3_

- [x] 13. Implement frontend - Comments and attachments (with mocks)
  - [x] 13.1 Create comment component
    - Display comments in chronological order
    - Support threaded replies
    - Add comment form (saves to mock data)
    - Mark comments as clarification requests
    - Resolve comments
    - _Requirements: 6.1-6.4, 40.1-40.4_
  
  - [x] 13.2 Create attachment upload component
    - File upload button with drag-and-drop support
    - Display list of attachments with download links (mock files)
    - Delete attachment button
    - _Requirements: 5.1-5.3_

- [x] 14. Implement frontend - Baselines and history (with mocks)
  - [x] 14.1 Create baseline management page
    - Display list of baselines (from mock data)
    - "Create Baseline" button with name and description form
    - "Lock Baseline" button for unlocked baselines
    - _Requirements: 16.1-16.5_
  
  - [x] 14.2 Create baseline comparison view
    - Select two baselines or baseline vs current
    - Display diff view with added, modified, deleted requirements
    - Highlight field-level changes
    - _Requirements: 17.1-17.4_
  
  - [x] 14.3 Create revision history view
    - Display all versions of a requirement (from mock data)
    - Show changes between versions
    - "Restore" button to revert to previous version
    - _Requirements: 15.1-15.3_

- [x] 15. Implement frontend - Workflows and approvals (with mocks)
  - [x] 15.1 Create approval workflow UI
    - Display current workflow state on requirement detail page
    - "Approve", "Request Changes", "Reject" buttons based on user role
    - Electronic signature capture modal (mock)
    - _Requirements: 19.1-19.4, 20.1-20.6, 21.1-21.5_
  
  - [x] 15.2 Create workflow configuration page (admin only)
    - Define workflow states
    - Define transitions between states
    - Assign reviewers to states
    - _Requirements: 19.1-19.4_

- [x] 16. Implement frontend - Import/Export (with mocks)
  - [x] 16.1 Create import page
    - File upload for CSV, ReqIF, Word
    - Field mapping interface for CSV
    - Display validation errors (mock)
    - Show import progress and results (mock)
    - _Requirements: 27.1-27.5, 28.1-28.5, 29.1-29.5_
  
  - [x] 16.2 Create export functionality
    - "Export" button on requirement list page
    - Select export format (CSV, JSON, PDF, ReqIF)
    - Select fields to include
    - Download exported file (mock data)
    - _Requirements: 30.1-30.3, 31.1-31.3, 32.1-32.3, 33.1-33.3, 11.1-11.2, 11.4_

- [x] 17. Implement frontend - Admin and settings (with mocks)
  - [x] 17.1 Create project management page
    - List projects (from mock data)
    - Create/edit project form
    - Configure custom fields per project
    - _Requirements: 2.1-2.3_
  
  - [x] 17.2 Create user management page (admin only)
    - List users (from mock data)
    - Assign roles
    - _Requirements: 42.1-42.7_
  
  - [x] 17.3 Create API token management page
    - List user's API tokens (from mock data)
    - Create new token with scopes and expiration
    - Revoke token
    - Display token value only once on creation
    - _Requirements: 37.1-37.5_
  
  - [x] 17.4 Create notification preferences page
    - Configure email notification preferences
    - Configure webhook subscriptions
    - _Requirements: 22.1-22.4, 38.1-38.5_

- [x] 18. Implement frontend - Requirement templates (with mocks)
  - [x] 18.1 Create template management page
    - List requirement templates (from mock data)
    - Create/edit template form
    - _Requirements: 7.1-7.3_
  
  - [x] 18.2 Add "Create from Template" option
    - Template selection dropdown on requirement creation
    - Pre-populate fields from selected template
    - _Requirements: 7.1-7.3_

- [x] 19. Implement frontend - Audit trail and compliance (with mocks)
  - [x] 19.1 Create audit trail page
    - Display audit entries with filtering (from mock data)
    - Filter by entity type, entity ID, actor, action, date range
    - _Requirements: 14.1-14.7_
  
  - [x] 19.2 Create compliance gap report page
    - Display requirements without approval
    - Display requirements without test coverage
    - Display requirements with failing tests
    - Display requirements changed since last baseline
    - _Requirements: 53.1-53.5_

- [x] 20. Polish frontend UI/UX
  - [x] 20.1 Add loading states and error handling
    - Show loading spinners during mock API calls
    - Display user-friendly error messages
    - Implement retry logic for failed requests
    - _Requirements: All_
  
  - [x] 20.2 Implement responsive design
    - Ensure UI works on desktop and tablet
    - Adjust layouts for different screen sizes
    - _Requirements: All_
  
  - [x] 20.3 Add keyboard shortcuts and accessibility
    - Implement common keyboard shortcuts (Ctrl+S to save, etc.)
    - Ensure ARIA labels and roles are correct
    - Test with screen readers
    - _Requirements: All_
  
  - [x] 20.4 Add user feedback mechanisms
    - Toast notifications for success/error messages
    - Confirmation dialogs for destructive actions
    - _Requirements: All_

- [x] 21. Checkpoint - Frontend prototype complete with mock data
  - Test all UI components and pages with mock data
  - Verify all user workflows are functional
  - Gather user feedback on UX and design
  - Make any necessary UI adjustments before backend integration


## PHASE 2: Core Backend API & Integration

This phase implements the REST API for core requirement management and connects the frontend to real backend services. After this phase, you can create, read, update, and delete real requirements.

- [ ] 22. Implement REST API endpoints - Requirements CRUD
  - [ ] 22.1 Set up Express server with middleware
    - Create Express app with JSON body parser
    - Add CORS middleware
    - Add error handling middleware
    - Add request logging middleware
    - _Requirements: 34.1-34.8_
  
  - [ ] 22.2 Implement authentication middleware
    - Create JWT authentication middleware
    - Create API token authentication middleware
    - Implement mock authentication for local development
    - _Requirements: 37.1-37.5_
  
  - [ ] 22.3 Implement authorization middleware
    - Create RBAC middleware with role checks
    - Define permission mappings for each role
    - _Requirements: 42.1-42.7_
  
  - [ ] 22.4 Implement requirement CRUD endpoints
    - POST /api/v1/requirements (create)
    - GET /api/v1/requirements/:id (retrieve)
    - GET /api/v1/requirements (list with filtering)
    - PUT /api/v1/requirements/:id (update)
    - DELETE /api/v1/requirements/:id (deprecate)
    - _Requirements: 34.1-34.8, 1.1-1.12_
  
  - [ ]* 22.5 Write property test for REST API CRUD consistency
    - **Property 31: REST API CRUD Consistency**
    - **Validates: Requirements 34.1-34.8, 36.1-36.4**

- [ ] 23. Implement REST API endpoints - Query capabilities
  - [ ] 23.1 Implement query parameter parsing
    - Parse pagination parameters (limit, offset, cursor)
    - Parse field selection (sparse fieldsets)
    - Parse resource expansion (include parameter)
    - Parse filtering (filter[field] syntax)
    - Parse sorting (sort parameter)
    - _Requirements: 34.3, 24.1-24.8_
  
  - [ ] 23.2 Implement nested resource loading
    - Add include parameter support for links, comments, attachments, history, parent, children
    - Implement efficient batch loading to avoid N+1 queries
    - _Requirements: 34.1-34.8_
  
  - [ ]* 23.3 Write property test for nested resource loading
    - **Property 32: REST API Nested Resource Loading**
    - **Validates: Requirements 34.1-34.8**
  
  - [ ] 23.4 Implement search and filter endpoints
    - GET /api/v1/search (full-text search)
    - Implement filter logic for status, type, priority, tags, assignee, custom fields, coverage status
    - Implement PostgreSQL full-text search with GIN indexes
    - _Requirements: 23.1-23.4, 24.1-24.8_
  
  - [ ]* 23.5 Write property tests for search and filter
    - **Property 24: Search Result Relevance**
    - **Property 25: Filter Result Accuracy**
    - **Validates: Requirements 23.1-23.4, 24.1-24.8**

- [ ] 24. Connect frontend to real API - Core requirements
  - [ ] 24.1 Create real API client service
    - Create axios instance with base URL and interceptors
    - Add authentication token to requests
    - Handle API errors globally
    - _Requirements: 34.1-34.8_
  
  - [ ] 24.2 Replace mock data with API calls in requirement list
    - Update requirement list page to fetch from API
    - Implement server-side pagination
    - Implement server-side sorting
    - _Requirements: 1.1-1.12, 34.3_
  
  - [ ] 24.3 Replace mock data with API calls in requirement detail
    - Update requirement detail page to fetch from API
    - Update comments to use API
    - Update attachments to use API (if implemented)
    - _Requirements: 1.1-1.12, 6.1-6.4_
  
  - [ ] 24.4 Replace mock data with API calls in requirement forms
    - Update create/edit forms to POST/PUT to API
    - Handle validation errors from API
    - _Requirements: 1.1-1.12, 2.1-2.3, 4.1-4.3_
  
  - [ ] 24.5 Replace mock search/filter with API calls
    - Update search to use API endpoint
    - Update filters to use API endpoint
    - _Requirements: 23.1-23.4, 24.1-24.8_

- [ ] 25. Checkpoint - Core requirements management working end-to-end
  - Test creating, reading, updating, deleting requirements via UI
  - Test search and filter functionality
  - Verify data persists in database
  - Ensure all tests pass, ask the user if questions arise


## PHASE 3: Traceability & Graph Features

This phase implements traceability links, graph operations, and connects the frontend traceability features to real backend services.

- [ ] 26. Implement REST API endpoints - Traceability
  - [ ] 26.1 Implement traceability link endpoints
    - POST /api/v1/traceability-links (create link)
    - DELETE /api/v1/traceability-links/:id (delete link)
    - GET /api/v1/traceability-links (list links)
    - GET /api/v1/requirements/:id/links (get links for requirement)
    - _Requirements: 8.1-8.7, 34.6_
  
  - [ ] 26.2 Implement traceability matrix endpoint
    - GET /api/v1/projects/:id/traceability-matrix
    - Support format parameter (json, csv, pdf)
    - Implement matrix generation logic
    - _Requirements: 9.1-9.2_
  
  - [ ]* 26.3 Write property test for traceability matrix
    - **Property 10: Traceability Matrix Completeness**
    - **Validates: Requirements 9.1-9.2**
  
  - [ ] 26.4 Implement impact analysis endpoint
    - GET /api/v1/requirements/:id/impact
    - Use graph repository for traversal
    - _Requirements: 12.1-12.4_
  
  - [ ] 26.5 Implement orphaned requirements endpoint
    - GET /api/v1/projects/:id/orphaned-requirements
    - Use graph repository for detection
    - _Requirements: 10.1-10.3_
  
  - [ ] 26.6 Implement broken link detection endpoint
    - GET /api/v1/traceability-links/broken
    - Check external item status (mock for local dev)
    - _Requirements: 13.1-13.4_
  
  - [ ]* 26.7 Write property test for broken link detection
    - **Property 15: Broken Link Detection**
    - **Validates: Requirements 13.1-13.4**

- [ ] 27. Connect frontend to real API - Traceability features
  - [ ] 27.1 Replace mock data with API calls in traceability link creation
    - Update link creation UI to POST to API
    - Handle link validation errors
    - _Requirements: 8.1-8.7_
  
  - [ ] 27.2 Replace mock data with API calls in traceability matrix
    - Update matrix view to fetch from API
    - Implement server-side matrix generation
    - _Requirements: 9.1-9.2_
  
  - [ ] 27.3 Replace mock data with API calls in dependency graph
    - Update graph visualization to fetch from API
    - _Requirements: 26.1-26.4_
  
  - [ ] 27.4 Replace mock data with API calls in impact analysis
    - Update impact analysis view to fetch from API
    - _Requirements: 12.1-12.4_
  
  - [ ] 27.5 Replace mock data with API calls in orphaned requirements
    - Update orphaned requirements view to fetch from API
    - _Requirements: 10.1-10.3_

- [ ] 28. Checkpoint - Traceability features working end-to-end
  - Test creating and deleting traceability links via UI
  - Test traceability matrix generation
  - Test impact analysis and orphan detection
  - Verify graph visualization works with real data
  - Ensure all tests pass, ask the user if questions arise


## PHASE 4: Workflows, Baselines & History

This phase implements approval workflows, baseline management, and revision history features.

- [ ] 29. Implement REST API endpoints - Baselines and history
  - [ ] 29.1 Implement baseline endpoints
    - POST /api/v1/baselines (create baseline)
    - PUT /api/v1/baselines/:id/lock (lock baseline)
    - GET /api/v1/baselines/:id (retrieve baseline)
    - GET /api/v1/baselines/:id/compare/:targetId (compare baselines)
    - GET /api/v1/baselines (list baselines)
    - _Requirements: 16.1-16.5, 17.1-17.4_
  
  - [ ] 29.2 Implement revision history endpoints
    - GET /api/v1/requirements/:id/history (get history)
    - POST /api/v1/requirements/:id/restore (restore version)
    - _Requirements: 15.1-15.3_
  
  - [ ]* 29.3 Write property test for revision history
    - **Property 18: Revision History Restoration**
    - **Validates: Requirements 15.1-15.3**
  
  - [ ] 29.4 Implement audit trail endpoint
    - GET /api/v1/audit-trail (query audit entries)
    - Support filtering by entity type, entity ID, actor, action, date range
    - _Requirements: 14.1-14.7_

- [ ] 30. Implement REST API endpoints - Workflows and approvals
  - [ ] 30.1 Implement workflow action endpoints
    - POST /api/v1/requirements/:id/approve
    - POST /api/v1/requirements/:id/request-changes
    - POST /api/v1/requirements/:id/reject
    - Integrate with WorkflowService and ElectronicSignatureService
    - _Requirements: 20.1-20.6, 21.1-21.5_
  
  - [ ] 30.2 Implement comment endpoints
    - POST /api/v1/requirements/:id/comments
    - GET /api/v1/requirements/:id/comments
    - PUT /api/v1/comments/:id
    - DELETE /api/v1/comments/:id
    - _Requirements: 6.1-6.4_
  
  - [ ]* 30.3 Write property test for comment persistence
    - **Property 7: Comment Persistence and Ordering**
    - **Validates: Requirements 6.1-6.4**
  
  - [ ] 30.4 Implement attachment endpoints
    - POST /api/v1/requirements/:id/attachments (upload with multipart)
    - GET /api/v1/requirements/:id/attachments (list)
    - GET /api/v1/attachments/:id/download (download file)
    - DELETE /api/v1/attachments/:id
    - Store files in ./uploads directory
    - _Requirements: 5.1-5.3_
  
  - [ ]* 30.5 Write property test for file attachments
    - **Property 6: File Attachment Round-Trip**
    - **Validates: Requirements 5.1-5.3**

- [ ] 31. Connect frontend to real API - Workflows, baselines, and history
  - [ ] 31.1 Replace mock data with API calls in baseline management
    - Update baseline list to fetch from API
    - Update baseline creation to POST to API
    - Update baseline locking to PUT to API
    - _Requirements: 16.1-16.5_
  
  - [ ] 31.2 Replace mock data with API calls in baseline comparison
    - Update comparison view to fetch from API
    - _Requirements: 17.1-17.4_
  
  - [ ] 31.3 Replace mock data with API calls in revision history
    - Update history view to fetch from API
    - Update restore functionality to POST to API
    - _Requirements: 15.1-15.3_
  
  - [ ] 31.4 Replace mock data with API calls in approval workflows
    - Update approval buttons to POST to API
    - Update electronic signature capture to POST to API
    - _Requirements: 19.1-19.4, 20.1-20.6, 21.1-21.5_
  
  - [ ] 31.5 Replace mock data with API calls in audit trail
    - Update audit trail page to fetch from API
    - _Requirements: 14.1-14.7_

- [ ] 32. Checkpoint - Workflows, baselines, and history working end-to-end
  - Test baseline creation, locking, and comparison via UI
  - Test approval workflows with electronic signatures
  - Test revision history and restoration
  - Test audit trail querying
  - Ensure all tests pass, ask the user if questions arise


## PHASE 5: Import/Export & Additional Features

This phase implements import/export functionality, additional backend features, and remaining integrations.

- [ ] 33. Implement import services
  - [ ] 33.1 Create CSV import service
    - Implement CSV parser
    - Create field mapping interface logic
    - Implement validation (required fields, data types, enum values, unique display IDs)
    - Implement bulk requirement creation in transaction
    - _Requirements: 27.1-27.5_
  
  - [ ]* 33.2 Write property test for CSV import
    - **Property 28: CSV Import Validation**
    - **Validates: Requirements 27.1-27.5_
  
  - [ ] 33.3 Create ReqIF import service
    - Implement ReqIF XML parser
    - Map ReqIF SpecObjects to Requirements
    - Map ReqIF SpecRelations to TraceabilityLinks
    - Preserve hierarchy from ReqIF SpecHierarchy
    - _Requirements: 28.1-28.5_
  
  - [ ]* 33.4 Write property test for ReqIF import
    - **Property 29: ReqIF Import Structure Preservation**
    - **Validates: Requirements 28.1-28.5_
  
  - [ ] 33.5 Create Word import service
    - Implement Word document parser using Open XML SDK or mammoth.js
    - Parse heading levels to create hierarchy
    - Parse tables for structured attributes
    - Create requirements from parsed content
    - _Requirements: 29.1-29.5_
  
  - [ ]* 33.6 Write property test for Word import
    - **Property 30: Word Import Structure Preservation**
    - **Validates: Requirements 29.1-29.5_
  
  - [ ] 33.7 Implement import API endpoints
    - POST /api/v1/import/csv
    - POST /api/v1/import/reqif
    - POST /api/v1/import/word
    - GET /api/v1/import/jobs/:id (job status)
    - Handle multipart file uploads
    - _Requirements: 27.1-27.5, 28.1-28.5, 29.1-29.5_

- [ ] 34. Implement export services
  - [ ] 34.1 Create CSV export service
    - Implement CSV generation with configurable fields
    - Include all requirement fields and custom fields
    - _Requirements: 30.1-30.3_
  
  - [ ] 34.2 Create JSON export service
    - Implement JSON serialization with stable schema
    - Include requirements and traceability links
    - Version the schema
    - _Requirements: 31.1-31.3_
  
  - [ ]* 34.3 Write property test for JSON export round-trip
    - **Property 12: Export Format Round-Trip**
    - **Validates: Requirements 31.1-31.3, 33.1-33.3_
  
  - [ ] 34.4 Create PDF export service
    - Implement HTML template rendering
    - Use Puppeteer or similar for HTML to PDF conversion
    - Include project metadata in exports
    - _Requirements: 32.1-32.3_
  
  - [ ]* 34.5 Write property test for export content completeness
    - **Property 13: Export Content Completeness**
    - **Validates: Requirements 11.1-11.2, 11.4, 30.1-30.3, 32.1-32.3_
  
  - [ ] 34.6 Create ReqIF export service
    - Map Requirements to ReqIF SpecObjects
    - Map TraceabilityLinks to ReqIF SpecRelations
    - Preserve hierarchy in ReqIF SpecHierarchy
    - Generate ReqIF XML
    - _Requirements: 33.1-33.3_
  
  - [ ] 34.7 Implement export API endpoints
    - GET /api/v1/export/csv
    - GET /api/v1/export/json
    - GET /api/v1/export/pdf
    - GET /api/v1/export/reqif
    - Return file downloads with appropriate content types
    - _Requirements: 30.1-30.3, 31.1-31.3, 32.1-32.3, 33.1-33.3_

- [ ] 35. Connect frontend to real API - Import/Export
  - [ ] 35.1 Replace mock import with API calls
    - Update import page to POST files to API
    - Handle import validation errors from API
    - Display import progress and results
    - _Requirements: 27.1-27.5, 28.1-28.5, 29.1-29.5_
  
  - [ ] 35.2 Replace mock export with API calls
    - Update export functionality to call API endpoints
    - Handle file downloads from API
    - _Requirements: 30.1-30.3, 31.1-31.3, 32.1-32.3, 33.1-33.3, 11.1-11.2, 11.4_

- [ ] 36. Implement additional backend features
  - [ ] 36.1 Implement hierarchical requirement operations
    - Create service methods for reordering requirements
    - Implement parent-child relationship validation (no cycles)
    - _Requirements: 3.1-3.3_
  
  - [ ]* 36.2 Write property test for hierarchical structure
    - **Property 5: Hierarchical Tree Structure Invariant**
    - **Validates: Requirements 3.1-3.2_
  
  - [ ] 36.3 Implement requirement templates
    - Create template storage and retrieval
    - Implement template application logic
    - _Requirements: 7.1-7.3_
  
  - [ ]* 36.4 Write property test for template field pre-population
    - **Property 8: Template Field Pre-Population**
    - **Validates: Requirements 7.1-7.3_
  
  - [ ] 36.5 Implement saved views
    - Create saved view storage (filter and sort configurations)
    - Implement view sharing logic
    - _Requirements: 25.1-25.4_
  
  - [ ]* 36.6 Write property test for saved views
    - **Property 26: Saved View Persistence**
    - **Validates: Requirements 25.1-25.4_
  
  - [ ] 36.7 Implement project and user management endpoints
    - GET /api/v1/projects, POST /api/v1/projects, GET /api/v1/projects/:id, PUT /api/v1/projects/:id
    - GET /api/v1/users/me, PUT /api/v1/users/me, GET /api/v1/users
    - GET /api/v1/api-tokens, POST /api/v1/api-tokens, DELETE /api/v1/api-tokens/:id
    - _Requirements: 37.1-37.5_
  
  - [ ]* 36.8 Write property test for RBAC enforcement
    - **Property 37: Role-Based Access Control Enforcement**
    - **Validates: Requirements 42.1-42.7_

- [ ] 37. Implement REST API endpoints - AI agent support
  - [ ] 37.1 Implement implementation status endpoint
    - GET /api/v1/requirements/:id/implementation-status
    - Return requirement details, approval status, linked items with states, coverage status
    - Optimize for 500ms response time
    - _Requirements: 39.1-39.3_
  
  - [ ]* 37.2 Write property test for implementation status
    - **Property 34: Implementation Status Completeness**
    - **Validates: Requirements 39.1-39.3_
  
  - [ ] 37.3 Implement clarification request endpoint
    - POST /api/v1/requirements/:id/clarification-requests
    - Create comment with clarification flag
    - Assign to requirement owner
    - Send notification (console log for local dev)
    - _Requirements: 40.1-40.4_
  
  - [ ]* 37.4 Write property test for clarification requests
    - **Property 35: Clarification Request Creation**
    - **Validates: Requirements 40.1-40.4_
  
  - [ ] 37.5 Implement batch operation endpoints
    - POST /api/v1/requirements/batch (bulk fetch)
    - POST /api/v1/traceability-links/batch (bulk create links)
    - PUT /api/v1/requirements/batch (bulk update)
    - DELETE /api/v1/requirements/batch (bulk delete)
    - Implement atomic transaction handling
    - _Requirements: 41.1-41.4_
  
  - [ ]* 37.6 Write property test for batch operations
    - **Property 36: Batch Operation Atomicity**
    - **Validates: Requirements 41.1-41.4_

- [ ] 38. Connect frontend to real API - Admin and settings
  - [ ] 38.1 Replace mock data with API calls in project management
    - Update project list to fetch from API
    - Update project create/edit to POST/PUT to API
    - _Requirements: 2.1-2.3_
  
  - [ ] 38.2 Replace mock data with API calls in user management
    - Update user list to fetch from API
    - Update role assignment to PUT to API
    - _Requirements: 42.1-42.7_
  
  - [ ] 38.3 Replace mock data with API calls in API token management
    - Update token list to fetch from API
    - Update token creation to POST to API
    - Update token revocation to DELETE to API
    - _Requirements: 37.1-37.5_

- [ ] 39. Implement notification and webhook services
  - [ ] 39.1 Create NotificationService
    - Implement stakeholder identification logic
    - Implement console logging for local development (mock email)
    - Create notification preference handling
    - _Requirements: 22.1-22.4_
  
  - [ ] 39.2 Create WebhookService
    - Implement webhook subscription management
    - Implement webhook delivery with retry logic
    - Implement webhook logging
    - _Requirements: 38.1-38.5_
  
  - [ ] 39.3 Integrate notifications with requirement changes
    - Trigger notifications on status changes
    - Trigger webhooks on requirement changes
    - _Requirements: 22.1-22.4, 38.1-38.5_
  
  - [ ] 39.4 Connect frontend notification preferences to API
    - Update notification preferences page to fetch/update via API
    - Update webhook subscriptions to fetch/update via API
    - _Requirements: 22.1-22.4, 38.1-38.5_

- [ ] 40. Implement optional external integrations (mocked for local dev)
  - [ ] 40.1 Create mock Jira integration
    - Create mock Jira issue storage
    - Implement mock link creation to Jira issues
    - Implement mock status synchronization
    - _Requirements: 50.1-50.5_
  
  - [ ] 40.2 Create mock GitHub integration
    - Create mock GitHub issue/PR storage
    - Implement mock link creation to GitHub items
    - Implement mock status synchronization
    - _Requirements: 51.1-51.5_
  
  - [ ] 40.3 Create mock Linear integration
    - Create mock Linear issue storage
    - Implement mock link creation to Linear issues
    - Implement mock status synchronization
    - _Requirements: 52.1-52.4_
  
  - [ ]* 40.4 Write property test for external integration sync
    - **Property 38: External Integration Link Synchronization**
    - **Validates: Requirements 50.1-50.5, 51.1-51.5, 52.1-52.4_

- [ ] 41. Implement compliance reporting
  - [ ] 41.1 Create ComplianceReportService
    - Implement gap report generation (requirements without approval, without tests, with failing tests, changed since baseline)
    - Implement traceability matrix generation with coverage status
    - _Requirements: 53.1-53.5_
  
  - [ ]* 41.2 Write property test for compliance gap reports
    - **Property 39: Compliance Gap Report Accuracy**
    - **Validates: Requirements 53.1-53.5_
  
  - [ ] 41.3 Connect frontend compliance reports to API
    - Update compliance gap report page to fetch from API
    - _Requirements: 53.1-53.5_

- [ ] 42. Checkpoint - All features implemented and integrated
  - Test all import/export functionality via UI
  - Test admin features (projects, users, tokens)
  - Test notifications and webhooks
  - Test compliance reporting
  - Verify all backend services are complete
  - Ensure all tests pass, ask the user if questions arise


## PHASE 6: Polish, Testing & Deployment

This phase focuses on final polish, comprehensive testing, documentation, and deployment readiness.

- [ ] 43. Create Docker Compose configuration
  - [ ] 43.1 Update Dockerfile for backend (if needed)
    - Ensure multi-stage build for production
    - Verify development Dockerfile with hot reload works
    - _Requirements: All (deployment)_
  
  - [ ] 43.2 Update Dockerfile for frontend (if needed)
    - Ensure multi-stage build for production
    - Verify development Dockerfile with hot reload works
    - _Requirements: All (deployment)_
  
  - [ ] 43.3 Update docker-compose.yml (if needed)
    - Verify PostgreSQL service with health check
    - Verify backend API service with volume mounts
    - Verify frontend service with volume mounts
    - Verify environment variables are configured
    - Verify networking between services
    - _Requirements: All (deployment)_
  
  - [ ] 43.4 Create database seed data script
    - Create seed data script with sample requirements, links, baselines
    - Make it easy to reset to demo state
    - _Requirements: All (deployment)_

- [ ] 44. Write comprehensive documentation
  - [ ] 44.1 Update README.md
    - Quick start guide with docker-compose up
    - Prerequisites and installation instructions
    - Environment variable documentation
    - Troubleshooting section
    - _Requirements: All (documentation)_
  
  - [ ] 44.2 Create API documentation
    - Generate OpenAPI 3.x specification
    - Document all endpoints with examples
    - Document authentication and authorization
    - _Requirements: 34.1-34.8, 36.1-36.4_
  
  - [ ] 44.3 Create developer guide
    - Architecture overview
    - Database schema documentation
    - Service layer documentation
    - Frontend component documentation
    - Testing guide
    - _Requirements: All (documentation)_
  
  - [ ] 44.4 Create user guide
    - Feature walkthroughs with screenshots
    - Common workflows
    - Best practices
    - _Requirements: All (documentation)_

- [ ] 45. Implement end-to-end tests
  - [ ] 45.1 Set up Playwright for E2E testing
    - Configure Playwright
    - Create test fixtures and helpers
    - _Requirements: All (testing)_
  
  - [ ] 45.2 Write E2E tests for core workflows
    - Test: Create requirement → add link → generate matrix
    - Test: Import CSV → validate → create requirements
    - Test: Create baseline → lock → compare with current
    - Test: Approve requirement → capture signature → verify audit trail
    - _Requirements: All (testing)_
  
  - [ ]* 45.3 Write E2E tests for search and filter
    - Test search functionality
    - Test filter combinations
    - Test saved views
    - _Requirements: 23.1-23.4, 24.1-24.8, 25.1-25.4_

- [ ] 46. Implement performance optimizations
  - [ ] 46.1 Add database query optimization
    - Review and optimize slow queries
    - Add missing indexes
    - Implement query result caching with in-memory Map
    - _Requirements: All (performance)_
  
  - [ ] 46.2 Add API response caching
    - Implement ETag headers for conditional requests
    - Cache frequently accessed data
    - Implement cache invalidation on writes
    - _Requirements: All (performance)_
  
  - [ ] 46.3 Optimize frontend performance
    - Implement React.memo for expensive components
    - Use virtual scrolling for large lists
    - Lazy load routes and components
    - Optimize bundle size
    - _Requirements: All (performance)_
  
  - [ ]* 46.4 Run performance tests
    - Test traceability matrix generation for 2000 requirements (target: <10 seconds)
    - Test implementation status endpoint (target: <500ms)
    - Test requirement list load for 10,000 requirements (target: <2 seconds)
    - _Requirements: 11.3, 39.3_

- [ ] 47. Implement security hardening
  - [ ] 47.1 Add security headers
    - Implement Helmet.js for Express
    - Add CORS configuration
    - Add rate limiting middleware
    - _Requirements: All (security)_
  
  - [ ] 47.2 Implement input validation and sanitization
    - Validate all API inputs
    - Sanitize user-provided HTML in rich text fields
    - Prevent SQL injection with parameterized queries
    - _Requirements: All (security)_
  
  - [ ] 47.3 Add CSRF protection
    - Implement CSRF tokens for state-changing operations
    - _Requirements: All (security)_
  
  - [ ]* 47.4 Run security tests
    - Test authentication bypass attempts
    - Test authorization boundary violations
    - Test SQL injection attempts
    - Test XSS attempts
    - _Requirements: All (security)_

- [ ] 48. Final integration and testing
  - [ ] 48.1 Run all unit tests
    - Ensure 80%+ code coverage
    - Fix any failing tests
    - _Requirements: All (testing)_
  
  - [ ] 48.2 Run all property-based tests
    - Verify all 39 correctness properties pass
    - Run with minimum 100 iterations per property
    - _Requirements: All (testing)_
  
  - [ ] 48.3 Run all integration tests
    - Test all API endpoints
    - Test database operations
    - Test external integrations (mocked)
    - _Requirements: All (testing)_
  
  - [ ] 48.4 Run all E2E tests
    - Test complete user workflows
    - Test across different browsers
    - _Requirements: All (testing)_
  
  - [ ] 48.5 Perform manual testing
    - Test UI/UX flows
    - Test edge cases
    - Test error handling
    - _Requirements: All (testing)_

- [ ] 49. Final checkpoint - System ready for use
  - Verify all features are implemented and working
  - Ensure all tests pass
  - Verify documentation is complete
  - Confirm system can be started with single docker-compose command
  - Ask the user if questions arise or if any adjustments are needed

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties from the design document
- Unit tests and integration tests validate specific examples and edge cases
- The implementation uses TypeScript for both frontend (React) and backend (Node.js/Express)
- PostgreSQL is used for all data storage with Docker Compose for local development
- External integrations (Jira, GitHub, Linear) are mocked for local development
- The system is designed to run entirely on a developer's laptop with minimal setup

## Implementation Approach Summary

The restructured plan follows an **iterative, UI-first approach** with 6 phases:

1. **Phase 1 (Tasks 9-21)**: Build complete frontend with mock data - enables early UX testing in ~1 week
2. **Phase 2 (Tasks 22-25)**: Implement core requirements API and connect frontend - working CRUD in ~2 weeks
3. **Phase 3 (Tasks 26-28)**: Add traceability features and graph operations - full traceability in ~1-2 weeks
4. **Phase 4 (Tasks 29-32)**: Implement workflows, baselines, and history - compliance features in ~1-2 weeks
5. **Phase 5 (Tasks 33-42)**: Add import/export, admin features, and integrations - complete feature set in ~2 weeks
6. **Phase 6 (Tasks 43-49)**: Polish, testing, documentation, and deployment - production-ready in ~1 week

**Key Benefits:**
- UI testable after Phase 1 (instead of waiting 6-8 weeks)
- Frontend and backend can be developed in parallel
- Early user feedback on UX and workflows
- Incremental delivery of working features
- Each phase delivers testable, demonstrable functionality
    - Implement ReqIF XML parser
    - Map ReqIF SpecObjects to Requirements
    - Map ReqIF SpecRelations to TraceabilityLinks
    - Preserve hierarchy from ReqIF SpecHierarchy
    - _Requirements: 28.1-28.5_
  
  - [ ]* 16.4 Write property test for ReqIF import
    - **Property 29: ReqIF Import Structure Preservation**
    - **Validates: Requirements 28.1-28.5**
  
  - [x] 16.5 Create Word import service
    - Implement Word document parser using Open XML SDK or mammoth.js
    - Parse heading levels to create hierarchy
    - Parse tables for structured attributes
    - Create requirements from parsed content
    - _Requirements: 29.1-29.5_
  
  - [ ]* 16.6 Write property test for Word import
    - **Property 30: Word Import Structure Preservation**
    - **Validates: Requirements 29.1-29.5**
  
  - [x] 16.7 Implement import API endpoints
    - POST /api/v1/import/csv
    - POST /api/v1/import/reqif
    - POST /api/v1/import/word
    - GET /api/v1/import/jobs/:id (job status)
    - Handle multipart file uploads
    - _Requirements: 27.1-27.5, 28.1-28.5, 29.1-29.5_

- [ ] 17. Implement export services
  - [ ] 17.1 Create CSV export service
    - Implement CSV generation with configurable fields
    - Include all requirement fields and custom fields
    - _Requirements: 30.1-30.3_
  
  - [ ] 17.2 Create JSON export service
    - Implement JSON serialization with stable schema
    - Include requirements and traceability links
    - Version the schema
    - _Requirements: 31.1-31.3_
  
  - [ ]* 17.3 Write property test for JSON export round-trip
    - **Property 12: Export Format Round-Trip**
    - **Validates: Requirements 31.1-31.3, 33.1-33.3**
  
  - [ ] 17.4 Create PDF export service
    - Implement HTML template rendering
    - Use Puppeteer or similar for HTML to PDF conversion
    - Include project metadata in exports
    - _Requirements: 32.1-32.3_
  
  - [ ]* 17.5 Write property test for export content completeness
    - **Property 13: Export Content Completeness**
    - **Validates: Requirements 11.1-11.2, 11.4, 30.1-30.3, 32.1-32.3**
  
  - [ ] 17.6 Create ReqIF export service
    - Map Requirements to ReqIF SpecObjects
    - Map TraceabilityLinks to ReqIF SpecRelations
    - Preserve hierarchy in ReqIF SpecHierarchy
    - Generate ReqIF XML
    - _Requirements: 33.1-33.3_
  
  - [ ] 17.7 Implement export API endpoints
    - GET /api/v1/export/csv
    - GET /api/v1/export/json
    - GET /api/v1/export/pdf
    - GET /api/v1/export/reqif
    - Return file downloads with appropriate content types
    - _Requirements: 30.1-30.3, 31.1-31.3, 32.1-32.3, 33.1-33.3_

- [ ] 18. Implement notification and webhook services
  - [ ] 18.1 Create NotificationService
    - Implement stakeholder identification logic
    - Implement console logging for local development (mock email)
    - Create notification preference handling
    - _Requirements: 22.1-22.4_
  
  - [ ] 18.2 Create WebhookService
    - Implement webhook subscription management
    - Implement webhook delivery with retry logic
    - Implement webhook logging
    - _Requirements: 38.1-38.5_
  
  - [ ] 18.3 Integrate notifications with requirement changes
    - Trigger notifications on status changes
    - Trigger webhooks on requirement changes
    - _Requirements: 22.1-22.4, 38.1-38.5_

- [ ] 19. Implement additional backend features
  - [ ] 19.1 Implement hierarchical requirement operations
    - Create service methods for reordering requirements
    - Implement parent-child relationship validation (no cycles)
    - _Requirements: 3.1-3.3_
  
  - [ ]* 19.2 Write property test for hierarchical structure
    - **Property 5: Hierarchical Tree Structure Invariant**
    - **Validates: Requirements 3.1-3.2**
  
  - [ ] 19.3 Implement requirement templates
    - Create template storage and retrieval
    - Implement template application logic
    - _Requirements: 7.1-7.3_
  
  - [ ]* 19.4 Write property test for template field pre-population
    - **Property 8: Template Field Pre-Population**
    - **Validates: Requirements 7.1-7.3**
  
  - [ ] 19.5 Implement saved views
    - Create saved view storage (filter and sort configurations)
    - Implement view sharing logic
    - _Requirements: 25.1-25.4_
  
  - [ ]* 19.6 Write property test for saved views
    - **Property 26: Saved View Persistence**
    - **Validates: Requirements 25.1-25.4**
  
  - [ ] 19.7 Implement project and user management endpoints
    - GET /api/v1/projects, POST /api/v1/projects, GET /api/v1/projects/:id, PUT /api/v1/projects/:id
    - GET /api/v1/users/me, PUT /api/v1/users/me, GET /api/v1/users
    - GET /api/v1/api-tokens, POST /api/v1/api-tokens, DELETE /api/v1/api-tokens/:id
    - _Requirements: 37.1-37.5_
  
  - [ ]* 19.8 Write property test for RBAC enforcement
    - **Property 37: Role-Based Access Control Enforcement**
    - **Validates: Requirements 42.1-42.7**

- [ ] 20. Implement optional external integrations (mocked for local dev)
  - [ ] 20.1 Create mock Jira integration
    - Create mock Jira issue storage
    - Implement mock link creation to Jira issues
    - Implement mock status synchronization
    - _Requirements: 50.1-50.5_
  
  - [ ] 20.2 Create mock GitHub integration
    - Create mock GitHub issue/PR storage
    - Implement mock link creation to GitHub items
    - Implement mock status synchronization
    - _Requirements: 51.1-51.5_
  
  - [ ] 20.3 Create mock Linear integration
    - Create mock Linear issue storage
    - Implement mock link creation to Linear issues
    - Implement mock status synchronization
    - _Requirements: 52.1-52.4_
  
  - [ ]* 20.4 Write property test for external integration sync
    - **Property 38: External Integration Link Synchronization**
    - **Validates: Requirements 50.1-50.5, 51.1-51.5, 52.1-52.4**

- [ ] 21. Implement compliance reporting
  - [ ] 21.1 Create ComplianceReportService
    - Implement gap report generation (requirements without approval, without tests, with failing tests, changed since baseline)
    - Implement traceability matrix generation with coverage status
    - _Requirements: 53.1-53.5_
  
  - [ ]* 21.2 Write property test for compliance gap reports
    - **Property 39: Compliance Gap Report Accuracy**
    - **Validates: Requirements 53.1-53.5**

- [ ] 22. Checkpoint - Ensure all backend services are complete
  - Run all unit tests, integration tests, and property tests
  - Verify all API endpoints work correctly
  - Test import/export functionality
  - Ensure all tests pass, ask the user if questions arise


- [ ] 23. Set up React frontend project structure
  - [ ] 23.1 Create React app with TypeScript
    - Initialize React project with Create React App or Vite
    - Configure TypeScript
    - Set up React Router for navigation
    - Configure Axios for API calls
    - _Requirements: All (frontend foundation)_
  
  - [ ] 23.2 Create shared UI components
    - Create Button, Input, Select, Textarea, Modal, Dropdown components
    - Create Table component with sorting and pagination
    - Create Loading spinner and error message components
    - Set up CSS/styling framework (Tailwind CSS or similar)
    - _Requirements: All (UI foundation)_
  
  - [ ] 23.3 Create authentication context and hooks
    - Create AuthContext for managing user session
    - Create useAuth hook
    - Implement login/logout functionality
    - Store JWT token in localStorage
    - _Requirements: 37.1-37.5_
  
  - [ ] 23.4 Create API client service
    - Create axios instance with base URL and interceptors
    - Add authentication token to requests
    - Handle API errors globally
    - _Requirements: 34.1-34.8_

- [ ] 24. Implement frontend - Requirement list and detail views
  - [ ] 24.1 Create requirement list page
    - Display requirements in a table with columns: Display ID, Title, Type, Status, Priority
    - Implement pagination
    - Implement sorting by columns
    - Add "Create Requirement" button
    - _Requirements: 1.1-1.12, 34.3_
  
  - [ ] 24.2 Create requirement detail page
    - Display all requirement fields
    - Show requirement hierarchy (parent and children)
    - Display comments section
    - Display attachments section
    - Display traceability links section
    - Add "Edit" and "Delete" buttons
    - _Requirements: 1.1-1.12, 3.1-3.3, 6.1-6.4, 5.1-5.3, 8.1-8.7_
  
  - [ ] 24.3 Create requirement create/edit form
    - Form fields for title, description (rich text editor), type, status, priority, tags, custom fields
    - Implement form validation
    - Submit to API on save
    - _Requirements: 1.1-1.12, 2.1-2.3, 4.1-4.3_
  
  - [ ] 24.4 Implement hierarchical tree view
    - Create tree component for requirement hierarchy
    - Support drag-and-drop reordering
    - Expand/collapse nodes
    - _Requirements: 3.1-3.3_

- [ ] 25. Implement frontend - Search, filter, and saved views
  - [ ] 25.1 Create search bar component
    - Full-text search input
    - Display search results with highlighting
    - _Requirements: 23.1-23.4_
  
  - [ ] 25.2 Create filter panel
    - Filter controls for status, type, priority, tags, assignee, custom fields, coverage status
    - Support multiple filter combinations
    - Apply filters to requirement list
    - _Requirements: 24.1-24.8_
  
  - [ ] 25.3 Create saved views feature
    - "Save View" button to save current filters and sort
    - Display list of saved views
    - Load saved view on click
    - Share view with team members
    - _Requirements: 25.1-25.4_

- [ ] 26. Implement frontend - Traceability features
  - [ ] 26.1 Create traceability link creation UI
    - "Add Link" button on requirement detail page
    - Modal to select target requirement or external item
    - Select link type dropdown
    - _Requirements: 8.1-8.7_
  
  - [ ] 26.2 Create traceability matrix view
    - Display matrix with requirements as rows and test cases as columns
    - Color-code cells by coverage status (Passed, Failed, Not Run, No Test)
    - Support filtering and export
    - _Requirements: 9.1-9.2_
  
  - [ ] 26.3 Create dependency graph visualization
    - Use D3.js or similar library for graph rendering
    - Display requirements as nodes and links as edges
    - Support zoom, pan, and node selection
    - Click node to navigate to requirement detail
    - _Requirements: 26.1-26.4_
  
  - [ ] 26.4 Create impact analysis view
    - Display impact tree when requirement is selected
    - Show all downstream requirements and external items
    - Highlight affected items
    - _Requirements: 12.1-12.4_
  
  - [ ] 26.5 Create orphaned requirements view
    - Display list of orphaned requirements
    - Support filtering and sorting
    - _Requirements: 10.1-10.3_

- [ ] 27. Implement frontend - Comments and attachments
  - [ ] 27.1 Create comment component
    - Display comments in chronological order
    - Support threaded replies
    - Add comment form
    - Mark comments as clarification requests
    - Resolve comments
    - _Requirements: 6.1-6.4, 40.1-40.4_
  
  - [ ] 27.2 Create attachment upload component
    - File upload button with drag-and-drop support
    - Display list of attachments with download links
    - Delete attachment button
    - _Requirements: 5.1-5.3_

- [ ] 28. Implement frontend - Baselines and history
  - [ ] 28.1 Create baseline management page
    - Display list of baselines
    - "Create Baseline" button with name and description form
    - "Lock Baseline" button for unlocked baselines
    - _Requirements: 16.1-16.5_
  
  - [ ] 28.2 Create baseline comparison view
    - Select two baselines or baseline vs current
    - Display diff view with added, modified, deleted requirements
    - Highlight field-level changes
    - _Requirements: 17.1-17.4_
  
  - [ ] 28.3 Create revision history view
    - Display all versions of a requirement
    - Show changes between versions
    - "Restore" button to revert to previous version
    - _Requirements: 15.1-15.3_

- [ ] 29. Implement frontend - Workflows and approvals
  - [ ] 29.1 Create approval workflow UI
    - Display current workflow state on requirement detail page
    - "Approve", "Request Changes", "Reject" buttons based on user role
    - Electronic signature capture modal
    - _Requirements: 19.1-19.4, 20.1-20.6, 21.1-21.5_
  
  - [ ] 29.2 Create workflow configuration page (admin only)
    - Define workflow states
    - Define transitions between states
    - Assign reviewers to states
    - _Requirements: 19.1-19.4_

- [ ] 30. Implement frontend - Import/Export
  - [ ] 30.1 Create import page
    - File upload for CSV, ReqIF, Word
    - Field mapping interface for CSV
    - Display validation errors
    - Show import progress and results
    - _Requirements: 27.1-27.5, 28.1-28.5, 29.1-29.5_
  
  - [ ] 30.2 Create export functionality
    - "Export" button on requirement list page
    - Select export format (CSV, JSON, PDF, ReqIF)
    - Select fields to include
    - Download exported file
    - _Requirements: 30.1-30.3, 31.1-31.3, 32.1-32.3, 33.1-33.3, 11.1-11.2, 11.4_

- [ ] 31. Implement frontend - Admin and settings
  - [ ] 31.1 Create project management page
    - List projects
    - Create/edit project form
    - Configure custom fields per project
    - _Requirements: 2.1-2.3_
  
  - [ ] 31.2 Create user management page (admin only)
    - List users
    - Assign roles
    - _Requirements: 42.1-42.7_
  
  - [ ] 31.3 Create API token management page
    - List user's API tokens
    - Create new token with scopes and expiration
    - Revoke token
    - Display token value only once on creation
    - _Requirements: 37.1-37.5_
  
  - [ ] 31.4 Create notification preferences page
    - Configure email notification preferences
    - Configure webhook subscriptions
    - _Requirements: 22.1-22.4, 38.1-38.5_

- [ ] 32. Implement frontend - Requirement templates
  - [ ] 32.1 Create template management page
    - List requirement templates
    - Create/edit template form
    - _Requirements: 7.1-7.3_
  
  - [ ] 32.2 Add "Create from Template" option
    - Template selection dropdown on requirement creation
    - Pre-populate fields from selected template
    - _Requirements: 7.1-7.3_

- [ ] 33. Implement frontend - Audit trail and compliance
  - [ ] 33.1 Create audit trail page
    - Display audit entries with filtering
    - Filter by entity type, entity ID, actor, action, date range
    - _Requirements: 14.1-14.7_
  
  - [ ] 33.2 Create compliance gap report page
    - Display requirements without approval
    - Display requirements without test coverage
    - Display requirements with failing tests
    - Display requirements changed since last baseline
    - _Requirements: 53.1-53.5_

- [ ] 34. Polish frontend UI/UX
  - [ ] 34.1 Add loading states and error handling
    - Show loading spinners during API calls
    - Display user-friendly error messages
    - Implement retry logic for failed requests
    - _Requirements: All_
  
  - [ ] 34.2 Implement responsive design
    - Ensure UI works on desktop and tablet
    - Adjust layouts for different screen sizes
    - _Requirements: All_
  
  - [ ] 34.3 Add keyboard shortcuts and accessibility
    - Implement common keyboard shortcuts (Ctrl+S to save, etc.)
    - Ensure ARIA labels and roles are correct
    - Test with screen readers
    - _Requirements: All_
  
  - [ ] 34.4 Add user feedback mechanisms
    - Toast notifications for success/error messages
    - Confirmation dialogs for destructive actions
    - _Requirements: All_

- [ ] 35. Checkpoint - Ensure frontend is fully functional
  - Test all UI components and pages
  - Verify integration with backend API
  - Test user workflows end-to-end
  - Ensure all tests pass, ask the user if questions arise


- [ ] 36. Create Docker Compose configuration
  - [ ] 36.1 Create Dockerfile for backend
    - Multi-stage build for production
    - Development Dockerfile with hot reload
    - _Requirements: All (deployment)_
  
  - [ ] 36.2 Create Dockerfile for frontend
    - Multi-stage build for production
    - Development Dockerfile with hot reload
    - _Requirements: All (deployment)_
  
  - [ ] 36.3 Create docker-compose.yml
    - PostgreSQL service with health check
    - Backend API service with volume mounts for development
    - Frontend service with volume mounts for development
    - Configure environment variables
    - Set up networking between services
    - _Requirements: All (deployment)_
  
  - [ ] 36.4 Create database initialization scripts
    - Create seed data script with sample requirements, links, baselines
    - Create migration runner script
    - _Requirements: All (deployment)_

- [ ] 37. Write comprehensive documentation
  - [ ] 37.1 Create README.md
    - Quick start guide with docker-compose up
    - Prerequisites and installation instructions
    - Environment variable documentation
    - Troubleshooting section
    - _Requirements: All (documentation)_
  
  - [ ] 37.2 Create API documentation
    - Generate OpenAPI 3.x specification
    - Document all endpoints with examples
    - Document authentication and authorization
    - _Requirements: 34.1-34.8, 36.1-36.4_
  
  - [ ] 37.3 Create developer guide
    - Architecture overview
    - Database schema documentation
    - Service layer documentation
    - Frontend component documentation
    - Testing guide
    - _Requirements: All (documentation)_
  
  - [ ] 37.4 Create user guide
    - Feature walkthroughs with screenshots
    - Common workflows
    - Best practices
    - _Requirements: All (documentation)_

- [ ] 38. Implement end-to-end tests
  - [ ] 38.1 Set up Playwright for E2E testing
    - Configure Playwright
    - Create test fixtures and helpers
    - _Requirements: All (testing)_
  
  - [ ] 38.2 Write E2E tests for core workflows
    - Test: Create requirement → add link → generate matrix
    - Test: Import CSV → validate → create requirements
    - Test: Create baseline → lock → compare with current
    - Test: Approve requirement → capture signature → verify audit trail
    - _Requirements: All (testing)_
  
  - [ ]* 38.3 Write E2E tests for search and filter
    - Test search functionality
    - Test filter combinations
    - Test saved views
    - _Requirements: 23.1-23.4, 24.1-24.8, 25.1-25.4_

- [ ] 39. Implement performance optimizations
  - [ ] 39.1 Add database query optimization
    - Review and optimize slow queries
    - Add missing indexes
    - Implement query result caching with in-memory Map
    - _Requirements: All (performance)_
  
  - [ ] 39.2 Add API response caching
    - Implement ETag headers for conditional requests
    - Cache frequently accessed data
    - Implement cache invalidation on writes
    - _Requirements: All (performance)_
  
  - [ ] 39.3 Optimize frontend performance
    - Implement React.memo for expensive components
    - Use virtual scrolling for large lists
    - Lazy load routes and components
    - Optimize bundle size
    - _Requirements: All (performance)_
  
  - [ ]* 39.4 Run performance tests
    - Test traceability matrix generation for 2000 requirements (target: <10 seconds)
    - Test implementation status endpoint (target: <500ms)
    - Test requirement list load for 10,000 requirements (target: <2 seconds)
    - _Requirements: 11.3, 39.3_

- [ ] 40. Implement security hardening
  - [ ] 40.1 Add security headers
    - Implement Helmet.js for Express
    - Add CORS configuration
    - Add rate limiting middleware
    - _Requirements: All (security)_
  
  - [ ] 40.2 Implement input validation and sanitization
    - Validate all API inputs
    - Sanitize user-provided HTML in rich text fields
    - Prevent SQL injection with parameterized queries
    - _Requirements: All (security)_
  
  - [ ] 40.3 Add CSRF protection
    - Implement CSRF tokens for state-changing operations
    - _Requirements: All (security)_
  
  - [ ]* 40.4 Run security tests
    - Test authentication bypass attempts
    - Test authorization boundary violations
    - Test SQL injection attempts
    - Test XSS attempts
    - _Requirements: All (security)_

- [ ] 41. Final integration and testing
  - [ ] 41.1 Run all unit tests
    - Ensure 80%+ code coverage
    - Fix any failing tests
    - _Requirements: All (testing)_
  
  - [ ] 41.2 Run all property-based tests
    - Verify all 39 correctness properties pass
    - Run with minimum 100 iterations per property
    - _Requirements: All (testing)_
  
  - [ ] 41.3 Run all integration tests
    - Test all API endpoints
    - Test database operations
    - Test external integrations (mocked)
    - _Requirements: All (testing)_
  
  - [ ] 41.4 Run all E2E tests
    - Test complete user workflows
    - Test across different browsers
    - _Requirements: All (testing)_
  
  - [ ] 41.5 Perform manual testing
    - Test UI/UX flows
    - Test edge cases
    - Test error handling
    - _Requirements: All (testing)_

- [ ] 42. Final checkpoint - System ready for use
  - Verify all features are implemented and working
  - Ensure all tests pass
  - Verify documentation is complete
  - Confirm system can be started with single docker-compose command
  - Ask the user if questions arise or if any adjustments are needed

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties from the design document
- Unit tests and integration tests validate specific examples and edge cases
- The implementation uses TypeScript for both frontend (React) and backend (Node.js/Express)
- PostgreSQL is used for all data storage with Docker Compose for local development
- External integrations (Jira, GitHub, Linear) are mocked for local development
- The system is designed to run entirely on a developer's laptop with minimal setup
