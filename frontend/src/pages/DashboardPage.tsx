import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">RMT Application</h1>
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
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-gray-600">
            Welcome to the Requirements Management & Traceability Application
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/requirements')}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Requirements</h3>
            <p className="text-gray-600 text-sm mb-4">
              View and manage all requirements
            </p>
            <Button variant="primary" size="sm">
              View Requirements
            </Button>
          </div>

          <div className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/traceability/matrix')}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Traceability Matrix</h3>
            <p className="text-gray-600 text-sm mb-4">
              View requirements coverage by test cases
            </p>
            <Button variant="primary" size="sm">
              View Matrix
            </Button>
          </div>

          <div className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/traceability/graph')}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Dependency Graph</h3>
            <p className="text-gray-600 text-sm mb-4">
              Visualize requirement relationships
            </p>
            <Button variant="primary" size="sm">
              View Graph
            </Button>
          </div>

          <div className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/traceability/impact')}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Impact Analysis</h3>
            <p className="text-gray-600 text-sm mb-4">
              Analyze downstream dependencies
            </p>
            <Button variant="primary" size="sm">
              Analyze Impact
            </Button>
          </div>

          <div className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/traceability/orphaned')}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Orphaned Requirements</h3>
            <p className="text-gray-600 text-sm mb-4">
              Find requirements without links
            </p>
            <Button variant="primary" size="sm">
              View Orphaned
            </Button>
          </div>

          <div className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/baselines')}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Baselines</h3>
            <p className="text-gray-600 text-sm mb-4">
              Manage requirement baselines
            </p>
            <Button variant="primary" size="sm">
              View Baselines
            </Button>
          </div>

          <div className="card hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Audit Trail</h3>
            <p className="text-gray-600 text-sm mb-4">
              View audit logs and history
            </p>
            <Button variant="secondary" size="sm" disabled>
              Coming Soon
            </Button>
          </div>

          <div className="card hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reports</h3>
            <p className="text-gray-600 text-sm mb-4">
              Generate compliance reports
            </p>
            <Button variant="secondary" size="sm" disabled>
              Coming Soon
            </Button>
          </div>

          <div className="card hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Settings</h3>
            <p className="text-gray-600 text-sm mb-4">
              Configure projects and workflows
            </p>
            <Button variant="secondary" size="sm" disabled>
              Coming Soon
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
