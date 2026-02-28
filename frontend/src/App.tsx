import React from 'react';
import './App.css';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';
import { useToast } from './contexts/ToastContext';
import AppRoutes from './routes';

function AppContent() {
  const { toasts, removeToast } = useToast();
  
  return (
    <>
      <AppRoutes />
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
