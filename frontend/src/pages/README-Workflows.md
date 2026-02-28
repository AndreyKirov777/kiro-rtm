# Workflow and Approval Features

This document describes the workflow and approval features implemented for the RMT application.

## Overview

The workflow system provides configurable approval workflows with electronic signatures for compliance with FDA 21 CFR Part 11 and other regulatory standards.

## Components

### 1. WorkflowActions Component
**Location**: `frontend/src/components/WorkflowActions.tsx`

Displays on the requirement detail page and provides:
- Current workflow state visualization
- Available action buttons based on user role and workflow configuration
- Electronic signature capture for approval actions
- Display of existing electronic signatures with tamper-evident hashes
- Reason input for requesting changes or rejecting requirements

**Features**:
- Role-based action visibility
- Real-time workflow state updates
- Electronic signature modal integration
- Automatic comment creation for change requests and rejections

### 2. ElectronicSignatureModal Component
**Location**: `frontend/src/components/ElectronicSignatureModal.tsx`

Modal dialog for capturing electronic signatures with:
- 21 CFR Part 11 compliance notice
- Signature meaning input (required)
- Password re-entry for identity confirmation
- Timestamp display
- Cryptographic hash generation (mock implementation)

**Compliance Features**:
- Immutable signature records
- Tamper-evident hashing
- Non-repudiation through password confirmation
- Audit trail integration

### 3. WorkflowConfigurationPage
**Location**: `frontend/src/pages/WorkflowConfigurationPage.tsx`

Admin-only page for configuring approval workflows:
- Define workflow states (draft, in_review, approved, deprecated, etc.)
- Configure state properties (requires approval, reviewer roles)
- Define transitions between states
- Specify which transitions require electronic signatures
- Visual workflow editor with add/edit/delete capabilities

**Access Control**: Only users with 'administrator' role can access this page.

## Data Models

### WorkflowState
```typescript
{
  id: string;                    // State identifier (e.g., 'draft', 'in_review')
  name: string;                  // Display name
  requiresApproval: boolean;     // Whether this state requires approval
  reviewerRoles: string[];       // Roles allowed to approve from this state
}
```

### WorkflowTransition
```typescript
{
  fromState: string;             // Source state ID
  toState: string;               // Target state ID
  action: 'approve' | 'request_changes' | 'reject';
  requiresSignature: boolean;    // Whether electronic signature is required
}
```

### ElectronicSignature
```typescript
{
  id: string;
  requirementId: string;
  userId: string;
  userName: string;
  signatureMeaning: string;      // Purpose of signature
  timestamp: string;
  signatureHash: string;         // Tamper-evident hash (HMAC-SHA256 in production)
}
```

## Mock API Methods

### Workflow Operations
- `getApprovalWorkflow(projectId)` - Retrieve workflow configuration
- `updateApprovalWorkflow(projectId, workflow)` - Save workflow configuration
- `approveRequirement(requirementId, signatureMeaning)` - Approve with signature
- `requestChanges(requirementId, reason)` - Request changes with reason
- `rejectRequirement(requirementId, reason)` - Reject with reason
- `getElectronicSignatures(requirementId)` - Retrieve signatures for requirement

## Mock Data

Default workflow for projects includes:
- **States**: draft, in_review, approved, deprecated
- **Transitions**:
  - draft → in_review (approve, no signature)
  - in_review → approved (approve, requires signature)
  - in_review → draft (request changes)
  - in_review → deprecated (reject)
  - approved → deprecated (reject, requires signature)

## Usage

### Viewing Workflow Actions
1. Navigate to any requirement detail page
2. Scroll to the "Workflow Actions" section
3. View current state and available actions based on your role

### Approving a Requirement
1. Click "Approve" button
2. If signature required, enter signature meaning and password
3. Signature is captured and requirement transitions to next state

### Requesting Changes
1. Click "Request Changes" button
2. Enter reason for changes
3. Requirement transitions back to draft state
4. Comment is automatically added with reason

### Configuring Workflows (Admin Only)
1. Navigate to `/workflow/configure/:projectId`
2. Add/edit workflow states with approval requirements
3. Define transitions between states
4. Specify which transitions require electronic signatures
5. Save configuration

## Compliance Features

### 21 CFR Part 11 Compliance
- Electronic signatures are legally binding
- Signatures include user identity, timestamp, and meaning
- Signatures are tamper-evident (cryptographic hash)
- Signatures are immutable after creation
- Password re-entry confirms signer identity
- Complete audit trail of all workflow actions

### Audit Trail
All workflow actions create audit entries:
- Requirement status changes
- Electronic signature capture
- Change requests with reasons
- Rejections with reasons

## Testing

To test the workflow features:
1. Log in as different user roles (viewer, author, reviewer, approver, admin)
2. Create or view requirements in different states
3. Attempt workflow actions and verify role-based access control
4. Test electronic signature capture for approval actions
5. Verify signatures are displayed with tamper-evident hashes
6. As admin, configure custom workflows and test transitions

## Future Enhancements

When connecting to real backend API:
- Replace mock signature hash with HMAC-SHA256
- Implement actual password validation
- Add signature verification endpoint
- Integrate with audit trail service
- Add workflow history visualization
- Support multiple approval workflows per project
- Add workflow templates for common regulatory standards
