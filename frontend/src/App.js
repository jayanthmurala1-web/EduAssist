import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/App.css';
import Dashboard from './components/Dashboard';
import SyllabusUpload from './components/SyllabusUpload';
import AnswerSubmission from './components/AnswerSubmission';
import Reviews from './components/Reviews';
import Analytics from './components/Analytics';
import ModelMonitoring from './components/ModelMonitoring';
import SubjectManagement from './components/SubjectManagement';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import ClassManagement from './pages/ClassManagement';
import StudentManagement from './pages/StudentManagement';
import DatabaseExplorer from './pages/DatabaseExplorer';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="App min-h-screen bg-gray-50">
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth-callback" element={<AuthCallback />} />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <div className="flex">
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="flex-1 ml-64">
                  <Navigate to="/dashboard" replace />
                </div>
              </div>
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <div className="flex">
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="flex-1 ml-64">
                  <Dashboard />
                </div>
              </div>
            </ProtectedRoute>
          } />

          <Route path="/classes" element={
            <ProtectedRoute>
              <div className="flex">
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="flex-1 ml-64">
                  <ClassManagement />
                </div>
              </div>
            </ProtectedRoute>
          } />

          <Route path="/students" element={
            <ProtectedRoute>
              <div className="flex">
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="flex-1 ml-64">
                  <StudentManagement />
                </div>
              </div>
            </ProtectedRoute>
          } />

          <Route path="/syllabus" element={
            <ProtectedRoute>
              <div className="flex">
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="flex-1 ml-64">
                  <SyllabusUpload />
                </div>
              </div>
            </ProtectedRoute>
          } />

          <Route path="/subjects" element={
            <ProtectedRoute>
              <div className="flex">
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="flex-1 ml-64">
                  <SubjectManagement />
                </div>
              </div>
            </ProtectedRoute>
          } />

          <Route path="/submit" element={
            <ProtectedRoute>
              <div className="flex">
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="flex-1 ml-64">
                  <AnswerSubmission />
                </div>
              </div>
            </ProtectedRoute>
          } />

          <Route path="/reviews" element={
            <ProtectedRoute>
              <div className="flex">
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="flex-1 ml-64">
                  <Reviews />
                </div>
              </div>
            </ProtectedRoute>
          } />

          <Route path="/analytics" element={
            <ProtectedRoute>
              <div className="flex">
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="flex-1 ml-64">
                  <Analytics />
                </div>
              </div>
            </ProtectedRoute>
          } />

          <Route path="/monitoring" element={
            <ProtectedRoute>
              <div className="flex">
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="flex-1 ml-64">
                  <ModelMonitoring />
                </div>
              </div>
            </ProtectedRoute>
          } />

          <Route path="/database" element={
            <ProtectedRoute>
              <div className="flex">
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="flex-1 ml-64">
                  <DatabaseExplorer />
                </div>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
