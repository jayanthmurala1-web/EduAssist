import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Upload, CheckCircle, AlertCircle, FileText, Image as ImageIcon, X } from 'lucide-react';

const SyllabusUpload = () => {
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'text'
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    topic: '',
    content: '',
  });
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [questionPaperFile, setQuestionPaperFile] = useState(null);
  const [syllabusPreview, setSyllabusPreview] = useState('');
  const [questionPreview, setQuestionPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSyllabusFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSyllabusFile(file);

      // Preview for text files
      if (file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setSyllabusPreview(e.target.result);
        };
        reader.readAsText(file);
      } else if (file.name.endsWith('.pdf')) {
        setSyllabusPreview('PDF file selected - preview will be generated after upload');
      }
    }
  };

  const handleQuestionPaperChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setQuestionPaperFile(file);

      // Preview for images
      const reader = new FileReader();
      reader.onloadend = () => {
        setQuestionPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('subject', formData.subject);
      if (formData.topic) formDataToSend.append('topic', formData.topic);
      if (syllabusFile) formDataToSend.append('syllabus_file', syllabusFile);
      if (questionPaperFile) formDataToSend.append('question_paper', questionPaperFile);

      const response = await axios.post(`${API}/syllabus/upload-file`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getAuthHeaders()
        },
        withCredentials: true
      });

      setSuccess(true);

      // Show previews from response
      if (response.data.content_preview) {
        setSyllabusPreview(response.data.content_preview);
      }
      if (response.data.questions_preview) {
        alert(`Questions extracted:\n${response.data.questions_preview}`);
      }

      // Reset form
      setFormData({ title: '', subject: '', topic: '', content: '' });
      setSyllabusFile(null);
      setQuestionPaperFile(null);
      setQuestionPreview('');

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload files');
    } finally {
      setLoading(false);
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await axios.post(`${API}/syllabus/upload`, {
        title: formData.title,
        subject: formData.subject,
        topic: formData.topic || null,
        content: formData.content,
      }, {
        headers: getAuthHeaders(),
        withCredentials: true
      });

      setSuccess(true);
      setFormData({ title: '', subject: '', topic: '', content: '' });

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload syllabus');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto" data-testid="syllabus-upload-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800" data-testid="page-title">Upload Syllabus & Question Paper</h1>
        <p className="text-gray-600 mt-2">Add reference material and questions for answer evaluation</p>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setUploadMode('file')}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${uploadMode === 'file'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          data-testid="file-mode-button"
        >
          <FileText className="inline mr-2" size={20} />
          Upload Files (PDF/TXT + Question Paper)
        </button>
        <button
          onClick={() => setUploadMode('text')}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${uploadMode === 'text'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          data-testid="text-mode-button"
        >
          <FileText className="inline mr-2" size={20} />
          Manual Text Entry
        </button>
      </div>

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 flex items-center" data-testid="success-message">
          <CheckCircle className="mr-2" size={20} />
          Syllabus uploaded and processed successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-center" data-testid="error-message">
          <AlertCircle className="mr-2" size={20} />
          {error}
        </div>
      )}

      {uploadMode === 'file' ? (
        <form onSubmit={handleFileSubmit} className="space-y-6" data-testid="file-upload-form">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - File Uploads */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Files</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    data-testid="title-input"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Data Structures - Chapter 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    data-testid="subject-input"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Data Structures"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Topic (Optional)
                  </label>
                  <input
                    type="text"
                    name="topic"
                    data-testid="topic-input"
                    value={formData.topic}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Stack and Queue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Syllabus/Notes File (PDF or TXT) *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    data-testid="syllabus-file-input"
                    onChange={handleSyllabusFileChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {syllabusFile && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {syllabusFile.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Question Paper Image (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    data-testid="question-paper-input"
                    onChange={handleQuestionPaperChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {questionPaperFile && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {questionPaperFile.name}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  data-testid="upload-files-button"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <Upload className="mr-2" size={20} />
                      Upload & Process
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column - Previews */}
            <div className="space-y-6">
              {syllabusPreview && (
                <div className="bg-white rounded-xl shadow-lg p-6" data-testid="syllabus-preview">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-800">Syllabus Preview</h3>
                    <button onClick={() => setSyllabusPreview('')} className="text-gray-500 hover:text-gray-700">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">{syllabusPreview}</pre>
                  </div>
                </div>
              )}

              {questionPreview && (
                <div className="bg-white rounded-xl shadow-lg p-6" data-testid="question-preview">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-800">Question Paper Preview</h3>
                    <button onClick={() => setQuestionPreview('')} className="text-gray-500 hover:text-gray-700">
                      <X size={20} />
                    </button>
                  </div>
                  <img src={questionPreview} alt="Question Paper" className="max-h-96 rounded-lg border" />
                </div>
              )}
            </div>
          </div>
        </form>
      ) : (
        <form onSubmit={handleTextSubmit} className="bg-white rounded-xl shadow-lg p-8" data-testid="text-upload-form">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                name="title"
                data-testid="title-input-text"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Operating Systems - Chapter 5"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  data-testid="subject-input-text"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Operating Systems"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Topic (Optional)
                </label>
                <input
                  type="text"
                  name="topic"
                  data-testid="topic-input-text"
                  value={formData.topic}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Page Replacement Algorithms"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Content / Notes *
              </label>
              <textarea
                name="content"
                data-testid="content-textarea"
                value={formData.content}
                onChange={handleChange}
                required
                rows={12}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Paste your syllabus or notes content here..."
              />
            </div>

            <button
              type="submit"
              data-testid="upload-text-button"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <Upload className="mr-2" size={20} />
                  Upload Syllabus
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SyllabusUpload;
