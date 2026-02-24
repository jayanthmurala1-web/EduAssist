import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { TrendingUp, Users, FileCheck, Target } from 'lucide-react';

const Dashboard = () => {
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="dashboard-loading">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Evaluations',
      value: analytics?.total_evaluations || 0,
      icon: FileCheck,
      color: 'bg-blue-500',
    },
    {
      label: 'Average Score',
      value: `${analytics?.average_score || 0}%`,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      label: 'Total Students',
      value: analytics?.total_students || 0,
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      label: 'Model Accuracy',
      value: `${analytics?.model_accuracy || 0}%`,
      icon: Target,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="p-8" data-testid="dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800" data-testid="dashboard-title">Faculty Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of student performance and system analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow" data-testid={`stat-card-${index}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2" data-testid={`stat-value-${index}`}>{stat.value}</p>
                </div>
                <div className={`${stat.color} p-4 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6" data-testid="subject-stats">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Subject-wise Performance</h2>
          {analytics?.subject_wise_stats && Object.keys(analytics.subject_wise_stats).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(analytics.subject_wise_stats).map(([subject, stats]) => (
                <div key={subject} className="border-b pb-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">{subject}</span>
                    <span className="text-blue-600 font-bold">{stats.avg_score.toFixed(1)}%</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{stats.count} evaluations</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No data available</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6" data-testid="recent-trends">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Evaluations</h2>
          {analytics?.recent_trends && analytics.recent_trends.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {analytics.recent_trends.map((trend, index) => (
                <div key={index} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-semibold text-gray-700">{trend.student_name}</p>
                    <p className="text-sm text-gray-500">{trend.subject}</p>
                  </div>
                  <span className={`font-bold ${trend.score >= 70 ? 'text-green-600' : trend.score >= 40 ? 'text-orange-600' : 'text-red-600'}`}>
                    {trend.score}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent evaluations</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
