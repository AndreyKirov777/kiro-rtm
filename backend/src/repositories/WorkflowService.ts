import { Pool } from 'pg';
import {
  Requirement,
  RequirementStatus,
  ApprovalWorkflow,
  UserRole,
} from '../types';
import { AuditService } from './AuditService';

/**
 * WorkflowService - Manages approval workflows and state transitions
 * 
 * This service enforces workflow state transitions, validates reviewer permissions,
 * and handles approval, rejection, and change request actions.
 * 
 * **Validates: Requirements 19.1-19.4, 20.1-20.6**
 */
export class WorkflowService {
  constructor(
    private pool: Pool,
    private auditService: AuditService
  ) {}

  /**
   * Validate if a state transition is allowed by the workflow
   * 
   * **Validates: Requirements 19.4**
   * 
   * @param workflow - The approval workflow configuration
   * @param currentStatus - Current requirement status
   * @param action - The action being performed
   * @returns The target status if transition is valid
   * @throws Error if transition is not allowed
   */
  private validateTransition(
    workflow: ApprovalWorkflow,
    currentStatus: RequirementStatus,
    action: 'approve' | 'request_changes' | 'reject'
  ): RequirementStatus {
    const transition = workflow.transitions.find(
      (t) => t.fromState === currentStatus && t.action === action
    );

    if (!transition) {
      throw new Error(
        `Invalid transition: Cannot ${action} from status ${currentStatus}`
      );
    }

    return transition.toState as RequirementStatus;
  }

  /**
   * Check if user has permission to perform workflow action
   * 
   * **Validates: Requirements 20.1-20.3, 42.5**
   * 
   * @param workflow - The approval workflow configuration
   * @param currentStatus - Current requirement status
   * @param userRole - Role of the user performing the action
   * @returns true if user is authorized
   * @throws Error if user is not authorized
   */
  private checkReviewerAuthorization(
    workflow: ApprovalWorkflow,
    currentStatus: RequirementStatus,
    userRole: UserRole
  ): boolean {
    const state = workflow.states.find((s) => s.id === currentStatus);

    if (!state) {
      throw new Error(`Invalid workflow state: ${currentStatus}`);
    }

    if (!state.requiresApproval) {
      // No approval required for this state
      return true;
    }

    // Check if user's role is in the list of authorized reviewer roles
    const isAuthorized = state.reviewerRoles.includes(userRole);

    if (!isAuthorized) {
      throw new Error(
        `User with role ${userRole} is not authorized to review requirements in state ${currentStatus}`
      );
    }

    return true;
  }

  /**
   * Approve a requirement
   * 
   * **Validates: Requirements 20.1, 20.4**
   * 
   * @param requirementId - ID of the requirement to approve
   * @param userId - ID of the user approving
   * @param userRole - Role of the approving user
   * @returns Updated requirement
   */
  async approve(
    requirementId: string,
    userId: string,
    userRole: UserRole
  ): Promise<Requirement> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get requirement and project workflow
      const reqResult = await client.query(
        `SELECT r.*, p.approval_workflow as "approvalWorkflow"
         FROM requirements r
         JOIN projects p ON p.id = r.project_id
         WHERE r.id = $1`,
        [requirementId]
      );

      if (reqResult.rows.length === 0) {
        throw new Error(`Requirement ${requirementId} not found`);
      }

      const requirement = reqResult.rows[0];
      const workflow: ApprovalWorkflow | null = requirement.approvalWorkflow;

      if (!workflow) {
        throw new Error('Project does not have an approval workflow configured');
      }

      // Validate transition
      const newStatus = this.validateTransition(
        workflow,
        requirement.status,
        'approve'
      );

      // Check authorization
      this.checkReviewerAuthorization(workflow, requirement.status, userRole);

      // Update requirement status
      const updateResult = await client.query(
        `UPDATE requirements
         SET status = $1, updated_at = NOW(), updated_by = $2, version = version + 1
         WHERE id = $3
         RETURNING *`,
        [newStatus, userId, requirementId]
      );

      const updatedRequirement = this.mapRowToRequirement(updateResult.rows[0]);

      // Create audit entry
      await this.auditService.createAuditEntry({
        actorId: userId,
        actorType: 'user',
        entityType: 'requirement',
        entityId: requirementId,
        action: 'approve',
        changeDescription: `Approved requirement, status changed from ${requirement.status} to ${newStatus}`,
        previousValue: { status: requirement.status },
        newValue: { status: newStatus },
      });

