import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Trash2, AlertCircle, CheckCircle, BookOpen } from 'lucide-react';

const SubjectManagement = () => {
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [syllabi, setSyllabi] = useState([]);
  const [subjects, setSubjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSyllabi();
  }, []);

  const fetchSyllabi = async () => {
    try {
      setLoading(true);
      console.log('Fetching syllabi from:', `${API}/syllabus`);
      const response = await axios.get(`${API}/syllabus`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      console.log('Fetched syllabi:', response.data.length);

      setSyllabi(response.data);

      // Group by subject
      const grouped = {};
      response.data.forEach(syl => {
        if (!grouped[syl.subject]) {
          grouped[syl.subject] = [];
        }
        grouped[syl.subject].push(syl);
      });

      console.log('Grouped subjects:', Object.keys(grouped));
      setSubjects(grouped);
    } catch (error) {
      console.error('Error fetching syllabi:', error);
      setError('Failed to load syllabi: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const deleteSyllabus = async (syllabusId, title) => {
    if (!window.confirm(`Delete syllabus "${title}"?\n\nThis action cannot be undone!`)) return;

    setDeleteLoading(syllabusId);
    setError('');
    setSuccess('');

    try {
      console.log('Deleting syllabus:', syllabusId);
      await axios.delete(`${API}/syllabus/${syllabusId}`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });

      setSuccess(`Syllabus "${title}" deleted successfully`);

      // Refresh the list
      await fetchSyllabi();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Delete error:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to delete syllabus';
      setError(`Error: ${errorMsg}`);
      setTimeout(() => setError(''), 3000);
    } finally {
      setDeleteLoading(null);
    }
  };

  const deleteSubject = async (subject) => {
    const count = subjects[subject].length;
    if (!window.confirm(`Delete all ${count} syllabus entries for subject "${subject}"?\n\nThis action cannot be undone!`)) return;

    setDeleteLoading(subject);
    setError('');
    setSuccess('');

    try {
      console.log('Deleting subject:', subject);
      const response = await axios.delete(`${API}/syllabus/subject/${encodeURIComponent(subject)}`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      console.log('Delete response:', response.data);

      setSuccess(`Subject "${subject}" deleted successfully (${response.data.message})`);

      // Immediately remove from local state for instant UI update
      const updatedSubjects = { ...subjects };
      delete updatedSubjects[subject];
      setSubjects(updatedSubjects);

      // Refresh from server to be sure
      await fetchSyllabi();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Delete error:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to delete subject';
      setError(`Error: ${errorMsg}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="subject-management-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Manage Subjects & Syllabi</h1>
        <p className="text-gray-600 mt-2">View and delete uploaded subjects and syllabi</p>
      </div>

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 flex items-center">
          <CheckCircle className="mr-2" size={20} />
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-center">
          <AlertCircle className="mr-2" size={20} />
          {error}
        </div>
      )}

      {Object.keys(subjects).length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <BookOpen className="mx-auto mb-4 text-gray-400" size={64} />
          <p className="text-gray-500 text-lg">No subjects found</p>
          <p className="text-gray-400 text-sm mt-2">Upload a syllabus to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(subjects).map(([subject, syllabusList]) => (
            <div key={subject} className="bg-white rounded-xl shadow-lg p-6" data-testid={`subject-card-${subject}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg mr-4">
                    <BookOpen className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{subject}</h2>
                    <p className="text-gray-600 text-sm">{syllabusList.length} syllabus {syllabusList.length === 1 ? 'entry' : 'entries'}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteSubject(subject)}
                  disabled={deleteLoading === subject}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid={`delete-subject-${subject}`}
                >
                  <Trash2 size={18} className="mr-2" />
                  {deleteLoading === subject ? (
                    <span>Deleting...</span>
                  ) : (
                    <span>Delete Subject</span>
                  )}
                </button>
              </div>

              <div className="space-y-3">
                {syllabusList.map((syl) => (
                  <div key={syl.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{syl.title}</p>
                      {syl.topic && <p className="text-sm text-gray-600">Topic: {syl.topic}</p>}
                      <p className="text-xs text-gray-500 mt-1">
                        Content: {syl.content.substring(0, 100)}...
                      </p>
                      {syl.questions_text && (
                        <p className="text-xs text-blue-600 mt-1">
                          ✓ Has question paper
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteSyllabus(syl.id, syl.title)}
                      disabled={deleteLoading === syl.id}
                      className="ml-4 text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                      data-testid={`delete-syllabus-${syl.id}`}
                      title="Delete this syllabus"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubjectManagement;
