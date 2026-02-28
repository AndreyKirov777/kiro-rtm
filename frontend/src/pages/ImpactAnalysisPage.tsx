import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Loading, ErrorMessage } from '../components';
import { Requirement, TraceabilityLink } from '../types';
import MockApiClient from '../services/MockApiClient';

interface ImpactNode {
  requirement: Requirement;
  level: number;
  children: ImpactNode[];
  externalItems: TraceabilityLink[];
}

const ImpactAnalysisPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialReqId = searchParams.get('requirementId');
  
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [links, setLinks] = useState<TraceabilityLink[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string>(initialReqId || '');
  const [impactTree, setImpactTree] = useState<ImpactNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedRequirementId && requirements.length > 0 && links.length > 0) {
      buildImpactTree(selectedRequirementId);
    }
  }, [selectedRequirementId, requirements, links]);

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
      setError('Failed to load impact analysis data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const buildImpactTree = (rootId: string, visited = new Set<string>()): void => {
    const rootReq = requirements.find((r) => r.id === rootId);
    if (!rootReq) {
      setImpactTree(null);
      return;
    }

    const buildNode = (reqId: string, level: number): ImpactNode | null => {
      if (visited.has(reqId)) {
        // Prevent infinite loops in case of circular dependencies
        return null;
      }
      visited.add(reqId);

      const req = requirements.find((r) => r.id === reqId);
      if (!req) return null;

      // Find downstream links (where this requirement is the source)
      const downstreamLinks = links.filter((l) => l.sourceId === reqId);
      
      // Separate requirement links from external links
      const requirementLinks = downstreamLinks.filter((l) => l.targetType === 'requirement');
      const externalLinks = downstreamLinks.filter((l) => l.targetType === 'external');

      // Recursively build child nodes
      const children: ImpactNode[] = [];
      requirementLinks.forEach((link) => {
        const childNode = buildNode(link.targetId, level + 1);
        if (childNode) {
          children.push(childNode);
        }
      });

      return {
        requirement: req,
        level,
        children,
        externalItems: externalLinks,
      };
    };

    const tree = buildNode(rootId, 0);
    setImpactTree(tree);
    
    // Auto-expand first level
    if (tree) {
      setExpandedNodes(new Set([tree.requirement.id]));
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    if (!impactTree) return;
    
    const allIds = new Set<string>();
    const collectIds = (node: ImpactNode) => {
      allIds.add(node.requirement.id);
      node.children.forEach(collectIds);
    };
    collectIds(impactTree);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    if (impactTree) {
      setExpandedNodes(new Set([impactTree.requirement.id]));
    }
  };

  const countTotalImpact = (node: ImpactNode): number => {
    let count = node.children.length + node.externalItems.length;
    node.children.forEach((child) => {
      count += countTotalImpact(child);
    });
    return count;
  };

  const renderImpactNode = (node: ImpactNode): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.requirement.id);
    const hasChildren = node.children.length > 0 || node.externalItems.length > 0;
    const indentLevel = node.level * 24;

    return (
      <div key={node.requirement.id} className="mb-2">
        <div
          className="flex items-start gap-2 p-3 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
          style={{ marginLeft: `${indentLevel}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleNode(node.requirement.id)}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-sm font-medium text-blue-600 cursor-pointer hover:underline"
                onClick={() => navigate(`/requirements/${node.requirement.id}`)}
              >
                {node.requirement.displayId}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  node.requirement.status === 'approved'
                    ? 'bg-green-100 text-green-800'
                    : node.requirement.status === 'in_review'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {node.requirement.status.replace(/_/g, ' ').toUpperCase()}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  node.requirement.priority === 'critical'
                    ? 'bg-red-100 text-red-800'
                    : node.requirement.priority === 'high'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {node.requirement.priority.toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-gray-900">{node.requirement.title}</div>
            {hasChildren && (
              <div className="text-xs text-gray-500 mt-1">
                {node.children.length} requirement(s), {node.externalItems.length} external item(s)
              </div>
            )}
          </div>

          {node.level === 0 && (
            <div className="flex-shrink-0">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                ROOT
              </span>
            </div>
          )}
        </div>

        {isExpanded && (
          <>
            {/* External Items */}
            {node.externalItems.map((link) => (
              <div
                key={link.id}
                className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded ml-6 mb-2"
                style={{ marginLeft: `${indentLevel + 24}px` }}
              >
                <div className="w-6 flex items-center justify-center text-blue-600">
                  🔗
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-blue-600">
                      {link.externalId || link.targetId}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-200 text-blue-800 rounded text-xs">
                      {link.externalSystem?.toUpperCase() || 'EXTERNAL'}
                    </span>
                  </div>
                  {link.externalMetadata && (
                    <>
                      <div className="text-sm text-gray-900">
                        {link.externalMetadata.title}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Status: {link.externalMetadata.status}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Child Requirements */}
            {node.children.map((child) => renderImpactNode(child))}
          </>
        )}
      </div>
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading impact analysis..." />
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
              <h2 className="text-2xl font-bold text-gray-900">Impact Analysis</h2>
              <p className="text-gray-600 mt-1">
                Analyze downstream dependencies and affected items
              </p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/requirements')}>
              Back to Requirements
            </Button>
          </div>

          {/* Requirement Selector */}
          <div className="card mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Requirement to Analyze
            </label>
            <select
              value={selectedRequirementId}
              onChange={(e) => setSelectedRequirementId(e.target.value)}
              className="w-full max-w-2xl px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a requirement...</option>
              {requirements.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.displayId} - {req.title}
                </option>
              ))}
            </select>
          </div>

          {impactTree && (
            <>
              {/* Controls */}
              <div className="card mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={expandAll}>
                      Expand All
                    </Button>
                    <Button variant="secondary" size="sm" onClick={collapseAll}>
                      Collapse All
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    Total Impact: {countTotalImpact(impactTree)} item(s)
                  </div>
                </div>
              </div>

              {/* Impact Tree */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Impact Tree
                </h3>
                {renderImpactNode(impactTree)}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="card">
                  <div className="text-sm text-gray-600">Affected Requirements</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {(() => {
                      let count = 0;
                      const countReqs = (node: ImpactNode) => {
                        count += node.children.length;
                        node.children.forEach(countReqs);
                      };
                      countReqs(impactTree);
                      return count;
                    })()}
                  </div>
                </div>
                <div className="card">
                  <div className="text-sm text-gray-600">External Items</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {(() => {
                      let count = 0;
                      const countExternal = (node: ImpactNode) => {
                        count += node.externalItems.length;
                        node.children.forEach(countExternal);
                      };
                      countExternal(impactTree);
                      return count;
                    })()}
                  </div>
                </div>
                <div className="card">
                  <div className="text-sm text-gray-600">Max Depth</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {(() => {
                      let maxDepth = 0;
                      const findMaxDepth = (node: ImpactNode) => {
                        maxDepth = Math.max(maxDepth, node.level);
                        node.children.forEach(findMaxDepth);
                      };
                      findMaxDepth(impactTree);
                      return maxDepth;
                    })()}
                  </div>
                </div>
              </div>
            </>
          )}

          {!impactTree && selectedRequirementId && (
            <div className="card text-center py-8 text-gray-500">
              No impact data available for this requirement
            </div>
          )}

          {!selectedRequirementId && (
            <div className="card text-center py-8 text-gray-500">
              Select a requirement to view its impact analysis
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ImpactAnalysisPage;
