import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, useAuth } from '../hooks/useAuth';
import { Settings, MessageCircle, Clock, Save } from 'lucide-react';

const SettingsPage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const clinicId = user?.clinicId;
  const [saved, setSaved] = useState(false);

  const { data: clinic, isLoading } = useQuery({
    queryKey: ['clinic', clinicId],
    queryFn: () => api.get(`/clinics/${clinicId}`).then(r => r.data),
    enabled: !!clinicId,
  });

  const [form, setForm] = useState(null);

  React.useEffect(() => {
    if (clinic && !form) setForm(clinic);
  }, [clinic]);

  const saveMutation = useMutation({
    mutationFn: (data) => api.put(`/clinics/${clinicId}`, data),
    onSuccess: () => {
      qc.invalidateQueries(['clinic']);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  if (isLoading || !form) return <div className="loading-center"><div className="spinner" /></div>;

  const update = (path, value) => {
    setForm(prev => {
      const next = { ...prev };
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Configure your clinic and WhatsApp agent</div>
        </div>
        <button className="btn btn-primary" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
          <Save size={16} /> {saveMutation.isPending ? 'Saving...' : saved ? '✅ Saved!' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        {/* Clinic Info */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={18} color="var(--primary)" /> Clinic Information
          </h3>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Clinic Name</label>
              <input className="form-input" value={form.name || ''} onChange={e => update('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone || ''} onChange={e => update('phone', e.target.value)} />
            </div>
          </div>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={form.email || ''} onChange={e => update('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Timezone</label>
              <select className="form-select" value={form.timezone || 'Asia/Karachi'} onChange={e => update('timezone', e.target.value)}>
                <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Welcome Message (shown to new WhatsApp patients)</label>
            <textarea className="form-textarea" rows={3} value={form.welcomeMessage || ''} onChange={e => update('welcomeMessage', e.target.value)} />
          </div>
        </div>

        {/* WhatsApp Config */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={18} color="var(--success)" /> WhatsApp Configuration
          </h3>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">WhatsApp Number</label>
              <input className="form-input" value={form.whatsapp?.phoneNumber || ''} onChange={e => update('whatsapp.phoneNumber', e.target.value)} placeholder="+923372113410" />
            </div>
            <div className="form-group">
              <label className="form-label">Provider</label>
              <select className="form-select" value={form.whatsapp?.provider || 'meta'} onChange={e => update('whatsapp.provider', e.target.value)}>
                <option value="meta">Meta Cloud API</option>
                <option value="twilio">Twilio</option>
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Phone Number ID (Meta)</label>
            <input className="form-input" value={form.whatsapp?.phoneNumberId || ''} onChange={e => update('whatsapp.phoneNumberId', e.target.value)} placeholder="From developers.facebook.com" />
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Access Token (Meta)</label>
            <input className="form-input" type="password" value={form.whatsapp?.accessToken === '***hidden***' ? '' : (form.whatsapp?.accessToken || '')} onChange={e => update('whatsapp.accessToken', e.target.value)} placeholder="Enter new token to update" />
          </div>
          <div style={{ background: 'var(--primary-light)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: 'var(--primary-dark)' }}>
            💡 Webhook URL: <strong>{window.location.protocol}//{window.location.hostname}:5000/api/webhook/whatsapp</strong>
          </div>
        </div>

        {/* Slot Settings */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} color="var(--warning)" /> Appointment Settings
          </h3>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Slot Duration (minutes)</label>
              <input type="number" className="form-input" value={form.slotDuration || 30} onChange={e => update('slotDuration', parseInt(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Buffer Time Between Slots (minutes)</label>
              <input type="number" className="form-input" value={form.bufferTime || 10} onChange={e => update('bufferTime', parseInt(e.target.value))} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
