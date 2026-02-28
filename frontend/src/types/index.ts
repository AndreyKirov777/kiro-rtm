// Core data types matching backend models

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
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  coverageStatus?: CoverageStatus;
  isOrphaned?: boolean;
}

export interface TraceabilityLink {
  id: string;
  sourceId: string;
  targetId: string;
  targetType: 'requirement' | 'external';
  linkType: LinkType;
  externalSystem?: 'jira' | 'github' | 'linear';
  externalId?: string;
  externalMetadata?: {
    title: string;
    status: string;
    url: string;
    lastSyncedAt: string;
  };
  createdAt: string;
  createdBy: string;
}

export interface Baseline {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  locked: boolean;
  lockedAt: string | null;
  lockedBy: string | null;
  snapshotData: string;
  createdAt: string;
  createdBy: string;
}

export interface Comment {
  id: string;
  requirementId: string;
  parentCommentId: string | null;
  content: string;
  authorId: string;
  authorName: string;
  isClarificationRequest: boolean;
  assignedTo: string | null;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  requirementId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  createdBy: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'viewer' | 'author' | 'reviewer' | 'approver' | 'administrator';
  createdAt: string;
  lastLoginAt: string;
}

export interface RequirementVersion {
  version: number;
  requirement: Requirement;
  changedFields: string[];
  changedBy: string;
  changedAt: string;
}

export interface BaselineComparison {
  added: Requirement[];
  modified: Array<{
    baseline: Requirement;
    current: Requirement;
    changedFields: string[];
  }>;
  deleted: Requirement[];
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

export interface ApprovalWorkflow {
  states: WorkflowState[];
  transitions: WorkflowTransition[];
}

export interface ElectronicSignature {
  id: string;
  requirementId: string;
  userId: string;
  userName: string;
  signatureMeaning: string;
  timestamp: string;
  signatureHash: string;
}

export interface ApiToken {
  id: string;
  userId: string;
  name: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  notifyOnStatusChange: boolean;
  notifyOnComments: boolean;
  notifyOnApproval: boolean;
}

export interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

export interface CustomFieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'enum';
  required: boolean;
  enumValues?: string[];
}

export interface RequirementTemplate {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  type: RequirementType;
  priority: Priority;
  tags: string[];
  customFields: Record<string, any>;
  titleTemplate: string;
  descriptionTemplate: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export type ActorType = 'user' | 'api_client' | 'system';

export type EntityType = 'requirement' | 'traceability_link' | 'baseline' | 'comment';

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorType: ActorType;
  entityType: EntityType;
  entityId: string;
  entityDisplayId?: string;
  action: string;
  changeDescription: string;
  previousValue: any | null;
  newValue: any | null;
}
