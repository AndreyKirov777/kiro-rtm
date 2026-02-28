import {
  Requirement,
  TraceabilityLink,
  Baseline,
  Comment,
  Attachment,
  Project,
  User,
  RequirementVersion,
  BaselineComparison,
} from '../types';
import {
  initializeMockData,
  getMockRequirements,
  getMockLinks,
  getMockBaselines,
  getMockComments,
  getMockAttachments,
  getMockProjects,
  getMockUsers,
  getMockRequirementHistory,
  saveMockRequirements,
  saveMockLinks,
  saveMockComments,
  saveMockAttachments,
  saveMockBaselines,
  getMockApprovalWorkflow,
  saveMockApprovalWorkflow,
  getMockElectronicSignatures,
  saveMockElectronicSignature,
  getMockApiTokens,
  saveMockApiToken,
  deleteMockApiToken,
  getMockNotificationPreferences,
  saveMockNotificationPreferences,
  getMockWebhookSubscriptions,
  saveMockWebhookSubscription,
  updateMockWebhookSubscription,
  deleteMockWebhookSubscription,
  saveMockProjects,
  saveMockUsers,
  getMockRequirementTemplates,
  saveMockRequirementTemplate,
  updateMockRequirementTemplate,
  deleteMockRequirementTemplate,
} from './mockData';

// Simulate network delay
const delay = (ms: number = 300): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

class MockApiClient {
  constructor() {
    initializeMockData();
  }

  // Requirements
  async getRequirements(projectId?: string): Promise<Requirement[]> {
    await delay();
    const requirements = getMockRequirements();
    return projectId
      ? requirements.filter((r) => r.projectId === projectId)
      : requirements;
  }

  async getRequirement(id: string): Promise<Requirement | null> {
    await delay();
    const requirements = getMockRequirements();
    return requirements.find((r) => r.id === id) || null;
  }

  async createRequirement(data: Partial<Requirement>): Promise<Requirement> {
    await delay();
    const requirements = getMockRequirements();
    const newRequirement: Requirement = {
      id: `req-${Date.now()}`,
      displayId: `REQ-${String(requirements.length + 1).padStart(3, '0')}`,
      projectId: data.projectId || 'proj-1',
      parentId: data.parentId || null,
      title: data.title || '',
      description: data.description || '',
      type: data.type || 'system_requirement',
      status: data.status || 'draft',
      priority: data.priority || 'medium',
      version: 1,
      tags: data.tags || [],
      customFields: data.customFields || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user-1',
      updatedBy: 'user-1',
    };
    requirements.push(newRequirement);
    saveMockRequirements(requirements);
    return newRequirement;
  }

  async updateRequirement(
    id: string,
    data: Partial<Requirement>
  ): Promise<Requirement | null> {
    await delay();
    const requirements = getMockRequirements();
    const index = requirements.findIndex((r) => r.id === id);
    if (index === -1) return null;

    requirements[index] = {
      ...requirements[index],
      ...data,
      id: requirements[index].id, // Preserve ID
      displayId: requirements[index].displayId, // Preserve display ID
      version: requirements[index].version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: 'user-1',
    };
    saveMockRequirements(requirements);
    return requirements[index];
  }

  async deleteRequirement(id: string): Promise<boolean> {
    await delay();
    const requirements = getMockRequirements();
    const filtered = requirements.filter((r) => r.id !== id);
    if (filtered.length === requirements.length) return false;
    saveMockRequirements(filtered);
    return true;
  }

  // Traceability Links
  async getLinks(requirementId?: string): Promise<TraceabilityLink[]> {
    await delay();
    const links = getMockLinks();
    return requirementId
      ? links.filter((l) => l.sourceId === requirementId || l.targetId === requirementId)
      : links;
  }

  async createLink(data: Partial<TraceabilityLink>): Promise<TraceabilityLink> {
    await delay();
    const links = getMockLinks();
    const newLink: TraceabilityLink = {
      id: `link-${Date.now()}`,
      sourceId: data.sourceId || '',
      targetId: data.targetId || '',
      targetType: data.targetType || 'requirement',
      linkType: data.linkType || 'relates_to',
      createdAt: new Date().toISOString(),
      createdBy: 'user-1',
    };
    links.push(newLink);
    saveMockLinks(links);
    return newLink;
  }

