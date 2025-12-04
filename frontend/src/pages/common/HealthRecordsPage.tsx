import { useState, useEffect } from 'react';
import { 
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  Folder,
  Search,
  Loader2,
  File,
  FileImage,
  X,
  Calendar
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';

interface HealthRecord {
  id: number;
  name: string;
  type: 'lab_report' | 'scan' | 'prescription' | 'vaccination' | 'other';
  file_type: string;
  file_size: string;
  uploaded_at: string;
  category: string;
  description?: string;
  file_url: string;
}

const typeConfig = {
  lab_report: { label: 'Lab Report', color: 'bg-blue-100 text-blue-700', icon: FileText },
  scan: { label: 'Scan/X-Ray', color: 'bg-purple-100 text-purple-700', icon: FileImage },
  prescription: { label: 'Prescription', color: 'bg-green-100 text-green-700', icon: File },
  vaccination: { label: 'Vaccination', color: 'bg-amber-100 text-amber-700', icon: FileText },
  other: { label: 'Other', color: 'bg-slate-100 text-slate-700', icon: File },
};

export default function HealthRecordsPage() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: 'other' as HealthRecord['type'],
    description: '',
    file: null as File | null,
  });

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    // Mock data - replace with API call
    setTimeout(() => {
      setRecords([
        {
          id: 1,
          name: 'Blood Test Results - November 2025',
          type: 'lab_report',
          file_type: 'PDF',
          file_size: '245 KB',
          uploaded_at: '2025-11-28',
          category: 'Blood Work',
          description: 'Complete blood count and metabolic panel',
          file_url: '#',
        },
        {
          id: 2,
          name: 'Chest X-Ray',
          type: 'scan',
          file_type: 'JPEG',
          file_size: '1.2 MB',
          uploaded_at: '2025-11-15',
          category: 'Radiology',
          description: 'Annual chest x-ray examination',
          file_url: '#',
        },
        {
          id: 3,
          name: 'COVID-19 Vaccination Certificate',
          type: 'vaccination',
          file_type: 'PDF',
          file_size: '156 KB',
          uploaded_at: '2025-10-01',
          category: 'Immunization',
          description: 'Full vaccination record',
          file_url: '#',
        },
        {
          id: 4,
          name: 'Allergy Test Results',
          type: 'lab_report',
          file_type: 'PDF',
          file_size: '312 KB',
          uploaded_at: '2025-09-20',
          category: 'Allergy',
          description: 'Comprehensive allergy panel',
          file_url: '#',
        },
      ]);
      setLoading(false);
    }, 1000);
  };

  const filteredRecords = records.filter(record => {
    if (filterType && record.type !== filterType) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.name.toLowerCase().includes(query) ||
      record.description?.toLowerCase().includes(query) ||
      record.category.toLowerCase().includes(query)
    );
  });

  const handleUpload = async () => {
    if (!uploadForm.name || !uploadForm.file) return;
    
    setUploading(true);
    // Simulate upload
    setTimeout(() => {
      const newRecord: HealthRecord = {
        id: records.length + 1,
        name: uploadForm.name,
        type: uploadForm.type,
        file_type: uploadForm.file!.name.split('.').pop()?.toUpperCase() || 'FILE',
        file_size: `${(uploadForm.file!.size / 1024).toFixed(0)} KB`,
        uploaded_at: new Date().toISOString().split('T')[0],
        category: uploadForm.type === 'lab_report' ? 'Lab Work' : 'General',
        description: uploadForm.description,
        file_url: '#',
      };
      setRecords([newRecord, ...records]);
      setShowUploadModal(false);
      setUploadForm({ name: '', type: 'other', description: '', file: null });
      setUploading(false);
    }, 1500);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this record?')) {
      setRecords(records.filter(r => r.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <Navbar />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Health Records</h1>
            <p className="text-slate-500">Store and manage your medical documents securely</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-medium"
          >
            <Upload className="w-4 h-4" />
            Upload Record
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search records..."
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
            >
              <option value="">All Types</option>
              <option value="lab_report">Lab Reports</option>
              <option value="scan">Scans/X-Rays</option>
              <option value="prescription">Prescriptions</option>
              <option value="vaccination">Vaccinations</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Records Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <Folder className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No records found</h3>
            <p className="text-slate-500 mb-4">
              {searchQuery || filterType
                ? "No records match your search criteria" 
                : "Upload your first health record to get started"}
            </p>
            {!searchQuery && !filterType && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-medium"
              >
                <Upload className="w-4 h-4" />
                Upload Record
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecords.map((record) => {
              const typeInfo = typeConfig[record.type];
              const TypeIcon = typeInfo.icon;
              
              return (
                <div 
                  key={record.id} 
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 ${typeInfo.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <TypeIcon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">{record.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                          <span className="text-xs text-slate-400">{record.file_type} • {record.file_size}</span>
                        </div>
                        {record.description && (
                          <p className="text-sm text-slate-500 mt-2 line-clamp-1">{record.description}</p>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {new Date(record.uploaded_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                      <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium">
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button 
                        onClick={() => handleDelete(record.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Upload Health Record</h3>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select File</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-cyan-300 transition-colors">
                    {uploadForm.file ? (
                      <div className="flex items-center justify-center gap-2">
                        <File className="w-5 h-5 text-cyan-600" />
                        <span className="text-slate-700">{uploadForm.file.name}</span>
                        <button 
                          onClick={() => setUploadForm({ ...uploadForm, file: null })}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-500 mb-2">Drag and drop or click to upload</p>
                        <input
                          type="file"
                          onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        />
                        <p className="text-xs text-slate-400">PDF, JPG, PNG up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Document Name</label>
                  <input
                    type="text"
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                    placeholder="e.g., Blood Test Results - Nov 2025"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Document Type</label>
                  <select
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value as HealthRecord['type'] })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="lab_report">Lab Report</option>
                    <option value="scan">Scan/X-Ray</option>
                    <option value="prescription">Prescription</option>
                    <option value="vaccination">Vaccination Record</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    placeholder="Add any notes about this document..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !uploadForm.name || !uploadForm.file}
                  className="flex-1 px-4 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
