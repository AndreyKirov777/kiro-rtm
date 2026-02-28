import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Loading, ErrorMessage, Input, Select } from '../components';
import mockApiClient from '../services/MockApiClient';

interface WorkflowState {
  id: string;
  name: string;
  requiresApproval: boolean;
  reviewerRoles: string[];
}

interface WorkflowTransition {
  fromState: string;
  toState: string;
  action: 'approve' | 'request_changes' | 'reject';
  requiresSignature: boolean;
}

interface ApprovalWorkflow {
  states: WorkflowState[];
  transitions: WorkflowTransition[];
}

const WorkflowConfigurationPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingState, setEditingState] = useState<WorkflowState | null>(null);
  const [editingTransition, setEditingTransition] = useState<WorkflowTransition | null>(null);

  const availableRoles = ['viewer', 'author', 'reviewer', 'approver', 'administrator'];
  const availableActions = ['approve', 'request_changes', 'reject'];

  useEffect(() => {
    if (user?.role !== 'administrator') {
      navigate('/');
      return;
    }
    loadWorkflow();
  }, [projectId, user, navigate]);

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      const wf = await mockApiClient.getApprovalWorkflow(projectId || 'proj-1');
      setWorkflow(wf);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!workflow) return;

    try {
      setSaving(true);
      await mockApiClient.updateApprovalWorkflow(projectId || 'proj-1', workflow);
      alert('Workflow configuration saved successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  const handleAddState = () => {
    setEditingState({
      id: '',
      name: '',
      requiresApproval: false,
      reviewerRoles: [],
    });
  };

  const handleSaveState = () => {
    if (!editingState || !workflow) return;

    if (!editingState.id || !editingState.name) {
      alert('State ID and name are required');
      return;
    }

    const existingIndex = workflow.states.findIndex((s) => s.id === editingState.id);
    if (existingIndex >= 0) {
      const newStates = [...workflow.states];
      newStates[existingIndex] = editingState;
      setWorkflow({ ...workflow, states: newStates });
    } else {
      setWorkflow({
        ...workflow,
        states: [...workflow.states, editingState],
      });
    }
    setEditingState(null);
  };

  const handleDeleteState = (stateId: string) => {
    if (!workflow) return;
    if (!window.confirm('Delete this state? This will also remove related transitions.')) {
      return;
    }

    setWorkflow({
      states: workflow.states.filter((s) => s.id !== stateId),
      transitions: workflow.transitions.filter(
        (t) => t.fromState !== stateId && t.toState !== stateId
      ),
    });
  };

  const handleAddTransition = () => {
    setEditingTransition({
      fromState: '',
      toState: '',
      action: 'approve',
      requiresSignature: false,
    });
  };

  const handleSaveTransition = () => {
    if (!editingTransition || !workflow) return;

    if (!editingTransition.fromState || !editingTransition.toState) {
      alert('From state and to state are required');
      return;
    }

    const existingIndex = workflow.transitions.findIndex(
      (t) =>
        t.fromState === editingTransition.fromState &&
        t.action === editingTransition.action
    );

    if (existingIndex >= 0) {
      const newTransitions = [...workflow.transitions];
      newTransitions[existingIndex] = editingTransition;
      setWorkflow({ ...workflow, transitions: newTransitions });
    } else {
      setWorkflow({
        ...workflow,
        transitions: [...workflow.transitions, editingTransition],
      });
    }
    setEditingTransition(null);
  };

  const handleDeleteTransition = (fromState: string, action: string) => {
    if (!workflow) return;
    if (!window.confirm('Delete this transition?')) return;

    setWorkflow({
      ...workflow,
      transitions: workflow.transitions.filter(
        (t) => !(t.fromState === fromState && t.action === action)
      ),
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading workflow configuration..." />
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage
          message={error || 'Failed to load workflow'}
          onRetry={loadWorkflow}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1
            className="text-xl font-bold text-gray-900 cursor-pointer"
            onClick={() => navigate('/')}
          >
            RMT Application
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.name} ({user?.role})
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            ← Back to Dashboard
          </Button>
        </div>

        <div className="card mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Workflow Configuration
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure approval workflow states and transitions for this project
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>

          {/* Workflow States */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Workflow States
              </h3>
              <Button variant="secondary" size="sm" onClick={handleAddState}>
                Add State
              </Button>
            </div>

            <div className="space-y-3">
              {workflow.states.map((state) => (
                <div
                  key={state.id}
                  className="p-4 bg-gray-50 rounded border border-gray-200"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900">
                          {state.name}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          ({state.id})
                        </span>
                        {state.requiresApproval && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                            Requires Approval
                          </span>
                        )}
                      </div>
                      {state.reviewerRoles.length > 0 && (
                        <div className="text-sm text-gray-600">
                          Reviewer Roles: {state.reviewerRoles.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingState(state)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteState(state.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Transitions */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Workflow Transitions
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddTransition}
              >
                Add Transition
              </Button>
            </div>

            <div className="space-y-3">
              {workflow.transitions.map((transition, index) => {
                const fromState = workflow.states.find(
                  (s) => s.id === transition.fromState
                );
                const toState = workflow.states.find(
                  (s) => s.id === transition.toState
                );

                return (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded border border-gray-200"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">
                            {fromState?.name || transition.fromState}
                          </span>
                          <span className="text-gray-500">→</span>
                          <span className="font-medium text-gray-900">
                            {toState?.name || transition.toState}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span>
                            Action:{' '}
                            <span className="font-medium">
                              {transition.action.replace(/_/g, ' ')}
                            </span>
                          </span>
                          {transition.requiresSignature && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                              Requires Signature
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTransition(transition)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDeleteTransition(
                              transition.fromState,
                              transition.action
                            )
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* State Edit Modal */}
      {editingState && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {editingState.id ? 'Edit State' : 'Add State'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State ID
                </label>
                <Input
                  value={editingState.id}
                  onChange={(e) =>
                    setEditingState({ ...editingState, id: e.target.value })
                  }
                  placeholder="e.g., draft, in_review"
                  disabled={!!workflow.states.find((s) => s.id === editingState.id)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State Name
                </label>
                <Input
                  value={editingState.name}
                  onChange={(e) =>
                    setEditingState({ ...editingState, name: e.target.value })
                  }
                  placeholder="e.g., Draft, In Review"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingState.requiresApproval}
                    onChange={(e) =>
                      setEditingState({
                        ...editingState,
                        requiresApproval: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-gray-700">
                    Requires Approval
                  </span>
                </label>
              </div>
              {editingState.requiresApproval && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reviewer Roles
                  </label>
                  <div className="space-y-2">
                    {availableRoles.map((role) => (
                      <label key={role} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingState.reviewerRoles.includes(role)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditingState({
                                ...editingState,
                                reviewerRoles: [
                                  ...editingState.reviewerRoles,
                                  role,
                                ],
                              });
                            } else {
                              setEditingState({
                                ...editingState,
                                reviewerRoles: editingState.reviewerRoles.filter(
                                  (r) => r !== role
                                ),
                              });
                            }
                          }}
                        />
                        <span className="text-sm text-gray-700">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="secondary"
                onClick={() => setEditingState(null)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveState}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Transition Edit Modal */}
      {editingTransition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {workflow.transitions.find(
                (t) =>
                  t.fromState === editingTransition.fromState &&
                  t.action === editingTransition.action
              )
                ? 'Edit Transition'
                : 'Add Transition'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From State
                </label>
                <Select
                  value={editingTransition.fromState}
                  onChange={(e) =>
                    setEditingTransition({
                      ...editingTransition,
                      fromState: e.target.value,
                    })
                  }
                >
                  <option value="">Select state...</option>
                  {workflow.states.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <Select
                  value={editingTransition.action}
                  onChange={(e) =>
                    setEditingTransition({
                      ...editingTransition,
                      action: e.target.value as any,
                    })
                  }
                >
                  {availableActions.map((action) => (
                    <option key={action} value={action}>
                      {action.replace(/_/g, ' ')}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To State
                </label>
                <Select
                  value={editingTransition.toState}
                  onChange={(e) =>
                    setEditingTransition({
                      ...editingTransition,
                      toState: e.target.value,
                    })
                  }
                >
                  <option value="">Select state...</option>
                  {workflow.states.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingTransition.requiresSignature}
                    onChange={(e) =>
                      setEditingTransition({
                        ...editingTransition,
                        requiresSignature: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-gray-700">
                    Requires Electronic Signature
                  </span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="secondary"
                onClick={() => setEditingTransition(null)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveTransition}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowConfigurationPage;
