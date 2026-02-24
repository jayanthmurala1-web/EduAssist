import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import {
    Database, Table, ChevronLeft, ChevronRight, Eye, X,
    RefreshCw, Layers, Hash, FileText, Code, Zap, Lock,
    Search, Trash2, Calendar, HardDrive, Cpu
} from 'lucide-react';

const DatabaseExplorer = () => {
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const [isAuthorized, setIsAuthorized] = useState(sessionStorage.getItem('db_auth') === 'true');
    const [passcode, setPasscode] = useState('');
    const [authError, setAuthError] = useState('');
    const [collections, setCollections] = useState([]);
    const [dbName, setDbName] = useState('');
    const [selectedCollection, setSelectedCollection] = useState(null);
    const [collectionData, setCollectionData] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [detailDoc, setDetailDoc] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isAuthorized) {
            fetchCollections();
        }
    }, [isAuthorized]);

    const handleAuth = (e) => {
        e.preventDefault();
        // The passcode as requested by the user
        if (passcode === '4-2-2026@DB') {
            setIsAuthorized(true);
            sessionStorage.setItem('db_auth', 'true');
            setAuthError('');
        } else {
            setAuthError('Access denied. Invalid passcode.');
        }
    };

    const fetchCollections = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API}/database/collections`, {
                headers: getAuthHeaders(),
                withCredentials: true
            });
            setCollections(response.data.collections || []);
            setDbName(response.data.database || '');
            setError('');
        } catch (err) {
            setError('Failed to connect to cluster');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const selectCollection = async (name, page = 1) => {
        setLoading(true);
        setSelectedCollection(name);
        setCurrentPage(page);
        try {
            const response = await axios.get(`${API}/database/collection/${name}?page=${page}&limit=12`, {
                headers: getAuthHeaders(),
                withCredentials: true
            });
            setCollectionData(response.data);
            setError('');
        } catch (err) {
            setError(`Error reading collection: ${name}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const viewDocument = async (doc) => {
        const docId = doc._id || doc.id || doc.evaluation_id || doc.student_id;
        if (selectedCollection && docId) {
            setLoading(true);
            try {
                const response = await axios.get(`${API}/database/document/${selectedCollection}/${docId}`, {
                    headers: getAuthHeaders(),
                    withCredentials: true
                });
                setDetailDoc(response.data);
                setShowDetail(true);
            } catch (err) {
                setDetailDoc({ collection: selectedCollection, document: doc, rag_data: null });
                setShowDetail(true);
            } finally {
                setLoading(false);
            }
        } else {
            setDetailDoc({ collection: selectedCollection, document: doc, rag_data: null });
            setShowDetail(true);
        }
    };

    const deleteDocument = async (id) => {
        if (!window.confirm('Are you sure you want to delete this document? This action is irreversible.')) return;

        try {
            await axios.delete(`${API}/database/document/${selectedCollection}/${id}`, {
                headers: getAuthHeaders(),
                withCredentials: true
            });
            selectCollection(selectedCollection, currentPage); // Refresh
        } catch (err) {
            alert('Delete failed');
        }
    };

    const getFieldTypeInfo = (type) => {
        if (type.includes('str')) return { label: 'string', color: 'text-green-600' };
        if (type.includes('int') || type.includes('float')) return { label: 'number', color: 'text-blue-600' };
        if (type.includes('bool')) return { label: 'boolean', color: 'text-red-600' };
        if (type.includes('list')) return { label: 'array', color: 'text-purple-600' };
        if (type.includes('dict')) return { label: 'object', color: 'text-orange-600' };
        return { label: 'any', color: 'text-gray-500' };
    };

    const renderValue = (val) => {
        if (val === null || val === undefined) return <span className="text-gray-300 font-mono">null</span>;
        if (typeof val === 'boolean') return <span className={`font-mono font-bold ${val ? 'text-green-600' : 'text-red-600'}`}>{val.toString()}</span>;
        if (typeof val === 'number') return <span className="text-blue-600 font-mono">{val}</span>;
        if (Array.isArray(val)) return <span className="text-gray-400 font-mono italic">Array({val.length})</span>;
        if (typeof val === 'object') return <span className="text-gray-400 font-mono italic">Object</span>;

        const s = String(val);
        return <span className="text-gray-700 font-mono text-xs">{s.length > 50 ? s.substring(0, 50) + '...' : s}</span>;
    };

    if (!isAuthorized) {
        return (
            <div className="flex items-center justify-center min-h-[85vh] bg-gray-50">
                <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-center mb-6">
                        <div className="p-3 bg-gray-100 rounded-lg">
                            <Lock size={24} className="text-gray-600" />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-center text-gray-900 mb-2">Restricted Area</h2>
                    <p className="text-gray-500 text-sm text-center mb-8">Enter administrative credentials to manage database.</p>

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Passcode</label>
                            <input
                                type="password"
                                value={passcode}
                                onChange={(e) => setPasscode(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                                placeholder="••••••••"
                                autoFocus
                            />
                        </div>
                        {authError && <p className="text-xs text-red-500 font-medium">{authError}</p>}
                        <button className="w-full py-3 bg-gray-900 text-white rounded-md font-bold hover:bg-black transition-colors">
                            Verify Identity
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30">
            {/* Direct & Functional Header */}
            <div className="flex items-center justify-between mb-8 border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Database className="text-gray-400" size={24} />
                        Database Manager
                    </h1>
                    <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">
                            <HardDrive size={12} /> {dbName || 'localhost'}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">
                            <Cpu size={12} /> {collections.length} Collections
                        </span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchCollections}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-md text-sm font-medium hover:bg-gray-50 text-gray-600 transition-all"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Sync Cluster
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Clean Collection Selector (Side Panel) */}
                <div className="col-span-3 space-y-4">
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Collections</h2>
                            <Search size={14} className="text-gray-400" />
                        </div>
                        <div className="divide-y divide-gray-100 overflow-y-auto max-h-[70vh]">
                            {collections.length === 0 && <p className="p-4 text-xs text-gray-400 italic">No nodes detected.</p>}
                            {collections.map(col => (
                                <button
                                    key={col.name}
                                    onClick={() => selectCollection(col.name)}
                                    className={`w-full text-left px-4 py-4 transition-colors flex items-center justify-between group ${selectedCollection === col.name ? 'bg-blue-50' : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Table size={16} className={selectedCollection === col.name ? 'text-blue-500' : 'text-gray-400'} />
                                        <span className={`text-sm font-medium ${selectedCollection === col.name ? 'text-blue-700' : 'text-gray-700'}`}>
                                            {col.name}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                                        {col.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Data View (Main Area) */}
                <div className="col-span-9">
                    {!collectionData ? (
                        <div className="h-64 flex flex-col items-center justify-center bg-white border border-dashed border-gray-300 rounded-lg">
                            <Database size={48} className="text-gray-200 mb-2" />
                            <p className="text-gray-400 text-sm font-medium">Select a collection to view records.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                            {/* Collection Header */}
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded flex items-center justify-center">
                                        <Layers size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 leading-none">{collectionData.collection}</h2>
                                        <p className="text-xs text-gray-500 mt-1">{collectionData.total} documents found</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => selectCollection(selectedCollection, currentPage)}
                                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded border border-transparent hover:border-gray-200 transition-all"
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-12">#</th>
                                            {collectionData.columns?.slice(0, 6).map(c => (
                                                <th key={c.name} className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                                    <div className="flex flex-col">
                                                        <span>{c.name}</span>
                                                        <span className={`text-[9px] lowercase font-normal ${getFieldTypeInfo(c.type).color}`}>
                                                            {getFieldTypeInfo(c.type).label}
                                                        </span>
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="px-6 py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {collectionData.data.map((doc, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 group">
                                                <td className="px-6 py-4 text-xs font-mono text-gray-400">
                                                    {(currentPage - 1) * 12 + idx + 1}
                                                </td>
                                                {collectionData.columns?.slice(0, 6).map(col => (
                                                    <td key={col.name} className="px-6 py-4 truncate max-w-[180px]">
                                                        {renderValue(doc[col.name])}
                                                    </td>
                                                ))}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => viewDocument(doc)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                                            title="View JSON"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteDocument(doc._id || doc.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                                                            title="Delete record"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {collectionData.total_pages > 1 && (
                                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
                                    <p className="text-xs text-gray-500 font-medium">Record {((currentPage - 1) * 12) + 1} to {Math.min(currentPage * 12, collectionData.total)}</p>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => selectCollection(selectedCollection, currentPage - 1)}
                                            disabled={currentPage <= 1}
                                            className="p-1.5 border border-gray-200 rounded bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <div className="flex gap-1 px-2">
                                            {[...Array(Math.min(collectionData.total_pages, 5))].map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => selectCollection(selectedCollection, i + 1)}
                                                    className={`w-8 h-8 rounded text-xs font-bold transition-all ${currentPage === i + 1 ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => selectCollection(selectedCollection, currentPage + 1)}
                                            disabled={currentPage >= collectionData.total_pages}
                                            className="p-1.5 border border-gray-200 rounded bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Logical & Clear Data Modal */}
            {showDetail && detailDoc && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
                        {/* Modal Header */}
                        <div className="px-8 py-5 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="bg-gray-100 p-2 rounded">
                                    <FileText size={20} className="text-gray-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 leading-none">Record Inspector</h3>
                                    <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-wider">
                                        ID: {detailDoc.document._id || detailDoc.document.id || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDetail(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-gray-900"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="overflow-y-auto flex-1 p-0 custom-scrollbar bg-gray-50/50">
                            <div className="p-8 space-y-8">
                                {/* Key Value Properties */}
                                <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-3">
                                        <Hash size={14} className="text-gray-400" />
                                        <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Document Schema</h4>
                                    </div>
                                    <div className="grid grid-cols-1 gap-y-4">
                                        {Object.entries(detailDoc.document).map(([key, value]) => (
                                            <div key={key} className="flex flex-col sm:flex-row sm:items-start border-b border-gray-50 pb-3">
                                                <div className="sm:w-1/3 mb-1 sm:mb-0">
                                                    <span className="text-xs font-mono font-bold text-gray-400">{key}</span>
                                                </div>
                                                <div className="sm:w-2/3">
                                                    {typeof value === 'object' ? (
                                                        <div className="bg-gray-100/50 p-4 rounded border border-gray-100 overflow-x-auto">
                                                            <pre className="text-[11px] font-mono text-gray-600 whitespace-pre-wrap">
                                                                {JSON.stringify(value, null, 2)}
                                                            </pre>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-mono text-gray-800 break-all">{String(value)}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* RAG Logic Visibility (If exists) */}
                                {detailDoc.rag_data && (
                                    <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-blue-500">
                                        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-3">
                                            <Zap size={14} className="text-blue-500" />
                                            <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">Retrieval Pipeline Data</h4>
                                        </div>

                                        <div className="space-y-6">
                                            {/* Subsections: Chunks & Scores */}
                                            {detailDoc.rag_data.chunks && (
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Retrieved Context Blocks</p>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {detailDoc.rag_data.chunks.map((c, i) => (
                                                            <div key={i} className="bg-blue-50/30 p-4 rounded border border-blue-100 text-xs text-gray-600 leading-relaxed italic">
                                                                "{c.text}"
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {detailDoc.rag_data.rag_chunk_scores && (
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Semantic Confidence Scores</p>
                                                    <div className="bg-gray-900 p-6 rounded-lg shadow-inner">
                                                        {detailDoc.rag_data.rag_chunk_scores.map((s, i) => (
                                                            <div key={i} className="mb-4 last:mb-0">
                                                                <div className="flex justify-between mb-1">
                                                                    <span className="text-[9px] font-mono font-bold text-gray-500">VECTOR_{s.index}</span>
                                                                    <span className="text-[10px] font-mono font-bold text-blue-400">{(s.similarity * 100).toFixed(2)}%</span>
                                                                </div>
                                                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.similarity * 100}%` }}></div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowDetail(false)}
                                className="px-6 py-2 bg-gray-900 text-white rounded font-bold text-sm hover:bg-black transition-all"
                            >
                                Close Inspector
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatabaseExplorer;
