import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../hooks/useAuth';
import { Users, Search } from 'lucide-react';

const PatientsPage = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['patients', search, page],
    queryFn: () => api.get('/patients', { params: { search, page, limit: 20 } }).then(r => r.data),
  });

  const patients = data?.patients || [];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Patients</div>
          <div className="page-subtitle">All registered patients</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : patients.length === 0 ? (
          <div className="empty-state">
            <Users size={40} />
            <h3>No patients found</h3>
            <p>Patients who message on WhatsApp will appear here</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Language</th>
                  <th>Total Appointments</th>
                  <th>Last Visit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 600 }}>
                          {(p.name || p.phone)?.[0]?.toUpperCase()}
                        </div>
                        {p.name || <span style={{ color: 'var(--text-muted)' }}>Unknown</span>}
                      </div>
                    </td>
                    <td>{p.phone}</td>
                    <td><span className="badge badge-default">{p.language || 'en'}</span></td>
                    <td>{p.totalAppointments || 0}</td>
                    <td>{p.lastVisit ? new Date(p.lastVisit).toLocaleDateString() : '—'}</td>
                    <td>
                      {p.isBlocked
                        ? <span className="badge badge-danger">Blocked</span>
                        : <span className="badge badge-success">Active</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientsPage;
