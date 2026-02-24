import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  TrendingUp, FileText, Target, Database,
  Zap, Award, GraduationCap, ChevronRight, Activity, Users, MessageSquare,
  FileCheck
} from 'lucide-react';

const Analytics = () => {
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
    setLoading(true);
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading Analytics...</div>
      </div>
    );
  }

  const subjectData = analytics?.subject_wise_stats
    ? Object.entries(analytics.subject_wise_stats).map(([subject, stats]) => ({
      subject,
      score: stats.avg_score,
      count: stats.count,
    }))
    : [];

  const trendData = analytics?.recent_trends
    ? [...analytics.recent_trends].reverse().map((t, idx) => ({
      name: `Eval ${idx + 1}`,
      score: t.score,
      student: t.student_name
    }))
    : [];

  const stats = [
    {
      label: 'Total Evaluations',
      value: analytics?.total_evaluations || 0,
      icon: FileCheck,
      color: 'bg-blue-500',
    },
    {
      label: 'Average Score',
      value: `${(analytics?.average_score || 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      label: 'RAG Trust Score',
      value: `${((analytics?.avg_similarity || 0) * 100).toFixed(1)}%`,
      icon: Database,
      color: 'bg-purple-500',
    },
    {
      label: 'Model Accuracy',
      value: `${(analytics?.model_accuracy || 0).toFixed(1)}%`,
      icon: Target,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="p-8" data-testid="analytics-page">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Advanced Analytics</h1>
          <p className="text-gray-600 mt-2">In-depth performance data and system metrics</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-md active:scale-95"
        >
          <Activity size={18} className="mr-2" />
          Refresh Stats
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-4 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Score Trends</h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} dy={10} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <GraduationCap className="mr-2 text-blue-500" />
                Subject Performance
              </h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectData} layout="vertical" margin={{ left: -10, right: 30 }}>
                    <XAxis type="number" hide domain={[0, 100]} />
                    <YAxis dataKey="subject" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#4b5563' }} width={100} />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} />
                    <Bar dataKey="score" fill="#4f46e5" radius={[0, 8, 8, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <Zap className="mr-2 text-orange-500" />
                RAG Statistics
              </h2>
              <div className="space-y-8">
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Avg Chunks / Eval</p>
                  <p className="text-4xl font-bold text-gray-800 mt-1">{(analytics?.avg_chunks || 0).toFixed(1)}</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold text-gray-400">
                    <span>SIMILARITY RATIO</span>
                    <span>{((analytics?.avg_similarity || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-1000"
                      style={{ width: `${(analytics?.avg_similarity || 0) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <MessageSquare className="mr-2 text-green-500" />
              Teacher Feedback
            </h2>
            <div className="flex flex-col items-center py-4">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" fill="transparent" stroke="#f3f4f6" strokeWidth="12" />
                  <circle
                    cx="80" cy="80" r="70" fill="transparent" stroke="#10b981" strokeWidth="12"
                    strokeDasharray={439.8}
                    strokeDashoffset={439.8 * (1 - (analytics?.feedback_count / (analytics?.total_evaluations || 1)))}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-800">
                    {((analytics?.feedback_count / (analytics?.total_evaluations || 1)) * 100).toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Verified</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-6 text-center leading-relaxed">
                <span className="font-bold text-gray-800">{analytics?.feedback_count} evaluations</span> have been manually verified by faculty members.
              </p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl shadow-lg p-6 text-white relative overflow-hidden group">
            <h2 className="text-xl font-bold mb-4">Student Coverage</h2>
            <p className="text-5xl font-bold mb-2">{analytics?.total_students || 0}</p>
            <p className="text-gray-400 text-sm font-medium">Distinct Students Evaluated</p>
            <div className="mt-8">
              <button className="flex items-center text-sm font-bold text-blue-400 hover:text-blue-300 transition">
                View Detailed Ledger <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
