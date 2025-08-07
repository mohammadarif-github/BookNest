import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { MyContext } from '../../Context';

const BookingManagement = ({ onDataUpdate }) => {
  const context = useContext(MyContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    date_from: '',
    date_to: ''
  });
  const [processingBookingId, setProcessingBookingId] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, [filters]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${context.token}`,
        },
        params: filters
      };

      const response = await axios.get(
        'http://localhost:8000/hotel/management/bookings/',
        config
      );

      if (response.data.success) {
        setBookings(response.data.data);
      } else {
        setError('Failed to fetch bookings');
      }
    } catch (err) {
      console.error('Bookings fetch error:', err);
      setError('Error loading bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingAction = async (bookingId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this booking?`)) {
      return;
    }

    try {
      setProcessingBookingId(bookingId);
      const config = {
        headers: {
          Authorization: `Bearer ${context.token}`,
          'Content-Type': 'application/json',
        },
      };

      const response = await axios.patch(
        'http://localhost:8000/hotel/management/bookings/',
        {
          booking_id: bookingId,
          action: action
        },
        config
      );

      if (response.data.success) {
        alert(`Booking ${action}ed successfully!`);
        fetchBookings(); // Refresh bookings
        if (onDataUpdate) onDataUpdate(); // Refresh parent dashboard
      } else {
        alert(`Failed to ${action} booking: ${response.data.message}`);
      }
    } catch (err) {
      console.error(`Booking ${action} error:`, err);
      alert(`Error ${action}ing booking: ${err.response?.data?.message || err.message}`);
    } finally {
      setProcessingBookingId(null);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading bookings...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <h4>Error</h4>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchBookings}>
          Retry
        </button>
      </div>
    );
  }

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
              <div className="col-md-3">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="checked_in">Checked In</option>
                  <option value="checked_out">Checked Out</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">From Date</label>
                <input
                  type="date"
                  className="form-control"
                  name="date_from"
                  value={filters.date_from}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">To Date</label>
                <input
                  type="date"
                  className="form-control"
                  name="date_to"
                  value={filters.date_to}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setFilters({ status: '', date_from: '', date_to: '' });
                  }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5><i className="fas fa-calendar-check me-2"></i>All Bookings ({bookings.length})</h5>
            <button className="btn btn-sm btn-outline-primary" onClick={fetchBookings}>
              <i className="fas fa-sync-alt me-1"></i>
              Refresh
            </button>
          </div>
          <div className="card-body">
            {bookings.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Guest</th>
                      <th>Room</th>
                      <th>Status</th>
                      <th>Booking Date</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Total Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>
                          <div>
                            <strong>{booking.customer_full_name || booking.customer_name}</strong>
                            <br />
                            <small className="text-muted">{booking.customer_email}</small>
                            {booking.phone_number && (
                              <>
                                <br />
                                <small className="text-muted">{booking.phone_number}</small>
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong>{booking.room_title}</strong>
                            <br />
                            <small className="text-muted">{booking.room_category}</small>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(booking.status)}`}>
                            {booking.status_display}
                          </span>
                          {booking.approved_by_name && (
                            <>
                              <br />
                              <small className="text-muted">
                                by {booking.approved_by_name}
                              </small>
                            </>
                          )}
                        </td>
                        <td>{new Date(booking.booking_date).toLocaleDateString()}</td>
                        <td>
                          {booking.checking_date 
                            ? new Date(booking.checking_date).toLocaleDateString() 
                            : 'N/A'
                          }
                        </td>
                        <td>
                          {booking.checkout_date 
                            ? new Date(booking.checkout_date).toLocaleDateString() 
                            : 'N/A'
                          }
                        </td>
                        <td>
                          {booking.total_amount ? `${booking.total_amount} BDT` : 'N/A'}
                          {booking.nights_count && (
                            <>
                              <br />
                              <small className="text-muted">{booking.nights_count} nights</small>
                            </>
                          )}
                        </td>
                        <td>
                          <div className="btn-group" role="group">
                            {booking.status === 'pending' && (
                              <>
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleBookingAction(booking.id, 'confirm')}
                                  disabled={processingBookingId === booking.id}
                                >
                                  {processingBookingId === booking.id ? (
                                    <span className="spinner-border spinner-border-sm" />
                                  ) : (
                                    <i className="fas fa-check"></i>
                                  )}
                                  {' '}Confirm
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleBookingAction(booking.id, 'cancel')}
                                  disabled={processingBookingId === booking.id}
                                >
                                  <i className="fas fa-times"></i> Cancel
                                </button>
                              </>
                            )}
                            {booking.status === 'confirmed' && (
                              <button
                                className="btn btn-sm btn-warning"
                                onClick={() => handleBookingAction(booking.id, 'cancel')}
                                disabled={processingBookingId === booking.id}
                              >
                                <i className="fas fa-times"></i> Cancel
                              </button>
                            )}
                            {booking.status === 'cancelled' && (
                              <span className="text-muted">No actions available</span>
                            )}
                          </div>
                          {booking.special_requests && (
                            <div className="mt-1">
                              <small className="text-info">
                                <i className="fas fa-info-circle me-1"></i>
                                Has special requests
                              </small>
                            </div>
                          )}
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
                <p className="text-muted">Try adjusting your filters or check back later.</p>
              </div>
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
      return 'bg-warning text-dark';
    case 'confirmed':
      return 'bg-success';
    case 'cancelled':
      return 'bg-danger';
    case 'checked_in':
      return 'bg-info';
    case 'checked_out':
      return 'bg-secondary';
    default:
      return 'bg-light text-dark';
  }
};

export default BookingManagement;
