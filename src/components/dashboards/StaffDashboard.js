import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { MyContext } from '../../Context';

const StaffDashboard = () => {
  const context = useContext(MyContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (context.hasRole('staff')) {
      fetchDashboardData();
      fetchBookings();
      fetchRooms();
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

  const fetchBookings = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${context.token}`,
        },
      };

      const response = await axios.get(
        'http://localhost:8000/hotel/management/bookings/',
        config
      );

      if (response.data.success) {
        setBookings(response.data.data);
      }
    } catch (err) {
      console.error('Bookings fetch error:', err);
    }
  };

  const fetchRooms = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${context.token}`,
        },
      };

      const response = await axios.get(
        'http://localhost:8000/hotel/get_room_list/',
        config
      );

      if (response.data) {
        setRooms(response.data);
      }
    } catch (err) {
      console.error('Rooms fetch error:', err);
    }
  };

  if (!context.hasRole('staff')) {
    return (
      <div className="alert alert-danger">
        <h4>Access Denied</h4>
        <p>You don't have permission to access the staff dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading staff dashboard...</span>
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
      <div className="row mb-4">
        <div className="col-12">
          <h2><i className="fas fa-user-cog me-2"></i>Staff Dashboard</h2>
          <p className="text-muted">Hotel information and booking overview</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="row mb-4">
        <div className="col-12">
          <ul className="nav nav-tabs">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <i className="fas fa-chart-line me-2"></i>Overview
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'bookings' ? 'active' : ''}`}
                onClick={() => setActiveTab('bookings')}
              >
                <i className="fas fa-calendar-alt me-2"></i>Bookings View
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'rooms' ? 'active' : ''}`}
                onClick={() => setActiveTab('rooms')}
              >
                <i className="fas fa-bed me-2"></i>Rooms Status
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && dashboardData && (
        <StaffOverview 
          data={dashboardData} 
          onRefresh={fetchDashboardData}
        />
      )}

      {activeTab === 'bookings' && (
        <StaffBookingView 
          bookings={bookings}
          onRefresh={fetchBookings}
        />
      )}

      {activeTab === 'rooms' && (
        <StaffRoomView 
          rooms={rooms}
          onRefresh={fetchRooms}
        />
      )}
    </div>
  );
};

