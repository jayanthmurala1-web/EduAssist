import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import {
  Activity, TrendingUp, AlertTriangle, ShieldCheck,
  Cpu, Zap, Database, Clock, ArrowRight, BrainCircuit,
  FileCheck, Users, Target
} from 'lucide-react';

const ModelMonitoring = () => {
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/model/performance`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setPerformanceData(response.data);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading Model Performance...</div>
      </div>
    );
  }

  // Handle empty state (No feedback submitted yet)
  if (!performanceData || !performanceData.performance_data || performanceData.performance_data.length === 0) {
    return (
      <div className="p-8" data-testid="model-monitoring-page">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Model Performance</h1>
          <p className="text-gray-600 mt-2">Evaluation accuracy tracking and drift analysis</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-blue-50 p-6 rounded-full mb-6">
            <Activity size={48} className="text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Performance Data Yet</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            The neural engine needs teacher feedback to calculate accuracy.
            Go to the <strong>Reviews</strong> page and provide feedback on evaluations to see performance insights here.
          </p>
        </div>
      </div>
    );
  }

  const currentAccuracy = performanceData?.running_accuracy?.length > 0
    ? performanceData.running_accuracy[performanceData.running_accuracy.length - 1].accuracy
    : 0;

  const avgError = performanceData?.avg_error || 0;

  const stats = [
    {
      label: 'System Accuracy',
      value: `${currentAccuracy.toFixed(1)}%`,
      icon: ShieldCheck,
      color: 'bg-green-500',
    },
    {
      label: 'Feedback Samples',
      value: performanceData?.total_feedback || 0,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      label: 'Average Error',
      value: avgError.toFixed(2),
      icon: AlertTriangle,
      color: 'bg-orange-500',
    },
    {
      label: 'Total Iterations',
      value: performanceData?.total_evaluations || (performanceData?.performance_data?.length || 0),
      icon: Activity,
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="p-8" data-testid="model-monitoring-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Model Performance</h1>
        <p className="text-gray-600 mt-2">Evaluation accuracy tracking and drift analysis</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-xl font-bold text-gray-800">Accuracy Evolution</h2>
            <TrendingUp size={24} className="text-green-500" />
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData.running_accuracy}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="index" hide />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ fill: '#4f46e5', r: 4 }}
                  activeDot={{ r: 8 }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-xl font-bold text-gray-800">Prediction Alignment</h2>
            <Zap size={24} className="text-blue-500" />
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" dataKey="predicted_score" name="Predicted" unit="%" domain={[0, 100]} axisLine={false} tickLine={false} />
                <YAxis type="number" dataKey="actual_score" name="Actual" unit="%" domain={[0, 100]} axisLine={false} tickLine={false} />
                <ZAxis type="number" range={[100, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={performanceData.performance_data} fill="#6366f1">
                  {performanceData.performance_data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.is_correct ? '#10b981' : '#ef4444'} fillOpacity={0.6} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">Validation Log</h2>
        </div>
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider italic">Entry Point</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider italic">AI Score</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider italic">Faculty Score</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider italic">Error Δ</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider italic">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {performanceData.performance_data.slice(-8).reverse().map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                        {item.index}
                      </div>
                      <span className="text-gray-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-800">{item.predicted_score.toFixed(1)}%</td>
                  <td className="px-6 py-4 font-bold text-gray-600">{item.actual_score.toFixed(1)}%</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.error < 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.error.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.is_correct ? 'bg-green-600 text-white' : 'bg-orange-500 text-white'}`}>
                      {item.is_correct ? 'Verified' : 'Review'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ModelMonitoring;