  async deleteLink(id: string): Promise<boolean> {
    await delay();
    const links = getMockLinks();
    const filtered = links.filter((l) => l.id !== id);
    if (filtered.length === links.length) return false;
    saveMockLinks(filtered);
    return true;
  }

  // Baselines
  async getBaselines(projectId?: string): Promise<Baseline[]> {
    await delay();
    const baselines = getMockBaselines();
    return projectId
      ? baselines.filter((b) => b.projectId === projectId)
      : baselines;
  }

  async getBaseline(id: string): Promise<Baseline | null> {
    await delay();
    const baselines = getMockBaselines();
    return baselines.find((b) => b.id === id) || null;
  }

  // Comments
  async getComments(requirementId: string): Promise<Comment[]> {
    await delay();
    const comments = getMockComments();
    return comments.filter((c) => c.requirementId === requirementId);
  }

  async createComment(data: Partial<Comment>): Promise<Comment> {
    await delay();
    const comments = getMockComments();
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      requirementId: data.requirementId || '',
      parentCommentId: data.parentCommentId || null,
      content: data.content || '',
      authorId: 'user-1',
      authorName: 'Admin User',
      isClarificationRequest: data.isClarificationRequest || false,
      assignedTo: data.assignedTo || null,
      resolved: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    comments.push(newComment);
    saveMockComments(comments);
    return newComment;
  }

  async updateComment(id: string, data: Partial<Comment>): Promise<Comment | null> {
    await delay();
    const comments = getMockComments();
    const index = comments.findIndex((c) => c.id === id);
    if (index === -1) return null;

    comments[index] = {
      ...comments[index],
      ...data,
      id: comments[index].id,
      updatedAt: new Date().toISOString(),
    };
    saveMockComments(comments);
    return comments[index];
  }

  async deleteComment(id: string): Promise<boolean> {
    await delay();
    const comments = getMockComments();
    const filtered = comments.filter((c) => c.id !== id);
    if (filtered.length === comments.length) return false;
    saveMockComments(filtered);
    return true;
  }

  // Attachments
  async getAttachments(requirementId: string): Promise<Attachment[]> {
    await delay();
    const attachments = getMockAttachments();
    return attachments.filter((a) => a.requirementId === requirementId);
  }

  async uploadAttachment(requirementId: string, file: File): Promise<Attachment> {
    await delay(500); // Simulate longer upload time
    const attachments = getMockAttachments();
    const newAttachment: Attachment = {
      id: `attach-${Date.now()}`,
      requirementId,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storagePath: `/uploads/${file.name}`,
      uploadedBy: 'user-1',
      uploadedAt: new Date().toISOString(),
    };
    attachments.push(newAttachment);
    saveMockAttachments(attachments);
    return newAttachment;
  }

  async deleteAttachment(id: string): Promise<boolean> {
    await delay();
    const attachments = getMockAttachments();
    const filtered = attachments.filter((a) => a.id !== id);
    if (filtered.length === attachments.length) return false;
    saveMockAttachments(filtered);
    return true;
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    await delay();
    return getMockProjects();
  }

  async getProject(id: string): Promise<Project | null> {
    await delay();
    const projects = getMockProjects();
    return projects.find((p) => p.id === id) || null;
  }

  // Users
  async getUsers(): Promise<User[]> {
    await delay();
    return getMockUsers();
  }

  async getCurrentUser(): Promise<User> {
    await delay();
    return getMockUsers()[0]; // Return admin user
  }

  // Baselines - Extended
  async createBaseline(data: Partial<Baseline>): Promise<Baseline> {
    await delay();
    const baselines = getMockBaselines();
    const requirements = getMockRequirements();
    const projectRequirements = requirements.filter(
      (r) => r.projectId === data.projectId
    );

    const newBaseline: Baseline = {
      id: `baseline-${Date.now()}`,
      projectId: data.projectId || 'proj-1',
      name: data.name || '',
      description: data.description || null,
      locked: false,
      lockedAt: null,
      lockedBy: null,
      snapshotData: JSON.stringify(projectRequirements),
      createdAt: new Date().toISOString(),
      createdBy: 'user-1',
    };
    baselines.push(newBaseline);
    saveMockBaselines(baselines);
    return newBaseline;
  }

  async lockBaseline(id: string): Promise<Baseline | null> {
    await delay();
    const baselines = getMockBaselines();
    const index = baselines.findIndex((b) => b.id === id);
    if (index === -1) return null;

    baselines[index] = {
      ...baselines[index],
      locked: true,
      lockedAt: new Date().toISOString(),
      lockedBy: 'user-1',
    };
    saveMockBaselines(baselines);
    return baselines[index];
  }

