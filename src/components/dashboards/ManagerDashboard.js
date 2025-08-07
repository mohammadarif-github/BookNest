import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { MyContext } from '../../Context';
import BookingManagement from './BookingManagement';
import GuestManagement from './GuestManagement';
import RoomManagement from './RoomManagement';
import PaymentManagement from './PaymentManagement';

const ManagerDashboard = () => {
  const context = useContext(MyContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${context.token}`,
        },
      };

      const response = await axios.get(
        'http://localhost:8000/hotel/management/dashboard/',
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

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading manager dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">
          <h4>Error</h4>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchDashboardData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        {/* Header */}
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>👔 Manager Dashboard</h2>
              <p className="text-muted">
                Welcome back, {context.username}! 
                {context.userDepartment && ` | ${context.userDepartment}`}
              </p>
            </div>
            <button 
              className="btn btn-outline-primary"
              onClick={fetchDashboardData}
            >
              <i className="fas fa-sync-alt me-2"></i>
              Refresh
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="col-12">
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <i className="fas fa-chart-bar me-2"></i>
                Overview
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'bookings' ? 'active' : ''}`}
                onClick={() => setActiveTab('bookings')}
              >
                <i className="fas fa-calendar-check me-2"></i>
                Bookings
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'guests' ? 'active' : ''}`}
                onClick={() => setActiveTab('guests')}
              >
                <i className="fas fa-users me-2"></i>
                Guests
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'rooms' ? 'active' : ''}`}
                onClick={() => setActiveTab('rooms')}
              >
                <i className="fas fa-bed me-2"></i>
                Rooms
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'payments' ? 'active' : ''}`}
                onClick={() => setActiveTab('payments')}
              >
                <i className="fas fa-credit-card me-2"></i>
                Payments
              </button>
            </li>
          </ul>
        </div>

        {/* Tab Content */}
        <div className="col-12">
          {activeTab === 'overview' && (
            <OverviewTab dashboardData={dashboardData} />
          )}
          {activeTab === 'bookings' && (
            <BookingManagement onDataUpdate={fetchDashboardData} />
          )}
          {activeTab === 'guests' && (
            <GuestManagement />
          )}
          {activeTab === 'rooms' && (
            <RoomManagement dashboardData={dashboardData} onDataChange={fetchDashboardData} />
          )}
          {activeTab === 'payments' && (
            <PaymentManagement />
          )}
        </div>
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ dashboardData }) => {
  const { overview, recent_bookings, current_guests } = dashboardData;

  return (
    <div className="row">
      {/* Stats Cards */}
      <div className="col-md-3 mb-4">
        <div className="card bg-primary text-white h-100">
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <div>
                <h6 className="card-title">Total Rooms</h6>
                <h2 className="mb-0">{overview.total_rooms}</h2>
              </div>
              <div className="align-self-center">
                <i className="fas fa-bed fa-2x"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-md-3 mb-4">
        <div className="card bg-success text-white h-100">
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <div>
                <h6 className="card-title">Available Rooms</h6>
                <h2 className="mb-0">{overview.available_rooms}</h2>
              </div>
              <div className="align-self-center">
                <i className="fas fa-check-circle fa-2x"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-md-3 mb-4">
        <div className="card bg-warning text-white h-100">
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <div>
                <h6 className="card-title">Pending Bookings</h6>
                <h2 className="mb-0">{overview.pending_bookings}</h2>
              </div>
              <div className="align-self-center">
                <i className="fas fa-clock fa-2x"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-md-3 mb-4">
        <div className="card bg-info text-white h-100">
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <div>
                <h6 className="card-title">Occupancy Rate</h6>
                <h2 className="mb-0">{overview.occupancy_rate}%</h2>
              </div>
              <div className="align-self-center">
                <i className="fas fa-chart-pie fa-2x"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Card */}
      <div className="col-md-6 mb-4">
        <div className="card">
          <div className="card-header">
            <h5><i className="fas fa-coins me-2"></i>Revenue This Month</h5>
          </div>
          <div className="card-body">
            <h3 className="text-success">{overview.revenue_this_month} BDT</h3>
            <p className="text-muted">Total confirmed bookings revenue</p>
          </div>
        </div>
      </div>

      {/* Current Guests */}
      <div className="col-md-6 mb-4">
        <div className="card">
          <div className="card-header">
            <h5><i className="fas fa-users me-2"></i>Current Guests ({overview.checked_in_guests})</h5>
          </div>
          <div className="card-body">
            {current_guests.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Guest</th>
                      <th>Room</th>
                      <th>Check-out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current_guests.slice(0, 5).map((guest, index) => (
                      <tr key={index}>
                        <td>{guest.customer_full_name || guest.customer_name}</td>
                        <td>{guest.room_title}</td>
                        <td>{new Date(guest.checkout_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">No current guests</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5><i className="fas fa-calendar me-2"></i>Recent Bookings</h5>
          </div>
          <div className="card-body">
            {recent_bookings.length > 0 ? (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Guest</th>
                      <th>Room</th>
                      <th>Status</th>
                      <th>Booking Date</th>
                      <th>Check-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent_bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>{booking.customer_full_name || booking.customer_name}</td>
                        <td>{booking.room_title}</td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(booking.status)}`}>
                            {booking.status_display}
                          </span>
                        </td>
                        <td>{new Date(booking.booking_date).toLocaleDateString()}</td>
                        <td>{booking.checking_date ? new Date(booking.checking_date).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">No recent bookings</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for status badge classes
const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'pending':
      return 'bg-warning';
    case 'confirmed':
      return 'bg-success';
    case 'cancelled':
      return 'bg-danger';
    case 'checked_in':
      return 'bg-info';
    case 'checked_out':
      return 'bg-secondary';
    default:
      return 'bg-light';
  }
};

export default ManagerDashboard;
