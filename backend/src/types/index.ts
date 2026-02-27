// Core type definitions for the RMT system

export type RequirementType =
  | 'stakeholder_need'
  | 'system_requirement'
  | 'software_requirement'
  | 'hardware_requirement'
  | 'constraint'
  | 'interface_requirement';

export type RequirementStatus = 'draft' | 'in_review' | 'approved' | 'deprecated';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type LinkType =
  | 'derives_from'
  | 'refines'
  | 'satisfies'
  | 'verified_by'
  | 'conflicts_with'
  | 'relates_to';

export type CoverageStatus = 'passed' | 'failed' | 'not_run' | 'no_test';

export type UserRole = 'viewer' | 'author' | 'reviewer' | 'approver' | 'administrator';

export type ActorType = 'user' | 'api_client' | 'system';

export type ExternalSystem = 'jira' | 'github' | 'linear';

// Core interfaces will be added in subsequent tasks
export interface Requirement {
  id: string;
  displayId: string;
  projectId: string;
  parentId: string | null;
  title: string;
  description: string;
  type: RequirementType;
  status: RequirementStatus;
  priority: Priority;
  version: number;
  tags: string[];
  customFields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface TraceabilityLink {
  id: string;
  sourceId: string;
  targetId: string;
  targetType: 'requirement' | 'external';
  linkType: LinkType;
  externalSystem?: ExternalSystem;
  externalId?: string;
  externalMetadata?: {
    title: string;
    status: string;
    url: string;
    lastSyncedAt: Date;
  };
  createdAt: Date;
  createdBy: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  customFieldDefinitions: CustomFieldDefinition[];
  approvalWorkflow: ApprovalWorkflow | null;
  createdAt: Date;
  createdBy: string;
}

export interface CustomFieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'enum';
  required: boolean;
  enumValues?: string[];
}

export interface ApprovalWorkflow {
  states: WorkflowState[];
  transitions: WorkflowTransition[];
}

export interface WorkflowState {
  id: string;
  name: string;
  requiresApproval: boolean;
  reviewerRoles: string[];
}

export interface WorkflowTransition {
  fromState: string;
  toState: string;
  action: 'approve' | 'request_changes' | 'reject';
  requiresSignature: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  actorId: string;
  actorType: ActorType;
  entityType: 'requirement' | 'traceability_link' | 'baseline' | 'comment';
  entityId: string;
  action: string;
  changeDescription: string;
  previousValue: any | null;
  newValue: any | null;
}

export interface Baseline {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  locked: boolean;
  lockedAt: Date | null;
  lockedBy: string | null;
  snapshotData: string | any; // Can be string or object depending on how it's retrieved
  createdAt: Date;
  createdBy: string;
}

export interface Comment {
  id: string;
  requirementId: string;
  parentCommentId: string | null;
  content: string;
  authorId: string;
  isClarificationRequest: boolean;
  assignedTo: string | null;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  id: string;
  requirementId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface ElectronicSignature {
  id: string;
  requirementId: string;
  userId: string;
  signatureMeaning: string;
  timestamp: Date;
  signatureHash: string;
}

export interface ApiToken {
  id: string;
  userId: string;
  name: string;
  tokenHash: string;
  scopes: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}
