import React, { useState, useEffect } from 'react';
import { User } from '../types';
import MockApiClient from '../services/MockApiClient';
import Button from '../components/Button';
import Table from '../components/Table';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import Select from '../components/Select';
import { useAuth } from '../contexts/AuthContext';

const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string>('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await MockApiClient.getUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (user: User) => {
    setEditingUserId(user.id);
    setEditingRole(user.role);
  };

  const handleSaveRole = async (userId: string) => {
    try {
      await MockApiClient.updateUser(userId, { role: editingRole as any });
      await loadUsers();
      setEditingUserId(null);
      setError(null);
    } catch (err) {
      setError('Failed to update user role');
      console.error(err);
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingRole('');
  };

  const getRoleBadgeClass = (role: string): string => {
    const roleClasses: Record<string, string> = {
      administrator: 'role-badge-admin',
      approver: 'role-badge-approver',
      reviewer: 'role-badge-reviewer',
      author: 'role-badge-author',
      viewer: 'role-badge-viewer',
    };
    return roleClasses[role] || 'role-badge-default';
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Role',
      render: (value: string, row: User) => {
        if (editingUserId === row.id) {
          return (
            <div className="role-edit-container">
              <Select
                value={editingRole}
                onChange={(e) => setEditingRole(e.target.value)}
                options={[
                  { value: 'viewer', label: 'Viewer' },
                  { value: 'author', label: 'Author' },
                  { value: 'reviewer', label: 'Reviewer' },
                  { value: 'approver', label: 'Approver' },
                  { value: 'administrator', label: 'Administrator' },
                ]}
              />
              <div className="role-edit-actions">
                <Button onClick={() => handleSaveRole(row.id)} size="small">
                  Save
                </Button>
                <Button onClick={handleCancelEdit} size="small" variant="secondary">
                  Cancel
                </Button>
              </div>
            </div>
          );
        }
        return <span className={`role-badge ${getRoleBadgeClass(value)}`}>{value}</span>;
      },
    },
    {
      key: 'lastLoginAt',
      label: 'Last Login',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: User) => {
        if (currentUser?.role !== 'administrator') {
          return <span className="text-muted">No permission</span>;
        }
        if (editingUserId === row.id) {
          return null;
        }
        return (
          <Button onClick={() => handleEditRole(row)} size="small">
            Change Role
          </Button>
        );
      },
    },
  ];

  if (loading) return <Loading />;

  if (currentUser?.role !== 'administrator') {
    return (
      <div className="user-management-page">
        <ErrorMessage message="Access denied. Administrator role required." />
      </div>
    );
  }

  return (
    <div className="user-management-page">
      <div className="page-header">
        <h1>User Management</h1>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="info-box">
        <h3>Role Permissions</h3>
        <ul>
          <li>
            <strong>Viewer:</strong> Can read requirements
          </li>
          <li>
            <strong>Author:</strong> Can create and edit requirements
          </li>
          <li>
            <strong>Reviewer:</strong> Can comment on requirements
          </li>
          <li>
            <strong>Approver:</strong> Can approve, request changes, or reject requirements
          </li>
          <li>
            <strong>Administrator:</strong> Can configure projects, workflows, and user roles
          </li>
        </ul>
      </div>

      <Table data={users} columns={columns} />

      <style>{`
        .user-management-page {
          padding: 2rem;
        }

        .page-header {
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

        .info-box ul {
          margin: 0.5rem 0 0 0;
          padding-left: 1.5rem;
        }

        .info-box li {
          margin-bottom: 0.5rem;
        }

        .role-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 500;
          text-transform: capitalize;
        }

        .role-badge-admin {
          background: #fef3c7;
          color: #92400e;
        }

        .role-badge-approver {
          background: #dbeafe;
          color: #1e40af;
        }

        .role-badge-reviewer {
          background: #e0e7ff;
          color: #3730a3;
        }

        .role-badge-author {
          background: #d1fae5;
          color: #065f46;
        }

        .role-badge-viewer {
          background: #f3f4f6;
          color: #374151;
        }

        .role-edit-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .role-edit-actions {
          display: flex;
          gap: 0.5rem;
        }

        .text-muted {
          color: #9ca3af;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default UserManagementPage;
