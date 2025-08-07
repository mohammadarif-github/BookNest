import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { MyContext } from '../../Context';

const GuestManagement = () => {
  const context = useContext(MyContext);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showVipOnly, setShowVipOnly] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);

  useEffect(() => {
    fetchGuests();
  }, [searchTerm, showVipOnly]);

  const fetchGuests = async () => {
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${context.token}`,
        },
        params: {
          ...(searchTerm && { search: searchTerm }),
          ...(showVipOnly && { vip_only: true })
        }
      };

      const response = await axios.get(
        'http://localhost:8000/hotel/management/guests/',
        config
      );

      if (response.data.success) {
        setGuests(response.data.data);
      } else {
        setError('Failed to fetch guests');
      }
    } catch (err) {
      console.error('Guests fetch error:', err);
      setError('Error loading guests data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const toggleVipFilter = () => {
    setShowVipOnly(!showVipOnly);
  };

  const viewGuestDetails = (guest) => {
    setSelectedGuest(guest);
  };

  const closeGuestModal = () => {
    setSelectedGuest(null);
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading guests...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <h4>Error</h4>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchGuests}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="row">
      {/* Search and Filters */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-header">
            <h5><i className="fas fa-search me-2"></i>Guest Search & Filters</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <label className="form-label">Search Guests</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="vipFilter"
                    checked={showVipOnly}
                    onChange={toggleVipFilter}
                  />
                  <label className="form-check-label" htmlFor="vipFilter">
                    <i className="fas fa-star text-warning me-1"></i>
                    VIP Guests Only
                  </label>
                </div>
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setShowVipOnly(false);
                  }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Statistics */}
      <div className="col-12 mb-4">
        <div className="row">
          <div className="col-md-3">
            <div className="card bg-info text-white">
              <div className="card-body text-center">
                <h3>{guests.length}</h3>
                <p className="mb-0">Total Guests</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-warning text-white">
              <div className="card-body text-center">
                <h3>{guests.filter(g => g.guest_profile?.vip_status).length}</h3>
                <p className="mb-0">VIP Guests</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-success text-white">
              <div className="card-body text-center">
                <h3>{guests.filter(g => g.current_booking).length}</h3>
                <p className="mb-0">Currently Checked In</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-primary text-white">
              <div className="card-body text-center">
                <h3>{guests.reduce((sum, g) => sum + g.total_bookings, 0)}</h3>
                <p className="mb-0">Total Bookings</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guests Table */}
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5><i className="fas fa-users me-2"></i>Guest List ({guests.length})</h5>
            <button className="btn btn-sm btn-outline-primary" onClick={fetchGuests}>
              <i className="fas fa-sync-alt me-1"></i>
              Refresh
            </button>
          </div>
          <div className="card-body">
            {guests.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Guest</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th>Bookings</th>
                      <th>Current Room</th>
                      <th>Member Since</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map((guest) => (
                      <tr key={guest.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div>
                              <strong>{guest.full_name}</strong>
                              <br />
                              <small className="text-muted">@{guest.username}</small>
                              {guest.guest_profile?.vip_status && (
                                <span className="badge bg-warning text-dark ms-2">
                                  <i className="fas fa-star me-1"></i>VIP
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <small className="text-muted">
                              <i className="fas fa-envelope me-1"></i>
                              {guest.email}
                            </small>
                            {guest.guest_profile?.phone_number && (
                              <>
                                <br />
                                <small className="text-muted">
                                  <i className="fas fa-phone me-1"></i>
                                  {guest.guest_profile.phone_number}
                                </small>
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          {guest.current_booking ? (
                            <span className="badge bg-success">
                              <i className="fas fa-bed me-1"></i>
                              Checked In
                            </span>
                          ) : guest.confirmed_bookings > 0 ? (
                            <span className="badge bg-info">
                              <i className="fas fa-calendar-check me-1"></i>
                              Has Bookings
                            </span>
                          ) : (
                            <span className="badge bg-secondary">
                              <i className="fas fa-user me-1"></i>
                              Regular Guest
                            </span>
                          )}
                        </td>
                        <td>
                          <div>
                            <strong>{guest.total_bookings}</strong> total
                            <br />
                            <small className="text-success">
                              {guest.completed_stays} completed
                            </small>
                            {guest.pending_bookings > 0 && (
                              <>
                                <br />
                                <small className="text-warning">
                                  {guest.pending_bookings} pending
                                </small>
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          {guest.current_booking ? (
                            <div>
                              <strong>{guest.current_booking.room_title}</strong>
                              <br />
                              <small className="text-muted">
                                {guest.current_booking.room_category}
                              </small>
                              <br />
                              <small className="text-info">
                                Until: {new Date(guest.current_booking.checkout_date).toLocaleDateString()}
                              </small>
                            </div>
                          ) : (
                            <span className="text-muted">Not checked in</span>
                          )}
                        </td>
                        <td>
                          {new Date(guest.date_joined).toLocaleDateString()}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => viewGuestDetails(guest)}
                          >
                            <i className="fas fa-eye me-1"></i>
                            View Details
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
                <h5 className="text-muted">No guests found</h5>
                <p className="text-muted">Try adjusting your search terms or filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guest Details Modal */}
      {selectedGuest && (
        <GuestDetailsModal
          guest={selectedGuest}
          onClose={closeGuestModal}
        />
      )}
    </div>
  );
};

// Guest Details Modal Component
const GuestDetailsModal = ({ guest, onClose }) => {
  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-user-circle me-2"></i>
              Guest Details - {guest.full_name}
              {guest.guest_profile?.vip_status && (
                <span className="badge bg-warning text-dark ms-2">
                  <i className="fas fa-star me-1"></i>VIP
                </span>
              )}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="row">
              {/* Basic Information */}
              <div className="col-md-6">
                <h6><i className="fas fa-info-circle me-2"></i>Basic Information</h6>
                <table className="table table-sm">
                  <tbody>
                    <tr>
                      <td><strong>Username:</strong></td>
                      <td>{guest.username}</td>
                    </tr>
                    <tr>
                      <td><strong>Email:</strong></td>
                      <td>{guest.email}</td>
                    </tr>
                    <tr>
                      <td><strong>Member Since:</strong></td>
                      <td>{new Date(guest.date_joined).toLocaleDateString()}</td>
                    </tr>
                    {guest.guest_profile?.phone_number && (
                      <tr>
                        <td><strong>Phone:</strong></td>
                        <td>{guest.guest_profile.phone_number}</td>
                      </tr>
                    )}
                    {guest.guest_profile?.address && (
                      <tr>
                        <td><strong>Address:</strong></td>
                        <td>{guest.guest_profile.address}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Booking Statistics */}
              <div className="col-md-6">
                <h6><i className="fas fa-chart-bar me-2"></i>Booking Statistics</h6>
                <table className="table table-sm">
                  <tbody>
                    <tr>
                      <td><strong>Total Bookings:</strong></td>
                      <td><span className="badge bg-primary">{guest.total_bookings}</span></td>
                    </tr>
                    <tr>
                      <td><strong>Completed Stays:</strong></td>
                      <td><span className="badge bg-success">{guest.completed_stays}</span></td>
                    </tr>
                    <tr>
                      <td><strong>Pending Bookings:</strong></td>
                      <td><span className="badge bg-warning">{guest.pending_bookings}</span></td>
                    </tr>
                    <tr>
                      <td><strong>Confirmed Bookings:</strong></td>
                      <td><span className="badge bg-info">{guest.confirmed_bookings}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Current Booking */}
              {guest.current_booking && (
                <div className="col-12 mt-3">
                  <h6><i className="fas fa-bed me-2"></i>Current Booking</h6>
                  <div className="card">
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <p><strong>Room:</strong> {guest.current_booking.room_title}</p>
                          <p><strong>Category:</strong> {guest.current_booking.room_category}</p>
                        </div>
                        <div className="col-md-6">
                          <p><strong>Check-in:</strong> {new Date(guest.current_booking.checking_date).toLocaleDateString()}</p>
                          <p><strong>Check-out:</strong> {new Date(guest.current_booking.checkout_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Guest Profile Details */}
              {guest.guest_profile && (
                <div className="col-12 mt-3">
                  <h6><i className="fas fa-user-cog me-2"></i>Profile Details</h6>
                  <div className="card">
                    <div className="card-body">
                      <div className="row">
                        {guest.guest_profile.id_number && (
                          <div className="col-md-6">
                            <p><strong>ID Number:</strong> {guest.guest_profile.id_number}</p>
                          </div>
                        )}
                        {guest.guest_profile.emergency_contact_name && (
                          <div className="col-md-6">
                            <p><strong>Emergency Contact:</strong> {guest.guest_profile.emergency_contact_name}</p>
                            {guest.guest_profile.emergency_contact_phone && (
                              <p><strong>Emergency Phone:</strong> {guest.guest_profile.emergency_contact_phone}</p>
                            )}
                          </div>
                        )}
                        {guest.guest_profile.special_requests && (
                          <div className="col-12">
                            <p><strong>Special Requests:</strong></p>
                            <p className="text-muted">{guest.guest_profile.special_requests}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestManagement;
