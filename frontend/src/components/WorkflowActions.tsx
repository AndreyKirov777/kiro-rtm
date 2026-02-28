import React, { useState, useEffect } from 'react';
import Button from './Button';
import ElectronicSignatureModal from './ElectronicSignatureModal';
import mockApiClient from '../services/MockApiClient';
import { Requirement } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface WorkflowActionsProps {
  requirement: Requirement;
  onUpdate: (requirement: Requirement) => void;
}

const WorkflowActions: React.FC<WorkflowActionsProps> = ({
  requirement,
  onUpdate,
}) => {
  const { user } = useAuth();
  const [workflow, setWorkflow] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'approve' | 'request_changes' | 'reject';
    reason?: string;
  } | null>(null);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reason, setReason] = useState('');
  const [signatures, setSignatures] = useState<any[]>([]);

  useEffect(() => {
    loadWorkflow();
    loadSignatures();
  }, [requirement.projectId, requirement.id]);

  const loadWorkflow = async () => {
    try {
      const wf = await mockApiClient.getApprovalWorkflow(requirement.projectId);
      setWorkflow(wf);
    } catch (error) {
      console.error('Failed to load workflow:', error);
    }
  };

  const loadSignatures = async () => {
    try {
      const sigs = await mockApiClient.getElectronicSignatures(requirement.id);
      setSignatures(sigs);
    } catch (error) {
      console.error('Failed to load signatures:', error);
    }
  };

  if (!workflow || !user) return null;

  const currentState = workflow.states.find(
    (s: any) => s.id === requirement.status
  );
  const availableTransitions = workflow.transitions.filter(
    (t: any) => t.fromState === requirement.status
  );

  const canPerformAction = (action: string): boolean => {
    if (!currentState) return false;
    
    const transition = availableTransitions.find((t: any) => t.action === action);
    if (!transition) return false;

    const targetState = workflow.states.find((s: any) => s.id === transition.toState);
    if (!targetState) return false;

    // Check if user has required role
    if (targetState.requiresApproval && targetState.reviewerRoles.length > 0) {
      return targetState.reviewerRoles.includes(user.role);
    }

    return true;
  };

  const handleApprove = () => {
    const transition = availableTransitions.find((t: any) => t.action === 'approve');
    if (!transition) return;

    if (transition.requiresSignature) {
      setPendingAction({ type: 'approve' });
      setShowSignatureModal(true);
    } else {
      executeApprove('Approved');
    }
  };

  const handleRequestChanges = () => {
    setPendingAction({ type: 'request_changes' });
    setShowReasonModal(true);
  };

  const handleReject = () => {
    setPendingAction({ type: 'reject' });
    setShowReasonModal(true);
  };

  const executeApprove = async (signatureMeaning: string) => {
    setLoading(true);
    try {
      const result = await mockApiClient.approveRequirement(
        requirement.id,
        signatureMeaning
      );
      onUpdate(result.requirement);
      if (result.signature) {
        setSignatures([...signatures, result.signature]);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to approve requirement');
    } finally {
      setLoading(false);
    }
  };

  const executeRequestChanges = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for requesting changes');
      return;
    }

    setLoading(true);
    try {
      const updated = await mockApiClient.requestChanges(requirement.id, reason);
      onUpdate(updated);
      setShowReasonModal(false);
      setReason('');
    } catch (error: any) {
      alert(error.message || 'Failed to request changes');
    } finally {
      setLoading(false);
    }
  };

  const executeReject = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      const updated = await mockApiClient.rejectRequirement(requirement.id, reason);
      onUpdate(updated);
      setShowReasonModal(false);
      setReason('');
    } catch (error: any) {
      alert(error.message || 'Failed to reject requirement');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (meaning: string, _password: string) => {
    // In mock mode, we don't validate password
    if (pendingAction?.type === 'approve') {
      await executeApprove(meaning);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Workflow Actions</h3>

      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Current State:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            requirement.status === 'approved'
              ? 'bg-green-100 text-green-800'
              : requirement.status === 'in_review'
              ? 'bg-yellow-100 text-yellow-800'
              : requirement.status === 'deprecated'
              ? 'bg-gray-100 text-gray-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {currentState?.name || requirement.status}
          </span>
        </div>
      </div>

      {signatures.length > 0 && (
        <div className="mb-4 p-4 bg-gray-50 rounded border">
          <h4 className="text-sm font-semibold mb-2">Electronic Signatures</h4>
          <div className="space-y-2">
            {signatures.map((sig) => (
              <div key={sig.id} className="text-sm">
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">{sig.userName}</span>
                  <span className="text-gray-500">-</span>
                  <span className="text-gray-600">{sig.signatureMeaning}</span>
                </div>
                <div className="text-xs text-gray-500 ml-6">
                  {new Date(sig.timestamp).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 ml-6 font-mono">
                  Hash: {sig.signatureHash}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {availableTransitions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 mb-3">Available Actions:</p>
          <div className="flex flex-wrap gap-2">
            {canPerformAction('approve') && (
              <Button
                onClick={handleApprove}
                disabled={loading}
                variant="primary"
              >
                Approve
              </Button>
            )}
            {canPerformAction('request_changes') && (
              <Button
                onClick={handleRequestChanges}
                disabled={loading}
                variant="secondary"
              >
                Request Changes
              </Button>
            )}
            {canPerformAction('reject') && (
              <Button
                onClick={handleReject}
                disabled={loading}
                variant="danger"
              >
                Reject
              </Button>
            )}
          </div>
        </div>
      )}

      {availableTransitions.length === 0 && (
        <p className="text-sm text-gray-500">
          No actions available for current state.
        </p>
      )}

      <ElectronicSignatureModal
        isOpen={showSignatureModal}
        onClose={() => {
          setShowSignatureModal(false);
          setPendingAction(null);
        }}
        onSign={handleSign}
        requirementId={requirement.displayId}
        action="Approve Requirement"
      />

      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {pendingAction?.type === 'request_changes'
                ? 'Request Changes'
                : 'Reject Requirement'}
            </h3>
            <textarea
              className="w-full border rounded p-2 mb-4"
              rows={4}
              placeholder="Please provide a reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowReasonModal(false);
                  setPendingAction(null);
                  setReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={
                  pendingAction?.type === 'request_changes'
                    ? executeRequestChanges
                    : executeReject
                }
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowActions;
