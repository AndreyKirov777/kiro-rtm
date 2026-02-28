import {
  Requirement,
  TraceabilityLink,
  Baseline,
  Comment,
  Attachment,
  Project,
  User,
} from '../types';

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'administrator',
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: new Date().toISOString(),
  },
  {
    id: 'user-2',
    email: 'author@example.com',
    name: 'John Author',
    role: 'author',
    createdAt: '2024-01-02T00:00:00Z',
    lastLoginAt: '2024-02-15T10:30:00Z',
  },
  {
    id: 'user-3',
    email: 'reviewer@example.com',
    name: 'Jane Reviewer',
    role: 'reviewer',
    createdAt: '2024-01-03T00:00:00Z',
    lastLoginAt: '2024-02-20T14:20:00Z',
  },
];

// Mock Projects
export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Medical Device Software',
    description: 'Requirements for FDA-regulated medical device',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
  },
  {
    id: 'proj-2',
    name: 'Aerospace Control System',
    description: 'DO-178C compliant flight control software',
    createdAt: '2024-01-15T00:00:00Z',
    createdBy: 'user-1',
  },
];

// Mock Requirements
export const mockRequirements: Requirement[] = [
  {
    id: 'req-1',
    displayId: 'REQ-001',
    projectId: 'proj-1',
    parentId: null,
    title: 'User Authentication System',
    description: 'The system shall provide secure user authentication with multi-factor support',
    type: 'system_requirement',
    status: 'approved',
    priority: 'critical',
    version: 2,
    tags: ['security', 'authentication'],
    customFields: { safetyLevel: 'high', regulatoryStandard: 'IEC 62304' },
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
    createdBy: 'user-2',
    updatedBy: 'user-2',
    coverageStatus: 'passed',
  },
  {
    id: 'req-2',
    displayId: 'REQ-002',
    projectId: 'proj-1',
    parentId: 'req-1',
    title: 'Password Complexity Requirements',
    description: 'Passwords must be at least 12 characters with uppercase, lowercase, numbers, and special characters',
    type: 'software_requirement',
    status: 'approved',
    priority: 'high',
    version: 1,
    tags: ['security', 'password'],
    customFields: {},
    createdAt: '2024-01-11T00:00:00Z',
    updatedAt: '2024-01-11T00:00:00Z',
    createdBy: 'user-2',
    updatedBy: 'user-2',
    coverageStatus: 'passed',
  },
  {
    id: 'req-3',
    displayId: 'REQ-003',
    projectId: 'proj-1',
    parentId: 'req-1',
    title: 'Multi-Factor Authentication',
    description: 'The system shall support TOTP-based two-factor authentication',
    type: 'software_requirement',
    status: 'in_review',
    priority: 'high',
    version: 1,
    tags: ['security', '2fa'],
    customFields: {},
    createdAt: '2024-01-12T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
    createdBy: 'user-2',
    updatedBy: 'user-2',
    coverageStatus: 'not_run',
  },
  {
    id: 'req-4',
    displayId: 'REQ-004',
    projectId: 'proj-1',
    parentId: null,
    title: 'Data Encryption at Rest',
    description: 'All sensitive data shall be encrypted using AES-256 encryption',
    type: 'system_requirement',
    status: 'approved',
    priority: 'critical',
    version: 1,
    tags: ['security', 'encryption'],
    customFields: { safetyLevel: 'high' },
    createdAt: '2024-01-13T00:00:00Z',
    updatedAt: '2024-01-13T00:00:00Z',
    createdBy: 'user-2',
    updatedBy: 'user-2',
    coverageStatus: 'passed',
  },
  {
    id: 'req-5',
    displayId: 'REQ-005',
    projectId: 'proj-1',
    parentId: null,
    title: 'Audit Trail Logging',
    description: 'The system shall maintain an immutable audit trail of all requirement changes',
    type: 'system_requirement',
    status: 'draft',
    priority: 'medium',
    version: 1,
    tags: ['compliance', 'audit'],
    customFields: {},
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
    createdBy: 'user-2',
    updatedBy: 'user-2',
    coverageStatus: 'no_test',
  },
];

