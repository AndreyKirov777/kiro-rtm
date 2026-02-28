import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { Button, Table, Loading, ErrorMessage, RequirementTree, SearchBar, FilterPanel, SavedViews } from '../components';
import ResponsiveNav from '../components/ResponsiveNav';
import KeyboardShortcutsHelp from '../components/KeyboardShortcutsHelp';
import { ExportModal } from '../components/ExportModal';
import { Requirement } from '../types';
import MockApiClient from '../services/MockApiClient';
import type { Column } from '../components/Table';
import type { FilterConfig } from '../components/FilterPanel';
import type { SavedView } from '../components/SavedViews';

const RequirementListPage: React.FC = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [filteredRequirements, setFilteredRequirements] = useState<Requirement[]>([]);
  const [displayedRequirements, setDisplayedRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  const [sortConfig, setSortConfig] = useState<{ by: string; order: 'asc' | 'desc' }>({
    by: 'displayId',
    order: 'asc',
  });
  const [currentFilters, setCurrentFilters] = useState<FilterConfig>({
    status: [],
    type: [],
    priority: [],
    tags: [],
    assignee: [],
    coverageStatus: [],
    customFields: {},
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const { user, logout } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const itemsPerPage = 10;

  const handleCreateRequirement = () => {
    navigate('/requirements/new');
  };

  // Keyboard shortcuts
  useKeyboardShortcut({ key: 'n', ctrl: true }, handleCreateRequirement);
  useKeyboardShortcut({ key: 'h', ctrl: true }, () => navigate('/'));
  useKeyboardShortcut({ key: '/', ctrl: true }, () => setShowShortcutsHelp(true));
  useKeyboardShortcut({ key: 'e', ctrl: true }, () => setShowExportModal(true));

  useEffect(() => {
    loadRequirements();
  }, []);

  useEffect(() => {
    // Apply search results to displayed requirements
    setDisplayedRequirements(filteredRequirements);
    setCurrentPage(1); // Reset to first page when filters change
  }, [filteredRequirements]);

  const loadRequirements = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await MockApiClient.getRequirements();
      setRequirements(data);
      setFilteredRequirements(data);
      setDisplayedRequirements(data);
    } catch (err) {
      const errorMessage = 'Failed to load requirements';
      setError(errorMessage);
      showError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchResults = (results: Requirement[]) => {
    setFilteredRequirements(results);
  };

  const handleFilterChange = (filtered: Requirement[]) => {
    setCurrentFilters(getCurrentFilters(filtered));
    setFilteredRequirements(filtered);
  };

  const getCurrentFilters = (_filtered: Requirement[]): FilterConfig => {
    // This is a simplified version - in reality, FilterPanel manages its own state
    return currentFilters;
  };

  const handleLoadView = (view: SavedView) => {
    // Apply the saved view's filters and sort
    setCurrentFilters(view.filters);
    setSortConfig({ by: view.sortBy, order: view.sortOrder });
    showSuccess(`Loaded view: ${view.name}`);
    
    // The FilterPanel will need to be updated to accept external filter state
    // For now, this is a mock implementation
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleReorder = async (updatedRequirements: Requirement[]) => {
    try {
      // Update each requirement that changed
      for (const req of updatedRequirements) {
        const original = requirements.find(r => r.id === req.id);
        if (original && original.parentId !== req.parentId) {
          await MockApiClient.updateRequirement(req.id, { parentId: req.parentId });
        }
      }
      setRequirements(updatedRequirements);
      setFilteredRequirements(updatedRequirements);
      setDisplayedRequirements(updatedRequirements);
      showSuccess('Requirements reordered successfully');
    } catch (err) {
      showError('Failed to reorder requirements');
      console.error(err);
    }
  };

  const columns: Column<Requirement>[] = [
    {
      key: 'displayId',
      header: 'ID',
      sortable: true,
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (req: Requirement) => req.type.replace(/_/g, ' ').toUpperCase(),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (req: Requirement) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            req.status === 'approved'
              ? 'bg-green-100 text-green-800'
              : req.status === 'in_review'
              ? 'bg-yellow-100 text-yellow-800'
              : req.status === 'draft'
              ? 'bg-gray-100 text-gray-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {req.status.replace(/_/g, ' ').toUpperCase()}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (req: Requirement) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            req.priority === 'critical'
              ? 'bg-red-100 text-red-800'
              : req.priority === 'high'
              ? 'bg-orange-100 text-orange-800'
              : req.priority === 'medium'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {req.priority.toUpperCase()}
        </span>
      ),
    },
  ];

  const paginatedData = displayedRequirements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(displayedRequirements.length / itemsPerPage);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading requirements..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ResponsiveNav
        userName={user?.name}
        userRole={user?.role}
        onLogout={handleLogout}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 stack-mobile justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Requirements</h2>
            <p className="text-gray-600">
              {displayedRequirements.length} of {requirements.length} requirements
              {displayedRequirements.length !== requirements.length && ' (filtered)'}
            </p>
          </div>
          <div className="flex-responsive items-center gap-3 full-width-mobile">
            <div className="flex bg-gray-100 rounded-lg p-1 full-width-mobile">
              <button
                onClick={() => setViewMode('table')}
                className={`flex-1 px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`flex-1 px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'tree'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tree
              </button>
            </div>
            <Button variant="secondary" onClick={() => setShowExportModal(true)} className="full-width-mobile">
              Export
            </Button>
            <Button variant="primary" onClick={handleCreateRequirement} className="full-width-mobile">
              Create Requirement
            </Button>
          </div>
        </div>

        {/* Search, Filter, and Saved Views */}
        <div className="mb-6 space-y-4">
          <div className="stack-mobile items-stretch gap-3">
            <div className="flex-1">
              <SearchBar
                requirements={requirements}
                onSearchResults={handleSearchResults}
              />
            </div>
            <div className="flex gap-2 full-width-mobile">
              <div className="flex-1">
                <FilterPanel
                  requirements={requirements}
                  onFilterChange={handleFilterChange}
                />
              </div>
              <SavedViews
                currentFilters={currentFilters}
                currentSort={sortConfig}
                onLoadView={handleLoadView}
                currentUserId={user?.id || ''}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorMessage message={error} onRetry={loadRequirements} />
          </div>
        )}

        {viewMode === 'table' ? (
          <div className="card">
            <Table
              columns={columns}
              data={paginatedData}
              keyExtractor={(req) => req.id}
              onRowClick={(req) => navigate(`/requirements/${req.id}`)}
              pagination={{
                currentPage,
                totalPages,
                onPageChange: setCurrentPage,
              }}
            />
          </div>
        ) : (
          <RequirementTree 
            requirements={displayedRequirements} 
            onReorder={handleReorder}
          />
        )}
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </div>
  );
};

export default RequirementListPage;
