import React, { useState, useEffect } from 'react';
import { FilterConfig } from './FilterPanel';
import Button from './Button';
import Modal from './Modal';
import Input from './Input';

export interface SavedView {
  id: string;
  name: string;
  description: string;
  filters: FilterConfig;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  createdAt: string;
  createdBy: string;
  shared: boolean;
}

interface SavedViewsProps {
  currentFilters: FilterConfig;
  currentSort: { by: string; order: 'asc' | 'desc' };
  onLoadView: (view: SavedView) => void;
  currentUserId: string;
}

const SavedViews: React.FC<SavedViewsProps> = ({
  currentFilters,
  currentSort,
  onLoadView,
  currentUserId,
}) => {
  const [views, setViews] = useState<SavedView[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [viewName, setViewName] = useState('');
  const [viewDescription, setViewDescription] = useState('');
  const [shareView, setShareView] = useState(false);

  useEffect(() => {
    loadViews();
  }, []);

  const loadViews = () => {
    const stored = localStorage.getItem('saved_views');
    if (stored) {
      setViews(JSON.parse(stored));
    }
  };

  const saveViews = (updatedViews: SavedView[]) => {
    localStorage.setItem('saved_views', JSON.stringify(updatedViews));
    setViews(updatedViews);
  };

  const handleSaveView = () => {
    if (!viewName.trim()) {
      alert('Please enter a view name');
      return;
    }

    const newView: SavedView = {
      id: `view-${Date.now()}`,
      name: viewName,
      description: viewDescription,
      filters: currentFilters,
      sortBy: currentSort.by,
      sortOrder: currentSort.order,
      createdAt: new Date().toISOString(),
      createdBy: currentUserId,
      shared: shareView,
    };

    const updatedViews = [...views, newView];
    saveViews(updatedViews);

    setViewName('');
    setViewDescription('');
    setShareView(false);
    setShowSaveModal(false);
  };

  const handleDeleteView = (viewId: string) => {
    if (window.confirm('Are you sure you want to delete this view?')) {
      const updatedViews = views.filter((v) => v.id !== viewId);
      saveViews(updatedViews);
    }
  };

  const handleLoadView = (view: SavedView) => {
    onLoadView(view);
    setIsOpen(false);
  };

  const getFilterSummary = (filters: FilterConfig): string => {
    const parts: string[] = [];

    if (filters.status.length > 0) {
      parts.push(`${filters.status.length} status`);
    }
    if (filters.type.length > 0) {
      parts.push(`${filters.type.length} type`);
    }
    if (filters.priority.length > 0) {
      parts.push(`${filters.priority.length} priority`);
    }
    if (filters.tags.length > 0) {
      parts.push(`${filters.tags.length} tags`);
    }
    if (filters.coverageStatus.length > 0) {
      parts.push(`${filters.coverageStatus.length} coverage`);
    }

    return parts.length > 0 ? parts.join(', ') : 'No filters';
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setShowSaveModal(true)}>
          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
            />
          </svg>
          Save View
        </Button>

        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            <span className="text-gray-700">Saved Views</span>
            {views.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                {views.length}
              </span>
            )}
          </button>

          {isOpen && (
            <div className="absolute top-full mt-2 right-0 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
              <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-900">Saved Views</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {views.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  No saved views yet. Save your current filters and sort to create a view.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {views.map((view) => (
                    <div
                      key={view.id}
                      className="p-3 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <button
                          onClick={() => handleLoadView(view)}
                          className="flex-1 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                              {view.name}
                            </h4>
                            {view.shared && (
                              <svg
                                className="h-3.5 w-3.5 text-blue-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                                />
                              </svg>
                            )}
                          </div>
                          {view.description && (
                            <p className="text-xs text-gray-600 mt-0.5">{view.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {getFilterSummary(view.filters)}
                          </p>
                        </button>
                        <button
                          onClick={() => handleDeleteView(view.id)}
                          className="ml-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save View Modal */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Save Current View"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              View Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={viewName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setViewName(e.target.value)}
              placeholder="e.g., High Priority Security Requirements"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <Input
              value={viewDescription}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setViewDescription(e.target.value)}
              placeholder="Brief description of this view..."
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={shareView}
                onChange={(e) => setShareView(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Share with team members (mock)
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Shared views will be visible to all team members
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="text-xs font-medium text-gray-700 mb-2">Current Filters:</h4>
            <p className="text-xs text-gray-600">{getFilterSummary(currentFilters)}</p>
            <p className="text-xs text-gray-600 mt-1">
              Sort: {currentSort.by} ({currentSort.order})
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowSaveModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveView}>
              Save View
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SavedViews;
