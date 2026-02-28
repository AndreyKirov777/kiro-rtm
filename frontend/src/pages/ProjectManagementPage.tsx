import React, { useState, useEffect } from 'react';
import { Project, CustomFieldDefinition } from '../types';
import MockApiClient from '../services/MockApiClient';
import Button from '../components/Button';
import Input from '../components/Input';
import Textarea from '../components/Textarea';
import Modal from '../components/Modal';
import Table from '../components/Table';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import Select from '../components/Select';

const ProjectManagementPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await MockApiClient.getProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({ name: '', description: '' });
    setCustomFields([]);
    setShowCreateModal(true);
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
    });
    // Load custom fields from localStorage (mock)
    const storedFields = localStorage.getItem(`project_${project.id}_custom_fields`);
    setCustomFields(storedFields ? JSON.parse(storedFields) : []);
    setShowEditModal(true);
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await MockApiClient.createProject(formData);
      // Save custom fields
      const newProjects = await MockApiClient.getProjects();
      const newProject = newProjects[newProjects.length - 1];
      if (customFields.length > 0) {
        localStorage.setItem(
          `project_${newProject.id}_custom_fields`,
          JSON.stringify(customFields)
        );
      }
      await loadProjects();
      setShowCreateModal(false);
    } catch (err) {
      setError('Failed to create project');
      console.error(err);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      await MockApiClient.updateProject(selectedProject.id, formData);
      // Save custom fields
      if (customFields.length > 0) {
        localStorage.setItem(
          `project_${selectedProject.id}_custom_fields`,
          JSON.stringify(customFields)
        );
      } else {
        localStorage.removeItem(`project_${selectedProject.id}_custom_fields`);
      }
      await loadProjects();
      setShowEditModal(false);
    } catch (err) {
      setError('Failed to update project');
      console.error(err);
    }
  };

  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      {
        name: '',
        label: '',
        type: 'text',
        required: false,
      },
    ]);
  };

  const updateCustomField = (
    index: number,
    field: keyof CustomFieldDefinition,
    value: any
  ) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], [field]: value };
    setCustomFields(updated);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const columns = [
    { key: 'name', label: 'Project Name' },
    { key: 'description', label: 'Description' },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: Project) => (
        <Button onClick={() => handleEdit(row)} size="small">
          Edit
        </Button>
      ),
    },
  ];

  if (loading) return <Loading />;

  return (
    <div className="project-management-page">
      <div className="page-header">
        <h1>Project Management</h1>
        <Button onClick={handleCreate}>Create Project</Button>
      </div>

      {error && <ErrorMessage message={error} />}

      <Table data={projects} columns={columns} />

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Project"
      >
        <form onSubmit={handleSubmitCreate}>
          <Input
            label="Project Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />

          <div className="custom-fields-section">
            <h3>Custom Fields</h3>
            {customFields.map((field, index) => (
              <div key={index} className="custom-field-row">
                <Input
                  label="Field Name"
                  value={field.name}
                  onChange={(e) => updateCustomField(index, 'name', e.target.value)}
                  placeholder="e.g., safetyLevel"
                />
                <Input
                  label="Field Label"
                  value={field.label}
                  onChange={(e) => updateCustomField(index, 'label', e.target.value)}
                  placeholder="e.g., Safety Level"
                />
                <Select
                  label="Type"
                  value={field.type}
                  onChange={(e) => updateCustomField(index, 'type', e.target.value)}
                  options={[
                    { value: 'text', label: 'Text' },
                    { value: 'number', label: 'Number' },
                    { value: 'date', label: 'Date' },
                    { value: 'enum', label: 'Dropdown' },
                  ]}
                />
                {field.type === 'enum' && (
                  <Input
                    label="Options (comma-separated)"
                    value={field.enumValues?.join(', ') || ''}
                    onChange={(e) =>
                      updateCustomField(
                        index,
                        'enumValues',
                        e.target.value.split(',').map((v) => v.trim())
                      )
                    }
                    placeholder="e.g., Low, Medium, High"
                  />
                )}
                <label>
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) =>
                      updateCustomField(index, 'required', e.target.checked)
                    }
                  />
                  Required
                </label>
                <Button
                  type="button"
                  onClick={() => removeCustomField(index)}
                  variant="danger"
                  size="small"
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" onClick={addCustomField} variant="secondary">
              Add Custom Field
            </Button>
          </div>

          <div className="modal-actions">
            <Button type="button" onClick={() => setShowCreateModal(false)} variant="secondary">
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Project"
      >
        <form onSubmit={handleSubmitEdit}>
          <Input
            label="Project Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />

          <div className="custom-fields-section">
            <h3>Custom Fields</h3>
            {customFields.map((field, index) => (
              <div key={index} className="custom-field-row">
                <Input
                  label="Field Name"
                  value={field.name}
                  onChange={(e) => updateCustomField(index, 'name', e.target.value)}
                  placeholder="e.g., safetyLevel"
                />
                <Input
                  label="Field Label"
                  value={field.label}
                  onChange={(e) => updateCustomField(index, 'label', e.target.value)}
                  placeholder="e.g., Safety Level"
                />
                <Select
                  label="Type"
                  value={field.type}
                  onChange={(e) => updateCustomField(index, 'type', e.target.value)}
                  options={[
                    { value: 'text', label: 'Text' },
                    { value: 'number', label: 'Number' },
                    { value: 'date', label: 'Date' },
                    { value: 'enum', label: 'Dropdown' },
                  ]}
                />
                {field.type === 'enum' && (
                  <Input
                    label="Options (comma-separated)"
                    value={field.enumValues?.join(', ') || ''}
                    onChange={(e) =>
                      updateCustomField(
                        index,
                        'enumValues',
                        e.target.value.split(',').map((v) => v.trim())
                      )
                    }
                    placeholder="e.g., Low, Medium, High"
                  />
                )}
                <label>
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) =>
                      updateCustomField(index, 'required', e.target.checked)
                    }
                  />
                  Required
                </label>
                <Button
                  type="button"
                  onClick={() => removeCustomField(index)}
                  variant="danger"
                  size="small"
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" onClick={addCustomField} variant="secondary">
              Add Custom Field
            </Button>
          </div>

          <div className="modal-actions">
            <Button type="button" onClick={() => setShowEditModal(false)} variant="secondary">
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

      <style>{`
        .project-management-page {
          padding: 2rem;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .custom-fields-section {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #e5e7eb;
        }

        .custom-field-row {
          display: grid;
          grid-template-columns: 1fr 1fr 150px auto;
          gap: 1rem;
          margin-bottom: 1rem;
          padding: 1rem;
          background: #f9fafb;
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

export default ProjectManagementPage;
