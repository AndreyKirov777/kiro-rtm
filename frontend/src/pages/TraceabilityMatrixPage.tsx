import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Loading, ErrorMessage, FilterPanel } from '../components';
import { Requirement, TraceabilityLink, CoverageStatus } from '../types';
import MockApiClient from '../services/MockApiClient';

interface MatrixCell {
  requirementId: string;
  testId: string;
  status: CoverageStatus;
}

const TraceabilityMatrixPage: React.FC = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [links, setLinks] = useState<TraceabilityLink[]>([]);
  const [testCases, setTestCases] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<Map<string, MatrixCell>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [matrixFilteredRequirements, setMatrixFilteredRequirements] = useState<Requirement[]>([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (requirements.length > 0 && links.length > 0) {
      buildMatrix();
    }
  }, [requirements, links]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [reqData, linkData] = await Promise.all([
        MockApiClient.getRequirements(),
        MockApiClient.getLinks(),
      ]);
      
      setRequirements(reqData);
      setMatrixFilteredRequirements(reqData);
      setLinks(linkData);
      
      // Extract unique test cases from external links
      const tests = new Set<string>();
      linkData.forEach((link) => {
        if (link.targetType === 'external' && link.linkType === 'verified_by') {
          tests.add(link.externalId || link.targetId);
        }
      });
      
      // Add some mock test cases if none exist
      if (tests.size === 0) {
        tests.add('TEST-001');
        tests.add('TEST-002');
        tests.add('TEST-003');
      }
      
      setTestCases(Array.from(tests));
      setError('');
    } catch (err) {
      setError('Failed to load traceability data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const buildMatrix = () => {
    const matrixData = new Map<string, MatrixCell>();
    
    // Build matrix from links
    links.forEach((link) => {
      if (link.targetType === 'external' && link.linkType === 'verified_by') {
        const testId = link.externalId || link.targetId;
        const key = `${link.sourceId}-${testId}`;
        
        // Get coverage status from requirement or external metadata
        const req = requirements.find((r) => r.id === link.sourceId);
        const status = link.externalMetadata?.status === 'Passed' 
          ? 'passed' 
          : link.externalMetadata?.status === 'Failed'
          ? 'failed'
          : req?.coverageStatus || 'not_run';
        
        matrixData.set(key, {
          requirementId: link.sourceId,
          testId,
          status: status as CoverageStatus,
        });
      }
    });
    
    setMatrix(matrixData);
  };

  const getCellStatus = (reqId: string, testId: string): CoverageStatus => {
    const key = `${reqId}-${testId}`;
    const cell = matrix.get(key);
    return cell?.status || 'no_test';
  };

  const getCellColor = (status: CoverageStatus): string => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'not_run':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'no_test':
        return 'bg-gray-100 text-gray-500 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-500 border-gray-300';
    }
  };

  const getStatusLabel = (status: CoverageStatus): string => {
    switch (status) {
      case 'passed':
        return '✓';
      case 'failed':
        return '✗';
      case 'not_run':
        return '○';
      case 'no_test':
        return '−';
      default:
        return '−';
    }
  };

  const handleExport = () => {
    alert('Export functionality - Coming soon (CSV/PDF export)');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading traceability matrix..." />
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
              <h2 className="text-2xl font-bold text-gray-900">Traceability Matrix</h2>
              <p className="text-gray-600 mt-1">
                Requirements coverage by test cases
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleExport}>
                Export
              </Button>
              <Button variant="ghost" onClick={() => navigate('/requirements')}>
                Back to Requirements
              </Button>
            </div>
          </div>

          {/* Legend */}
          <div className="card mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Legend</h3>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded border ${getCellColor('passed')}`}>
                  {getStatusLabel('passed')}
                </span>
                <span>Passed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded border ${getCellColor('failed')}`}>
                  {getStatusLabel('failed')}
                </span>
                <span>Failed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded border ${getCellColor('not_run')}`}>
                  {getStatusLabel('not_run')}
                </span>
                <span>Not Run</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded border ${getCellColor('no_test')}`}>
                  {getStatusLabel('no_test')}
                </span>
                <span>No Test</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <FilterPanel requirements={requirements} onFilterChange={setMatrixFilteredRequirements} />
        </div>

        {/* Matrix */}
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                  Requirement
                </th>
                {testCases.map((testId) => (
                  <th
                    key={testId}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]"
                  >
                    {testId}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {matrixFilteredRequirements.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-gray-200">
                    <div
                      className="cursor-pointer hover:text-blue-600"
                      onClick={() => navigate(`/requirements/${req.id}`)}
                    >
                      <div className="text-sm font-medium text-blue-600">
                        {req.displayId}
                      </div>
                      <div className="text-sm text-gray-900 truncate max-w-xs">
                        {req.title}
                      </div>
                      <div className="flex gap-1 mt-1">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            req.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : req.status === 'in_review'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {req.status}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            req.priority === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : req.priority === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {req.priority}
                        </span>
                      </div>
                    </div>
                  </td>
                  {testCases.map((testId) => {
                    const status = getCellStatus(req.id, testId);
                    return (
                      <td
                        key={`${req.id}-${testId}`}
                        className="px-4 py-3 text-center"
                      >
                        <span
                          className={`inline-block px-3 py-1 rounded border font-medium ${getCellColor(
                            status
                          )}`}
                          title={status.replace(/_/g, ' ').toUpperCase()}
                        >
                          {getStatusLabel(status)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {matrixFilteredRequirements.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No requirements match the current filters
            </div>
          )}
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="card">
            <div className="text-sm text-gray-600">Total Requirements</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {matrixFilteredRequirements.length}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Test Cases</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {testCases.length}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Coverage</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {matrixFilteredRequirements.length > 0
                ? Math.round(
                    (matrixFilteredRequirements.filter((r) => r.coverageStatus !== 'no_test').length /
                      matrixFilteredRequirements.length) *
                      100
                  )
                : 0}
              %
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Passed</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {matrixFilteredRequirements.filter((r) => r.coverageStatus === 'passed').length}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TraceabilityMatrixPage;