  async compareBaselines(
    baselineId: string,
    targetId: string
  ): Promise<BaselineComparison> {
    await delay();
    const baselines = getMockBaselines();
    const baseline = baselines.find((b) => b.id === baselineId);
    if (!baseline) {
      throw new Error('Baseline not found');
    }

    const baselineReqs: Requirement[] = JSON.parse(baseline.snapshotData);
    let targetReqs: Requirement[];

    if (targetId === 'current') {
      const requirements = getMockRequirements();
      targetReqs = requirements.filter((r) => r.projectId === baseline.projectId);
    } else {
      const targetBaseline = baselines.find((b) => b.id === targetId);
      if (!targetBaseline) {
        throw new Error('Target baseline not found');
      }
      targetReqs = JSON.parse(targetBaseline.snapshotData);
    }

    const added: Requirement[] = [];
    const modified: Array<{
      baseline: Requirement;
      current: Requirement;
      changedFields: string[];
    }> = [];
    const deleted: Requirement[] = [];

    // Find added and modified
    targetReqs.forEach((targetReq) => {
      const baselineReq = baselineReqs.find((r) => r.id === targetReq.id);
      if (!baselineReq) {
        added.push(targetReq);
      } else {
        const changedFields: string[] = [];
        (Object.keys(targetReq) as Array<keyof Requirement>).forEach((key) => {
          if (
            key !== 'updatedAt' &&
            key !== 'version' &&
            JSON.stringify(targetReq[key]) !== JSON.stringify(baselineReq[key])
          ) {
            changedFields.push(key);
          }
        });
        if (changedFields.length > 0) {
          modified.push({
            baseline: baselineReq,
            current: targetReq,
            changedFields,
          });
        }
      }
    });

    // Find deleted
    baselineReqs.forEach((baselineReq) => {
      const targetReq = targetReqs.find((r) => r.id === baselineReq.id);
      if (!targetReq) {
        deleted.push(baselineReq);
      }
    });

    return { added, modified, deleted };
  }

  // Revision History
  async getRequirementHistory(requirementId: string): Promise<RequirementVersion[]> {
    await delay();
    return getMockRequirementHistory(requirementId);
  }

  async restoreRequirementVersion(
    requirementId: string,
    version: number
  ): Promise<Requirement | null> {
    await delay();
    const history = getMockRequirementHistory(requirementId);
    const versionData = history.find((h) => h.version === version);
    if (!versionData) return null;

    const requirements = getMockRequirements();
    const index = requirements.findIndex((r) => r.id === requirementId);
    if (index === -1) return null;

    const restoredRequirement: Requirement = {
      ...versionData.requirement,
      version: requirements[index].version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: 'user-1',
    };

    requirements[index] = restoredRequirement;
    saveMockRequirements(requirements);
    return restoredRequirement;
  }

  // Workflow and Approvals
  async getApprovalWorkflow(projectId: string): Promise<any> {
    await delay();
    return getMockApprovalWorkflow(projectId);
  }

  async updateApprovalWorkflow(projectId: string, workflow: any): Promise<any> {
    await delay();
    saveMockApprovalWorkflow(projectId, workflow);
    return workflow;
  }

  async approveRequirement(
    requirementId: string,
    signatureMeaning: string
  ): Promise<{ requirement: Requirement; signature: any }> {
    await delay();
    const requirements = getMockRequirements();
    const index = requirements.findIndex((r) => r.id === requirementId);
    if (index === -1) throw new Error('Requirement not found');

    const currentUser = await this.getCurrentUser();
    const workflow = getMockApprovalWorkflow(requirements[index].projectId);
    const currentState = workflow.states.find(
      (s: any) => s.id === requirements[index].status
    );
    const transition = workflow.transitions.find(
      (t: any) => t.fromState === currentState?.id && t.action === 'approve'
    );

    if (!transition) throw new Error('Invalid transition');

    // Update requirement status
    requirements[index] = {
      ...requirements[index],
      status: transition.toState as any,
      version: requirements[index].version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id,
    };
    saveMockRequirements(requirements);

    // Create electronic signature if required
    let signature = null;
    if (transition.requiresSignature) {
      signature = {
        id: `sig-${Date.now()}`,
        requirementId,
        userId: currentUser.id,
        userName: currentUser.name,
        signatureMeaning,
        timestamp: new Date().toISOString(),
        signatureHash: this.generateSignatureHash(
          currentUser.id,
          requirementId,
          signatureMeaning
        ),
      };
      saveMockElectronicSignature(signature);
    }

    return { requirement: requirements[index], signature };
  }

