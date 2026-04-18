import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Fields from './pages/Fields';
import FieldDetails from './pages/FieldDetails';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
};

function AppContent() {
  const { token, user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      {token && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/fields" element={
          <ProtectedRoute>
            <Fields />
          </ProtectedRoute>
        } />
        <Route path="/fields/:id" element={
          <ProtectedRoute>
            <FieldDetails />
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;