// Mock Traceability Links
export const mockLinks: TraceabilityLink[] = [
  {
    id: 'link-1',
    sourceId: 'req-2',
    targetId: 'req-1',
    targetType: 'requirement',
    linkType: 'derives_from',
    createdAt: '2024-01-11T00:00:00Z',
    createdBy: 'user-2',
  },
  {
    id: 'link-2',
    sourceId: 'req-3',
    targetId: 'req-1',
    targetType: 'requirement',
    linkType: 'derives_from',
    createdAt: '2024-01-12T00:00:00Z',
    createdBy: 'user-2',
  },
  {
    id: 'link-3',
    sourceId: 'req-1',
    targetId: 'TEST-001',
    targetType: 'external',
    linkType: 'verified_by',
    externalSystem: 'jira',
    externalId: 'TEST-001',
    externalMetadata: {
      title: 'Authentication Integration Tests',
      status: 'Passed',
      url: 'https://jira.example.com/browse/TEST-001',
      lastSyncedAt: '2024-02-15T00:00:00Z',
    },
    createdAt: '2024-01-15T00:00:00Z',
    createdBy: 'user-3',
  },
];

// Mock Baselines
export const mockBaselines: Baseline[] = [
  {
    id: 'baseline-1',
    projectId: 'proj-1',
    name: 'Release 1.0',
    description: 'Initial release baseline',
    locked: true,
    lockedAt: '2024-01-20T00:00:00Z',
    lockedBy: 'user-1',
    snapshotData: JSON.stringify(mockRequirements.slice(0, 3)),
    createdAt: '2024-01-20T00:00:00Z',
    createdBy: 'user-1',
  },
  {
    id: 'baseline-2',
    projectId: 'proj-1',
    name: 'Release 1.1 (Draft)',
    description: 'Work in progress for next release',
    locked: false,
    lockedAt: null,
    lockedBy: null,
    snapshotData: JSON.stringify(mockRequirements),
    createdAt: '2024-02-01T00:00:00Z',
    createdBy: 'user-1',
  },
];

