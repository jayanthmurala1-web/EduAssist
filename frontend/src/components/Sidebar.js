import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Upload, FileText, BarChart3, Activity, Home, Users, GraduationCap, LogOut, Database } from 'lucide-react';
import axios from 'axios';
import { API } from '../App';

const Sidebar = ({ isCollapsed, onMouseEnter, onMouseLeave }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
    { id: 'classes', label: 'My Classes', icon: GraduationCap, path: '/classes' },
    { id: 'students', label: 'Students', icon: Users, path: '/students' },
    { id: 'syllabus', label: 'Upload Syllabus', icon: BookOpen, path: '/syllabus' },
    { id: 'subjects', label: 'Manage Subjects', icon: BookOpen, path: '/subjects' },
    { id: 'submit', label: 'Submit Answer', icon: Upload, path: '/submit' },
    { id: 'reviews', label: 'Reviews', icon: FileText, path: '/reviews' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
    { id: 'monitoring', label: 'Model Monitoring', icon: Activity, path: '/monitoring' },
  ];

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await axios.post(`${API}/auth/logout`, {}, {
        headers,
        withCredentials: true
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('authMethod');
      navigate('/login');
    }
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-blue-600 to-blue-800 text-white shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}
      data-testid="sidebar"
    >
      <div className={`p-6 border-b border-blue-500 overflow-hidden ${isCollapsed ? 'px-2 flex flex-col items-center' : ''}`}>
        <h1 className="text-2xl font-bold whitespace-nowrap" data-testid="app-title">{isCollapsed ? 'EA' : 'EduAssist'}</h1>
        {!isCollapsed && <p className="text-xs text-blue-200 mt-1 whitespace-nowrap">AI Answer Evaluation</p>}
        {user.name && !isCollapsed && (
          <div className="mt-3 pt-3 border-t border-blue-500 w-full">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs text-blue-200 truncate">{user.email}</p>
          </div>
        )}
      </div>

      <nav className="p-4 flex-1 overflow-y-auto" data-testid="navigation-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              data-testid={`nav-${item.id}`}
              className={`w-full flex items-center px-4 py-3 rounded-lg mb-2 transition-all ${isActive
                ? 'bg-white text-blue-600 shadow-lg'
                : 'text-blue-100 hover:bg-blue-700'
                } ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
            >
              <Icon size={20} className="shrink-0" />
              {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-blue-500">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center rounded-lg text-blue-100 hover:bg-blue-700 transition-all ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3 space-x-3'}`}
          data-testid="logout-button"
        >
          <LogOut size={20} className="shrink-0" />
          {!isCollapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
