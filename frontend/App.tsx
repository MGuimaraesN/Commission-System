import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ServiceOrders } from './pages/ServiceOrders';
import { Periods } from './pages/Periods';
import { Brands } from './pages/Brands';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Audit } from './pages/Audit';
import { ErrorBoundary } from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route path="/" element={
            <Layout>
              <Dashboard />
            </Layout>
          } />

          <Route path="/orders" element={
            <Layout>
              <ServiceOrders />
            </Layout>
          } />

          <Route path="/periods" element={
            <Layout>
              <Periods />
            </Layout>
          } />

          <Route path="/brands" element={
            <Layout>
              <Brands />
            </Layout>
          } />

          <Route path="/reports" element={
            <Layout>
              <Reports />
            </Layout>
          } />

          <Route path="/settings" element={
            <Layout>
              <Settings />
            </Layout>
          } />

          <Route path="/audit" element={
            <Layout>
              <Audit />
            </Layout>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
};

export default App;