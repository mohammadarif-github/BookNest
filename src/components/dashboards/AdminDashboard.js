import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { MyContext } from '../../Context';
import BookingManagement from './BookingManagement';
import GuestManagement from './GuestManagement';
import RoomManagement from './RoomManagement';
import PaymentManagement from './PaymentManagement';

const AdminDashboard = () => {
  const context = useContext(MyContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignManagerModal, setAssignManagerModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  useEffect(() => {
    if (context.hasRole('admin')) {
      fetchDashboardData();
      fetchStaffMembers();
    }
  }, [context]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${context.token}`,
        },
      };

      const response = await axios.get(
        'https://booknest-jhw4.onrender.com/hotel/admin/dashboard/',
        config
      );

      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        setError('Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffMembers = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${context.token}`,
        },
      };

      const response = await axios.get(
        'https://booknest-jhw4.onrender.com/hotel/management/staff/',
        config
      );

      if (response.data.success) {
        setStaffMembers(response.data.data);
      }
    } catch (err) {
      console.error('Staff fetch error:', err);
    }
  };

  const handleAssignManager = async (staffId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${context.token}`,
          'Content-Type': 'application/json',
        },
      };

      const response = await axios.post(
        'https://booknest-jhw4.onrender.com/hotel/admin/assign-manager/',
        { user_id: staffId },
        config
      );

      if (response.data.success) {
        // Refresh staff list
        await fetchStaffMembers();
        setAssignManagerModal(false);
        setSelectedStaff(null);
        alert('Manager assigned successfully!');
      } else {
        alert(response.data.message || 'Failed to assign manager');
      }
    } catch (err) {
      console.error('Assign manager error:', err);
      alert('Error assigning manager');
    }
  };

  const handleRemoveManager = async (managerId) => {
    if (!window.confirm('Are you sure you want to remove this manager role?')) {
      return;
    }

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${context.token}`,
          'Content-Type': 'application/json',
        },
      };

      const response = await axios.post(
        'https://booknest-jhw4.onrender.com/hotel/admin/remove-manager/',
        { user_id: managerId },
        config
      );

      if (response.data.success) {
        await fetchStaffMembers();
        alert('Manager role removed successfully!');
      } else {
        alert(response.data.message || 'Failed to remove manager');
      }
    } catch (err) {
      console.error('Remove manager error:', err);
      alert('Error removing manager');
    }
  };

  if (!context.hasRole('admin')) {
    return (
      <div className="alert alert-danger">
        <h4>Access Denied</h4>
        <p>You don't have permission to access the admin dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading admin dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <h4>Error</h4>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchDashboardData}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        {/* Header */}
        <div className="col-12">
          <h2><i className="fas fa-user-shield me-2"></i>Admin Dashboard</h2>
          <p className="text-muted">Complete hotel management and administration</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="row mb-4">
        <div className="col-12">
          <ul className="nav nav-tabs flex-nowrap overflow-auto">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <i className="fas fa-chart-line me-2 d-none d-sm-inline"></i>Overview
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'bookings' ? 'active' : ''}`}
                onClick={() => setActiveTab('bookings')}
              >
                <i className="fas fa-calendar-alt me-2 d-none d-sm-inline"></i>Bookings
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'guests' ? 'active' : ''}`}
                onClick={() => setActiveTab('guests')}
              >
                <i className="fas fa-users me-2 d-none d-sm-inline"></i>Guests
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'rooms' ? 'active' : ''}`}
                onClick={() => setActiveTab('rooms')}
              >
                <i className="fas fa-bed me-2 d-none d-sm-inline"></i>Rooms
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'staff' ? 'active' : ''}`}
                onClick={() => setActiveTab('staff')}
              >
                <i className="fas fa-user-tie me-2 d-none d-sm-inline"></i>Staff
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'payments' ? 'active' : ''}`}
                onClick={() => setActiveTab('payments')}
              >
                <i className="fas fa-credit-card me-2 d-none d-sm-inline"></i>Payments
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && dashboardData && (
        <AdminOverview 
          data={dashboardData} 
          onRefresh={fetchDashboardData}
          staffCount={staffMembers.length}
        />
      )}

      {activeTab === 'bookings' && (
        <BookingManagement onDataChange={fetchDashboardData} />
      )}

      {activeTab === 'guests' && (
        <GuestManagement />
      )}

      {activeTab === 'rooms' && dashboardData && (
        <RoomManagement dashboardData={dashboardData} onDataChange={fetchDashboardData} />
      )}

      {activeTab === 'staff' && (
        <StaffManagement 
          staffMembers={staffMembers}
          onRefresh={fetchStaffMembers}
          onAssignManager={() => setAssignManagerModal(true)}
          onRemoveManager={handleRemoveManager}
        />
      )}

      {activeTab === 'payments' && (
        <PaymentManagement />
      )}

      {/* Assign Manager Modal */}
      {assignManagerModal && (
        <AssignManagerModal
          staffMembers={staffMembers.filter(s => s.hotel_role?.role === 'staff')}
          onAssign={handleAssignManager}
          onClose={() => {
            setAssignManagerModal(false);
            setSelectedStaff(null);
          }}
        />
      )}
    </div>
  );
};

// Admin Overview Component
const AdminOverview = ({ data, onRefresh, staffCount }) => {
  return (
    <div className="row">
      {/* Key Metrics */}
      <div className="col-12 mb-4">
        <div className="row">
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card bg-primary text-white">
              <div className="card-body text-center">
                <i className="fas fa-bed fa-2x mb-2"></i>
                <h3>{data.total_rooms}</h3>
                <p className="mb-0">Total Rooms</p>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card bg-success text-white">
              <div className="card-body text-center">
                <i className="fas fa-users fa-2x mb-2"></i>
                <h3>{data.total_guests}</h3>
                <p className="mb-0">Total Guests</p>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card bg-info text-white">
              <div className="card-body text-center">
                <i className="fas fa-calendar-check fa-2x mb-2"></i>
                <h3>{data.total_bookings}</h3>
                <p className="mb-0">Total Bookings</p>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card bg-warning text-white">
              <div className="card-body text-center">
                <i className="fas fa-user-tie fa-2x mb-2"></i>
                <h3>{staffCount}</h3>
                <p className="mb-0">Staff Members</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue and Occupancy */}
      <div className="col-lg-8 mb-4">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5><i className="fas fa-chart-area me-2"></i>Hotel Performance</h5>
            <button className="btn btn-sm btn-outline-primary" onClick={onRefresh}>
              <i className="fas fa-sync-alt me-1"></i>Refresh
            </button>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <h6>Room Occupancy</h6>
                <div className="progress mb-3" style={{ height: '25px' }}>
                  <div
                    className="progress-bar bg-info"
                    role="progressbar"
                    style={{ width: `${data.occupancy_rate}%` }}
                  >
                    {data.occupancy_rate}%
                  </div>
                </div>
                <small className="text-muted">
                  {data.occupied_rooms} of {data.total_rooms} rooms occupied
                </small>
              </div>
              <div className="col-md-6">
                <h6>Today's Revenue</h6>
                <h3 className="text-success">{data.today_revenue} BDT</h3>
                <small className="text-muted">Monthly: {data.monthly_revenue} BDT</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="col-lg-4 mb-4">
        <div className="card">
          <div className="card-header">
            <h5><i className="fas fa-tachometer-alt me-2"></i>Quick Stats</h5>
          </div>
          <div className="card-body">
            <div className="d-flex justify-content-between mb-2">
              <span>Available Rooms:</span>
              <span className="badge bg-success">{data.available_rooms}</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span>Pending Bookings:</span>
              <span className="badge bg-warning">{data.pending_bookings}</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span>Confirmed Today:</span>
              <span className="badge bg-info">{data.confirmed_today}</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span>Check-ins Today:</span>
              <span className="badge bg-primary">{data.checkins_today}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>Check-outs Today:</span>
              <span className="badge bg-secondary">{data.checkouts_today}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5><i className="fas fa-clock me-2"></i>Recent Activity</h5>
          </div>
          <div className="card-body">
            {data.recent_bookings && data.recent_bookings.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Guest</th>
                      <th>Room</th>
                      <th>Check-in</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_bookings.slice(0, 5).map((booking) => (
                      <tr key={booking.id}>
                        <td>{booking.full_name}</td>
                        <td>{booking.room_title}</td>
                        <td>{new Date(booking.checking_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${
                            booking.is_approved 
                              ? 'bg-success' 
                              : 'bg-warning'
                          }`}>
                            {booking.is_approved ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted text-center">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Staff Management Component
const StaffManagement = ({ staffMembers, onRefresh, onAssignManager, onRemoveManager }) => {
  return (
    <div className="row">
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5><i className="fas fa-user-tie me-2"></i>Staff Management</h5>
            <div>
              <button className="btn btn-primary me-2" onClick={onAssignManager}>
                <i className="fas fa-user-plus me-1"></i>Assign Manager
              </button>
              <button className="btn btn-outline-secondary" onClick={onRefresh}>
                <i className="fas fa-sync-alt me-1"></i>Refresh
              </button>
            </div>
          </div>
          <div className="card-body">
            {staffMembers.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffMembers.map((staff) => (
                      <tr key={staff.id}>
                        <td>
                          <strong>{staff.full_name}</strong>
                        </td>
                        <td>{staff.username}</td>
                        <td>{staff.email}</td>
                        <td>
                          <span className={`badge ${
                            staff.hotel_role?.role === 'manager' 
                              ? 'bg-warning' 
                              : staff.hotel_role?.role === 'admin'
                              ? 'bg-danger'
                              : 'bg-info'
                          }`}>
                            {staff.hotel_role?.role ? 
                              staff.hotel_role.role.charAt(0).toUpperCase() + staff.hotel_role.role.slice(1) 
                              : 'Unknown'
                            }
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${staff.is_active ? 'bg-success' : 'bg-secondary'}`}>
                            {staff.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>{new Date(staff.date_joined).toLocaleDateString()}</td>
                        <td>
                          {staff.hotel_role?.role === 'staff' && (
                            <button 
                              className="btn btn-sm btn-outline-warning me-1"
                              onClick={() => onAssignManager()}
                              title="Assign as Manager"
                            >
                              <i className="fas fa-arrow-up"></i>
                            </button>
                          )}
                          {staff.hotel_role?.role === 'manager' && (
                            <button 
                              className="btn btn-sm btn-outline-danger me-1"
                              onClick={() => onRemoveManager(staff.id)}
                              title="Remove Manager Role"
                            >
                              <i className="fas fa-arrow-down"></i>
                            </button>
                          )}
                          <button className="btn btn-sm btn-outline-primary">
                            <i className="fas fa-eye"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="fas fa-users-slash fa-3x text-muted mb-3"></i>
                <h5 className="text-muted">No staff members found</h5>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Assign Manager Modal Component
const AssignManagerModal = ({ staffMembers, onAssign, onClose }) => {
  const [selectedStaffId, setSelectedStaffId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedStaffId) {
      onAssign(selectedStaffId);
    }
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-user-plus me-2"></i>Assign Manager Role
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label htmlFor="staffSelect" className="form-label">
                  Select Staff Member to Promote:
                </label>
                <select
                  id="staffSelect"
                  className="form-select"
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  required
                >
                  <option value="">Choose a staff member...</option>
                  {staffMembers.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.full_name} (@{staff.username})
                    </option>
                  ))}
                </select>
              </div>
              <div className="alert alert-info">
                <i className="fas fa-info-circle me-2"></i>
                This will grant the selected staff member manager permissions, including the ability to approve/cancel bookings and view guest information.
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <i className="fas fa-check me-1"></i>Assign Manager
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
