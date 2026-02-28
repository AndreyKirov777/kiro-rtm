import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Loading, ErrorMessage } from '../components';
import { Requirement, TraceabilityLink } from '../types';
import MockApiClient from '../services/MockApiClient';

interface GraphNode {
  id: string;
  x: number;
  y: number;
  requirement: Requirement;
}

interface GraphEdge {
  source: string;
  target: string;
  link: TraceabilityLink;
}

const DependencyGraphPage: React.FC = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [links, setLinks] = useState<TraceabilityLink[]>([]);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (requirements.length > 0 && links.length > 0) {
      buildGraph();
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
      setLinks(linkData.filter(l => l.targetType === 'requirement')); // Only requirement-to-requirement links
      setError('');
    } catch (err) {
      setError('Failed to load graph data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const buildGraph = () => {
    // Create nodes with force-directed layout simulation (simplified)
    const nodeMap = new Map<string, GraphNode>();
    const centerX = 400;
    const centerY = 300;
    const radius = 200;
    
    requirements.forEach((req, index) => {
      const angle = (index / requirements.length) * 2 * Math.PI;
      nodeMap.set(req.id, {
        id: req.id,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        requirement: req,
      });
    });

    // Create edges
    const graphEdges: GraphEdge[] = [];
    links.forEach((link) => {
      if (nodeMap.has(link.sourceId) && nodeMap.has(link.targetId)) {
        graphEdges.push({
          source: link.sourceId,
          target: link.targetId,
          link,
        });
      }
    });

    setNodes(Array.from(nodeMap.values()));
    setEdges(graphEdges);
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
  };

  const handleNodeDoubleClick = (nodeId: string) => {
    navigate(`/requirements/${nodeId}`);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev / 1.2, 0.3));
  };

  const handleResetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNodeColor = (req: Requirement): string => {
    switch (req.status) {
      case 'approved':
        return '#10b981'; // green
      case 'in_review':
        return '#f59e0b'; // yellow
      case 'draft':
        return '#6b7280'; // gray
      case 'deprecated':
        return '#ef4444'; // red
      default:
        return '#6b7280';
    }
  };

  const getEdgeColor = (linkType: string): string => {
    switch (linkType) {
      case 'derives_from':
        return '#3b82f6'; // blue
      case 'refines':
        return '#8b5cf6'; // purple
      case 'satisfies':
        return '#10b981'; // green
      case 'verified_by':
        return '#06b6d4'; // cyan
      case 'conflicts_with':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const selectedNodeData = selectedNode
    ? nodes.find((n) => n.id === selectedNode)
    : null;

  const connectedNodes = selectedNode
    ? new Set([
        ...edges.filter((e) => e.source === selectedNode).map((e) => e.target),
        ...edges.filter((e) => e.target === selectedNode).map((e) => e.source),
      ])
    : new Set();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading dependency graph..." />
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
              <h2 className="text-2xl font-bold text-gray-900">Dependency Graph</h2>
              <p className="text-gray-600 mt-1">
                Visual representation of requirement relationships
              </p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/requirements')}>
              Back to Requirements
            </Button>
          </div>

          {/* Controls */}
          <div className="card mb-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleZoomIn}>
                  Zoom In (+)
                </Button>
                <Button variant="secondary" size="sm" onClick={handleZoomOut}>
                  Zoom Out (−)
                </Button>
                <Button variant="secondary" size="sm" onClick={handleResetView}>
                  Reset View
                </Button>
              </div>
              <div className="text-sm text-gray-600">
                Click to select • Double-click to open • Drag to pan
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="card mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Status Colors</h3>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span>Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span>In Review</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                <span>Draft</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span>Deprecated</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Graph Visualization */}
          <div className="col-span-2">
            <div className="card p-0 overflow-hidden">
              <svg
                ref={svgRef}
                width="100%"
                height="600"
                className="bg-white cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
                  {/* Edges */}
                  {edges.map((edge, index) => {
                    const sourceNode = nodes.find((n) => n.id === edge.source);
                    const targetNode = nodes.find((n) => n.id === edge.target);
                    if (!sourceNode || !targetNode) return null;

                    const isHighlighted =
                      selectedNode &&
                      (edge.source === selectedNode || edge.target === selectedNode);

                    return (
                      <g key={`edge-${index}`}>
                        <line
                          x1={sourceNode.x}
                          y1={sourceNode.y}
                          x2={targetNode.x}
                          y2={targetNode.y}
                          stroke={getEdgeColor(edge.link.linkType)}
                          strokeWidth={isHighlighted ? 3 : 1.5}
                          strokeOpacity={isHighlighted ? 1 : 0.4}
                          markerEnd="url(#arrowhead)"
                        />
                      </g>
                    );
                  })}

                  {/* Arrow marker definition */}
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="10"
                      markerHeight="10"
                      refX="9"
                      refY="3"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3, 0 6" fill="#6b7280" />
                    </marker>
                  </defs>

                  {/* Nodes */}
                  {nodes.map((node) => {
                    const isSelected = selectedNode === node.id;
                    const isConnected = connectedNodes.has(node.id);
                    const opacity =
                      !selectedNode || isSelected || isConnected ? 1 : 0.3;

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => handleNodeClick(node.id)}
                        onDoubleClick={() => handleNodeDoubleClick(node.id)}
                        style={{ cursor: 'pointer' }}
                        opacity={opacity}
                      >
                        <circle
                          r={isSelected ? 35 : 30}
                          fill={getNodeColor(node.requirement)}
                          stroke={isSelected ? '#1f2937' : '#fff'}
                          strokeWidth={isSelected ? 3 : 2}
                        />
                        <text
                          textAnchor="middle"
                          dy="0.3em"
                          fill="white"
                          fontSize="12"
                          fontWeight="bold"
                        >
                          {node.requirement.displayId}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>

          {/* Details Panel */}
          <div className="col-span-1">
            <div className="card sticky top-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedNodeData ? 'Requirement Details' : 'Graph Statistics'}
              </h3>

              {selectedNodeData ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700">
                      {selectedNodeData.requirement.displayId}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 mt-1">
                      {selectedNodeData.requirement.title}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600">Status</div>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${
                        selectedNodeData.requirement.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : selectedNodeData.requirement.status === 'in_review'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {selectedNodeData.requirement.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600">Priority</div>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${
                        selectedNodeData.requirement.priority === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : selectedNodeData.requirement.priority === 'high'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {selectedNodeData.requirement.priority.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-2">Connections</div>
                    <div className="text-sm">
                      <div>
                        Outgoing:{' '}
                        {edges.filter((e) => e.source === selectedNode).length}
                      </div>
                      <div>
                        Incoming:{' '}
                        {edges.filter((e) => e.target === selectedNode).length}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/requirements/${selectedNode}`)}
                      className="w-full"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600">Total Requirements</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {nodes.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Links</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {edges.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Average Connections</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {nodes.length > 0
                        ? ((edges.length * 2) / nodes.length).toFixed(1)
                        : 0}
                    </div>
                  </div>
                  <div className="pt-4 border-t text-sm text-gray-600">
                    Click on a node to see details
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DependencyGraphPage;