      await client.query('COMMIT');

      return updatedRequirement;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Request changes to a requirement
   * 
   * **Validates: Requirements 20.2, 20.5**
   * 
   * @param requirementId - ID of the requirement
   * @param userId - ID of the user requesting changes
   * @param userRole - Role of the user
   * @param reason - Reason for requesting changes
   * @returns Updated requirement
   */
  async requestChanges(
    requirementId: string,
    userId: string,
    userRole: UserRole,
    reason: string
  ): Promise<Requirement> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get requirement and project workflow
      const reqResult = await client.query(
        `SELECT r.*, p.approval_workflow as "approvalWorkflow"
         FROM requirements r
         JOIN projects p ON p.id = r.project_id
         WHERE r.id = $1`,
        [requirementId]
      );

      if (reqResult.rows.length === 0) {
        throw new Error(`Requirement ${requirementId} not found`);
      }

      const requirement = reqResult.rows[0];
      const workflow: ApprovalWorkflow | null = requirement.approvalWorkflow;

      if (!workflow) {
        throw new Error('Project does not have an approval workflow configured');
      }

      // Validate transition
      const newStatus = this.validateTransition(
        workflow,
        requirement.status,
        'request_changes'
      );

      // Check authorization
      this.checkReviewerAuthorization(workflow, requirement.status, userRole);

      // Update requirement status
      const updateResult = await client.query(
        `UPDATE requirements
         SET status = $1, updated_at = NOW(), updated_by = $2, version = version + 1
         WHERE id = $3
         RETURNING *`,
        [newStatus, userId, requirementId]
      );

      const updatedRequirement = this.mapRowToRequirement(updateResult.rows[0]);

      // Create audit entry
      await this.auditService.createAuditEntry({
        actorId: userId,
        actorType: 'user',
        entityType: 'requirement',
        entityId: requirementId,
        action: 'request_changes',
        changeDescription: `Requested changes: ${reason}. Status changed from ${requirement.status} to ${newStatus}`,
        previousValue: { status: requirement.status },
        newValue: { status: newStatus, reason },
      });

      await client.query('COMMIT');

      return updatedRequirement;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reject a requirement
   * 
   * **Validates: Requirements 20.3, 20.6**
   * 
   * @param requirementId - ID of the requirement
   * @param userId - ID of the user rejecting
   * @param userRole - Role of the user
   * @param reason - Reason for rejection
   * @returns Updated requirement
   */
  async reject(
    requirementId: string,
    userId: string,
    userRole: UserRole,
    reason: string
  ): Promise<Requirement> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get requirement and project workflow
      const reqResult = await client.query(
        `SELECT r.*, p.approval_workflow as "approvalWorkflow"
         FROM requirements r
         JOIN projects p ON p.id = r.project_id
         WHERE r.id = $1`,
        [requirementId]
      );

      if (reqResult.rows.length === 0) {
        throw new Error(`Requirement ${requirementId} not found`);
      }

      const requirement = reqResult.rows[0];
      const workflow: ApprovalWorkflow | null = requirement.approvalWorkflow;

      if (!workflow) {
        throw new Error('Project does not have an approval workflow configured');
      }

      // Validate transition
      const newStatus = this.validateTransition(
        workflow,
        requirement.status,
        'reject'
      );

      // Check authorization
      this.checkReviewerAuthorization(workflow, requirement.status, userRole);

      // Update requirement status
      const updateResult = await client.query(
        `UPDATE requirements
         SET status = $1, updated_at = NOW(), updated_by = $2, version = version + 1
         WHERE id = $3
         RETURNING *`,
        [newStatus, userId, requirementId]
      );

      const updatedRequirement = this.mapRowToRequirement(updateResult.rows[0]);

      // Create audit entry
      await this.auditService.createAuditEntry({
        actorId: userId,
        actorType: 'user',
        entityType: 'requirement',
        entityId: requirementId,
        action: 'reject',
        changeDescription: `Rejected requirement: ${reason}. Status changed from ${requirement.status} to ${newStatus}`,
        previousValue: { status: requirement.status },
        newValue: { status: newStatus, reason },
      });

      await client.query('COMMIT');

      return updatedRequirement;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Map database row to Requirement object
   */
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }
}
