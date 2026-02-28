import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Requirement, RequirementVersion, User } from '../types';
import mockApiClient from '../services/MockApiClient';
import { Button, Loading, ErrorMessage } from '../components';

const RevisionHistoryPage: React.FC = () => {
  const { requirementId } = useParams<{ requirementId: string }>();
  const navigate = useNavigate();
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [history, setHistory] = useState<RequirementVersion[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [requirementId]);

  const loadData = async () => {
    if (!requirementId) return;

    try {
      setLoading(true);
      setError(null);
      const [reqData, historyData, usersData] = await Promise.all([
        mockApiClient.getRequirement(requirementId),
        mockApiClient.getRequirementHistory(requirementId),
        mockApiClient.getUsers(),
      ]);

      if (!reqData) {
        setError('Requirement not found');
        return;
      }

      setRequirement(reqData);
      setHistory(historyData);
      setUsers(usersData);
    } catch (err) {
      setError('Failed to load revision history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreVersion = async (version: number) => {
    if (!requirementId) return;

    if (
      !window.confirm(
        `Are you sure you want to restore version ${version}? This will create a new version with the content from version ${version}.`
      )
    ) {
      return;
    }

    try {
      setRestoring(true);
      setError(null);
      await mockApiClient.restoreRequirementVersion(requirementId, version);
      navigate(`/requirements/${requirementId}`);
    } catch (err) {
      setError('Failed to restore version');
      console.error(err);
    } finally {
      setRestoring(false);
    }
  };

  const getUserName = (userId: string): string => {
    const user = users.find((u) => u.id === userId);
    return user ? user.name : 'Unknown User';
  };

  const renderFieldValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const renderVersionCard = (versionData: RequirementVersion) => {
    const req = versionData.requirement;
    const isSelected = selectedVersion === versionData.version;

    return (
      <div
        key={versionData.version}
        className={`border rounded-lg p-4 mb-3 ${
          isSelected ? 'border-blue-500 bg-blue-50' : ''
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-lg">Version {versionData.version}</span>
              {versionData.version === requirement?.version && (
                <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                  Current
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {new Date(versionData.changedAt).toLocaleString()} by{' '}
              {getUserName(versionData.changedBy)}
            </div>
            {versionData.changedFields.length > 0 && (
              <div className="text-sm text-gray-600 mt-1">
                Changed: {versionData.changedFields.join(', ')}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedVersion(isSelected ? null : versionData.version)}
            >
              {isSelected ? 'Deselect' : 'View'}
            </Button>
            {versionData.version !== requirement?.version && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleRestoreVersion(versionData.version)}
                disabled={restoring}
              >
                Restore
              </Button>
            )}
          </div>
        </div>

        {isSelected && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <div>
              <span className="font-medium">Title:</span> {req.title}
            </div>
            <div>
              <span className="font-medium">Description:</span> {req.description}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="font-medium">Type:</span> {req.type}
              </div>
              <div>
                <span className="font-medium">Status:</span> {req.status}
              </div>
              <div>
                <span className="font-medium">Priority:</span> {req.priority}
              </div>
            </div>
            {req.tags.length > 0 && (
              <div>
                <span className="font-medium">Tags:</span> {req.tags.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <Loading />;
  }

  if (!requirement) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorMessage message="Requirement not found" />
        <Button onClick={() => navigate('/requirements')} className="mt-4">
          Back to Requirements
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="secondary"
          onClick={() => navigate(`/requirements/${requirementId}`)}
          className="mb-4"
        >
          ← Back to Requirement
        </Button>
        <h1 className="text-3xl font-bold mb-2">Revision History</h1>
        <div className="text-gray-600">
          <span className="font-mono font-medium">{requirement.displayId}</span> - {requirement.title}
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {history.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">No revision history available for this requirement</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">
              Version History ({history.length} version{history.length !== 1 ? 's' : ''})
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Click "View" to see version details, or "Restore" to revert to a previous version
            </p>
            {history
              .slice()
              .reverse()
              .map((versionData) => renderVersionCard(versionData))}
          </div>
        </>
      )}
    </div>
  );
};

export default RevisionHistoryPage;
