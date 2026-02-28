import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Loading, ErrorMessage } from '../components';
import { Requirement, TraceabilityLink } from '../types';
import MockApiClient from '../services/MockApiClient';

type SortField = 'displayId' | 'title' | 'status' | 'priority' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const OrphanedRequirementsPage: React.FC = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [links, setLinks] = useState<TraceabilityLink[]>([]);
  const [orphanedRequirements, setOrphanedRequirements] = useState<Requirement[]>([]);
  const [filteredRequirements, setFilteredRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<SortField>('displayId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    priority: '',
  });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (requirements.length > 0 && links.length > 0) {
      identifyOrphanedRequirements();
    }
  }, [requirements, links]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [orphanedRequirements, filters, sortField, sortDirection]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [reqData, linkData] = await Promise.all([
        MockApiClient.getRequirements(),
        MockApiClient.getLinks(),
      ]);
      
      setRequirements(reqData);
      setLinks(linkData);
      setError('');
    } catch (err) {
      setError('Failed to load requirements data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const identifyOrphanedRequirements = () => {
    // A requirement is orphaned if it has no downstream traceability links
    // (i.e., it's not the source of any links)
    const requirementsWithDownstreamLinks = new Set<string>();
    
    links.forEach((link) => {
      requirementsWithDownstreamLinks.add(link.sourceId);
    });

    const orphaned = requirements.filter((req) => {
      return !requirementsWithDownstreamLinks.has(req.id);
    });

    setOrphanedRequirements(orphaned);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...orphanedRequirements];

    // Apply filters
    if (filters.status) {
      filtered = filtered.filter((req) => req.status === filters.status);
    }
    if (filters.type) {
      filtered = filtered.filter((req) => req.type === filters.type);
    }
    if (filters.priority) {
      filtered = filtered.filter((req) => req.priority === filters.priority);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle date fields
      if (sortField === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredRequirements(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      type: '',
      priority: '',
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading orphaned requirements..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage message={error} onRetry={loadData} />
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

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Orphaned Requirements</h2>
              <p className="text-gray-600 mt-1">
                Requirements with no downstream traceability links
              </p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/requirements')}>
              Back to Requirements
            </Button>
          </div>

          {/* Alert Banner */}
          {orphanedRequirements.length > 0 && (
            <div className="card bg-yellow-50 border-yellow-200 mb-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-900 mb-1">
                    {orphanedRequirements.length} Orphaned Requirement(s) Found
                  </h3>
                  <p className="text-sm text-yellow-800">
                    These requirements have no downstream traceability links to implementation items or tests.
                    Consider adding links to ensure proper coverage and traceability.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="card mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="in_review">In Review</option>
                  <option value="approved">Approved</option>
                  <option value="deprecated">Deprecated</option>
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="stakeholder_need">Stakeholder Need</option>
                  <option value="system_requirement">System Requirement</option>
                  <option value="software_requirement">Software Requirement</option>
                  <option value="hardware_requirement">Hardware Requirement</option>
                  <option value="constraint">Constraint</option>
                  <option value="interface_requirement">Interface Requirement</option>
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Requirements Table */}
          <div className="card overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('displayId')}
                  >
                    ID {getSortIcon('displayId')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('title')}
                  >
                    Title {getSortIcon('title')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    Status {getSortIcon('status')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('priority')}
                  >
                    Priority {getSortIcon('priority')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('createdAt')}
                  >
                    Created {getSortIcon('createdAt')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequirements.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-blue-600">
                        {req.displayId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{req.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {req.type.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
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
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
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
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/requirements/${req.id}`)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRequirements.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {orphanedRequirements.length === 0
                  ? '✓ No orphaned requirements found. All requirements have downstream links.'
                  : 'No requirements match the current filters'}
              </div>
            )}
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="card">
              <div className="text-sm text-gray-600">Total Requirements</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {requirements.length}
              </div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-600">Orphaned</div>
              <div className="text-2xl font-bold text-yellow-600 mt-1">
                {orphanedRequirements.length}
              </div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-600">With Links</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {requirements.length - orphanedRequirements.length}
              </div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-600">Coverage Rate</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {requirements.length > 0
                  ? Math.round(
                      ((requirements.length - orphanedRequirements.length) /
                        requirements.length) *
                        100
                    )
                  : 0}
                %
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrphanedRequirementsPage;
