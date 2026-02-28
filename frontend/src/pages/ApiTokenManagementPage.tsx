import React, { useState, useEffect } from 'react';
import { ApiToken } from '../types';
import MockApiClient from '../services/MockApiClient';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import Table from '../components/Table';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../contexts/AuthContext';

const ApiTokenManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [newTokenValue, setNewTokenValue] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    scopes: [] as string[],
    expiresAt: '',
  });

  const availableScopes = [
    { value: 'requirements:read', label: 'Read Requirements' },
    { value: 'requirements:write', label: 'Write Requirements' },
    { value: 'traceability:read', label: 'Read Traceability' },
    { value: 'traceability:write', label: 'Write Traceability' },
    { value: 'baselines:read', label: 'Read Baselines' },
    { value: 'baselines:write', label: 'Write Baselines' },
    { value: 'audit:read', label: 'Read Audit Trail' },
  ];

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      setLoading(true);
      const data = await MockApiClient.getApiTokens(user?.id);
      setTokens(data);
      setError(null);
    } catch (err) {
      setError('Failed to load API tokens');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      scopes: [],
      expiresAt: '',
    });
    setShowCreateModal(true);
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await MockApiClient.createApiToken({
        name: formData.name,
        scopes: formData.scopes,
        expiresAt: formData.expiresAt || null,
      });
      setNewTokenValue(result.plainTextToken);
      setShowCreateModal(false);
      setShowTokenModal(true);
      await loadTokens();
    } catch (err) {
      setError('Failed to create API token');
      console.error(err);
    }
  };

  const handleRevoke = async (tokenId: string) => {
    if (!window.confirm('Are you sure you want to revoke this token? This action cannot be undone.')) {
      return;
    }

    try {
      await MockApiClient.deleteApiToken(tokenId);
      await loadTokens();
      setError(null);
    } catch (err) {
      setError('Failed to revoke token');
      console.error(err);
    }
  };

  const toggleScope = (scope: string) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(newTokenValue);
    alert('Token copied to clipboard!');
  };

  const columns = [
    { key: 'name', label: 'Token Name' },
    {
      key: 'scopes',
      label: 'Scopes',
      render: (value: string[]) => (
        <div className="scopes-list">
          {value.map((scope) => (
            <span key={scope} className="scope-badge">
              {scope}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'expiresAt',
      label: 'Expires',
      render: (value: string | null) =>
        value ? new Date(value).toLocaleDateString() : 'Never',
    },
    {
      key: 'lastUsedAt',
      label: 'Last Used',
      render: (value: string | null) =>
        value ? new Date(value).toLocaleString() : 'Never',
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: ApiToken) => (
        <Button onClick={() => handleRevoke(row.id)} size="small" variant="danger">
          Revoke
        </Button>
      ),
    },
  ];

  if (loading) return <Loading />;

  return (
    <div className="api-token-management-page">
      <div className="page-header">
        <h1>API Token Management</h1>
        <Button onClick={handleCreate}>Create Token</Button>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="info-box">
        <h3>About API Tokens</h3>
        <p>
          API tokens allow you to authenticate with the RMT API programmatically. Each token can
          be scoped to specific permissions and can have an expiration date.
        </p>
        <p>
          <strong>Security Note:</strong> Token values are only shown once upon creation. Store
          them securely and never commit them to version control.
        </p>
      </div>

      <Table data={tokens} columns={columns} />

      {/* Create Token Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create API Token"
      >
        <form onSubmit={handleSubmitCreate}>
          <Input
            label="Token Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., CI/CD Pipeline Token"
            required
          />

          <div className="form-group">
            <label>Scopes (Permissions)</label>
            <div className="scopes-checkboxes">
              {availableScopes.map((scope) => (
                <label key={scope.value} className="scope-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.scopes.includes(scope.value)}
                    onChange={() => toggleScope(scope.value)}
                  />
                  {scope.label}
                </label>
              ))}
            </div>
            {formData.scopes.length === 0 && (
              <p className="help-text">Select at least one scope</p>
            )}
          </div>

          <Input
            label="Expiration Date (Optional)"
            type="date"
            value={formData.expiresAt}
            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
          />

          <div className="modal-actions">
            <Button type="button" onClick={() => setShowCreateModal(false)} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" disabled={formData.scopes.length === 0}>
              Create Token
            </Button>
          </div>
        </form>
      </Modal>

      {/* Show Token Modal */}
      <Modal
        isOpen={showTokenModal}
        onClose={() => {
          setShowTokenModal(false);
          setNewTokenValue('');
        }}
        title="Token Created Successfully"
      >
        <div className="token-display">
          <p className="warning-text">
            <strong>Important:</strong> Copy this token now. You won't be able to see it again!
          </p>
          <div className="token-value-container">
            <code className="token-value">{newTokenValue}</code>
            <Button onClick={copyToClipboard} size="small">
              Copy
            </Button>
          </div>
          <p className="help-text">
            Use this token in the Authorization header: <code>Bearer {'{token}'}</code>
          </p>
        </div>
        <div className="modal-actions">
          <Button
            onClick={() => {
              setShowTokenModal(false);
              setNewTokenValue('');
            }}
          >
            Done
          </Button>
        </div>
      </Modal>

      <style>{`
        .api-token-management-page {
          padding: 2rem;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .info-box {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 4px;
          padding: 1rem;
          margin-bottom: 2rem;
        }

        .info-box h3 {
          margin-top: 0;
          color: #0369a1;
        }

        .info-box p {
          margin: 0.5rem 0;
        }

        .scopes-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .scope-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: #e0e7ff;
          color: #3730a3;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .scopes-checkboxes {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          padding: 1rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
        }

        .scope-checkbox {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-weight: normal;
        }

        .scope-checkbox input[type="checkbox"] {
          cursor: pointer;
        }

        .help-text {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .token-display {
          margin: 1rem 0;
        }

        .warning-text {
          padding: 1rem;
          background: #fef3c7;
          border: 1px solid #fbbf24;
          border-radius: 4px;
          color: #92400e;
          margin-bottom: 1rem;
        }

        .token-value-container {
          display: flex;
          gap: 1rem;
          align-items: center;
          padding: 1rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .token-value {
          flex: 1;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
          word-break: break-all;
          background: white;
          padding: 0.5rem;
          border-radius: 4px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
        }
      `}</style>
    </div>
  );
};

export default ApiTokenManagementPage;
