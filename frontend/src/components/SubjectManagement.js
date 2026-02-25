import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Trash2, AlertCircle, CheckCircle, BookOpen, Search, Eye, Edit3, X, FileText, HelpCircle, Save, Image as ImageIcon } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [selectedSyllabus, setSelectedSyllabus] = useState(null);
  const [viewMode, setViewMode] = useState(null); // 'content', 'questions', 'file_original', 'paper_original'
  const [editQuestions, setEditQuestions] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  useEffect(() => {
    fetchSyllabi();
  }, []);

  const fetchFullDetails = async (sylId, mode) => {
    setFetchingDetails(true);
    try {
      const response = await axios.get(`${API}/syllabus/${sylId}`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setSelectedSyllabus(response.data);
      setViewMode(mode);
      if (mode === 'questions') {
        setEditQuestions(response.data.questions_text || '');
      }
    } catch (err) {
      setError('Failed to fetch file details.');
    } finally {
      setFetchingDetails(false);
    }
  };

  const fetchSyllabi = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/syllabus`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setSyllabi(response.data);
      groupSyllabi(response.data);
    } catch (error) {
      console.error('Error fetching syllabi:', error);
      setError('Failed to load syllabi.');
    } finally {
      setLoading(false);
    }
  };

  const groupSyllabi = (data) => {
    const grouped = {};
    data.forEach(syl => {
      if (!grouped[syl.subject]) {
        grouped[syl.subject] = [];
      }
      grouped[syl.subject].push(syl);
    });
    setSubjects(grouped);
  };

  const handleUpdateQuestions = async () => {
    if (!selectedSyllabus) return;
    setUpdateLoading(true);
    try {
      await axios.put(`${API}/syllabus/${selectedSyllabus.id}`, {
        questions_text: editQuestions
      }, {
        headers: getAuthHeaders(),
        withCredentials: true
      });

      setSuccess('Question paper updated successfully!');
      fetchSyllabi();
      setViewMode(null);
      setSelectedSyllabus(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update questions.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const deleteSyllabus = async (syllabusId, title) => {
    if (!window.confirm(`Delete syllabus "${title}"?`)) return;
    setDeleteLoading(syllabusId);
    try {
      await axios.delete(`${API}/syllabus/${syllabusId}`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setSuccess(`Syllabus deleted successfully`);
      fetchSyllabi();
    } catch (err) {
      setError('Failed to delete syllabus');
    } finally {
      setDeleteLoading(null);
    }
  };

  const deleteSubject = async (subject) => {
    if (!window.confirm(`Delete all entries for "${subject}"?`)) return;
    setDeleteLoading(subject);
    try {
      await axios.delete(`${API}/syllabus/subject/${encodeURIComponent(subject)}`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setSuccess(`Subject deleted successfully`);
      fetchSyllabi();
    } catch (err) {
      setError('Failed to delete subject');
    } finally {
      setDeleteLoading(null);
    }
  };

  const filteredSubjects = Object.entries(subjects).filter(([subject, list]) =>
    subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    list.some(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalSyllabi = syllabi.length;
  const totalQuestions = syllabi.filter(s => !!s.questions_text).length;

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Management Hub</h1>
          <p className="text-gray-500 mt-1 font-medium">Control subjects, syllabus versions, and question banks</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><BookOpen size={20} /></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Total Syllabi</p>
              <p className="text-lg font-black text-gray-800">{totalSyllabi}</p>
            </div>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="bg-amber-50 p-2 rounded-lg text-amber-600"><HelpCircle size={20} /></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Linked Papers</p>
              <p className="text-lg font-black text-gray-800">{totalQuestions}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mb-8 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
        <input
          type="text"
          placeholder="Search by subject, title, or topic..."
          className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-gray-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-800 p-4 rounded-r-xl mb-6 flex items-center shadow-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="mr-3" size={20} />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-r-xl mb-6 flex items-center shadow-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="mr-3" size={20} />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {filteredSubjects.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-xl p-20 text-center border border-gray-100">
          <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="text-gray-300" size={40} />
          </div>
          <p className="text-gray-400 text-xl font-medium">No results found for "{searchTerm}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {filteredSubjects.map(([subject, syllabusList]) => (
            <div key={subject} className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all border border-gray-50 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-white px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 rotate-2">
                    <BookOpen size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">{subject}</h2>
                    <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">{syllabusList.length} Syllabus Modules</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => deleteSubject(subject)}
                    className="group flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-600 hover:text-white transition-all active:scale-95"
                  >
                    <Trash2 size={16} className="group-hover:rotate-12 transition-transform" />
                    Mass Clear
                  </button>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {syllabusList.map((syl) => (
                  <div key={syl.id} className="group bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors uppercase text-sm mb-1">{syl.title}</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Topic: {syl.topic || 'General'}</p>
                      </div>
                      <button onClick={() => deleteSyllabus(syl.id, syl.title)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mb-6">
                      {syl.questions_text ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 rounded-md border border-green-100">
                          <CheckCircle size={10} />
                          <span className="text-[9px] font-black uppercase">Paper Linked</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 text-gray-400 rounded-md border border-gray-100">
                          <AlertCircle size={10} />
                          <span className="text-[9px] font-black uppercase">No Paper</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                        <FileText size={10} />
                        <span className="text-[9px] font-black uppercase">{syl.content.length} chars</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-gray-50 flex-wrap">
                      <button
                        onClick={() => { setSelectedSyllabus(syl); setViewMode('content'); }}
                        className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center gap-1"
                      >
                        <Eye size={12} /> Info
                      </button>
                      <button
                        onClick={() => fetchFullDetails(syl.id, 'file_original')}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1"
                        disabled={fetchingDetails}
                      >
                        <FileText size={12} /> View Doc
                      </button>
                      <button
                        onClick={() => fetchFullDetails(syl.id, 'questions')}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1"
                        disabled={fetchingDetails}
                      >
                        <Edit3 size={12} /> Paper
                      </button>
                      {syl.questions_text && (
                        <button
                          onClick={() => fetchFullDetails(syl.id, 'paper_original')}
                          className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all flex items-center gap-1"
                          disabled={fetchingDetails}
                        >
                          <ImageIcon size={12} /> Scan
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Backdrop */}
      {viewMode && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-black text-gray-900 uppercase">
                  {viewMode === 'content' && 'Syllabus Info'}
                  {viewMode === 'questions' && 'Question Bank'}
                  {viewMode === 'file_original' && 'Original Document'}
                  {viewMode === 'paper_original' && 'Original Question Paper'}
                </h2>
                <p className="text-xs text-gray-500 font-bold overflow-hidden text-ellipsis whitespace-nowrap max-w-sm">
                  {selectedSyllabus?.title}
                </p>
              </div>
              <button onClick={() => { setViewMode(null); setSelectedSyllabus(null); }} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/30">
              {fetchingDetails ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Retrieving File...</p>
                </div>
              ) : (
                <>
                  {viewMode === 'content' && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h4 className="text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest">Extracted Text Content</h4>
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm italic font-medium">"{selectedSyllabus?.content}"</p>
                    </div>
                  )}

                  {viewMode === 'questions' && (
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Raw Question Paper Text (Extracted via OCR)</label>
                      <textarea
                        value={editQuestions}
                        onChange={(e) => setEditQuestions(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-700 leading-relaxed outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all min-h-[400px] shadow-sm"
                        placeholder="Paste or edit the question paper text here..."
                      />
                    </div>
                  )}

                  {viewMode === 'file_original' && (
                    <div className="w-full h-full flex items-center justify-center min-h-[500px]">
                      {selectedSyllabus?.original_file_b64 ? (
                        selectedSyllabus.original_file_b64.startsWith('JVBERi') || selectedSyllabus.original_file_b64.length > 1000 ? (
                          <embed
                            src={`data:application/pdf;base64,${selectedSyllabus.original_file_b64}`}
                            type="application/pdf"
                            className="w-full h-[70vh] rounded-xl shadow-lg border border-gray-200"
                          />
                        ) : (
                          <div className="bg-white p-12 rounded-3xl text-center shadow-sm border border-gray-100">
                            <FileText className="mx-auto text-gray-200 mb-4" size={64} />
                            <p className="text-gray-400 font-bold uppercase text-xs">File format not previewable as Image/PDF</p>
                          </div>
                        )
                      ) : (
                        <div className="bg-white p-12 rounded-3xl text-center shadow-sm border border-gray-100">
                          <AlertCircle className="mx-auto text-amber-200 mb-4" size={64} />
                          <p className="text-gray-400 font-bold uppercase text-xs">No original file stored for this entry</p>
                          <p className="text-[10px] text-gray-300 mt-2">Only files uploaded AFTER this update will show here.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {viewMode === 'paper_original' && (
                    <div className="w-full flex items-center justify-center p-4">
                      {selectedSyllabus?.question_paper ? (
                        <img
                          src={`data:image/png;base64,${selectedSyllabus.question_paper}`}
                          alt="Original Question Paper"
                          className="max-w-full h-auto rounded-2xl shadow-2xl border-4 border-white"
                        />
                      ) : (
                        <div className="bg-white p-12 rounded-2xl text-center shadow-sm border border-gray-100">
                          <ImageIcon className="mx-auto text-gray-200 mb-4" size={64} />
                          <p className="text-gray-400 font-bold uppercase text-xs">No image scan available</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {viewMode === 'questions' && !fetchingDetails && (
              <div className="px-8 py-6 bg-white border-t border-gray-100 flex items-center justify-between sticky bottom-0">
                <p className="text-xs text-gray-500 font-medium">You can manually refine the OCR results above.</p>
                <button
                  onClick={handleUpdateQuestions}
                  disabled={updateLoading}
                  className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {updateLoading ? 'Updating...' : <><Save size={16} /> Save Paper</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectManagement;
