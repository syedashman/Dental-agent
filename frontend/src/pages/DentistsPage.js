import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, useAuth } from '../hooks/useAuth';
import { Stethoscope, Plus, Edit, Trash2 } from 'lucide-react';

const DentistModal = ({ dentist, clinicId, onClose }) => {
  const qc = useQueryClient();
  const isEdit = !!dentist;
  const [form, setForm] = useState(dentist || {
    firstName: '', lastName: '', title: 'Dr.', specialization: [], experience: '', bio: '', email: '', phone: '',
  });

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit
      ? api.put(`/dentists/${dentist._id}`, data)
      : api.post('/dentists', { ...data, clinicId }),
    onSuccess: () => { qc.invalidateQueries(['dentists']); onClose(); },
  });

  const handleSubmit = () => saveMutation.mutate(form);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 style={{ marginBottom: 24, fontSize: 18, fontWeight: 700 }}>{isEdit ? 'Edit Dentist' : 'Add New Dentist'}</h2>
        <div className="grid-2" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <select className="form-select" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}>
              <option>Dr.</option><option>Prof.</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Experience (years)</label>
            <input type="number" className="form-input" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} />
          </div>
        </div>
        <div className="grid-2" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">First Name *</label>
            <input className="form-input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name *</label>
            <input className="form-input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
          </div>
        </div>
        <div className="grid-2" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Specialization (comma separated)</label>
          <input className="form-input" value={Array.isArray(form.specialization) ? form.specialization.join(', ') : form.specialization}
            onChange={e => setForm(f => ({ ...f, specialization: e.target.value.split(',').map(s => s.trim()) }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="form-label">Bio</label>
          <textarea className="form-textarea" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DentistsPage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);

  const { data: dentists = [], isLoading } = useQuery({
    queryKey: ['dentists'],
    queryFn: () => api.get('/dentists').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/dentists/${id}`),
    onSuccess: () => qc.invalidateQueries(['dentists']),
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Dentists</div>
          <div className="page-subtitle">Manage clinic dentists and their schedules</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'add' })}>
          <Plus size={16} /> Add Dentist
        </button>
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : dentists.length === 0 ? (
        <div className="empty-state">
          <Stethoscope size={40} />
          <h3>No dentists yet</h3>
          <p>Add your first dentist to get started</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {dentists.map(d => (
            <div key={d._id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18 }}>
                  {d.firstName[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{d.title} {d.firstName} {d.lastName}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{d.experience} years experience</div>
                </div>
              </div>
              {d.specialization?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {d.specialization.map(s => <span key={s} className="badge badge-info">{s}</span>)}
                </div>
              )}
              {d.bio && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>{d.bio}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setModal({ type: 'edit', dentist: d })}>
                  <Edit size={14} /> Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm('Remove this dentist?')) deleteMutation.mutate(d._id); }}>
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <DentistModal
          dentist={modal.type === 'edit' ? modal.dentist : null}
          clinicId={user?.clinicId}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

export default DentistsPage;
