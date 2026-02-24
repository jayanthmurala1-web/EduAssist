import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { ThumbsUp, ThumbsDown, MessageSquare, CheckCircle } from 'lucide-react';

const Reviews = () => {
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [teacherScore, setTeacherScore] = useState('');
  const [conceptFeedback, setConceptFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="reviews-loading">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="reviews-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800" data-testid="page-title">Evaluation Reviews</h1>
        <p className="text-gray-600 mt-2">Review and provide feedback on AI evaluations</p>
      </div>

      {evaluations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center" data-testid="no-evaluations">
          <p className="text-gray-500 text-lg">No evaluations to review yet</p>
        </div>
      ) : (
        <div className="space-y-6" data-testid="evaluations-list">
          {evaluations.map((evaluation) => (
            <div key={evaluation.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow" data-testid={`evaluation-card-${evaluation.id}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800" data-testid="student-name">{evaluation.student_name}</h3>
                  <p className="text-gray-600">
                    {evaluation.subject} {evaluation.topic && `- ${evaluation.topic}`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600" data-testid="evaluation-score">
                    {evaluation.score}/100
                  </div>
                  {evaluation.feedback && (
                    <div className="flex items-center text-green-600 mt-2" data-testid="feedback-indicator">
                      <CheckCircle size={16} className="mr-1" />
                      <span className="text-sm">Reviewed</span>
                    </div>
                  )}
                </div>
              </div>

              {evaluation.question && (
                <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded shadow-sm">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Question Evaluated:</p>
                  <p className="text-gray-900 font-bold leading-tight">{evaluation.question}</p>
                </div>
              )}

              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-100 shadow-inner">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">AI Feedback & Explanation:</p>
                <p className="text-gray-800 leading-relaxed text-sm" data-testid="evaluation-explanation">{evaluation.explanation}</p>
              </div>

              {evaluation.matched_concepts && evaluation.matched_concepts.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Matched Concepts:</p>
                  <div className="flex flex-wrap gap-2">
                    {evaluation.matched_concepts.map((concept, idx) => (
                      <span key={idx} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {evaluation.missing_keywords && evaluation.missing_keywords.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Missing Keywords:</p>
                  <div className="flex flex-wrap gap-2">
                    {evaluation.missing_keywords.map((keyword, idx) => (
                      <span key={idx} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {evaluation.feedback && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg" data-testid="faculty-feedback">
                  <p className="text-sm font-semibold text-blue-700 mb-2">Faculty Feedback:</p>
                  <p className="text-gray-800">{evaluation.feedback}</p>
                  {evaluation.feedback_score && (
                    <p className="text-sm text-blue-600 mt-2">
                      Corrected Score: {evaluation.feedback_score}/100
                    </p>
                  )}
                </div>
              )}

              {!evaluation.feedback && (
                <div className="flex gap-4">
                  <button
                    onClick={() => openFeedbackModal(evaluation, true)}
                    data-testid="correct-button"
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <ThumbsUp className="mr-2" size={18} />
                    Correct
                  </button>
                  <button
                    onClick={() => openFeedbackModal(evaluation, false)}
                    data-testid="incorrect-button"
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center"
                  >
                    <ThumbsDown className="mr-2" size={18} />
                    Needs Correction
                  </button>
                </div>
              )}
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
    </div>
  );
};

export default Reviews;
