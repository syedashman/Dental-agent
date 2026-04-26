// AppointmentsPage.js
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, useAuth } from '../hooks/useAuth';
import { Calendar, Plus, Search, Filter } from 'lucide-react';

const statusColors = {
  confirmed: 'badge-success',
  pending: 'badge-warning',
  cancelled: 'badge-danger',
  completed: 'badge-info',
  no_show: 'badge-default',
  rescheduled: 'badge-default',
};

export const AppointmentsPage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ date: '', status: '' });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', filters, page],
    queryFn: () => api.get('/appointments', { params: { ...filters, page, limit: 20 } }).then(r => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.delete(`/appointments/${id}`, { data: { reason: 'Cancelled by admin' } }),
    onSuccess: () => qc.invalidateQueries(['appointments']),
  });

  const appointments = data?.appointments || [];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Appointments</div>
          <div className="page-subtitle">Manage all clinic appointments</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="date"
            className="form-input"
            style={{ width: 180 }}
            value={filters.date}
            onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
          />
          <select
            className="form-select"
            style={{ width: 160 }}
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          >
            <option value="">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ date: '', status: '' })}>
            Clear
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : appointments.length === 0 ? (
          <div className="empty-state">
            <Calendar size={40} />
            <h3>No appointments found</h3>
            <p>Appointments booked via WhatsApp will appear here</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Date & Time</th>
                  <th>Patient</th>
                  <th>Service</th>
                  <th>Dentist</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(apt => (
                  <tr key={apt._id}>
                    <td><code style={{ fontSize: 12, background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>{apt.confirmationCode}</code></td>
                    <td>
                      <strong>{new Date(apt.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                      <br /><small style={{ color: 'var(--text-muted)' }}>{apt.startTime} - {apt.endTime}</small>
                    </td>
                    <td>
                      {apt.patientId?.name || 'Unknown'}
                      <br /><small style={{ color: 'var(--text-muted)' }}>{apt.patientId?.phone}</small>
                    </td>
                    <td>{apt.service}</td>
                    <td>{apt.dentistId?.title} {apt.dentistId?.firstName} {apt.dentistId?.lastName}</td>
                    <td><span className={`badge ${statusColors[apt.status] || 'badge-default'}`}>{apt.status}</span></td>
                    <td>
                      {['confirmed', 'pending'].includes(apt.status) && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => { if (window.confirm('Cancel this appointment?')) cancelMutation.mutate(apt._id); }}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data?.pages > 1 && (
          <div style={{ padding: 16, display: 'flex', justifyContent: 'center', gap: 8 }}>
            {[...Array(data.pages)].map((_, i) => (
              <button key={i} className={`btn btn-sm ${page === i + 1 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPage(i + 1)}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentsPage;
