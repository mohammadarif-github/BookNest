import React, { useContext, useState, useEffect } from 'react';
import { MyContext } from '../Context';
import ManagerDashboard from './dashboards/ManagerDashboard';
import AdminDashboard from './dashboards/AdminDashboard';
import StaffDashboard from './dashboards/StaffDashboard';

const RoleBasedDashboard = () => {
  const context = useContext(MyContext);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ensure user role is loaded
    if (!context.userRole && context.token) {
      context.fetchUserRole(context.token).then(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [context.userRole, context.token]);

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Role-based dashboard rendering
  switch (context.userRole) {
    case 'admin':
      return <AdminDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    case 'staff':
      return <StaffDashboard />;
    default:
      return (
        <div className="container mt-5">
          <div className="alert alert-info text-center">
            <h4>👤 Guest Dashboard</h4>
            <p>Welcome! You're logged in as a guest.</p>
            <p>To access management features, please contact an administrator.</p>
            <a href="/profile" className="btn btn-primary">View Profile</a>
          </div>
        </div>
      );
  }
};

export default RoleBasedDashboard;
