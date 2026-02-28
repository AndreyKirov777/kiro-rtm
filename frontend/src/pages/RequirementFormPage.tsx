import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Select, Textarea, Loading, ErrorMessage } from '../components';
import { Requirement, RequirementType, RequirementStatus, Priority } from '../types';
import MockApiClient from '../services/MockApiClient';

const RequirementFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = id !== 'new';
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<RequirementType>('system_requirement');
  const [status, setStatus] = useState<RequirementStatus>('draft');
  const [priority, setPriority] = useState<Priority>('medium');
  const [tags, setTags] = useState<string>('');
  const [parentId, setParentId] = useState<string>('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({
    safetyLevel: '',
    regulatoryStandard: '',
  });

  const [allRequirements, setAllRequirements] = useState<Requirement[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  useEffect(() => {
    loadAllRequirements();
    loadTemplates();
    if (isEditMode && id) {
      loadRequirement(id);
    }
  }, [id, isEditMode]);

  const loadAllRequirements = async () => {
    try {
      const data = await MockApiClient.getRequirements();
      setAllRequirements(data);
    } catch (err) {
      console.error('Failed to load requirements:', err);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await MockApiClient.getRequirementTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    if (!templateId) {
      setSelectedTemplate('');
      return;
    }

    try {
      const template = await MockApiClient.getRequirementTemplate(templateId);
      if (template) {
        setSelectedTemplate(templateId);
        setTitle(template.titleTemplate);
        setDescription(template.descriptionTemplate);
        setType(template.type);
        setPriority(template.priority);
        setTags(template.tags.join(', '));
        
        const customFieldsData: Record<string, string> = {
          safetyLevel: template.customFields.safetyLevel || '',
          regulatoryStandard: template.customFields.regulatoryStandard || '',
        };
        setCustomFields(customFieldsData);
      }
    } catch (err) {
      console.error('Failed to apply template:', err);
      setError('Failed to apply template');
    }
  };

  const loadRequirement = async (reqId: string) => {
    try {
      setIsLoading(true);
      const data = await MockApiClient.getRequirement(reqId);
      if (data) {
        setTitle(data.title);
        setDescription(data.description);
        setType(data.type);
        setStatus(data.status);
        setPriority(data.priority);
        setTags(data.tags.join(', '));
        setParentId(data.parentId || '');
        setCustomFields({
          safetyLevel: data.customFields.safetyLevel || '',
          regulatoryStandard: data.customFields.regulatoryStandard || '',
        });
        setError('');
      } else {
        setError('Requirement not found');
      }
    } catch (err) {
      setError('Failed to load requirement');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = 'Title is required';
    } else if (title.length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }

    if (!description.trim()) {
      errors.description = 'Description is required';
    } else if (description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      const tagsArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const customFieldsData: Record<string, any> = {};
      if (customFields.safetyLevel) {
        customFieldsData.safetyLevel = customFields.safetyLevel;
      }
      if (customFields.regulatoryStandard) {
        customFieldsData.regulatoryStandard = customFields.regulatoryStandard;
      }

      const requirementData: Partial<Requirement> = {
        title,
        description,
        type,
        status,
        priority,
        tags: tagsArray,
        parentId: parentId || null,
        customFields: customFieldsData,
      };

      if (isEditMode && id) {
        await MockApiClient.updateRequirement(id, requirementData);
        navigate(`/requirements/${id}`);
      } else {
        const newReq = await MockApiClient.createRequirement(requirementData);
        navigate(`/requirements/${newReq.id}`);
      }
    } catch (err) {
      setError('Failed to save requirement');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading requirement..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 cursor-pointer" onClick={() => navigate('/')}>
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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(isEditMode ? `/requirements/${id}` : '/requirements')}
          >
            ← Back
          </Button>
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {isEditMode ? 'Edit Requirement' : 'Create New Requirement'}
          </h2>

          {error && (
            <div className="mb-4">
              <ErrorMessage message={error} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Template Selection - Only show in create mode */}
            {!isEditMode && templates.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-2">
                  Create from Template (Optional)
                </label>
                <Select
                  id="template"
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  options={[
                    { value: '', label: 'Start from scratch' },
                    ...templates.map(template => ({
                      value: template.id,
                      label: `${template.name} (${template.type.replace(/_/g, ' ')})`,
                    })),
                  ]}
                />
                <p className="text-xs text-gray-600 mt-2">
                  Select a template to pre-populate fields with common values
                </p>
              </div>
            )}

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter requirement title"
                error={validationErrors.title}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter detailed requirement description"
                rows={6}
                error={validationErrors.description}
              />
              <p className="text-xs text-gray-500 mt-1">
                Provide a clear and detailed description of what the system must do
              </p>
            </div>

            {/* Type and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <Select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as RequirementType)}
                  options={[
                    { value: 'stakeholder_need', label: 'Stakeholder Need' },
                    { value: 'system_requirement', label: 'System Requirement' },
                    { value: 'software_requirement', label: 'Software Requirement' },
                    { value: 'hardware_requirement', label: 'Hardware Requirement' },
                    { value: 'constraint', label: 'Constraint' },
                    { value: 'interface_requirement', label: 'Interface Requirement' },
                  ]}
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <Select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as RequirementStatus)}
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'in_review', label: 'In Review' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'deprecated', label: 'Deprecated' },
                  ]}
                />
              </div>
            </div>

            {/* Priority and Parent */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Priority <span className="text-red-500">*</span>
                </label>
                <Select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'critical', label: 'Critical' },
                  ]}
                />
              </div>

              <div>
                <label htmlFor="parentId" className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Requirement
                </label>
                <Select
                  id="parentId"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  options={[
                    { value: '', label: 'None (Root Level)' },
                    ...allRequirements
                      .filter(req => req.id !== id)
                      .map(req => ({
                        value: req.id,
                        label: `${req.displayId} - ${req.title}`,
                      })),
                  ]}
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="security, authentication, compliance (comma-separated)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter tags separated by commas
              </p>
            </div>

            {/* Custom Fields */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Fields</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="safetyLevel" className="block text-sm font-medium text-gray-700 mb-1">
                    Safety Level
                  </label>
                  <Select
                    id="safetyLevel"
                    value={customFields.safetyLevel}
                    onChange={(e) => setCustomFields({ ...customFields, safetyLevel: e.target.value })}
                    options={[
                      { value: '', label: 'Not specified' },
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' },
                      { value: 'critical', label: 'Critical' },
                    ]}
                  />
                </div>

                <div>
                  <label htmlFor="regulatoryStandard" className="block text-sm font-medium text-gray-700 mb-1">
                    Regulatory Standard
                  </label>
                  <Input
                    id="regulatoryStandard"
                    value={customFields.regulatoryStandard}
                    onChange={(e) => setCustomFields({ ...customFields, regulatoryStandard: e.target.value })}
                    placeholder="e.g., IEC 62304, DO-178C"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(isEditMode ? `/requirements/${id}` : '/requirements')}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : isEditMode ? 'Update Requirement' : 'Create Requirement'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default RequirementFormPage;
