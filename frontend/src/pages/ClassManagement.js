import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Plus, Trash2, Users, BookOpen, CheckSquare, Square } from 'lucide-react';

const SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

const ClassManagement = () => {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    academic_year: new Date().getFullYear().toString(),
    description: '',
    sections: []
  });
  const [sectionName, setSectionName] = useState('');
  const [loading, setLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API}/classes`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setClasses(response.data);
      response.data.forEach(cls => fetchSections(cls.id));
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
      setSections(prev => ({ ...prev, [classId]: response.data }));
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const toggleSection = (sectionLetter) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.includes(sectionLetter)
        ? prev.sections.filter(s => s !== sectionLetter)
        : [...prev.sections, sectionLetter]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create the class
      const classRes = await axios.post(`${API}/classes`, {
        name: formData.name,
        academic_year: formData.academic_year,
        description: formData.description
      }, {
        headers: getAuthHeaders(),
        withCredentials: true
      });

      const newClassId = classRes.data.id;

      // 2. Create each selected section for this class
      for (const sectionLetter of formData.sections) {
        try {
          await axios.post(`${API}/classes/sections`, {
            name: `Section ${sectionLetter}`,
            class_id: newClassId
          }, {
            headers: getAuthHeaders(),
            withCredentials: true
          });
        } catch (err) {
          console.error(`Failed to create section ${sectionLetter}:`, err);
        }
      }

      setShowModal(false);
      setFormData({
        name: '',
        academic_year: new Date().getFullYear().toString(),
        description: '',
        sections: []
      });
      fetchClasses();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSection = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/classes/sections`, {
        name: sectionName,
        class_id: selectedClass
      }, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setShowSectionModal(false);
      setSectionName('');
      fetchSections(selectedClass);
      fetchClasses();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to create section');
    } finally {
      setLoading(false);
    }
  };

  const deleteClass = async (id) => {
    if (!window.confirm('Delete this class and all its sections & students?')) return;
    try {
      await axios.delete(`${API}/classes/${id}`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      fetchClasses();
    } catch (error) {
      alert('Failed to delete class');
    }
  };

  const deleteSection = async (sectionId, classId) => {
    if (!window.confirm('Delete this section and all its students?')) return;
    try {
      await axios.delete(`${API}/classes/sections/${sectionId}`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      fetchSections(classId);
      fetchClasses();
    } catch (error) {
      alert('Failed to delete section');
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">My Classes</h1>
          <p className="text-gray-600 mt-2">Manage your classes and sections</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Create Class
        </button>
      </div>

      {classes.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl shadow">
          <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">No classes yet</h3>
          <p className="text-gray-400 mt-1">Click "Create Class" to get started</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map(cls => (
          <div key={cls.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{cls.name}</h3>
                <p className="text-sm text-gray-600">{cls.academic_year}</p>
              </div>
              <button onClick={() => deleteClass(cls.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition">
                <Trash2 size={18} />
              </button>
            </div>

            {cls.description && <p className="text-gray-700 text-sm mb-4">{cls.description}</p>}

            <div className="flex gap-4 mb-4 text-sm">
              <span className="flex items-center text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
                <Users size={14} className="mr-1.5" />
                {cls.student_count} students
              </span>
              <span className="flex items-center text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
                <BookOpen size={14} className="mr-1.5" />
                {cls.section_count} sections
              </span>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-semibold text-gray-700">Sections</p>
                <button
                  onClick={() => {
                    setSelectedClass(cls.id);
                    setShowSectionModal(true);
                  }}
                  className="text-blue-600 text-xs hover:text-blue-800 flex items-center font-medium"
                >
                  <Plus size={14} className="mr-0.5" />
                  Add Section
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sections[cls.id]?.map(section => (
                  <div key={section.id} className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-sm flex items-center font-medium">
                    {section.name}
                    <span className="text-blue-400 text-xs ml-1.5">({section.student_count})</span>
                    <button
                      onClick={() => deleteSection(section.id, cls.id)}
                      className="ml-2 text-red-400 hover:text-red-600 transition"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {(!sections[cls.id] || sections[cls.id].length === 0) && (
                  <p className="text-xs text-gray-400 italic">No sections added yet</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Class Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Class</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Class Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="e.g., Class 10A"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Academic Year *</label>
                <input
                  type="text"
                  value={formData.academic_year}
                  onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="2024-2025"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  rows={2}
                  placeholder="Optional class description..."
                />
              </div>

              {/* Sections Selector */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Sections
                  <span className="font-normal text-gray-400 ml-1">(select sections to create)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SECTION_OPTIONS.map(letter => {
                    const isSelected = formData.sections.includes(letter);
                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => toggleSection(letter)}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {isSelected
                          ? <CheckSquare size={16} className="text-blue-600" />
                          : <Square size={16} className="text-gray-400" />
                        }
                        Section {letter}
                      </button>
                    );
                  })}
                </div>
                {formData.sections.length > 0 && (
                  <p className="text-xs text-blue-600 mt-2 font-medium">
                    {formData.sections.length} section{formData.sections.length > 1 ? 's' : ''} will be created: {formData.sections.sort().map(s => `Section ${s}`).join(', ')}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-semibold transition disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Class'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ name: '', academic_year: new Date().getFullYear().toString(), description: '', sections: [] });
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Add Section</h2>
            <form onSubmit={handleAddSection} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Section Name *</label>
                <input
                  type="text"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="e.g., Section A"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-semibold transition disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Section'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSectionModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 font-semibold transition"
                >
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

export default ClassManagement;
