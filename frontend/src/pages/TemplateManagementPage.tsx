import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MockApiClient from '../services/MockApiClient';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Textarea } from '../components/Textarea';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { RequirementType, Priority } from '../types';

interface Template {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  type: RequirementType;
  priority: Priority;
  tags: string[];
  customFields: Record<string, any>;
  titleTemplate: string;
  descriptionTemplate: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export const TemplateManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [projects, setProjects] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectId: 'proj-1',
    type: 'system_requirement' as RequirementType,
    priority: 'medium' as Priority,
    tags: '',
    titleTemplate: '',
    descriptionTemplate: '',
  });

  useEffect(() => {
    loadData();
  }, [selectedProject]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [templatesData, projectsData] = await Promise.all([
        MockApiClient.getRequirementTemplates(
          selectedProject === 'all' ? undefined : selectedProject
        ),
        MockApiClient.getProjects(),
      ]);
      setTemplates(templatesData);
      setProjects(projectsData);
    } catch (err) {
      setError('Failed to load templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      projectId: selectedProject === 'all' ? 'proj-1' : selectedProject,
      type: 'system_requirement',
      priority: 'medium',
      tags: '',
      titleTemplate: '',
      descriptionTemplate: '',
    });
    setShowModal(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      projectId: template.projectId,
      type: template.type,
      priority: template.priority,
      tags: template.tags.join(', '),
      titleTemplate: template.titleTemplate,
      descriptionTemplate: template.descriptionTemplate,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await MockApiClient.deleteRequirementTemplate(id);
      await loadData();
    } catch (err) {
      setError('Failed to delete template');
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const templateData = {
        ...formData,
        tags: formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t),
        customFields: {},
      };

      if (editingTemplate) {
        await MockApiClient.updateRequirementTemplate(editingTemplate.id, templateData);
      } else {
        await MockApiClient.createRequirementTemplate(templateData);
      }

      setShowModal(false);
      await loadData();
    } catch (err) {
      setError('Failed to save template');
      console.error(err);
    }
  };

  const getProjectName = (projectId: string): string => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || projectId;
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="template-management-page">
      <div className="page-header">
        <h1>Requirement Templates</h1>
        <div className="header-actions">
          <Select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            style={{ marginRight: '1rem' }}
          >
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          <Button onClick={handleCreate}>Create Template</Button>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="templates-list">
        {templates.length === 0 ? (
          <div className="empty-state">
            <p>No templates found. Create your first template to get started.</p>
          </div>
        ) : (
          <div className="templates-grid">
            {templates.map((template) => (
              <div key={template.id} className="template-card">
                <div className="template-header">
                  <h3>{template.name}</h3>
                  <div className="template-badges">
                    <span className={`badge badge-${template.type}`}>
                      {template.type.replace(/_/g, ' ')}
                    </span>
                    <span className={`badge badge-priority-${template.priority}`}>
                      {template.priority}
                    </span>
                  </div>
                </div>

                {template.description && (
                  <p className="template-description">{template.description}</p>
                )}

                <div className="template-details">
                  <div className="detail-row">
                    <strong>Project:</strong> {getProjectName(template.projectId)}
                  </div>
                  <div className="detail-row">
                    <strong>Title Template:</strong>
                    <code>{template.titleTemplate || '(empty)'}</code>
                  </div>
                  <div className="detail-row">
                    <strong>Description Template:</strong>
                    <code className="description-preview">
                      {template.descriptionTemplate.substring(0, 100)}
                      {template.descriptionTemplate.length > 100 ? '...' : ''}
                    </code>
                  </div>
                  {template.tags.length > 0 && (
                    <div className="detail-row">
                      <strong>Tags:</strong>
                      <div className="tags">
                        {template.tags.map((tag, idx) => (
                          <span key={idx} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="template-actions">
                  <Button variant="secondary" size="small" onClick={() => handleEdit(template)}>
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => handleDelete(template.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingTemplate ? 'Edit Template' : 'Create Template'}
        >
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Template Name *</label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Security Requirement"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Brief description of when to use this template"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="projectId">Project *</label>
                <Select
                  id="projectId"
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  required
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="form-group">
                <label htmlFor="type">Type *</label>
                <Select
                  id="type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as RequirementType })
                  }
                  required
                >
                  <option value="stakeholder_need">Stakeholder Need</option>
                  <option value="system_requirement">System Requirement</option>
                  <option value="software_requirement">Software Requirement</option>
                  <option value="hardware_requirement">Hardware Requirement</option>
                  <option value="constraint">Constraint</option>
                  <option value="interface_requirement">Interface Requirement</option>
                </Select>
              </div>

              <div className="form-group">
                <label htmlFor="priority">Priority *</label>
                <Select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value as Priority })
                  }
                  required
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="tags">Tags (comma-separated)</label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., security, compliance, performance"
              />
            </div>

            <div className="form-group">
              <label htmlFor="titleTemplate">Title Template</label>
              <Input
                id="titleTemplate"
                value={formData.titleTemplate}
                onChange={(e) => setFormData({ ...formData, titleTemplate: e.target.value })}
                placeholder="e.g., [Security] "
              />
              <small className="form-help">
                This text will be pre-filled in the title field when creating from this template
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="descriptionTemplate">Description Template</label>
              <Textarea
                id="descriptionTemplate"
                value={formData.descriptionTemplate}
                onChange={(e) =>
                  setFormData({ ...formData, descriptionTemplate: e.target.value })
                }
                rows={6}
                placeholder="The system shall..."
              />
              <small className="form-help">
                This text will be pre-filled in the description field. Use placeholders like
                [action], [condition] to guide users.
              </small>
            </div>

            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingTemplate ? 'Update' : 'Create'} Template</Button>
            </div>
          </form>
        </Modal>
      )}

      <style>{`
        .template-management-page {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .page-header h1 {
          margin: 0;
          font-size: 2rem;
        }

        .header-actions {
          display: flex;
          align-items: center;
        }

        .templates-list {
          margin-top: 2rem;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #666;
        }

        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        .template-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1.5rem;
          background: white;
          transition: box-shadow 0.2s;
        }

        .template-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .template-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .template-header h3 {
          margin: 0;
          font-size: 1.25rem;
          flex: 1;
        }

        .template-badges {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
          white-space: nowrap;
        }

        .badge-system_requirement,
        .badge-software_requirement,
        .badge-hardware_requirement {
          background: #e3f2fd;
          color: #1976d2;
        }

        .badge-stakeholder_need {
          background: #f3e5f5;
          color: #7b1fa2;
        }

        .badge-constraint {
          background: #fff3e0;
          color: #f57c00;
        }

        .badge-interface_requirement {
          background: #e8f5e9;
          color: #388e3c;
        }

        .badge-priority-critical {
          background: #ffebee;
          color: #c62828;
        }

        .badge-priority-high {
          background: #fff3e0;
          color: #ef6c00;
        }

        .badge-priority-medium {
          background: #fff9c4;
          color: #f57f17;
        }

        .badge-priority-low {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .template-description {
          color: #666;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .template-details {
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .detail-row {
          margin-bottom: 0.75rem;
        }

        .detail-row strong {
          display: block;
          margin-bottom: 0.25rem;
          color: #333;
        }

        .detail-row code {
          display: block;
          background: #f5f5f5;
          padding: 0.5rem;
          border-radius: 4px;
          font-size: 0.85rem;
          overflow-x: auto;
        }

        .description-preview {
          white-space: pre-wrap;
          word-break: break-word;
        }

        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }

        .tag {
          background: #f0f0f0;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
        }

        .template-actions {
          display: flex;
          gap: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #333;
        }

        .form-help {
          display: block;
          margin-top: 0.25rem;
          font-size: 0.85rem;
          color: #666;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }
      `}</style>
    </div>
  );
};