// Staff Overview Component
const StaffOverview = ({ data, onRefresh }) => {
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
                <i className="fas fa-check-circle fa-2x mb-2"></i>
                <h3>{data.available_rooms}</h3>
                <p className="mb-0">Available Rooms</p>
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
                <i className="fas fa-clock fa-2x mb-2"></i>
                <h3>{data.pending_bookings}</h3>
                <p className="mb-0">Pending Approvals</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Occupancy and Today's Activity */}
      <div className="col-lg-8 mb-4">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5><i className="fas fa-chart-area me-2"></i>Hotel Status</h5>
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
                <h6>Today's Activity</h6>
                <div className="d-flex justify-content-between mb-2">
                  <span>Check-ins:</span>
                  <span className="badge bg-success">{data.checkins_today}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Check-outs:</span>
                  <span className="badge bg-secondary">{data.checkouts_today}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>New Bookings:</span>
                  <span className="badge bg-info">{data.new_bookings_today}</span>
                </div>
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
              <span>Confirmed Bookings:</span>
              <span className="badge bg-success">{data.confirmed_bookings}</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span>Pending Approvals:</span>
              <span className="badge bg-warning">{data.pending_bookings}</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span>Total Guests:</span>
              <span className="badge bg-info">{data.total_guests}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>VIP Guests:</span>
              <span className="badge bg-warning">{data.vip_guests || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5><i className="fas fa-clock me-2"></i>Recent Bookings</h5>
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
                      <th>Check-out</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_bookings.slice(0, 5).map((booking) => (
                      <tr key={booking.id}>
                        <td>{booking.full_name}</td>
                        <td>{booking.room_title}</td>
                        <td>{new Date(booking.checking_date).toLocaleDateString()}</td>
                        <td>{new Date(booking.checkout_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${
                            booking.is_approved 
                              ? 'bg-success' 
                              : 'bg-warning'
                          }`}>
                            {booking.is_approved ? 'Approved' : 'Pending'}
                          </span>
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

// Staff Booking View Component (Read-only)
const StaffBookingView = ({ bookings, onRefresh }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBookings = bookings.filter(booking => {
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'pending' && !booking.is_approved) ||
      (statusFilter === 'confirmed' && booking.is_approved && !booking.is_cancelled) ||
      (statusFilter === 'cancelled' && booking.is_cancelled);
    
    const matchesSearch = !searchTerm || 
      booking.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.room_title.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="row">
      {/* Filters */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-header">
            <h5><i className="fas fa-filter me-2"></i>Booking Filters</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <label className="form-label">Search Bookings</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by guest name or room..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Filter by Status</label>
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Bookings</option>
                  <option value="pending">Pending Approval</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <button className="btn btn-outline-primary" onClick={onRefresh}>
                  <i className="fas fa-sync-alt me-1"></i>Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5><i className="fas fa-calendar-alt me-2"></i>Bookings ({filteredBookings.length})</h5>
          </div>
          <div className="card-body">
            {filteredBookings.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Guest</th>
                      <th>Room</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Guests</th>
                      <th>Status</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>
                          <code>#{booking.id}</code>
                        </td>
                        <td>
                          <div>
                            <strong>{booking.full_name}</strong>
                            <br />
                            <small className="text-muted">{booking.user_email}</small>
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong>{booking.room_title}</strong>
                            <br />
                            <small className="text-muted">{booking.room_category}</small>
                          </div>
                        </td>
                        <td>{new Date(booking.checking_date).toLocaleDateString()}</td>
                        <td>{new Date(booking.checkout_date).toLocaleDateString()}</td>
                        <td>
                          <span className="badge bg-info">
                            {booking.adult} adults
                            {booking.children > 0 && `, ${booking.children} children`}
                          </span>
                        </td>
                        <td>
                          {booking.is_cancelled ? (
                            <span className="badge bg-danger">
                              <i className="fas fa-times me-1"></i>Cancelled
                            </span>
                          ) : booking.is_approved ? (
                            <span className="badge bg-success">
                              <i className="fas fa-check me-1"></i>Confirmed
                            </span>
                          ) : (
                            <span className="badge bg-warning">
                              <i className="fas fa-clock me-1"></i>Pending
                            </span>
                          )}
                        </td>
                        <td>
                          <strong>{booking.total_cost} BDT</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                <h5 className="text-muted">No bookings found</h5>
                <p className="text-muted">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Staff Room View Component (Read-only)
const StaffRoomView = ({ rooms, onRefresh }) => {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  const categories = [...new Set(rooms.map(room => room.category))];

  const filteredRooms = rooms.filter(room => {
    const matchesCategory = categoryFilter === 'all' || room.category === categoryFilter;
    const matchesAvailability = availabilityFilter === 'all' || 
      (availabilityFilter === 'available' && room.is_available) ||
      (availabilityFilter === 'occupied' && !room.is_available);
    
    return matchesCategory && matchesAvailability;
  });

  return (
    <div className="row">
      {/* Filters */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-header">
            <h5><i className="fas fa-filter me-2"></i>Room Filters</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-4">
                <label className="form-label">Filter by Category</label>
                <select
                  className="form-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Filter by Availability</label>
                <select
                  className="form-select"
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                >
                  <option value="all">All Rooms</option>
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                </select>
              </div>
              <div className="col-md-4 d-flex align-items-end">
                <button className="btn btn-outline-primary" onClick={onRefresh}>
                  <i className="fas fa-sync-alt me-1"></i>Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Room Cards */}
      <div className="col-12">
        <div className="row">
          {filteredRooms.length > 0 ? (
            filteredRooms.map((room) => (
              <div key={room.id} className="col-lg-4 col-md-6 mb-4">
                <div className="card h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h5 className="card-title">{room.title}</h5>
                      <span className={`badge ${room.is_available ? 'bg-success' : 'bg-danger'}`}>
                        {room.is_available ? 'Available' : 'Occupied'}
                      </span>
                    </div>
                    <p className="text-muted mb-2">{room.category}</p>
                    <p className="card-text">{room.description}</p>
                    <div className="row text-center">
                      <div className="col-6">
                        <small className="text-muted">Price per night</small>
                        <div className="fw-bold">{room.price} BDT</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">Room Number</small>
                        <div className="fw-bold">{room.room_number || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-12">
              <div className="text-center py-4">
                <i className="fas fa-bed fa-3x text-muted mb-3"></i>
                <h5 className="text-muted">No rooms found</h5>
                <p className="text-muted">Try adjusting your filter criteria.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
