import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const AdminDashboard: React.FC = () => {
  return (
    <AdminLayout>
      <div style={{ padding: '20px' }}>
        <h1>⚙️ Admin Dashboard</h1>
        <p>Welcome to the admin panel!</p>

        <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc' }}>
          <h2>Platform Overview</h2>
          <p>Total Users: 2,847</p>
          <p>Revenue: $24.5K</p>
          <p>Open Cases: 5</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
