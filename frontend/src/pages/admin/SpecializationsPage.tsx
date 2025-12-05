import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '../../components/ui';
import { Navbar } from '../../components/layout';
import { authFetch } from '../../services/api';
import {
  Stethoscope,
  Plus,
  Loader2,
  RefreshCw,
  Edit2,
  Trash2,
  ArrowLeft,
  Save,
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Specialization {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  is_active: boolean;
  doctor_count?: number;
}

export const SpecializationsPage: React.FC = () => {
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchSpecializations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authFetch('/api/v1/doctors/specializations/all');
      if (response.ok) {
        const data = await response.json();
        setSpecializations(data);
      } else {
        setError('Failed to load specializations');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpecializations();
  }, [fetchSpecializations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = editingId
        ? `/api/v1/admin/specializations/${editingId}`
        : '/api/v1/admin/specializations';
      const method = editingId ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(editingId ? 'Specialization updated successfully' : 'Specialization created successfully');
        setShowForm(false);
        setEditingId(null);
        setFormData({ name: '', description: '', icon: '' });
        fetchSpecializations();
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to save specialization');
      }
    } catch {
      setError('Network error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (spec: Specialization) => {
    setEditingId(spec.id);
    setFormData({
      name: spec.name,
      description: spec.description || '',
      icon: spec.icon || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this specialization?')) return;

    setActionLoading(id);
    try {
      const response = await authFetch(`/api/v1/admin/specializations/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSuccess('Specialization deleted successfully');
        fetchSpecializations();
      } else {
        setError('Failed to delete specialization');
      }
    } catch {
      setError('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSeedSpecializations = async () => {
    setActionLoading(-1);
    try {
      const response = await authFetch('/api/v1/admin/specializations/seed', {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        setSuccess(`Seeded ${data.length} specializations successfully`);
        fetchSpecializations();
      } else {
        setError('Failed to seed specializations');
      }
    } catch {
      setError('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', description: '', icon: '' });
  };

  // Icon options for the dropdown
  const iconOptions = [
    'heart', 'brain', 'bone', 'eye', 'baby', 'stethoscope', 
    'activity', 'thermometer', 'pill', 'syringe', 'bandage', 'hospital',
    'user-md', 'lungs', 'stomach', 'kidney', 'liver', 'tooth',
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/admin/dashboard"
              className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Specialization Management</h1>
              <p className="text-slate-500">Manage medical specializations</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSeedSpecializations} disabled={actionLoading === -1}>
              {actionLoading === -1 ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Seed Defaults</>
              )}
            </Button>
            <Button onClick={() => setShowForm(true)} disabled={showForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add New
            </Button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {success}
            <button onClick={() => setSuccess('')} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
            <button onClick={() => setError('')} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {editingId ? 'Edit Specialization' : 'Add New Specialization'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="e.g., Cardiology"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="Brief description of the specialization..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Icon</label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Select an icon</option>
                  {iconOptions.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {editingId ? 'Update' : 'Create'}
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={cancelForm}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Specializations List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
          </div>
        ) : specializations.length === 0 ? (
          <Card className="p-8 text-center">
            <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">No specializations found</p>
            <Button onClick={handleSeedSpecializations}>
              Seed Default Specializations
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {specializations.map((spec) => (
              <Card key={spec.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{spec.name}</h3>
                      {spec.doctor_count !== undefined && (
                        <p className="text-xs text-slate-500">{spec.doctor_count} doctors</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    spec.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {spec.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                {spec.description && (
                  <p className="text-sm text-slate-600 mt-3 line-clamp-2">{spec.description}</p>
                )}
                
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(spec)}
                    className="flex-1"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(spec.id)}
                    disabled={actionLoading === spec.id}
                    className="flex-1"
                  >
                    {actionLoading === spec.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={fetchSpecializations} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh List
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SpecializationsPage;
