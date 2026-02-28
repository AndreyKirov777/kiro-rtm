import React, { useState, useEffect } from 'react';
import { Table, Button, Select, Loading, ErrorMessage } from '../components';
import { getMockRequirements, getMockBaselines, getMockElectronicSignatures } from '../services/mockData';
import { Requirement } from '../types';
import { useNavigate } from 'react-router-dom';

interface ComplianceGap {
  category: string;
  requirements: Requirement[];
  severity: 'critical' | 'high' | 'medium' | 'low';
}

const ComplianceGapReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>('');
  
  const [requirementsWithoutApproval, setRequirementsWithoutApproval] = useState<Requirement[]>([]);
  const [requirementsWithoutTests, setRequirementsWithoutTests] = useState<Requirement[]>([]);
  const [requirementsWithFailingTests, setRequirementsWithFailingTests] = useState<Requirement[]>([]);
  const [requirementsChangedSinceBaseline, setRequirementsChangedSinceBaseline] = useState<Requirement[]>([]);

  useEffect(() => {
    loadComplianceData();
  }, [projectFilter]);

  const loadComplianceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const requirements = getMockRequirements();
      const baselines = getMockBaselines();
      const signatures = getMockElectronicSignatures();
      
      // Filter by project if selected
      const filteredReqs = projectFilter 
        ? requirements.filter(req => req.projectId === projectFilter)
        : requirements;

      // 1. Requirements without approval (not in approved status)
      const withoutApproval = filteredReqs.filter(req => req.status !== 'approved');
      setRequirementsWithoutApproval(withoutApproval);

      // 2. Requirements without test coverage (no_test status)
      const withoutTests = filteredReqs.filter(req => req.coverageStatus === 'no_test');
      setRequirementsWithoutTests(withoutTests);

      // 3. Requirements with failing tests
      const withFailingTests = filteredReqs.filter(req => req.coverageStatus === 'failed');
      setRequirementsWithFailingTests(withFailingTests);

      // 4. Requirements changed since last locked baseline
      const lockedBaselines = baselines.filter(b => b.locked && (!projectFilter || b.projectId === projectFilter));
      if (lockedBaselines.length > 0) {
        // Get the most recent locked baseline
        const latestBaseline = lockedBaselines.sort((a, b) => 
          new Date(b.lockedAt!).getTime() - new Date(a.lockedAt!).getTime()
        )[0];
        
        const baselineDate = new Date(latestBaseline.lockedAt!);
        const changedSinceBaseline = filteredReqs.filter(req => 
          new Date(req.updatedAt) > baselineDate
        );
        setRequirementsChangedSinceBaseline(changedSinceBaseline);
      } else {
        setRequirementsChangedSinceBaseline([]);
      }
    } catch (err) {
      setError('Failed to load compliance data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      in_review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      deprecated: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getCoverageBadge = (coverage: string) => {
    const colors: Record<string, string> = {
      passed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      not_run: 'bg-yellow-100 text-yellow-800',
      no_test: 'bg-gray-100 text-gray-800',
    };
    return colors[coverage] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const columns = [
    {
      key: 'displayId',
      label: 'ID',
      render: (req: Requirement) => (
        <span className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
          {req.displayId}
        </span>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      render: (req: Requirement) => (
        <span className="text-sm text-gray-900">{req.title}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (req: Requirement) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(req.status)}`}>
          {req.status}
        </span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (req: Requirement) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityBadge(req.priority)}`}>
          {req.priority}
        </span>
      ),
    },
    {
      key: 'coverage',
      label: 'Coverage',
      render: (req: Requirement) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCoverageBadge(req.coverageStatus || 'no_test')}`}>
          {req.coverageStatus || 'no_test'}
        </span>
      ),
    },
  ];

  const handleRowClick = (req: Requirement) => {
    navigate(`/requirements/${req.id}`);
  };

  const exportReport = () => {
    // Mock export functionality
    const report = {
      generatedAt: new Date().toISOString(),
      projectFilter: projectFilter || 'All Projects',
      summary: {
        totalRequirements: getMockRequirements().length,
        withoutApproval: requirementsWithoutApproval.length,
        withoutTests: requirementsWithoutTests.length,
        withFailingTests: requirementsWithFailingTests.length,
        changedSinceBaseline: requirementsChangedSinceBaseline.length,
      },
      details: {
        requirementsWithoutApproval,
        requirementsWithoutTests,
        requirementsWithFailingTests,
        requirementsChangedSinceBaseline,
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-gap-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadComplianceData} />;
  }

  const totalGaps = requirementsWithoutApproval.length + 
                    requirementsWithoutTests.length + 
                    requirementsWithFailingTests.length + 
                    requirementsChangedSinceBaseline.length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Gap Report</h1>
          <p className="mt-2 text-gray-600">
            Identify requirements that need attention for regulatory compliance
          </p>
        </div>
        <Button onClick={exportReport}>
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Project:
          </label>
          <Select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-64"
          >
            <option value="">All Projects</option>
            <option value="proj-1">Medical Device Software</option>
            <option value="proj-2">Aerospace Control System</option>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Without Approval</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {requirementsWithoutApproval.length}
              </p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Without Tests</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {requirementsWithoutTests.length}
              </p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failing Tests</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {requirementsWithFailingTests.length}
              </p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Changed Since Baseline</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {requirementsChangedSinceBaseline.length}
              </p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Gap Details */}
      <div className="space-y-6">
        {/* Requirements Without Approval */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Requirements Without Approval ({requirementsWithoutApproval.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Requirements that are not in approved status
            </p>
          </div>
          {requirementsWithoutApproval.length > 0 ? (
            <Table
              data={requirementsWithoutApproval}
              columns={columns}
              onRowClick={handleRowClick}
            />
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              No requirements without approval
            </div>
          )}
        </div>

        {/* Requirements Without Test Coverage */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-yellow-50 px-6 py-4 border-b border-yellow-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Requirements Without Test Coverage ({requirementsWithoutTests.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Requirements with no linked test cases
            </p>
          </div>
          {requirementsWithoutTests.length > 0 ? (
            <Table
              data={requirementsWithoutTests}
              columns={columns}
              onRowClick={handleRowClick}
            />
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              All requirements have test coverage
            </div>
          )}
        </div>

        {/* Requirements With Failing Tests */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-red-50 px-6 py-4 border-b border-red-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Requirements With Failing Tests ({requirementsWithFailingTests.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Requirements with test cases that are currently failing
            </p>
          </div>
          {requirementsWithFailingTests.length > 0 ? (
            <Table
              data={requirementsWithFailingTests}
              columns={columns}
              onRowClick={handleRowClick}
            />
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              No requirements with failing tests
            </div>
          )}
        </div>

        {/* Requirements Changed Since Last Baseline */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Requirements Changed Since Last Baseline ({requirementsChangedSinceBaseline.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Requirements modified after the most recent locked baseline
            </p>
          </div>
          {requirementsChangedSinceBaseline.length > 0 ? (
            <Table
              data={requirementsChangedSinceBaseline}
              columns={columns}
              onRowClick={handleRowClick}
            />
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              No requirements changed since last baseline
            </div>
          )}
        </div>
      </div>

      {/* Overall Status */}
      {totalGaps === 0 && (
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-green-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            No Compliance Gaps Found
          </h3>
          <p className="text-green-700">
            All requirements meet compliance criteria
          </p>
        </div>
      )}
    </div>
  );
};

export default ComplianceGapReportPage;
