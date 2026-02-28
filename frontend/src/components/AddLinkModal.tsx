import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Modal } from './index';
import { Requirement, LinkType, TraceabilityLink } from '../types';
import MockApiClient from '../services/MockApiClient';

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceRequirementId: string;
  onLinkCreated: () => void;
}

type CreateLinkData = Omit<TraceabilityLink, 'id' | 'createdAt' | 'createdBy'>;

const linkTypeOptions: { value: LinkType; label: string }[] = [
  { value: 'derives_from', label: 'Derives From' },
  { value: 'refines', label: 'Refines' },
  { value: 'satisfies', label: 'Satisfies' },
  { value: 'verified_by', label: 'Verified By' },
  { value: 'conflicts_with', label: 'Conflicts With' },
  { value: 'relates_to', label: 'Relates To' },
];

const AddLinkModal: React.FC<AddLinkModalProps> = ({
  isOpen,
  onClose,
  sourceRequirementId,
  onLinkCreated,
}) => {
  const [linkType, setLinkType] = useState<LinkType>('relates_to');
  const [targetType, setTargetType] = useState<'requirement' | 'external'>('requirement');
  const [targetRequirementId, setTargetRequirementId] = useState('');
  const [externalSystem, setExternalSystem] = useState<'jira' | 'github' | 'linear'>('jira');
  const [externalId, setExternalId] = useState('');
  const [externalTitle, setExternalTitle] = useState('');
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadRequirements();
      // Reset form state when modal opens
      setLinkType('relates_to');
      setTargetType('requirement');
      setTargetRequirementId('');
      setExternalSystem('jira');
      setExternalId('');
      setExternalTitle('');
      setError('');
    }
  }, [isOpen, sourceRequirementId]);

  const loadRequirements = async () => {
    try {
      const data = await MockApiClient.getRequirements();
      // Filter out the source requirement
      setRequirements(data.filter((r) => r.id !== sourceRequirementId));
    } catch (err) {
      console.error('Failed to load requirements:', err);
    }
  };

  const getExternalUrl = (system: 'jira' | 'github' | 'linear', id: string): string => {
    const urlMap = {
      jira: `https://jira.example.com/browse/${id}`,
      github: `https://github.example.com/issues/${id}`,
      linear: `https://linear.app/issue/${id}`,
    };
    return urlMap[system];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (targetType === 'requirement' && !targetRequirementId) {
      setError('Please select a target requirement');
      return;
    }

    if (targetType === 'external' && (!externalId.trim() || !externalTitle.trim())) {
      setError('Please provide external ID and title');
      return;
    }

    setIsLoading(true);

    try {
      const linkData: CreateLinkData = {
        sourceId: sourceRequirementId,
        linkType,
        targetType,
        targetId: targetType === 'requirement' ? targetRequirementId : externalId,
      };

      if (targetType === 'external') {
        linkData.externalSystem = externalSystem;
        linkData.externalId = externalId;
        linkData.externalMetadata = {
          title: externalTitle,
          status: 'Open',
          url: getExternalUrl(externalSystem, externalId),
          lastSyncedAt: new Date().toISOString(),
        };
      }

      await MockApiClient.createLink(linkData);
      onLinkCreated();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create link';
      setError(errorMessage);
      console.error('Link creation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Traceability Link">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link Type
          </label>
          <Select
            value={linkType}
            onChange={(e) => setLinkType(e.target.value as LinkType)}
            required
          >
            {linkTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="requirement"
                checked={targetType === 'requirement'}
                onChange={(e) => setTargetType(e.target.value as 'requirement' | 'external')}
                className="mr-2"
              />
              Requirement
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="external"
                checked={targetType === 'external'}
                onChange={(e) => setTargetType(e.target.value as 'requirement' | 'external')}
                className="mr-2"
              />
              External Item
            </label>
          </div>
        </div>

        {targetType === 'requirement' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Requirement
            </label>
            <Select
              value={targetRequirementId}
              onChange={(e) => setTargetRequirementId(e.target.value)}
              required
            >
              <option value="">Select a requirement...</option>
              {requirements.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.displayId} - {req.title}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                External System
              </label>
              <Select
                value={externalSystem}
                onChange={(e) => setExternalSystem(e.target.value as 'jira' | 'github' | 'linear')}
                required
              >
                <option value="jira">Jira</option>
                <option value="github">GitHub</option>
                <option value="linear">Linear</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                External ID
              </label>
              <Input
                type="text"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                placeholder="e.g., PROJ-123, #456"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <Input
                type="text"
                value={externalTitle}
                onChange={(e) => setExternalTitle(e.target.value)}
                placeholder="External item title"
                required
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Link'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddLinkModal;
