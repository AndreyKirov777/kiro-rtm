import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Baseline, Project } from '../types';
import mockApiClient from '../services/MockApiClient';
import { Button, Input, Textarea, Table, Modal, Loading, ErrorMessage } from '../components';

const BaselineManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lockingBaselineId, setLockingBaselineId] = useState<string | null>(null);

  // Create baseline form state
  const [newBaselineName, setNewBaselineName] = useState('');
  const [newBaselineDescription, setNewBaselineDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedProjectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [projectsData, baselinesData] = await Promise.all([
        mockApiClient.getProjects(),
        mockApiClient.getBaselines(selectedProjectId || undefined),
      ]);
      setProjects(projectsData);
      setBaselines(baselinesData);
      if (!selectedProjectId && projectsData.length > 0) {
        setSelectedProjectId(projectsData[0].id);
      }
    } catch (err) {
      setError('Failed to load baselines');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBaseline = async () => {
    if (!newBaselineName.trim()) {
      setError('Baseline name is required');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      await mockApiClient.createBaseline({
        projectId: selectedProjectId,
        name: newBaselineName,
        description: newBaselineDescription || null,
      });
      setShowCreateModal(false);
      setNewBaselineName('');
      setNewBaselineDescription('');
      await loadData();
    } catch (err) {
      setError('Failed to create baseline');
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleLockBaseline = async (baselineId: string) => {
    if (!window.confirm('Are you sure you want to lock this baseline? This action cannot be undone.')) {
      return;
    }

    try {
      setLockingBaselineId(baselineId);
      setError(null);
      await mockApiClient.lockBaseline(baselineId);
      await loadData();
    } catch (err) {
      setError('Failed to lock baseline');
      console.error(err);
    } finally {
      setLockingBaselineId(null);
    }
  };

  const handleCompareBaseline = (baselineId: string) => {
    navigate(`/baselines/${baselineId}/compare`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (baseline: Baseline) => (
        <div>
          <div className="font-medium">{baseline.name}</div>
          {baseline.description && (
            <div className="text-sm text-gray-600">{baseline.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (baseline: Baseline) => (
        <span
          className={`px-2 py-1 rounded text-sm ${
            baseline.locked
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {baseline.locked ? 'Locked' : 'Unlocked'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (baseline: Baseline) => (
        <div className="text-sm">
          <div>{formatDate(baseline.createdAt)}</div>
        </div>
      ),
    },
    {
      key: 'lockedAt',
      label: 'Locked',
      render: (baseline: Baseline) => (
        <div className="text-sm">{formatDate(baseline.lockedAt)}</div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (baseline: Baseline) => (
        <div className="flex gap-2">
          {!baseline.locked && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleLockBaseline(baseline.id)}
              disabled={lockingBaselineId === baseline.id}
            >
              {lockingBaselineId === baseline.id ? 'Locking...' : 'Lock'}
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleCompareBaseline(baseline.id)}
          >
            Compare
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Baseline Management</h1>
        <p className="text-gray-600">
          Create and manage requirement baselines for compliance and version control
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      <div className="mb-6 flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <label className="font-medium">Project:</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="border rounded px-3 py-2"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>Create Baseline</Button>
      </div>

      {baselines.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded">
          <p className="text-gray-600 mb-4">No baselines found for this project</p>
          <Button onClick={() => setShowCreateModal(true)}>Create First Baseline</Button>
        </div>
      ) : (
        <Table columns={columns} data={baselines} />
      )}

      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          title="Create Baseline"
          onClose={() => {
            setShowCreateModal(false);
            setNewBaselineName('');
            setNewBaselineDescription('');
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-2">Name *</label>
              <Input
                value={newBaselineName}
                onChange={(e) => setNewBaselineName(e.target.value)}
                placeholder="e.g., Release 1.0"
              />
            </div>
            <div>
              <label className="block font-medium mb-2">Description</label>
              <Textarea
                value={newBaselineDescription}
                onChange={(e) => setNewBaselineDescription(e.target.value)}
                placeholder="Optional description of this baseline"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewBaselineName('');
                  setNewBaselineDescription('');
                }}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateBaseline} disabled={creating}>
                {creating ? 'Creating...' : 'Create Baseline'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BaselineManagementPage;
