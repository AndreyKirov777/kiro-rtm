import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import RequirementDetailPage from './pages/RequirementDetailPage';
import RequirementFormPage from './pages/RequirementFormPage';
import TraceabilityMatrixPage from './pages/TraceabilityMatrixPage';
import DependencyGraphPage from './pages/DependencyGraphPage';
import ImpactAnalysisPage from './pages/ImpactAnalysisPage';
import OrphanedRequirementsPage from './pages/OrphanedRequirementsPage';
import BaselineManagementPage from './pages/BaselineManagementPage';
import BaselineComparisonPage from './pages/BaselineComparisonPage';
import RevisionHistoryPage from './pages/RevisionHistoryPage';
import WorkflowConfigurationPage from './pages/WorkflowConfigurationPage';
import ProjectManagementPage from './pages/ProjectManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import ApiTokenManagementPage from './pages/ApiTokenManagementPage';
import NotificationPreferencesPage from './pages/NotificationPreferencesPage';
import { TemplateManagementPage } from './pages/TemplateManagementPage';
import AuditTrailPage from './pages/AuditTrailPage';
import ComplianceGapReportPage from './pages/ComplianceGapReportPage';

const AppRoutes: React.FC = () => {
  return (
    <Router>
      <div className="app-container">
        <nav className="app-nav">
          <div className="nav-brand">
            <h2>RMT System</h2>
          </div>
          <div className="nav-links">
            <a href="/">Dashboard</a>
            <a href="/traceability-matrix">Traceability Matrix</a>
            <a href="/dependency-graph">Dependency Graph</a>
            <a href="/baselines">Baselines</a>
            <div className="nav-dropdown">
              <span>Compliance</span>
              <div className="dropdown-content">
                <a href="/audit-trail">Audit Trail</a>
                <a href="/compliance-gaps">Gap Report</a>
              </div>
            </div>
            <div className="nav-dropdown">
              <span>Admin</span>
              <div className="dropdown-content">
                <a href="/admin/projects">Projects</a>
                <a href="/admin/users">Users</a>
                <a href="/admin/workflow">Workflow Config</a>
                <a href="/admin/templates">Templates</a>
                <a href="/admin/api-tokens">API Tokens</a>
                <a href="/admin/notifications">Notifications</a>
              </div>
            </div>
          </div>
        </nav>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/requirements/:id" element={<RequirementDetailPage />} />
            <Route path="/requirements/new" element={<RequirementFormPage />} />
            <Route path="/requirements/:id/edit" element={<RequirementFormPage />} />
            <Route path="/requirements/:id/history" element={<RevisionHistoryPage />} />
            <Route path="/traceability-matrix" element={<TraceabilityMatrixPage />} />
            <Route path="/dependency-graph" element={<DependencyGraphPage />} />
            <Route path="/impact-analysis" element={<ImpactAnalysisPage />} />
            <Route path="/orphaned-requirements" element={<OrphanedRequirementsPage />} />
            <Route path="/baselines" element={<BaselineManagementPage />} />
            <Route path="/baselines/compare" element={<BaselineComparisonPage />} />
            <Route path="/audit-trail" element={<AuditTrailPage />} />
            <Route path="/compliance-gaps" element={<ComplianceGapReportPage />} />
            <Route path="/admin/projects" element={<ProjectManagementPage />} />
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/workflow" element={<WorkflowConfigurationPage />} />
            <Route path="/admin/templates" element={<TemplateManagementPage />} />
            <Route path="/admin/api-tokens" element={<ApiTokenManagementPage />} />
            <Route path="/admin/notifications" element={<NotificationPreferencesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <style>{`
        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .app-nav {
          background: #1f2937;
          color: white;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .nav-brand h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .nav-links {
          display: flex;
          gap: 2rem;
          align-items: center;
        }

        .nav-links a {
          color: white;
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .nav-links a:hover {
          background: #374151;
        }

        .nav-dropdown {
          position: relative;
        }

        .nav-dropdown > span {
          cursor: pointer;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .nav-dropdown:hover > span {
          background: #374151;
        }

        .dropdown-content {
          display: none;
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          min-width: 200px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          margin-top: 0.5rem;
          z-index: 1000;
        }

        .nav-dropdown:hover .dropdown-content {
          display: block;
        }

        .dropdown-content a {
          display: block;
          color: #1f2937;
          padding: 0.75rem 1rem;
          text-decoration: none;
          transition: background 0.2s;
        }

        .dropdown-content a:hover {
          background: #f3f4f6;
        }

        .app-main {
          flex: 1;
          background: #f9fafb;
        }
      `}</style>
    </Router>
  );
};

export default AppRoutes;
