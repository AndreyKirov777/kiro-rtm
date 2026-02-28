import React, { useState, useEffect } from 'react';
import { Requirement, RequirementStatus, RequirementType, Priority, CoverageStatus } from '../types';

export interface FilterConfig {
  status: RequirementStatus[];
  type: RequirementType[];
  priority: Priority[];
  tags: string[];
  assignee: string[];
  coverageStatus: CoverageStatus[];
  customFields: Record<string, string>;
}

interface FilterPanelProps {
  requirements: Requirement[];
  onFilterChange: (filtered: Requirement[]) => void;
  availableUsers?: Array<{ id: string; name: string }>;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  requirements,
  onFilterChange,
  availableUsers = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterConfig>({
    status: [],
    type: [],
    priority: [],
    tags: [],
    assignee: [],
    coverageStatus: [],
    customFields: {},
  });

  // Extract unique values from requirements
  const allTags = Array.from(
    new Set(requirements.flatMap((req) => req.tags))
  ).sort();

  const allCustomFieldKeys = Array.from(
    new Set(requirements.flatMap((req) => Object.keys(req.customFields)))
  ).sort();

  useEffect(() => {
    applyFilters();
  }, [filters, requirements]);

  const applyFilters = () => {
    let filtered = [...requirements];

    // Filter by status
    if (filters.status.length > 0) {
      filtered = filtered.filter((req) => filters.status.includes(req.status));
    }

    // Filter by type
    if (filters.type.length > 0) {
      filtered = filtered.filter((req) => filters.type.includes(req.type));
    }

    // Filter by priority
    if (filters.priority.length > 0) {
      filtered = filtered.filter((req) => filters.priority.includes(req.priority));
    }

    // Filter by tags
    if (filters.tags.length > 0) {
      filtered = filtered.filter((req) =>
        filters.tags.some((tag) => req.tags.includes(tag))
      );
    }

    // Filter by assignee (using createdBy as proxy)
    if (filters.assignee.length > 0) {
      filtered = filtered.filter((req) => filters.assignee.includes(req.createdBy));
    }

    // Filter by coverage status
    if (filters.coverageStatus.length > 0) {
      filtered = filtered.filter(
        (req) => req.coverageStatus && filters.coverageStatus.includes(req.coverageStatus)
      );
    }

    // Filter by custom fields
    Object.entries(filters.customFields).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(
          (req) => req.customFields[key] && String(req.customFields[key]).includes(value)
        );
      }
    });

    onFilterChange(filtered);
  };

  const handleStatusToggle = (status: RequirementStatus) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
  };

  const handleTypeToggle = (type: RequirementType) => {
    setFilters((prev) => ({
      ...prev,
      type: prev.type.includes(type)
        ? prev.type.filter((t) => t !== type)
        : [...prev.type, type],
    }));
  };

  const handlePriorityToggle = (priority: Priority) => {
    setFilters((prev) => ({
      ...prev,
      priority: prev.priority.includes(priority)
        ? prev.priority.filter((p) => p !== priority)
        : [...prev.priority, priority],
    }));
  };

  const handleTagToggle = (tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleCoverageStatusToggle = (status: CoverageStatus) => {
    setFilters((prev) => ({
      ...prev,
      coverageStatus: prev.coverageStatus.includes(status)
        ? prev.coverageStatus.filter((s) => s !== status)
        : [...prev.coverageStatus, status],
    }));
  };

  const handleCustomFieldChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [key]: value,
      },
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      status: [],
      type: [],
      priority: [],
      tags: [],
      assignee: [],
      coverageStatus: [],
      customFields: {},
    });
  };

  const activeFilterCount =
    filters.status.length +
    filters.type.length +
    filters.priority.length +
    filters.tags.length +
    filters.assignee.length +
    filters.coverageStatus.length +
    Object.values(filters.customFields).filter((v) => v).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        <span className="text-sm font-medium text-gray-700">Filters</span>
        {activeFilterCount > 0 && (
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-[600px] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-4 space-y-6">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="space-y-2">
                {(['draft', 'in_review', 'approved', 'deprecated'] as RequirementStatus[]).map(
                  (status) => (
                    <label key={status} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status)}
                        onChange={() => handleStatusToggle(status)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </label>
                  )
                )}
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <div className="space-y-2">
                {([
                  'stakeholder_need',
                  'system_requirement',
                  'software_requirement',
                  'hardware_requirement',
                  'constraint',
                  'interface_requirement',
                ] as RequirementType[]).map((type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.type.includes(type)}
                      onChange={() => handleTypeToggle(type)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {type.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <div className="space-y-2">
                {(['critical', 'high', 'medium', 'low'] as Priority[]).map((priority) => (
                  <label key={priority} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.priority.includes(priority)}
                      onChange={() => handlePriorityToggle(priority)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {priority.toUpperCase()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Coverage Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coverage Status
              </label>
              <div className="space-y-2">
                {(['passed', 'failed', 'not_run', 'no_test'] as CoverageStatus[]).map(
                  (status) => (
                    <label key={status} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.coverageStatus.includes(status)}
                        onChange={() => handleCoverageStatusToggle(status)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </label>
                  )
                )}
              </div>
            </div>

            {/* Tags Filter */}
            {allTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {allTags.map((tag) => (
                    <label key={tag} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.tags.includes(tag)}
                        onChange={() => handleTagToggle(tag)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{tag}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Fields Filter */}
            {allCustomFieldKeys.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Fields
                </label>
                <div className="space-y-3">
                  {allCustomFieldKeys.map((key) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-600 mb-1">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <input
                        type="text"
                        value={filters.customFields[key] || ''}
                        onChange={(e) => handleCustomFieldChange(key, e.target.value)}
                        placeholder={`Filter by ${key}...`}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
