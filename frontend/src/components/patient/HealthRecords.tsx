import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Calendar, 
  Trash2,
  Filter,
  Search,
  Loader2,
  AlertCircle,
  X,
  Eye,
  File,
  Image as ImageIcon
} from 'lucide-react';
import { 
  getMyHealthRecords, 
  uploadHealthRecord,
  deleteHealthRecord,
  getHealthRecordFileUrl,
  getHealthRecordStats,
  formatFileSize,
  getRecordTypeLabel,
  RECORD_TYPES,
  type HealthRecord,
  type RecordType,
  type HealthRecordStats
} from '../../services/ehr';
import { Button, Input } from '../ui';

interface HealthRecordsProps {
  showUpload?: boolean;
}

export const HealthRecords: React.FC<HealthRecordsProps> = ({
  showUpload = true,
}) => {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [stats, setStats] = useState<HealthRecordStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filterType, setFilterType] = useState<RecordType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadData, setUploadData] = useState({
    file: null as File | null,
    recordType: '' as RecordType | '',
    title: '',
    description: '',
    recordDate: '',
  });

  useEffect(() => {
    fetchRecords();
    fetchStats();
  }, [filterType]);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const data = await getMyHealthRecords(filterType || undefined);
      setRecords(data);
    } catch (err) {
      setError('Failed to load health records');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await getHealthRecordStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadData(prev => ({ ...prev, file }));
      // Auto-fill title from filename
      if (!uploadData.title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setUploadData(prev => ({ ...prev, title: nameWithoutExt }));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.file || !uploadData.recordType || !uploadData.title) {
      setUploadError('Please fill in all required fields');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const newRecord = await uploadHealthRecord(
        uploadData.file,
        uploadData.recordType as RecordType,
        uploadData.title,
        uploadData.description || undefined,
        uploadData.recordDate || undefined
      );

      setRecords(prev => [newRecord, ...prev]);
      setShowUploadModal(false);
      setUploadData({
        file: null,
        recordType: '',
        title: '',
        description: '',
        recordDate: '',
      });
      fetchStats();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { detail?: string } } };
        setUploadError(error.response?.data?.detail || 'Failed to upload file');
      } else {
        setUploadError('Failed to upload file');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (recordId: number) => {
    setIsDeleting(true);
    try {
      await deleteHealthRecord(recordId);
      setRecords(prev => prev.filter(r => r.id !== recordId));
      setDeleteConfirm(null);
      fetchStats();
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getFileIcon = (fileType?: string) => {
    if (fileType?.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-purple-500" />;
    }
    return <File className="w-5 h-5 text-red-500" />;
  };

  const filteredRecords = records.filter(record => 
    record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-2xl font-bold text-slate-800">{stats.total_records}</div>
            <div className="text-sm text-slate-500">Total Records</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-2xl font-bold text-slate-800">{stats.total_storage_mb}</div>
            <div className="text-sm text-slate-500">Storage Used (MB)</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-2xl font-bold text-slate-800">
              {stats.records_by_type?.lab_report || 0}
            </div>
            <div className="text-sm text-slate-500">Lab Reports</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-2xl font-bold text-slate-800">
              {stats.records_by_type?.prescription || 0}
            </div>
            <div className="text-sm text-slate-500">Prescriptions</div>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records..."
              className="pl-10 pr-4 py-2 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none w-full md:w-64"
            />
          </div>

          {/* Filter by Type */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as RecordType | '')}
              className="pl-10 pr-8 py-2 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none appearance-none bg-white"
            >
              <option value="">All Types</option>
              {RECORD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Upload Button */}
        {showUpload && (
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Record
          </Button>
        )}
      </div>

      {/* Records List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center p-12 text-red-500">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-xl border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">No Health Records</h3>
          <p className="text-slate-500 mb-4">
            {filterType 
              ? `No ${getRecordTypeLabel(filterType)} records found.`
              : 'Upload your health records to keep them organized.'}
          </p>
          {showUpload && (
            <Button onClick={() => setShowUploadModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Your First Record
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((record) => (
            <div
              key={record.id}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  {getFileIcon(record.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-800 truncate">{record.title}</h4>
                  <p className="text-sm text-slate-500">{getRecordTypeLabel(record.record_type)}</p>
                </div>
              </div>

              {record.description && (
                <p className="text-sm text-slate-600 mt-3 line-clamp-2">{record.description}</p>
              )}

              <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(record.record_date || record.uploaded_at)}
                </div>
                <span>{formatFileSize(record.file_size)}</span>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(getHealthRecordFileUrl(record), '_blank')}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = getHealthRecordFileUrl(record);
                    link.download = record.title;
                    link.click();
                  }}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
                <button
                  onClick={() => setDeleteConfirm(record.id)}
                  className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold">Upload Health Record</h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-4 space-y-4">
              {uploadError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {uploadError}
                </div>
              )}

              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  File *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-cyan-500 transition-colors"
                >
                  {uploadData.file ? (
                    <div className="flex items-center justify-center gap-2">
                      <File className="w-5 h-5 text-cyan-600" />
                      <span className="text-slate-700">{uploadData.file.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600">Click to upload or drag and drop</p>
                      <p className="text-sm text-slate-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                    </>
                  )}
                </div>
              </div>

              {/* Record Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Record Type *
                </label>
                <select
                  value={uploadData.recordType}
                  onChange={(e) => setUploadData(prev => ({ ...prev, recordType: e.target.value as RecordType }))}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none bg-white"
                  required
                >
                  <option value="">Select type</option>
                  {RECORD_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <Input
                label="Title *"
                value={uploadData.title}
                onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Blood Test Report - June 2024"
                required
              />

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add any notes about this record..."
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none resize-none"
                  rows={2}
                />
              </div>

              {/* Record Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Record Date (Optional)
                </label>
                <input
                  type="date"
                  value={uploadData.recordDate}
                  onChange={(e) => setUploadData(prev => ({ ...prev, recordDate: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUploading} className="flex-1">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Delete Record?</h3>
              <p className="text-slate-500 text-sm mb-6">
                This action cannot be undone. The file will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={isDeleting}
                  className="flex-1 bg-red-500 text-white hover:bg-red-600"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthRecords;
