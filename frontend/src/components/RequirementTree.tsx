import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Requirement } from '../types';

interface RequirementTreeProps {
  requirements: Requirement[];
  onReorder?: (requirements: Requirement[]) => void;
}

interface TreeNode {
  requirement: Requirement;
  children: TreeNode[];
}

const RequirementTree: React.FC<RequirementTreeProps> = ({ requirements, onReorder }) => {
  const navigate = useNavigate();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // Build tree structure
  const buildTree = (reqs: Requirement[]): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // Create nodes
    reqs.forEach(req => {
      nodeMap.set(req.id, { requirement: req, children: [] });
    });

    // Build hierarchy
    reqs.forEach(req => {
      const node = nodeMap.get(req.id)!;
      if (req.parentId && nodeMap.has(req.parentId)) {
        nodeMap.get(req.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const tree = buildTree(requirements);

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const handleDragStart = (e: React.DragEvent, reqId: string) => {
    setDraggedItem(reqId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || draggedItem === targetId || !onReorder) {
      setDraggedItem(null);
      return;
    }

    // Update parent relationship
    const updatedRequirements = requirements.map(req => {
      if (req.id === draggedItem) {
        return { ...req, parentId: targetId };
      }
      return req;
    });

    onReorder(updatedRequirements);
    setDraggedItem(null);
  };

  const handleDropAsRoot = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || !onReorder) {
      setDraggedItem(null);
      return;
    }

    // Update to root level
    const updatedRequirements = requirements.map(req => {
      if (req.id === draggedItem) {
        return { ...req, parentId: null };
      }
      return req;
    });

    onReorder(updatedRequirements);
    setDraggedItem(null);
  };

  const renderNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.requirement.id);
    const hasChildren = node.children.length > 0;
    const isDragging = draggedItem === node.requirement.id;

    return (
      <div key={node.requirement.id} className="select-none">
        <div
          className={`flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer ${
            isDragging ? 'opacity-50' : ''
          }`}
          style={{ paddingLeft: `${level * 24 + 8}px` }}
          draggable
          onDragStart={(e) => handleDragStart(e, node.requirement.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, node.requirement.id)}
        >
          {/* Expand/Collapse Icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) {
                toggleNode(node.requirement.id);
              }
            }}
            className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700"
          >
            {hasChildren ? (
              isExpanded ? (
                <span>▼</span>
              ) : (
                <span>▶</span>
              )
            ) : (
              <span className="text-gray-300">•</span>
            )}
          </button>

          {/* Requirement Info */}
          <div
            className="flex-1 flex items-center gap-2"
            onClick={() => navigate(`/requirements/${node.requirement.id}`)}
          >
            <span className="text-sm font-medium text-blue-600">
              {node.requirement.displayId}
            </span>
            <span className="text-sm text-gray-900 flex-1">
              {node.requirement.title}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                node.requirement.status === 'approved'
                  ? 'bg-green-100 text-green-800'
                  : node.requirement.status === 'in_review'
                  ? 'bg-yellow-100 text-yellow-800'
                  : node.requirement.status === 'draft'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-red-100 text-red-800'
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
                  : node.requirement.priority === 'medium'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {node.requirement.priority.toUpperCase()}
            </span>
          </div>

          {/* Drag Handle */}
          <div className="text-gray-400 cursor-move">
            <span>⋮⋮</span>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="border rounded-lg bg-white"
      onDragOver={handleDragOver}
      onDrop={handleDropAsRoot}
    >
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Requirement Hierarchy
          </h3>
          <button
            onClick={() => {
              const allIds = new Set(requirements.map(r => r.id));
              setExpandedNodes(
                expandedNodes.size === allIds.size ? new Set() : allIds
              );
            }}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {expandedNodes.size === requirements.length ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
        {onReorder && (
          <p className="text-xs text-gray-600 mt-1">
            Drag and drop requirements to reorganize the hierarchy
          </p>
        )}
      </div>

      <div className="p-2">
        {tree.length === 0 ? (
          <p className="text-gray-600 text-sm p-4 text-center">
            No requirements found
          </p>
        ) : (
          tree.map(node => renderNode(node))
        )}
      </div>
    </div>
  );
};

export default RequirementTree;
