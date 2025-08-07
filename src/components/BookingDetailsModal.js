import React, { useState, useEffect, useContext } from 'react';
import { MyContext } from '../Context';
import axios from 'axios';

const BookingDetailsModal = ({ bookingId, onClose, onUpdate }) => {
  const context = useContext(MyContext);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${context.token}`,
        },
      };

      const response = await axios.get(
        `http://localhost:8000/hotel/booking-detail/${bookingId}/`,
        config
      );

      if (response.data.success) {
        setBooking(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch booking details');
      }
    } catch (err) {
      console.error('Error fetching booking details:', err);
      setError('Error fetching booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancellationRequest = async () => {
    if (!cancellationReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    try {
      setCancelling(true);
      const config = {
        headers: {
          Authorization: `Bearer ${context.token}`,
          'Content-Type': 'application/json',
        },
      };

      const response = await axios.post(
        `http://localhost:8000/hotel/booking-cancel/${bookingId}/`,
        { reason: cancellationReason.trim() },
        config
      );

      if (response.data.success) {
        alert('Cancellation request submitted successfully');
        await fetchBookingDetails(); // Refresh booking details
        setShowCancelForm(false);
        setCancellationReason('');
        if (onUpdate) onUpdate(); // Refresh parent component
      } else {
        alert(response.data.message || 'Failed to request cancellation');
      }
    } catch (err) {
      console.error('Error requesting cancellation:', err);
      alert('Error requesting cancellation');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-warning';
      case 'payment_pending':
        return 'bg-info';
      case 'awaiting_approval':
        return 'bg-primary';
      case 'confirmed':
        return 'bg-success';
      case 'cancellation_requested':
        return 'bg-warning';
      case 'cancelled':
        return 'bg-danger';
      case 'checked_in':
        return 'bg-success';
      case 'checked_out':
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  };

  const getPaymentStatusBadgeClass = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-success';
      case 'pending':
        return 'bg-warning';
      case 'unpaid':
        return 'bg-danger';
      case 'refunded':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-body text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <h5>Loading booking details...</h5>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Error</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body text-center py-5">
              <i className="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
              <h5 className="text-danger">Error Loading Booking</h5>
              <p className="text-muted">{error}</p>
              <button className="btn btn-primary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="fas fa-calendar-alt me-2"></i>
              Booking Details #{booking.id}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="row">
              {/* Left Column - Booking Information */}
              <div className="col-md-8">
                {/* Status Cards */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="card border-0 bg-light">
                      <div className="card-body text-center">
                        <h6 className="card-title">Booking Status</h6>
                        <span className={`badge ${getStatusBadgeClass(booking.status)} fs-6`}>
                          {booking.status_display}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card border-0 bg-light">
                      <div className="card-body text-center">
                        <h6 className="card-title">Payment Status</h6>
                        <span className={`badge ${getPaymentStatusBadgeClass(booking.payment_status)} fs-6`}>
                          {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Room Information */}
                <div className="card mb-4">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="fas fa-bed me-2"></i>
                      Room Information
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-4">
                        {booking.room.cover_image && (
                          <img 
                            src={booking.room.cover_image} 
                            alt={booking.room.title}
                            className="img-fluid rounded"
                          />
                        )}
                      </div>
                      <div className="col-md-8">
                        <h5>{booking.room.title}</h5>
                        <p className="text-muted mb-1">
                          <i className="fas fa-users me-2"></i>
                          Capacity: {booking.room.capacity} guests
                        </p>
                        <p className="text-muted mb-1">
                          <i className="fas fa-money-bill-wave me-2"></i>
                          Price: {parseFloat(booking.room.price_per_night).toLocaleString()} BDT per night
                        </p>
                        {booking.total_amount && (
                          <h4 className="text-primary">
                            Total: {parseFloat(booking.total_amount).toLocaleString()} BDT
                            {booking.nights_count > 1 && (
                              <small className="text-muted"> ({booking.nights_count} nights)</small>
                            )}
                          </h4>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booking Dates */}
                <div className="card mb-4">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="fas fa-calendar me-2"></i>
                      Stay Information
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <h6>Check-in</h6>
                        <p className="text-muted">
                          {booking.checking_date ? formatDate(booking.checking_date) : 'Not specified'}
                        </p>
                      </div>
                      <div className="col-md-6">
                        <h6>Check-out</h6>
                        <p className="text-muted">
                          {booking.checkout_date ? formatDate(booking.checkout_date) : 'Not specified'}
                        </p>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <h6>Booking Date</h6>
                        <p className="text-muted">{formatDate(booking.booking_date)}</p>
                      </div>
                      <div className="col-md-6">
                        <h6>Duration</h6>
                        <p className="text-muted">
                          {booking.nights_count} {booking.nights_count === 1 ? 'night' : 'nights'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Special Requests */}
                {booking.special_requests && (
                  <div className="card mb-4">
                    <div className="card-header">
                      <h6 className="mb-0">
                        <i className="fas fa-comments me-2"></i>
                        Special Requests
                      </h6>
                    </div>
                    <div className="card-body">
                      <p className="mb-0">{booking.special_requests}</p>
                    </div>
                  </div>
                )}

                {/* Payment Information */}
                {booking.payment_info && (
                  <div className="card mb-4">
                    <div className="card-header">
                      <h6 className="mb-0">
                        <i className="fas fa-credit-card me-2"></i>
                        Payment Information
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <h6>Transaction ID</h6>
                          <p className="text-muted">{booking.payment_info.transaction_id}</p>
                        </div>
                        <div className="col-md-6">
                          <h6>Payment Method</h6>
                          <p className="text-muted">{booking.payment_info.payment_method || 'Online Payment'}</p>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-6">
                          <h6>Amount Paid</h6>
                          <p className="text-success">
                            {parseFloat(booking.payment_info.amount).toLocaleString()} BDT
                          </p>
                        </div>
                        <div className="col-md-6">
                          <h6>Payment Date</h6>
                          <p className="text-muted">{formatDate(booking.payment_info.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Actions */}
              <div className="col-md-4">
                {/* Contact Information */}
                <div className="card mb-4">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="fas fa-user me-2"></i>
                      Contact Details
                    </h6>
                  </div>
                  <div className="card-body">
                    <p className="mb-2">
                      <strong>Email:</strong><br />
                      <span className="text-muted">{booking.email}</span>
                    </p>
                    <p className="mb-0">
                      <strong>Phone:</strong><br />
                      <span className="text-muted">{booking.phone_number}</span>
                    </p>
                  </div>
                </div>

                {/* Payment Due */}
                {booking.payment_due_date && booking.payment_status === 'unpaid' && (
                  <div className="card mb-4 border-warning">
                    <div className="card-header bg-warning text-dark">
                      <h6 className="mb-0">
                        <i className="fas fa-clock me-2"></i>
                        Payment Due
                      </h6>
                    </div>
                    <div className="card-body">
                      <p className="mb-2">Payment due by:</p>
                      <p className="text-danger mb-0">
                        <strong>{formatDate(booking.payment_due_date)}</strong>
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="fas fa-cogs me-2"></i>
                      Actions
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="d-grid gap-2">
                      {booking.can_be_cancelled && !showCancelForm && (
                        <button 
                          className="btn btn-outline-danger"
                          onClick={() => setShowCancelForm(true)}
                        >
                          <i className="fas fa-times me-2"></i>
                          Request Cancellation
                        </button>
                      )}

                      {booking.payment_status === 'unpaid' && booking.status === 'pending' && (
                        <button className="btn btn-success">
                          <i className="fas fa-credit-card me-2"></i>
                          Complete Payment
                        </button>
                      )}

                      <button 
                        className="btn btn-outline-primary"
                        onClick={() => window.print()}
                      >
                        <i className="fas fa-print me-2"></i>
                        Print Details
                      </button>

                      <a 
                        href="mailto:support@hotel.com"
                        className="btn btn-outline-info"
                      >
                        <i className="fas fa-envelope me-2"></i>
                        Contact Support
                      </a>
                    </div>

                    {/* Cancellation Form */}
                    {showCancelForm && (
                      <div className="mt-3">
                        <hr />
                        <h6>Cancellation Request</h6>
                        <div className="mb-3">
                          <label className="form-label">Reason for cancellation</label>
                          <textarea
                            className="form-control"
                            rows="3"
                            value={cancellationReason}
                            onChange={(e) => setCancellationReason(e.target.value)}
                            placeholder="Please provide a reason for cancellation..."
                          ></textarea>
                        </div>
                        <div className="d-grid gap-2">
                          <button
                            className="btn btn-danger"
                            onClick={handleCancellationRequest}
                            disabled={cancelling || !cancellationReason.trim()}
                          >
                            {cancelling ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Submitting...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-paper-plane me-2"></i>
                                Submit Request
                              </>
                            )}
                          </button>
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => {
                              setShowCancelForm(false);
                              setCancellationReason('');
                            }}
                            disabled={cancelling}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Staff Notes */}
                {booking.notes && (
                  <div className="card mt-4">
                    <div className="card-header">
                      <h6 className="mb-0">
                        <i className="fas fa-sticky-note me-2"></i>
                        Staff Notes
                      </h6>
                    </div>
                    <div className="card-body">
                      <p className="mb-0 small text-muted">{booking.notes}</p>
                    </div>
                  </div>
                )}
              </div>
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

export default BookingDetailsModal;
