import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ServiceOrders } from './pages/ServiceOrders';
import { Periods } from './pages/Periods';
import { Brands } from './pages/Brands';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { useAuth } from './services/auth';

const PrivateRoute = ({ children }: { children?: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/auth" element={<Login />} />
        
        <Route path="/" element={
          <PrivateRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/orders" element={
          <PrivateRoute>
            <Layout>
              <ServiceOrders />
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/periods" element={
          <PrivateRoute>
            <Layout>
              <Periods />
            </Layout>
          </PrivateRoute>
        } />

        <Route path="/brands" element={
          <PrivateRoute>
            <Layout>
              <Brands />
            </Layout>
          </PrivateRoute>
        } />

        <Route path="/reports" element={
          <PrivateRoute>
            <Layout>
              <Reports />
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/settings" element={
          <PrivateRoute>
            <Layout>
              <Settings />
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;