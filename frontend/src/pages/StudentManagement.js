import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Plus, Trash2, Upload, Download } from 'lucide-react';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    roll_number: '',
    class_id: '',
    section_id: '',
    contact_email: '',
    contact_phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ class_id: '', section_id: '' });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (filter.class_id) {
      fetchSections(filter.class_id);
    }
  }, [filter.class_id]);

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API}/classes`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setClasses(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchSections = async (classId) => {
    try {
      const response = await axios.get(`${API}/classes/${classId}/sections`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setSections(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const params = {};
      if (filter.class_id) params.class_id = filter.class_id;
      if (filter.section_id) params.section_id = filter.section_id;

      const response = await axios.get(`${API}/students`, {
        headers: getAuthHeaders(),
        withCredentials: true,
        params
      });
      setStudents(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/students`, formData, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setShowModal(false);
      setFormData({
        name: '',
        roll_number: '',
        class_id: '',
        section_id: '',
        contact_email: '',
        contact_phone: ''
      });
      fetchStudents();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  const deleteStudent = async (id) => {
    if (!window.confirm('Delete this student?')) return;
    try {
      await axios.delete(`${API}/students/${id}`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      fetchStudents();
    } catch (error) {
      alert('Failed to delete student');
    }
  };

  const handleClassChange = (classId) => {
    setFormData({ ...formData, class_id: classId, section_id: '' });
    if (classId) {
      fetchSections(classId);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Student Management</h1>
          <p className="text-gray-600 mt-2">Manage all students across classes</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Filter by Class</label>
            <select
              value={filter.class_id}
              onChange={(e) => {
                setFilter({ ...filter, class_id: e.target.value, section_id: '' });
                fetchStudents();
              }}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Filter by Section</label>
            <select
              value={filter.section_id}
              onChange={(e) => {
                setFilter({ ...filter, section_id: e.target.value });
                fetchStudents();
              }}
              className="w-full px-4 py-2 border rounded-lg"
              disabled={!filter.class_id}
            >
              <option value="">All Sections</option>
              {sections.map(section => (
                <option key={section.id} value={section.id}>{section.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilter({ class_id: '', section_id: '' });
                fetchStudents();
              }}
              className="w-full bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evaluations</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map(student => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-semibold">{student.roll_number}</td>
                <td className="px-6 py-4 whitespace-nowrap">{student.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{student.class_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{student.section_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {student.contact_email || student.contact_phone || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{student.evaluation_count}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`font-bold ${student.average_score >= 70 ? 'text-green-600' : student.average_score >= 40 ? 'text-orange-600' : 'text-red-600'}`}>
                    {student.average_score.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => deleteStudent(student.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No students found. Add your first student!
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full max-h-screen overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Add New Student</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Roll Number *</label>
                <input
                  type="text"
                  value={formData.roll_number}
                  onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                  required
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Class *</label>
                <select
                  value={formData.class_id}
                  onChange={(e) => handleClassChange(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Section *</label>
                <select
                  value={formData.section_id}
                  onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                  required
                  disabled={!formData.class_id}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">Select Section</option>
                  {sections.map(section => (
                    <option key={section.id} value={section.id}>{section.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Email</label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-4">
                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  {loading ? 'Adding...' : 'Add Student'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-300 py-2 rounded-lg">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
