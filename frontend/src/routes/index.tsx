import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import RequirementListPage from '../pages/RequirementListPage';
import RequirementDetailPage from '../pages/RequirementDetailPage';
import RequirementFormPage from '../pages/RequirementFormPage';
import TraceabilityMatrixPage from '../pages/TraceabilityMatrixPage';
import DependencyGraphPage from '../pages/DependencyGraphPage';
import ImpactAnalysisPage from '../pages/ImpactAnalysisPage';
import OrphanedRequirementsPage from '../pages/OrphanedRequirementsPage';
import BaselineManagementPage from '../pages/BaselineManagementPage';
import BaselineComparisonPage from '../pages/BaselineComparisonPage';
import RevisionHistoryPage from '../pages/RevisionHistoryPage';
import WorkflowConfigurationPage from '../pages/WorkflowConfigurationPage';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/requirements"
          element={
            <PrivateRoute>
              <RequirementListPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/requirements/:id"
          element={
            <PrivateRoute>
              <RequirementDetailPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/requirements/:id/edit"
          element={
            <PrivateRoute>
              <RequirementFormPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/traceability/matrix"
          element={
            <PrivateRoute>
              <TraceabilityMatrixPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/traceability/graph"
          element={
            <PrivateRoute>
              <DependencyGraphPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/traceability/impact"
          element={
            <PrivateRoute>
              <ImpactAnalysisPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/traceability/orphaned"
          element={
            <PrivateRoute>
              <OrphanedRequirementsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/baselines"
          element={
            <PrivateRoute>
              <BaselineManagementPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/baselines/:baselineId/compare"
          element={
            <PrivateRoute>
              <BaselineComparisonPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/requirements/:requirementId/history"
          element={
            <PrivateRoute>
              <RevisionHistoryPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/workflow/configure/:projectId?"
          element={
            <PrivateRoute>
              <WorkflowConfigurationPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
