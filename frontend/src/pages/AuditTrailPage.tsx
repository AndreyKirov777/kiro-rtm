import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Loading, ErrorMessage } from '../components';
import { getMockAuditEntries } from '../services/mockData';
import { AuditEntry } from '../types';

const AuditTrailPage: React.FC = () => {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');
  const [entityIdFilter, setEntityIdFilter] = useState<string>('');
  const [actorFilter, setActorFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');

  useEffect(() => {
    loadAuditEntries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [auditEntries, entityTypeFilter, entityIdFilter, actorFilter, actionFilter, dateFromFilter, dateToFilter]);

  const loadAuditEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const entries = getMockAuditEntries();
      setAuditEntries(entries);
    } catch (err) {
      setError('Failed to load audit entries');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...auditEntries];

    // Filter by entity type
    if (entityTypeFilter) {
      filtered = filtered.filter(entry => entry.entityType === entityTypeFilter);
    }

    // Filter by entity ID or display ID
    if (entityIdFilter) {
      const searchTerm = entityIdFilter.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.entityId.toLowerCase().includes(searchTerm) ||
        (entry.entityDisplayId && entry.entityDisplayId.toLowerCase().includes(searchTerm))
      );
    }

    // Filter by actor
    if (actorFilter) {
      const searchTerm = actorFilter.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.actorName.toLowerCase().includes(searchTerm) ||
        entry.actorId.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by action
    if (actionFilter) {
      filtered = filtered.filter(entry => entry.action === actionFilter);
    }

    // Filter by date range
    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter);
      filtered = filtered.filter(entry => new Date(entry.timestamp) >= fromDate);
    }

    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(entry => new Date(entry.timestamp) <= toDate);
    }

    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setFilteredEntries(filtered);
  };

  const clearFilters = () => {
    setEntityTypeFilter('');
    setEntityIdFilter('');
    setActorFilter('');
    setActionFilter('');
    setDateFromFilter('');
    setDateToFilter('');
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getActorTypeBadge = (actorType: string) => {
    const colors: Record<string, string> = {
      user: 'bg-blue-100 text-blue-800',
      api_client: 'bg-purple-100 text-purple-800',
      system: 'bg-gray-100 text-gray-800',
    };
    return colors[actorType] || 'bg-gray-100 text-gray-800';
  };

  const getEntityTypeBadge = (entityType: string) => {
    const colors: Record<string, string> = {
      requirement: 'bg-green-100 text-green-800',
      traceability_link: 'bg-yellow-100 text-yellow-800',
      baseline: 'bg-indigo-100 text-indigo-800',
      comment: 'bg-pink-100 text-pink-800',
    };
    return colors[entityType] || 'bg-gray-100 text-gray-800';
  };

  // Get unique values for dropdowns
  const uniqueEntityTypes = Array.from(new Set(auditEntries.map(e => e.entityType)));
  const uniqueActions = Array.from(new Set(auditEntries.map(e => e.action)));

  const columns = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      render: (entry: AuditEntry) => (
        <span className="text-sm text-gray-900">{formatTimestamp(entry.timestamp)}</span>
      ),
    },
    {
      key: 'actor',
      label: 'Actor',
      render: (entry: AuditEntry) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{entry.actorName}</div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActorTypeBadge(entry.actorType)}`}>
            {entry.actorType}
          </span>
        </div>
      ),
    },
    {
      key: 'entity',
      label: 'Entity',
      render: (entry: AuditEntry) => (
        <div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEntityTypeBadge(entry.entityType)}`}>
            {entry.entityType}
          </span>
          {entry.entityDisplayId && (
            <div className="text-sm text-gray-600 mt-1">{entry.entityDisplayId}</div>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (entry: AuditEntry) => (
        <span className="text-sm font-medium text-gray-900">{entry.action}</span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (entry: AuditEntry) => (
        <span className="text-sm text-gray-700">{entry.changeDescription}</span>
      ),
    },
  ];

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadAuditEntries} />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Audit Trail</h1>
        <p className="mt-2 text-gray-600">
          Immutable log of all changes to requirements and related entities
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type
            </label>
            <Select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="w-full"
            >
              <option value="">All Types</option>
              {uniqueEntityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity ID / Display ID
            </label>
            <Input
              type="text"
              value={entityIdFilter}
              onChange={(e) => setEntityIdFilter(e.target.value)}
              placeholder="Search by ID..."
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actor
            </label>
            <Input
              type="text"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              placeholder="Search by actor name..."
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <Select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full"
            >
              <option value="">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <Input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date To
            </label>
            <Input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={clearFilters} variant="secondary">
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredEntries.length} of {auditEntries.length} audit entries
        </p>
      </div>

      {/* Audit Entries Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <Table
          data={filteredEntries}
          columns={columns}
          onRowClick={(entry) => {
            // Show details in a modal or expand row
            console.log('Audit entry details:', entry);
          }}
        />
      </div>

      {filteredEntries.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No audit entries found matching the filters.</p>
        </div>
      )}
    </div>
  );
};

export default AuditTrailPage;
