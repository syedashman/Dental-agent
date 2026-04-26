import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../hooks/useAuth';
import { useAuth } from '../hooks/useAuth';
import {
  Calendar, Users, TrendingUp, Clock, CheckCircle, XCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0ea5e9', '#06b6d4', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];

const StatCard = ({ icon: Icon, label, value, color, bg }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: bg }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const clinicId = user?.clinicId;

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', clinicId],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data),
    refetchInterval: 60000,
  });

  if (isLoading) return (
    <div className="loading-center">
      <div className="spinner" />
      <span>Loading dashboard...</span>
    </div>
  );

  const summary = data?.summary || {};
  const monthlyData = data?.monthlyData || [];
  const serviceBreakdown = data?.serviceBreakdown || [];
  const upcomingToday = data?.upcomingToday || [];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Welcome back! Here's what's happening today.</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard icon={Calendar} label="Today's Appointments" value={summary.todayAppointments || 0} color="#0ea5e9" bg="#e0f2fe" />
        <StatCard icon={TrendingUp} label="This Week" value={summary.weekAppointments || 0} color="#10b981" bg="#d1fae5" />
        <StatCard icon={Users} label="Total Patients" value={summary.totalPatients || 0} color="#6366f1" bg="#e0e7ff" />
        <StatCard icon={CheckCircle} label="Completion Rate" value={`${summary.completionRate || 0}%`} color="#f59e0b" bg="#fef3c7" />
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Monthly Chart */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>Appointments (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Service Breakdown */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>Services Breakdown</h3>
          {serviceBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={serviceBreakdown} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={80} label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`}>
                  {serviceBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <p>No data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Today's Appointments */}
      <div className="card">
        <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>
          Today's Schedule
        </h3>
        {upcomingToday.length === 0 ? (
          <div className="empty-state">
            <Calendar size={40} />
            <h3>No appointments today</h3>
            <p>Enjoy your free day! 😊</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Service</th>
                  <th>Dentist</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingToday.map(apt => (
                  <tr key={apt._id}>
                    <td><strong>{apt.startTime}</strong></td>
                    <td>{apt.patientId?.name || 'Unknown'}<br /><small style={{ color: 'var(--text-muted)' }}>{apt.patientId?.phone}</small></td>
                    <td>{apt.service}</td>
                    <td>{apt.dentistId?.title} {apt.dentistId?.firstName} {apt.dentistId?.lastName}</td>
                    <td><span className="badge badge-success">Confirmed</span></td>
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

export default DashboardPage;