  async requestChanges(requirementId: string, reason: string): Promise<Requirement> {
    await delay();
    const requirements = getMockRequirements();
    const index = requirements.findIndex((r) => r.id === requirementId);
    if (index === -1) throw new Error('Requirement not found');

    const currentUser = await this.getCurrentUser();
    const workflow = getMockApprovalWorkflow(requirements[index].projectId);
    const currentState = workflow.states.find(
      (s: any) => s.id === requirements[index].status
    );
    const transition = workflow.transitions.find(
      (t: any) => t.fromState === currentState?.id && t.action === 'request_changes'
    );

    if (!transition) throw new Error('Invalid transition');

    // Update requirement status
    requirements[index] = {
      ...requirements[index],
      status: transition.toState as any,
      version: requirements[index].version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id,
    };
    saveMockRequirements(requirements);

    // Add comment with reason
    await this.createComment({
      requirementId,
      content: `Changes requested: ${reason}`,
      isClarificationRequest: true,
      assignedTo: requirements[index].createdBy,
    });

    return requirements[index];
  }

  async rejectRequirement(requirementId: string, reason: string): Promise<Requirement> {
    await delay();
    const requirements = getMockRequirements();
    const index = requirements.findIndex((r) => r.id === requirementId);
    if (index === -1) throw new Error('Requirement not found');

    const currentUser = await this.getCurrentUser();
    const workflow = getMockApprovalWorkflow(requirements[index].projectId);
    const currentState = workflow.states.find(
      (s: any) => s.id === requirements[index].status
    );
    const transition = workflow.transitions.find(
      (t: any) => t.fromState === currentState?.id && t.action === 'reject'
    );

    if (!transition) throw new Error('Invalid transition');

    // Update requirement status
    requirements[index] = {
      ...requirements[index],
      status: transition.toState as any,
      version: requirements[index].version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id,
    };
    saveMockRequirements(requirements);

    // Add comment with reason
    await this.createComment({
      requirementId,
      content: `Rejected: ${reason}`,
      isClarificationRequest: false,
      assignedTo: requirements[index].createdBy,
    });

    return requirements[index];
  }

  async getElectronicSignatures(requirementId: string): Promise<any[]> {
    await delay();
    return getMockElectronicSignatures(requirementId);
  }

  private generateSignatureHash(
    userId: string,
    requirementId: string,
    meaning: string
  ): string {
    // Mock hash generation (in real app, use HMAC-SHA256)
    const data = `${userId}-${requirementId}-${meaning}-${Date.now()}`;
    return btoa(data).substring(0, 32);
  }

  // Projects - Extended
  async createProject(data: Partial<Project>): Promise<Project> {
    await delay();
    const projects = getMockProjects();
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: data.name || '',
      description: data.description || null,
      createdAt: new Date().toISOString(),
      createdBy: 'user-1',
    };
    projects.push(newProject);
    saveMockProjects(projects);
    return newProject;
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project | null> {
    await delay();
    const projects = getMockProjects();
    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) return null;

