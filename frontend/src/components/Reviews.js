import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { ThumbsUp, ThumbsDown, MessageSquare, CheckCircle, Image as ImageIcon, X, Search, Filter, Book, Users, Star, BarChart3, AlertCircle } from 'lucide-react';

const Reviews = () => {
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [scriptModal, setScriptModal] = useState(null); // New state for script preview
  const [fetchingScript, setFetchingScript] = useState(false); // Loading state for full script
  const [feedbackText, setFeedbackText] = useState('');
  const [teacherScore, setTeacherScore] = useState('');
  const [conceptFeedback, setConceptFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(true);

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterClass, setFilterClass] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All'); // All, Pending, Reviewed

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      const response = await axios.get(`${API}/evaluations`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setEvaluations(response.data);
    } catch (error) {
      console.error('Error fetching evaluations:', error);
    } finally {
      setLoading(false);
    }
  };

  const openFeedbackModal = (evaluation, correct) => {
    setFeedbackModal(evaluation);
    setIsCorrect(correct);
    setFeedbackText('');
    setTeacherScore(evaluation.score.toString());
    setConceptFeedback('');
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) {
      alert('Please provide feedback');
      return;
    }

    if (!teacherScore || teacherScore < 0 || teacherScore > 100) {
      alert('Please provide a valid score between 0 and 100');
      return;
    }

    try {
      const conceptList = conceptFeedback
        ? conceptFeedback.split(',').map(c => c.trim()).filter(c => c)
        : [];

      const response = await axios.post(`${API}/feedback`, {
        evaluation_id: feedbackModal.id,
        teacher_score: parseFloat(teacherScore),
        feedback: feedbackText,
        concept_feedback: conceptList,
        is_correct: isCorrect,
      }, {
        headers: getAuthHeaders(),
        withCredentials: true
      });

      // Show accuracy feedback
      if (response.data.accuracy !== undefined) {
        alert(`Feedback submitted! Model accuracy: ${response.data.accuracy.toFixed(1)}%\nScore difference: ${response.data.score_difference.toFixed(1)}`);
      }

      // Refresh evaluations
      await fetchEvaluations();
      setFeedbackModal(null);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback');
    }
  };

  const fetchFullScript = async (evaluationId) => {
    setFetchingScript(true);
    try {
      const response = await axios.get(`${API}/evaluations/${evaluationId}/full`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setScriptModal(response.data);
    } catch (error) {
      console.error('Error fetching script:', error);
      alert('Failed to load full script preview');
    } finally {
      setFetchingScript(false);
    }
  };

  const filteredEvaluations = evaluations.filter(ev => {
    const matchesSearch = ev.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ev.question && ev.question.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSubject = filterSubject === 'All' || ev.subject === filterSubject;
    const matchesClass = filterClass === 'All' || (ev.class_name && ev.class_name === filterClass);
    const matchesStatus = filterStatus === 'All' ||
      (filterStatus === 'Reviewed' && ev.feedback) ||
      (filterStatus === 'Pending' && !ev.feedback);

    return matchesSearch && matchesSubject && matchesClass && matchesStatus;
  });

  const subjects = ['All', ...new Set(evaluations.map(e => e.subject).filter(Boolean))];
  const classes = ['All', ...new Set(evaluations.map(e => e.class_name).filter(Boolean))];

  const stats = {
    total: evaluations.length,
    pending: evaluations.filter(e => !e.feedback).length,
    reviewed: evaluations.filter(e => e.feedback).length,
    avgScore: evaluations.length > 0 ? (evaluations.reduce((acc, e) => acc + e.score, 0) / evaluations.length).toFixed(1) : 0
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4" data-testid="reviews-loading">
        <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.3em] animate-pulse">Loading Analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50/30 min-h-screen" data-testid="reviews-page">
      {/* Header & Stats Dashboard */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter" data-testid="page-title">
            Evaluation <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Hub</span>
          </h1>
          <p className="text-sm text-gray-500 font-bold mt-1 uppercase tracking-widest">Adaptive Feedback Terminal</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full md:w-auto">
          {[
            { label: 'Total', value: stats.total, icon: BarChart3, color: 'blue' },
            { label: 'Pending', value: stats.pending, icon: AlertCircle, color: 'amber' },
            { label: 'Reviewed', value: stats.reviewed, icon: CheckCircle, color: 'green' },
            { label: 'Avg AI Score', value: stats.avgScore, icon: Star, color: 'indigo' }
          ].map((stat, i) => (
            <div key={i} className={`bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 min-w-[140px]`}>
              <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider leading-none mb-1">{stat.label}</p>
                <p className="text-lg font-black text-gray-900 leading-none">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 mb-10 flex flex-wrap items-center gap-4 sticky top-4 z-30">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search student or question..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
            <Filter size={14} className="text-gray-500" />
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-gray-700 focus:ring-0 cursor-pointer"
            >
              {subjects.map(s => <option key={s} value={s}>{s === 'All' ? 'Subject: All' : s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
            <Users size={14} className="text-gray-500" />
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-gray-700 focus:ring-0 cursor-pointer"
            >
              {classes.map(c => <option key={c} value={c}>{c === 'All' ? 'Class: All' : c}</option>)}
            </select>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl">
            {['All', 'Pending', 'Reviewed'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${filterStatus === status ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredEvaluations.length === 0 ? (
        <div className="bg-white rounded-[3rem] p-20 text-center border-4 border-dashed border-gray-100" data-testid="no-evaluations">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search size={32} className="text-gray-300" />
          </div>
          <p className="text-gray-400 font-black uppercase tracking-[0.2em]">No Matches Found</p>
          <p className="text-xs text-gray-300 font-bold mt-2">Try adjusting your filters or search terms</p>
          <button
            onClick={() => { setSearchTerm(''); setFilterSubject('All'); setFilterClass('All'); setFilterStatus('All'); }}
            className="mt-6 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(
            filteredEvaluations.reduce((acc, evalItem) => {
              const subject = evalItem.subject || 'Uncategorized';
              const classSection = evalItem.class_name && evalItem.section_name
                ? `${evalItem.class_name} - ${evalItem.section_name}`
                : 'Individual Submissions';

              if (!acc[subject]) acc[subject] = {};
              if (!acc[subject][classSection]) acc[subject][classSection] = [];
              acc[subject][classSection].push(evalItem);
              return acc;
            }, {})
          ).map(([subject, sections]) => (
            <div key={subject} className="space-y-8">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">{subject}</h2>
                <div className="h-0.5 flex-1 bg-gradient-to-r from-gray-200 to-transparent"></div>
              </div>

              {Object.entries(sections).map(([sectionName, sectionEvals]) => (
                <div key={sectionName} className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                        <CheckCircle size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{sectionName}</h3>
                        <p className="text-xs text-gray-500 font-medium">{sectionEvals.length} Evaluation{sectionEvals.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sectionEvals.map((evaluation) => (
                      <div key={evaluation.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border border-gray-50 flex flex-col" data-testid={`evaluation-card-${evaluation.id}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-gray-900" data-testid="student-name">{evaluation.student_name}</h3>
                              {evaluation.exam_date && (
                                <span className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-blue-100">
                                  {new Date(evaluation.exam_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 font-medium">
                              Topic: {evaluation.topic || 'General'}
                            </p>
                            <button
                              onClick={() => fetchFullScript(evaluation.id)}
                              className="mt-2 flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100 text-[10px] font-black uppercase tracking-tighter hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
                              disabled={fetchingScript}
                            >
                              <ImageIcon size={10} /> {fetchingScript ? 'Opening...' : 'View Script'}
                            </button>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black text-blue-600 leading-none" data-testid="evaluation-score">
                              {evaluation.score}<span className="text-xs font-normal">/100</span>
                            </div>
                            {evaluation.feedback && (
                              <div className="flex items-center text-green-600 mt-2 justify-end" data-testid="feedback-indicator">
                                <CheckCircle size={12} className="mr-1" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Reviewed</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {evaluation.question && (
                          <div className="mb-4 p-3 bg-blue-50/50 border-l-4 border-blue-400 rounded-lg">
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Question:</p>
                            <p className="text-gray-800 text-xs font-bold leading-tight line-clamp-2">{evaluation.question}</p>
                          </div>
                        )}

                        <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100 flex-1">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">AI Explanation:</p>
                          <p className="text-gray-700 text-xs leading-relaxed" data-testid="evaluation-explanation">{evaluation.explanation}</p>
                        </div>

                        {evaluation.feedback && (
                          <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-100" data-testid="faculty-feedback">
                            <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-2">Faculty Correction:</p>
                            <p className="text-gray-800 text-xs leading-relaxed">{evaluation.feedback}</p>
                            {evaluation.feedback_score !== undefined && (
                              <p className="text-xs font-black text-green-700 mt-2 pt-2 border-t border-green-100/50">
                                Verified Score: {evaluation.feedback_score}/100
                              </p>
                            )}
                          </div>
                        )}

                        {!evaluation.feedback && (
                          <div className="flex gap-2 mt-auto">
                            <button
                              onClick={() => openFeedbackModal(evaluation, true)}
                              data-testid="correct-button"
                              className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg text-xs font-bold hover:bg-green-700 transition-all flex items-center justify-center shadow-lg shadow-green-200 active:scale-95"
                            >
                              <ThumbsUp className="mr-1.5" size={14} />
                              Agree
                            </button>
                            <button
                              onClick={() => openFeedbackModal(evaluation, false)}
                              data-testid="incorrect-button"
                              className="flex-1 bg-white text-red-600 border-2 border-red-50 py-2 px-3 rounded-lg text-xs font-bold hover:bg-red-50 hover:border-red-100 transition-all flex items-center justify-center active:scale-95"
                            >
                              <ThumbsDown className="mr-1.5" size={14} />
                              Correct AI
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {feedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-testid="feedback-modal">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Teacher Evaluation & Feedback
            </h2>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold text-blue-800 mb-2">AI Evaluation:</p>
              <p className="text-lg font-bold text-blue-600">Score: {feedbackModal.score}/100</p>
              <p className="text-sm text-gray-700 mt-2">{feedbackModal.explanation}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Evaluated Score (0-100) *
              </label>
              <input
                type="number"
                data-testid="teacher-score-input"
                value={teacherScore}
                onChange={(e) => setTeacherScore(e.target.value)}
                min="0"
                max="100"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your score for this answer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Difference from AI: {Math.abs(feedbackModal.score - (parseFloat(teacherScore) || 0)).toFixed(1)} points
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Detailed Feedback (Paragraph) *
              </label>
              <textarea
                data-testid="feedback-textarea"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={6}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Provide detailed feedback on the evaluation. Explain why you gave this score, what concepts were correct/incorrect, and areas for improvement..."
              />
              <p className="text-xs text-gray-500 mt-1">
                This helps the AI learn better evaluation patterns
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Concept Feedback (Optional)
              </label>
              <textarea
                data-testid="concept-feedback-textarea"
                value={conceptFeedback}
                onChange={(e) => setConceptFeedback(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="List specific concepts that were well-explained or missing (comma separated)&#10;Example: Stack operations correct, Queue concept missing, LIFO explained well"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Overall AI Evaluation Quality
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsCorrect(true)}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${isCorrect
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  ✓ Good Evaluation
                </button>
                <button
                  type="button"
                  onClick={() => setIsCorrect(false)}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${!isCorrect
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  ✗ Needs Improvement
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={submitFeedback}
                data-testid="submit-feedback-button"
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <MessageSquare className="mr-2" size={18} />
                Submit Feedback
              </button>
              <button
                onClick={() => setFeedbackModal(null)}
                data-testid="cancel-feedback-button"
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Script Preview Modal */}
      {scriptModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
              <div>
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Student Answer Script</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{scriptModal.student_name} • {scriptModal.subject}</p>
              </div>
              <button
                onClick={() => setScriptModal(null)}
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/50 flex flex-col items-center gap-8">
              {scriptModal.all_pages && scriptModal.all_pages.length > 0 ? (
                scriptModal.all_pages.map((page, idx) => (
                  <div key={idx} className="relative group">
                    <p className="text-[10px] text-gray-400 font-black uppercase mb-2 text-center">Page {idx + 1}</p>
                    <img
                      src={`data:image/png;base64,${page}`}
                      alt={`Page ${idx + 1}`}
                      className="max-w-full h-auto rounded-xl shadow-2xl border-4 border-white transition-transform hover:scale-[1.01]"
                    />
                  </div>
                ))
              ) : (
                <div className="text-center py-20">
                  <AlertCircle size={40} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-400 font-black uppercase text-[10px]">No Script Data Available</p>
                </div>
              )}
            </div>

            <div className="px-8 py-4 bg-white border-t border-gray-100 text-center">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">End of Script Preview</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reviews;
