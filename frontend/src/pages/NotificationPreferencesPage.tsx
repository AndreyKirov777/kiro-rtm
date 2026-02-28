import React, { useState, useEffect } from 'react';
import { NotificationPreferences, WebhookSubscription } from '../types';
import MockApiClient from '../services/MockApiClient';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import Table from '../components/Table';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';

const NotificationPreferencesPage: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    notifyOnStatusChange: true,
    notifyOnComments: true,
    notifyOnApproval: true,
  });
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookFormData, setWebhookFormData] = useState({
    url: '',
    events: [] as string[],
  });

  const availableEvents = [
    { value: 'requirement.created', label: 'Requirement Created' },
    { value: 'requirement.updated', label: 'Requirement Updated' },
    { value: 'requirement.deleted', label: 'Requirement Deleted' },
    { value: 'requirement.approved', label: 'Requirement Approved' },
    { value: 'requirement.rejected', label: 'Requirement Rejected' },
    { value: 'traceability.link_created', label: 'Traceability Link Created' },
    { value: 'traceability.link_deleted', label: 'Traceability Link Deleted' },
    { value: 'baseline.created', label: 'Baseline Created' },
    { value: 'baseline.locked', label: 'Baseline Locked' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prefs, webhookData] = await Promise.all([
        MockApiClient.getNotificationPreferences(),
        MockApiClient.getWebhookSubscriptions(),
      ]);
      setPreferences(prefs);
      setWebhooks(webhookData);
      setError(null);
    } catch (err) {
      setError('Failed to load notification preferences');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await MockApiClient.updateNotificationPreferences(preferences);
      setSuccess('Notification preferences saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save preferences');
      console.error(err);
    }
  };

  const handleCreateWebhook = () => {
    setWebhookFormData({ url: '', events: [] });
    setShowWebhookModal(true);
  };

  const handleSubmitWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await MockApiClient.createWebhookSubscription(webhookFormData);
      await loadData();
      setShowWebhookModal(false);
      setSuccess('Webhook subscription created successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to create webhook subscription');
      console.error(err);
    }
  };

  const handleToggleWebhook = async (webhookId: string, active: boolean) => {
    try {
      await MockApiClient.updateWebhookSubscription(webhookId, { active });
      await loadData();
      setSuccess(`Webhook ${active ? 'enabled' : 'disabled'} successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update webhook');
      console.error(err);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!window.confirm('Are you sure you want to delete this webhook subscription?')) {
      return;
    }

    try {
      await MockApiClient.deleteWebhookSubscription(webhookId);
      await loadData();
      setSuccess('Webhook subscription deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete webhook');
      console.error(err);
    }
  };

  const toggleEvent = (event: string) => {
    setWebhookFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const webhookColumns = [
    { key: 'url', label: 'Webhook URL' },
    {
      key: 'events',
      label: 'Events',
      render: (value: string[]) => (
        <div className="events-list">
          {value.map((event) => (
            <span key={event} className="event-badge">
              {event}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'active',
      label: 'Status',
      render: (value: boolean) => (
        <span className={`status-badge ${value ? 'status-active' : 'status-inactive'}`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: WebhookSubscription) => (
        <div className="action-buttons">
          <Button
            onClick={() => handleToggleWebhook(row.id, !row.active)}
            size="small"
            variant="secondary"
          >
            {row.active ? 'Disable' : 'Enable'}
          </Button>
          <Button onClick={() => handleDeleteWebhook(row.id)} size="small" variant="danger">
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return <Loading />;

  return (
    <div className="notification-preferences-page">
      <h1>Notification Preferences</h1>

      {error && <ErrorMessage message={error} />}
      {success && <div className="success-message">{success}</div>}

      {/* Email Notification Preferences */}
      <section className="preferences-section">
        <h2>Email Notifications</h2>
        <form onSubmit={handleSavePreferences}>
          <div className="preference-item">
            <label>
              <input
                type="checkbox"
                checked={preferences.emailNotifications}
                onChange={(e) =>
                  setPreferences({ ...preferences, emailNotifications: e.target.checked })
                }
              />
              <span className="preference-label">Enable email notifications</span>
            </label>
            <p className="preference-description">
              Receive email notifications for requirement changes and updates
            </p>
          </div>

          <div className="preference-item">
            <label>
              <input
                type="checkbox"
                checked={preferences.notifyOnStatusChange}
                onChange={(e) =>
                  setPreferences({ ...preferences, notifyOnStatusChange: e.target.checked })
                }
                disabled={!preferences.emailNotifications}
              />
              <span className="preference-label">Notify on status changes</span>
            </label>
            <p className="preference-description">
              Get notified when requirements you own or follow change status
            </p>
          </div>

          <div className="preference-item">
            <label>
              <input
                type="checkbox"
                checked={preferences.notifyOnComments}
                onChange={(e) =>
                  setPreferences({ ...preferences, notifyOnComments: e.target.checked })
                }
                disabled={!preferences.emailNotifications}
              />
              <span className="preference-label">Notify on comments</span>
            </label>
            <p className="preference-description">
              Get notified when someone comments on your requirements
            </p>
          </div>

          <div className="preference-item">
            <label>
              <input
                type="checkbox"
                checked={preferences.notifyOnApproval}
                onChange={(e) =>
                  setPreferences({ ...preferences, notifyOnApproval: e.target.checked })
                }
                disabled={!preferences.emailNotifications}
              />
              <span className="preference-label">Notify on approval actions</span>
            </label>
            <p className="preference-description">
              Get notified when requirements are approved, rejected, or changes are requested
            </p>
          </div>

          <Button type="submit">Save Preferences</Button>
        </form>
      </section>

      {/* Webhook Subscriptions */}
      <section className="webhooks-section">
        <div className="section-header">
          <h2>Webhook Subscriptions</h2>
          <Button onClick={handleCreateWebhook}>Add Webhook</Button>
        </div>

        <div className="info-box">
          <p>
            Webhooks allow external systems to receive real-time notifications when events occur
            in the RMT system. Configure webhook URLs and select which events to subscribe to.
          </p>
        </div>

        <Table data={webhooks} columns={webhookColumns} />
      </section>

      {/* Create Webhook Modal */}
      <Modal
        isOpen={showWebhookModal}
        onClose={() => setShowWebhookModal(false)}
        title="Create Webhook Subscription"
      >
        <form onSubmit={handleSubmitWebhook}>
          <Input
            label="Webhook URL"
            type="url"
            value={webhookFormData.url}
            onChange={(e) => setWebhookFormData({ ...webhookFormData, url: e.target.value })}
            placeholder="https://example.com/webhooks/rmt"
            required
          />

          <div className="form-group">
            <label>Events to Subscribe</label>
            <div className="events-checkboxes">
              {availableEvents.map((event) => (
                <label key={event.value} className="event-checkbox">
                  <input
                    type="checkbox"
                    checked={webhookFormData.events.includes(event.value)}
                    onChange={() => toggleEvent(event.value)}
                  />
                  {event.label}
                </label>
              ))}
            </div>
            {webhookFormData.events.length === 0 && (
              <p className="help-text">Select at least one event</p>
            )}
          </div>

          <div className="modal-actions">
            <Button type="button" onClick={() => setShowWebhookModal(false)} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" disabled={webhookFormData.events.length === 0}>
              Create Webhook
            </Button>
          </div>
        </form>
      </Modal>

      <style>{`
        .notification-preferences-page {
          padding: 2rem;
          max-width: 1200px;
        }

        .preferences-section,
        .webhooks-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .preference-item {
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .preference-item:last-child {
          border-bottom: none;
        }

        .preference-item label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
        }

        .preference-label {
          font-weight: 500;
          font-size: 1rem;
        }

        .preference-description {
          margin: 0.5rem 0 0 2rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .info-box {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 4px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .info-box p {
          margin: 0;
          color: #0369a1;
        }

        .events-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .event-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .status-active {
          background: #d1fae5;
          color: #065f46;
        }

        .status-inactive {
          background: #fee2e2;
          color: #991b1b;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .events-checkboxes {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          padding: 1rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
        }

        .event-checkbox {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-weight: normal;
        }

        .event-checkbox input[type="checkbox"] {
          cursor: pointer;
        }

        .help-text {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
        }

        .success-message {
          padding: 1rem;
          background: #d1fae5;
          border: 1px solid #10b981;
          border-radius: 4px;
          color: #065f46;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
};

export default NotificationPreferencesPage;