    projects[index] = {
      ...projects[index],
      ...data,
      id: projects[index].id,
    };
    saveMockProjects(projects);
    return projects[index];
  }

  // Users - Extended
  async updateUser(id: string, data: Partial<User>): Promise<User | null> {
    await delay();
    const users = getMockUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    users[index] = {
      ...users[index],
      ...data,
      id: users[index].id,
    };
    saveMockUsers(users);
    return users[index];
  }

  async updateCurrentUser(data: Partial<User>): Promise<User> {
    await delay();
    const users = getMockUsers();
    const currentUser = users[0]; // Admin user
    const updated = {
      ...currentUser,
      ...data,
      id: currentUser.id,
    };
    users[0] = updated;
    saveMockUsers(users);
    return updated;
  }

  // API Tokens
  async getApiTokens(userId?: string): Promise<any[]> {
    await delay();
    return getMockApiTokens(userId);
  }

  async createApiToken(data: {
    name: string;
    scopes: string[];
    expiresAt: string | null;
  }): Promise<{ token: any; plainTextToken: string }> {
    await delay();
    const currentUser = await this.getCurrentUser();
    const plainTextToken = `rmt_${btoa(
      `${currentUser.id}-${Date.now()}-${Math.random()}`
    ).substring(0, 40)}`;
    
    const newToken = {
      id: `token-${Date.now()}`,
      userId: currentUser.id,
      name: data.name,
      scopes: data.scopes,
      expiresAt: data.expiresAt,
      lastUsedAt: null,
      createdAt: new Date().toISOString(),
    };
    
    saveMockApiToken(newToken);
    return { token: newToken, plainTextToken };
  }

  async deleteApiToken(tokenId: string): Promise<boolean> {
    await delay();
    deleteMockApiToken(tokenId);
    return true;
  }

  // Notification Preferences
  async getNotificationPreferences(userId?: string): Promise<any> {
    await delay();
    const currentUser = await this.getCurrentUser();
    const targetUserId = userId || currentUser.id;
    return getMockNotificationPreferences(targetUserId);
  }

  async updateNotificationPreferences(prefs: any): Promise<any> {
    await delay();
    const currentUser = await this.getCurrentUser();
    saveMockNotificationPreferences(currentUser.id, prefs);
    return prefs;
  }

  // Webhook Subscriptions
  async getWebhookSubscriptions(): Promise<any[]> {
    await delay();
    return getMockWebhookSubscriptions();
  }

  async createWebhookSubscription(data: {
    url: string;
    events: string[];
  }): Promise<any> {
    await delay();
    const newWebhook = {
      id: `webhook-${Date.now()}`,
      url: data.url,
      events: data.events,
      active: true,
      createdAt: new Date().toISOString(),
    };
    saveMockWebhookSubscription(newWebhook);
    return newWebhook;
  }

  async updateWebhookSubscription(webhookId: string, updates: any): Promise<any> {
    await delay();
    updateMockWebhookSubscription(webhookId, updates);
    const webhooks = getMockWebhookSubscriptions();
    return webhooks.find((w) => w.id === webhookId) || null;
  }

  async deleteWebhookSubscription(webhookId: string): Promise<boolean> {
    await delay();
    deleteMockWebhookSubscription(webhookId);
    return true;
  }

  // Requirement Templates
  async getRequirementTemplates(projectId?: string): Promise<any[]> {
    await delay();
    return getMockRequirementTemplates(projectId);
  }

  async getRequirementTemplate(id: string): Promise<any | null> {
    await delay();
    const templates = getMockRequirementTemplates();
    return templates.find((t) => t.id === id) || null;
  }

  async createRequirementTemplate(data: any): Promise<any> {
    await delay();
    const currentUser = await this.getCurrentUser();
    const newTemplate = {
      id: `template-${Date.now()}`,
      projectId: data.projectId || 'proj-1',
      name: data.name || '',
      description: data.description || null,
      type: data.type || 'system_requirement',
      priority: data.priority || 'medium',
      tags: data.tags || [],
      customFields: data.customFields || {},
      titleTemplate: data.titleTemplate || '',
      descriptionTemplate: data.descriptionTemplate || '',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id,
    };
    saveMockRequirementTemplate(newTemplate);
    return newTemplate;
  }

  async updateRequirementTemplate(id: string, data: any): Promise<any | null> {
    await delay();
    const currentUser = await this.getCurrentUser();
    updateMockRequirementTemplate(id, { ...data, updatedBy: currentUser.id });
    const templates = getMockRequirementTemplates();
    return templates.find((t) => t.id === id) || null;
  }

  async deleteRequirementTemplate(id: string): Promise<boolean> {
    await delay();
    deleteMockRequirementTemplate(id);
    return true;
  }

  async createRequirementFromTemplate(templateId: string, overrides?: any): Promise<Requirement> {
    await delay();
    const template = await this.getRequirementTemplate(templateId);
    if (!template) throw new Error('Template not found');

    const requirementData: Partial<Requirement> = {
      projectId: template.projectId,
      title: overrides?.title || template.titleTemplate,
      description: overrides?.description || template.descriptionTemplate,
      type: overrides?.type || template.type,
      priority: overrides?.priority || template.priority,
      tags: overrides?.tags || [...template.tags],
      customFields: overrides?.customFields || { ...template.customFields },
      status: 'draft',
    };

    return this.createRequirement(requirementData);
  }
}

export default new MockApiClient();