// Mock Comments
export const mockComments: Comment[] = [
  {
    id: 'comment-1',
    requirementId: 'req-3',
    parentCommentId: null,
    content: 'Should we also support hardware tokens like YubiKey?',
    authorId: 'user-3',
    authorName: 'Jane Reviewer',
    isClarificationRequest: true,
    assignedTo: 'user-2',
    resolved: false,
    createdAt: '2024-01-14T00:00:00Z',
    updatedAt: '2024-01-14T00:00:00Z',
  },
  {
    id: 'comment-2',
    requirementId: 'req-3',
    parentCommentId: 'comment-1',
    content: 'Good point. Let me add that to the requirement.',
    authorId: 'user-2',
    authorName: 'John Author',
    isClarificationRequest: false,
    assignedTo: null,
    resolved: false,
    createdAt: '2024-01-14T10:00:00Z',
    updatedAt: '2024-01-14T10:00:00Z',
  },
  {
    id: 'comment-3',
    requirementId: 'req-1',
    parentCommentId: null,
    content: 'This requirement looks good. Approved for implementation.',
    authorId: 'user-3',
    authorName: 'Jane Reviewer',
    isClarificationRequest: false,
    assignedTo: null,
    resolved: true,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
];

// Mock Attachments
export const mockAttachments: Attachment[] = [
  {
    id: 'attach-1',
    requirementId: 'req-1',
    filename: 'authentication-flow-diagram.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 245760,
    storagePath: '/uploads/auth-flow.pdf',
    uploadedBy: 'user-2',
    uploadedAt: '2024-01-10T12:00:00Z',
  },
  {
    id: 'attach-2',
    requirementId: 'req-1',
    filename: 'security-requirements.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 102400,
    storagePath: '/uploads/security-reqs.docx',
    uploadedBy: 'user-2',
    uploadedAt: '2024-01-11T09:30:00Z',
  },
  {
    id: 'attach-3',
    requirementId: 'req-4',
    filename: 'encryption-spec.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 512000,
    storagePath: '/uploads/encryption-spec.pdf',
    uploadedBy: 'user-2',
    uploadedAt: '2024-01-13T14:20:00Z',
  },
];

// Initialize mock data from localStorage or use defaults
export const initializeMockData = (): void => {
  if (!localStorage.getItem('mock_requirements')) {
    localStorage.setItem('mock_requirements', JSON.stringify(mockRequirements));
  }
  if (!localStorage.getItem('mock_links')) {
    localStorage.setItem('mock_links', JSON.stringify(mockLinks));
  }
  if (!localStorage.getItem('mock_baselines')) {
    localStorage.setItem('mock_baselines', JSON.stringify(mockBaselines));
  }
  if (!localStorage.getItem('mock_comments')) {
    localStorage.setItem('mock_comments', JSON.stringify(mockComments));
  }
  if (!localStorage.getItem('mock_attachments')) {
    localStorage.setItem('mock_attachments', JSON.stringify(mockAttachments));
  }
  if (!localStorage.getItem('mock_projects')) {
    localStorage.setItem('mock_projects', JSON.stringify(mockProjects));
  }
  if (!localStorage.getItem('mock_users')) {
    localStorage.setItem('mock_users', JSON.stringify(mockUsers));
  }
  if (!localStorage.getItem('mock_templates')) {
    localStorage.setItem('mock_templates', JSON.stringify(mockRequirementTemplates));
  }
  if (!localStorage.getItem('mock_audit_entries')) {
    localStorage.setItem('mock_audit_entries', JSON.stringify(mockAuditEntries));
  }
};

// Get mock data from localStorage
export const getMockRequirements = (): Requirement[] => {
  const data = localStorage.getItem('mock_requirements');
  return data ? JSON.parse(data) : mockRequirements;
};

export const getMockLinks = (): TraceabilityLink[] => {
  const data = localStorage.getItem('mock_links');
  return data ? JSON.parse(data) : mockLinks;
};

export const getMockBaselines = (): Baseline[] => {
  const data = localStorage.getItem('mock_baselines');
  return data ? JSON.parse(data) : mockBaselines;
};

export const getMockComments = (): Comment[] => {
  const data = localStorage.getItem('mock_comments');
  return data ? JSON.parse(data) : mockComments;
};

export const getMockAttachments = (): Attachment[] => {
  const data = localStorage.getItem('mock_attachments');
  return data ? JSON.parse(data) : mockAttachments;
};

export const getMockProjects = (): Project[] => {
  const data = localStorage.getItem('mock_projects');
  return data ? JSON.parse(data) : mockProjects;
};

export const getMockUsers = (): User[] => {
  const data = localStorage.getItem('mock_users');
  return data ? JSON.parse(data) : mockUsers;
};

// Save mock data to localStorage
export const saveMockRequirements = (requirements: Requirement[]): void => {
  localStorage.setItem('mock_requirements', JSON.stringify(requirements));
};

export const saveMockLinks = (links: TraceabilityLink[]): void => {
  localStorage.setItem('mock_links', JSON.stringify(links));
};

export const saveMockComments = (comments: Comment[]): void => {
  localStorage.setItem('mock_comments', JSON.stringify(comments));
};

export const saveMockAttachments = (attachments: Attachment[]): void => {
  localStorage.setItem('mock_attachments', JSON.stringify(attachments));
};

// Mock Requirement Revision History
export const mockRequirementHistory: Record<string, any[]> = {
  'req-1': [
    {
      version: 1,
      requirement: {
        ...mockRequirements[0],
        version: 1,
        status: 'draft',
        description: 'The system shall provide secure user authentication',
        updatedAt: '2024-01-10T00:00:00Z',
      },
      changedFields: [],
      changedBy: 'user-2',
      changedAt: '2024-01-10T00:00:00Z',
    },
    {
      version: 2,
      requirement: mockRequirements[0],
      changedFields: ['description', 'status'],
      changedBy: 'user-2',
      changedAt: '2024-02-01T00:00:00Z',
    },
  ],
  'req-3': [
    {
      version: 1,
      requirement: mockRequirements[2],
      changedFields: [],
      changedBy: 'user-2',
      changedAt: '2024-01-12T00:00:00Z',
    },
  ],
};

export const getMockRequirementHistory = (requirementId: string): any[] => {
  return mockRequirementHistory[requirementId] || [];
};

export const saveMockBaselines = (baselines: Baseline[]): void => {
  localStorage.setItem('mock_baselines', JSON.stringify(baselines));
};

// Mock Approval Workflows
export const mockApprovalWorkflows: Record<string, any> = {
  'proj-1': {
    states: [
      { id: 'draft', name: 'Draft', requiresApproval: false, reviewerRoles: [] },
      { id: 'in_review', name: 'In Review', requiresApproval: true, reviewerRoles: ['reviewer', 'approver'] },
      { id: 'approved', name: 'Approved', requiresApproval: true, reviewerRoles: ['approver'] },
      { id: 'deprecated', name: 'Deprecated', requiresApproval: false, reviewerRoles: [] },
    ],
    transitions: [
      { fromState: 'draft', toState: 'in_review', action: 'approve', requiresSignature: false },
      { fromState: 'in_review', toState: 'approved', action: 'approve', requiresSignature: true },
      { fromState: 'in_review', toState: 'draft', action: 'request_changes', requiresSignature: false },
      { fromState: 'in_review', toState: 'deprecated', action: 'reject', requiresSignature: false },
      { fromState: 'approved', toState: 'deprecated', action: 'reject', requiresSignature: true },
    ],
  },
};

export const getMockApprovalWorkflow = (projectId: string): any => {
  return mockApprovalWorkflows[projectId] || mockApprovalWorkflows['proj-1'];
};

export const saveMockApprovalWorkflow = (projectId: string, workflow: any): void => {
  mockApprovalWorkflows[projectId] = workflow;
  localStorage.setItem('mock_workflows', JSON.stringify(mockApprovalWorkflows));
};

// Mock Electronic Signatures
export const mockElectronicSignatures: any[] = [
  {
    id: 'sig-1',
    requirementId: 'req-1',
    userId: 'user-3',
    userName: 'Jane Reviewer',
    signatureMeaning: 'Approved for implementation',
    timestamp: '2024-02-01T00:00:00Z',
    signatureHash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  },
  {
    id: 'sig-2',
    requirementId: 'req-4',
    userId: 'user-1',
    userName: 'Admin User',
    signatureMeaning: 'Approved for implementation',
    timestamp: '2024-01-13T00:00:00Z',
    signatureHash: 'z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4',
  },
];

export const getMockElectronicSignatures = (requirementId?: string): any[] => {
  const data = localStorage.getItem('mock_signatures');
  const signatures = data ? JSON.parse(data) : mockElectronicSignatures;
  return requirementId 
    ? signatures.filter((sig: any) => sig.requirementId === requirementId)
    : signatures;
};

export const saveMockElectronicSignature = (signature: any): void => {
  const signatures = getMockElectronicSignatures();
  signatures.push(signature);
  localStorage.setItem('mock_signatures', JSON.stringify(signatures));
};

// Mock API Tokens
export const mockApiTokens: any[] = [
  {
    id: 'token-1',
    userId: 'user-1',
    name: 'CI/CD Pipeline Token',
    scopes: ['requirements:read', 'requirements:write', 'traceability:read'],
    expiresAt: '2025-12-31T23:59:59Z',
    lastUsedAt: '2024-02-20T10:30:00Z',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'token-2',
    userId: 'user-1',
    name: 'Read-Only Integration',
    scopes: ['requirements:read', 'traceability:read'],
    expiresAt: null,
    lastUsedAt: '2024-02-15T08:15:00Z',
    createdAt: '2024-01-15T00:00:00Z',
  },
];

export const getMockApiTokens = (userId?: string): any[] => {
  const data = localStorage.getItem('mock_api_tokens');
  const tokens = data ? JSON.parse(data) : mockApiTokens;
  return userId 
    ? tokens.filter((token: any) => token.userId === userId)
    : tokens;
};

export const saveMockApiToken = (token: any): void => {
  const tokens = getMockApiTokens();
  tokens.push(token);
  localStorage.setItem('mock_api_tokens', JSON.stringify(tokens));
};

export const deleteMockApiToken = (tokenId: string): void => {
  const tokens = getMockApiTokens();
  const filtered = tokens.filter((token: any) => token.id !== tokenId);
  localStorage.setItem('mock_api_tokens', JSON.stringify(filtered));
};

// Mock Notification Preferences
export const mockNotificationPreferences: Record<string, any> = {
  'user-1': {
    emailNotifications: true,
    notifyOnStatusChange: true,
    notifyOnComments: true,
    notifyOnApproval: true,
  },
  'user-2': {
    emailNotifications: true,
    notifyOnStatusChange: true,
    notifyOnComments: false,
    notifyOnApproval: true,
  },
};

export const getMockNotificationPreferences = (userId: string): any => {
  const data = localStorage.getItem('mock_notification_prefs');
  const prefs = data ? JSON.parse(data) : mockNotificationPreferences;
  return prefs[userId] || {
    emailNotifications: true,
    notifyOnStatusChange: true,
    notifyOnComments: true,
    notifyOnApproval: true,
  };
};

export const saveMockNotificationPreferences = (userId: string, prefs: any): void => {
  const data = localStorage.getItem('mock_notification_prefs');
  const allPrefs = data ? JSON.parse(data) : mockNotificationPreferences;
  allPrefs[userId] = prefs;
  localStorage.setItem('mock_notification_prefs', JSON.stringify(allPrefs));
};

// Mock Webhook Subscriptions
export const mockWebhookSubscriptions: any[] = [
  {
    id: 'webhook-1',
    url: 'https://example.com/webhooks/requirements',
    events: ['requirement.created', 'requirement.updated', 'requirement.approved'],
    active: true,
    createdAt: '2024-01-10T00:00:00Z',
  },
];

export const getMockWebhookSubscriptions = (): any[] => {
  const data = localStorage.getItem('mock_webhooks');
  return data ? JSON.parse(data) : mockWebhookSubscriptions;
};

export const saveMockWebhookSubscription = (webhook: any): void => {
  const webhooks = getMockWebhookSubscriptions();
  webhooks.push(webhook);
  localStorage.setItem('mock_webhooks', JSON.stringify(webhooks));
};

export const updateMockWebhookSubscription = (webhookId: string, updates: any): void => {
  const webhooks = getMockWebhookSubscriptions();
  const index = webhooks.findIndex((w: any) => w.id === webhookId);
  if (index !== -1) {
    webhooks[index] = { ...webhooks[index], ...updates };
    localStorage.setItem('mock_webhooks', JSON.stringify(webhooks));
  }
};

export const deleteMockWebhookSubscription = (webhookId: string): void => {
  const webhooks = getMockWebhookSubscriptions();
  const filtered = webhooks.filter((w: any) => w.id !== webhookId);
  localStorage.setItem('mock_webhooks', JSON.stringify(filtered));
};

export const saveMockProjects = (projects: any[]): void => {
  localStorage.setItem('mock_projects', JSON.stringify(projects));
};

export const saveMockUsers = (users: any[]): void => {
  localStorage.setItem('mock_users', JSON.stringify(users));
};

// Mock Requirement Templates
export const mockRequirementTemplates: any[] = [
  {
    id: 'template-1',
    projectId: 'proj-1',
    name: 'Security Requirement',
    description: 'Template for security-related requirements',
    type: 'system_requirement',
    priority: 'high',
    tags: ['security'],
    customFields: { safetyLevel: 'high' },
    titleTemplate: '[Security] ',
    descriptionTemplate: 'The system shall provide secure...',
    createdAt: '2024-01-05T00:00:00Z',
    createdBy: 'user-1',
    updatedAt: '2024-01-05T00:00:00Z',
    updatedBy: 'user-1',
  },
  {
    id: 'template-2',
    projectId: 'proj-1',
    name: 'Performance Requirement',
    description: 'Template for performance-related requirements',
    type: 'system_requirement',
    priority: 'medium',
    tags: ['performance'],
    customFields: {},
    titleTemplate: '[Performance] ',
    descriptionTemplate: 'The system shall complete [operation] within [time] seconds under [conditions].',
    createdAt: '2024-01-05T00:00:00Z',
    createdBy: 'user-1',
    updatedAt: '2024-01-05T00:00:00Z',
    updatedBy: 'user-1',
  },
  {
    id: 'template-3',
    projectId: 'proj-1',
    name: 'Compliance Requirement',
    description: 'Template for regulatory compliance requirements',
    type: 'constraint',
    priority: 'critical',
    tags: ['compliance', 'regulatory'],
    customFields: { regulatoryStandard: 'IEC 62304' },
    titleTemplate: '[Compliance] ',
    descriptionTemplate: 'The system shall comply with [standard] section [section number] by...',
    createdAt: '2024-01-05T00:00:00Z',
    createdBy: 'user-1',
    updatedAt: '2024-01-05T00:00:00Z',
    updatedBy: 'user-1',
  },
  {
    id: 'template-4',
    projectId: 'proj-2',
    name: 'Safety-Critical Function',
    description: 'Template for DO-178C safety-critical functions',
    type: 'software_requirement',
    priority: 'critical',
    tags: ['safety', 'do-178c'],
    customFields: { safetyLevel: 'DAL-A' },
    titleTemplate: '[Safety] ',
    descriptionTemplate: 'The software shall [action] to ensure [safety objective].',
    createdAt: '2024-01-16T00:00:00Z',
    createdBy: 'user-1',
    updatedAt: '2024-01-16T00:00:00Z',
    updatedBy: 'user-1',
  },
];

export const getMockRequirementTemplates = (projectId?: string): any[] => {
  const data = localStorage.getItem('mock_templates');
  const templates = data ? JSON.parse(data) : mockRequirementTemplates;
  return projectId 
    ? templates.filter((template: any) => template.projectId === projectId)
    : templates;
};

export const saveMockRequirementTemplate = (template: any): void => {
  const templates = getMockRequirementTemplates();
  templates.push(template);
  localStorage.setItem('mock_templates', JSON.stringify(templates));
};

export const updateMockRequirementTemplate = (templateId: string, updates: any): void => {
  const templates = getMockRequirementTemplates();
  const index = templates.findIndex((t: any) => t.id === templateId);
  if (index !== -1) {
    templates[index] = { ...templates[index], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem('mock_templates', JSON.stringify(templates));
  }
};

export const deleteMockRequirementTemplate = (templateId: string): void => {
  const templates = getMockRequirementTemplates();
  const filtered = templates.filter((t: any) => t.id !== templateId);
  localStorage.setItem('mock_templates', JSON.stringify(filtered));
};

// Mock Audit Entries
export const mockAuditEntries: any[] = [
  {
    id: 'audit-1',
    timestamp: '2024-01-10T00:00:00Z',
    actorId: 'user-2',
    actorName: 'John Author',
    actorType: 'user',
    entityType: 'requirement',
    entityId: 'req-1',
    entityDisplayId: 'REQ-001',
    action: 'create',
    changeDescription: 'Created requirement',
    previousValue: null,
    newValue: { title: 'User Authentication System', status: 'draft' },
  },
  {
    id: 'audit-2',
    timestamp: '2024-01-11T00:00:00Z',
    actorId: 'user-2',
    actorName: 'John Author',
    actorType: 'user',
    entityType: 'requirement',
    entityId: 'req-2',
    entityDisplayId: 'REQ-002',
    action: 'create',
    changeDescription: 'Created requirement',
    previousValue: null,
    newValue: { title: 'Password Complexity Requirements', status: 'draft' },
  },
  {
    id: 'audit-3',
    timestamp: '2024-01-11T00:00:00Z',
    actorId: 'user-2',
    actorName: 'John Author',
    actorType: 'user',
    entityType: 'traceability_link',
    entityId: 'link-1',
    entityDisplayId: 'REQ-002 → REQ-001',
    action: 'create_link',
    changeDescription: 'Created traceability link from REQ-002 to REQ-001',
    previousValue: null,
    newValue: { linkType: 'derives_from', sourceId: 'req-2', targetId: 'req-1' },
  },
  {
    id: 'audit-4',
    timestamp: '2024-01-12T00:00:00Z',
    actorId: 'user-2',
    actorName: 'John Author',
    actorType: 'user',
    entityType: 'requirement',
    entityId: 'req-3',
    entityDisplayId: 'REQ-003',
    action: 'create',
    changeDescription: 'Created requirement',
    previousValue: null,
    newValue: { title: 'Multi-Factor Authentication', status: 'draft' },
  },
  {
    id: 'audit-5',
    timestamp: '2024-01-13T00:00:00Z',
    actorId: 'user-2',
    actorName: 'John Author',
    actorType: 'user',
    entityType: 'requirement',
    entityId: 'req-4',
    entityDisplayId: 'REQ-004',
    action: 'create',
    changeDescription: 'Created requirement',
    previousValue: null,
    newValue: { title: 'Data Encryption at Rest', status: 'draft' },
  },
  {
    id: 'audit-6',
    timestamp: '2024-01-15T00:00:00Z',
    actorId: 'user-3',
    actorName: 'Jane Reviewer',
    actorType: 'user',
    entityType: 'requirement',
    entityId: 'req-1',
    entityDisplayId: 'REQ-001',
    action: 'update_status',
    changeDescription: 'Changed status from draft to in_review',
    previousValue: { status: 'draft' },
    newValue: { status: 'in_review' },
  },
  {
    id: 'audit-7',
    timestamp: '2024-01-20T00:00:00Z',
    actorId: 'user-1',
    actorName: 'Admin User',
    actorType: 'user',
    entityType: 'baseline',
    entityId: 'baseline-1',
    entityDisplayId: 'Release 1.0',
    action: 'create_baseline',
    changeDescription: 'Created baseline Release 1.0',
    previousValue: null,
    newValue: { name: 'Release 1.0', locked: false },
  },
  {
    id: 'audit-8',
    timestamp: '2024-01-20T00:00:00Z',
    actorId: 'user-1',
    actorName: 'Admin User',
    actorType: 'user',
    entityType: 'baseline',
    entityId: 'baseline-1',
    entityDisplayId: 'Release 1.0',
    action: 'lock_baseline',
    changeDescription: 'Locked baseline Release 1.0',
    previousValue: { locked: false },
    newValue: { locked: true },
  },
  {
    id: 'audit-9',
    timestamp: '2024-02-01T00:00:00Z',
    actorId: 'user-2',
    actorName: 'John Author',
    actorType: 'user',
    entityType: 'requirement',
    entityId: 'req-1',
    entityDisplayId: 'REQ-001',
    action: 'update',
    changeDescription: 'Updated description and status',
    previousValue: { 
      description: 'The system shall provide secure user authentication',
      status: 'in_review'
    },
    newValue: { 
      description: 'The system shall provide secure user authentication with multi-factor support',
      status: 'approved'
    },
  },
  {
    id: 'audit-10',
    timestamp: '2024-02-01T00:00:00Z',
    actorId: 'user-2',
    actorName: 'John Author',
    actorType: 'user',
    entityType: 'requirement',
    entityId: 'req-5',
    entityDisplayId: 'REQ-005',
    action: 'create',
    changeDescription: 'Created requirement',
    previousValue: null,
    newValue: { title: 'Audit Trail Logging', status: 'draft' },
  },
  {
    id: 'audit-11',
    timestamp: '2024-02-05T10:30:00Z',
    actorId: 'api-client-1',
    actorName: 'CI/CD Pipeline',
    actorType: 'api_client',
    entityType: 'requirement',
    entityId: 'req-2',
    entityDisplayId: 'REQ-002',
    action: 'update_status',
    changeDescription: 'Changed status from draft to approved',
    previousValue: { status: 'draft' },
    newValue: { status: 'approved' },
  },
  {
    id: 'audit-12',
    timestamp: '2024-02-10T14:20:00Z',
    actorId: 'user-3',
    actorName: 'Jane Reviewer',
    actorType: 'user',
    entityType: 'comment',
    entityId: 'comment-1',
    entityDisplayId: 'Comment on REQ-003',
    action: 'create_comment',
    changeDescription: 'Added clarification request comment',
    previousValue: null,
    newValue: { content: 'Should we also support hardware tokens like YubiKey?', isClarificationRequest: true },
  },
  {
    id: 'audit-13',
    timestamp: '2024-02-12T09:15:00Z',
    actorId: 'user-3',
    actorName: 'Jane Reviewer',
    actorType: 'user',
    entityType: 'requirement',
    entityId: 'req-4',
    entityDisplayId: 'REQ-004',
    action: 'update_status',
    changeDescription: 'Changed status from draft to approved',
    previousValue: { status: 'draft' },
    newValue: { status: 'approved' },
  },
  {
    id: 'audit-14',
    timestamp: '2024-02-15T11:00:00Z',
    actorId: 'user-3',
    actorName: 'Jane Reviewer',
    actorType: 'user',
    entityType: 'traceability_link',
    entityId: 'link-3',
    entityDisplayId: 'REQ-001 → TEST-001',
    action: 'create_link',
    changeDescription: 'Created traceability link from REQ-001 to TEST-001',
    previousValue: null,
    newValue: { linkType: 'verified_by', sourceId: 'req-1', targetId: 'TEST-001' },
  },
  {
    id: 'audit-15',
    timestamp: '2024-02-18T16:45:00Z',
    actorId: 'system',
    actorName: 'System',
    actorType: 'system',
    entityType: 'requirement',
    entityId: 'req-3',
    entityDisplayId: 'REQ-003',
    action: 'update_status',
    changeDescription: 'Automatic status change to in_review',
    previousValue: { status: 'draft' },
    newValue: { status: 'in_review' },
  },
];

export const getMockAuditEntries = (): any[] => {
  const data = localStorage.getItem('mock_audit_entries');
  return data ? JSON.parse(data) : mockAuditEntries;
};

export const saveMockAuditEntry = (entry: any): void => {
  const entries = getMockAuditEntries();
  entries.push(entry);
  localStorage.setItem('mock_audit_entries', JSON.stringify(entries));
};
