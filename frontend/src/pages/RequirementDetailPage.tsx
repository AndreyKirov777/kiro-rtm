import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Loading, ErrorMessage, CommentSection, AttachmentList } from '../components';
import AddLinkModal from '../components/AddLinkModal';
import WorkflowActions from '../components/WorkflowActions';
import { Requirement, TraceabilityLink } from '../types';
import MockApiClient from '../services/MockApiClient';

const RequirementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [links, setLinks] = useState<TraceabilityLink[]>([]);
  const [parent, setParent] = useState<Requirement | null>(null);
  const [children, setChildren] = useState<Requirement[]>([]);
  const [allRequirements, setAllRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      loadRequirement(id);
      loadLinks(id);
      loadAllRequirements();
    }
  }, [id]);

  const loadRequirement = async (reqId: string) => {
    try {
      setIsLoading(true);
      const data = await MockApiClient.getRequirement(reqId);
      if (data) {
        setRequirement(data);
        setError('');
      } else {
        setError('Requirement not found');
      }
    } catch (err) {
      setError('Failed to load requirement');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLinks = async (reqId: string) => {
    try {
      const data = await MockApiClient.getLinks(reqId);
      setLinks(data);
    } catch (err) {
      console.error('Failed to load links:', err);
    }
  };

  const loadAllRequirements = async () => {
    try {
      const data = await MockApiClient.getRequirements();
      setAllRequirements(data);
    } catch (err) {
      console.error('Failed to load all requirements:', err);
    }
  };

  useEffect(() => {
    if (requirement && allRequirements.length > 0) {
      // Find parent
      if (requirement.parentId) {
        const parentReq = allRequirements.find(r => r.id === requirement.parentId);
        setParent(parentReq || null);
      } else {
        setParent(null);
      }
      
      // Find children
      const childReqs = allRequirements.filter(r => r.parentId === requirement.id);
      setChildren(childReqs);
    }
  }, [requirement, allRequirements]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleEdit = () => {
    navigate(`/requirements/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this requirement?')) {
      return;
    }
    try {
      await MockApiClient.deleteRequirement(id);
      navigate('/requirements');
    } catch (err) {
      alert('Failed to delete requirement');
      console.error(err);
    }
  };

  const getLinkTypeLabel = (linkType: string): string => {
    return linkType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading requirement..." />
      </div>
    );
  }

  if (error || !requirement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage message={error || 'Requirement not found'} onRetry={() => id && loadRequirement(id)} />
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
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/requirements')}>
            ← Back to Requirements
          </Button>
        </div>

        <div className="card mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-500">{requirement.displayId}</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    requirement.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : requirement.status === 'in_review'
                      ? 'bg-yellow-100 text-yellow-800'
                      : requirement.status === 'draft'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {requirement.status.replace(/_/g, ' ').toUpperCase()}
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    requirement.priority === 'critical'
                      ? 'bg-red-100 text-red-800'
                      : requirement.priority === 'high'
                      ? 'bg-orange-100 text-orange-800'
                      : requirement.priority === 'medium'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {requirement.priority.toUpperCase()}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{requirement.title}</h2>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate(`/requirements/${id}/history`)}>
                View History
              </Button>
              <Button variant="secondary" size="sm" onClick={handleEdit}>
                Edit
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
              <p className="text-gray-900">{requirement.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Type</h3>
                <p className="text-gray-900">{requirement.type.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Version</h3>
                <p className="text-gray-900">{requirement.version}</p>
              </div>
            </div>

            {requirement.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Tags</h3>
                <div className="flex gap-2">
                  {requirement.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Created:</span> {new Date(requirement.createdAt).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">Updated:</span> {new Date(requirement.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Hierarchy Section */}
        {(parent || children.length > 0) && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hierarchy</h3>
            
            {parent && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Parent Requirement</h4>
                <div 
                  className="p-3 bg-gray-50 rounded border border-gray-200 cursor-pointer hover:bg-gray-100"
                  onClick={() => navigate(`/requirements/${parent.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-600">{parent.displayId}</span>
                    <span className="text-sm text-gray-900">{parent.title}</span>
                  </div>
                </div>
              </div>
            )}

            {children.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Child Requirements ({children.length})</h4>
                <div className="space-y-2">
                  {children.map((child) => (
                    <div 
                      key={child.id}
                      className="p-3 bg-gray-50 rounded border border-gray-200 cursor-pointer hover:bg-gray-100"
                      onClick={() => navigate(`/requirements/${child.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-blue-600">{child.displayId}</span>
                        <span className="text-sm text-gray-900">{child.title}</span>
                        <span
                          className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
                            child.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : child.status === 'in_review'
                              ? 'bg-yellow-100 text-yellow-800'
                              : child.status === 'draft'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {child.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Traceability Links Section */}
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Traceability Links ({links.length})
            </h3>
            <Button variant="secondary" size="sm" onClick={() => setIsAddLinkModalOpen(true)}>
              Add Link
            </Button>
          </div>
          
          {links.length === 0 ? (
            <p className="text-gray-600 text-sm">No traceability links</p>
          ) : (
            <div className="space-y-3">
              {links.map((link) => {
                const isSource = link.sourceId === id;
                const linkedId = isSource ? link.targetId : link.sourceId;
                const linkedReq = allRequirements.find(r => r.id === linkedId);
                
                return (
                  <div key={link.id} className="p-3 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-500">
                            {getLinkTypeLabel(link.linkType)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {isSource ? '→' : '←'}
                          </span>
                        </div>
                        
                        {link.targetType === 'external' && link.externalMetadata ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-blue-600">{link.externalId}</span>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                                {link.externalSystem?.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 mt-1">{link.externalMetadata.title}</p>
                            <p className="text-xs text-gray-600 mt-1">Status: {link.externalMetadata.status}</p>
                          </div>
                        ) : linkedReq ? (
                          <div 
                            className="cursor-pointer hover:text-blue-600"
                            onClick={() => navigate(`/requirements/${linkedReq.id}`)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-blue-600">{linkedReq.displayId}</span>
                              <span className="text-sm text-gray-900">{linkedReq.title}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Linked requirement not found</p>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={async () => {
                          if (window.confirm('Delete this link?')) {
                            try {
                              await MockApiClient.deleteLink(link.id);
                              setLinks(links.filter(l => l.id !== link.id));
                            } catch (err) {
                              alert('Failed to delete link');
                            }
                          }
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Workflow Actions Section */}
        <div className="mb-6">
          <WorkflowActions 
            requirement={requirement} 
            onUpdate={(updated) => setRequirement(updated)} 
          />
        </div>

        {/* Attachments Section */}
        <div className="card mb-6">
          <AttachmentList requirementId={id || ''} />
        </div>

        {/* Comments Section */}
        <div className="card">
          <CommentSection requirementId={id || ''} />
        </div>
      </main>

      {/* Add Link Modal */}
      <AddLinkModal
        isOpen={isAddLinkModalOpen}
        onClose={() => setIsAddLinkModalOpen(false)}
        sourceRequirementId={id || ''}
        onLinkCreated={() => {
          if (id) loadLinks(id);
        }}
      />
    </div>
  );
};

export default RequirementDetailPage;
