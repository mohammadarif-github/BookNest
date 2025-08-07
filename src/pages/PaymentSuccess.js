import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MyContext } from '../Context';
import axios from 'axios';

const PaymentSuccess = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const context = useContext(MyContext);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (transactionId) {
      fetchPaymentDetails();
    } else {
      setError('Transaction ID not found');
      setLoading(false);
    }
  }, [transactionId]);

  const fetchPaymentDetails = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${context.token}`,
        },
      };

      const response = await axios.get(
        `https://booknest-jhw4.onrender.com/hotel/payment/status/?transaction_id=${transactionId}`,
        config
      );

      if (response.data.success) {
        setPaymentDetails(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch payment details');
      }
    } catch (err) {
      console.error('Error fetching payment details:', err);
      setError('Error fetching payment details');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return `${parseFloat(amount).toLocaleString()} BDT`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h5>Verifying Payment...</h5>
                <p className="text-muted">Please wait while we confirm your payment.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card border-danger">
              <div className="card-body text-center py-5">
                <i className="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <h4 className="text-danger">Payment Verification Error</h4>
                <p className="text-muted">{error}</p>
                <div className="mt-4">
                  <Link to="/bookings" className="btn btn-primary me-2">
                    View My Bookings
                  </Link>
                  <Link to="/" className="btn btn-outline-secondary">
                    Back to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-10">
          {/* Success Header */}
          <div className="card border-success mb-4">
            <div className="card-body text-center py-5">
              <div className="mb-4">
                <i className="fas fa-check-circle fa-4x text-success"></i>
              </div>
              <h2 className="text-success mb-3">Payment Successful!</h2>
              <p className="lead text-muted">
                Thank you for your payment. Your booking has been confirmed.
              </p>
              <div className="mt-4">
                <h4 className="text-primary">Transaction ID: {transactionId}</h4>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          {paymentDetails && (
            <div className="row">
              <div className="col-md-8">
                <div className="card mb-4">
                  <div className="card-header bg-primary text-white">
                    <h5 className="mb-0">
                      <i className="fas fa-receipt me-2"></i>
                      Payment Details
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-6 mb-3">
                        <strong>Amount Paid:</strong>
                        <div className="text-success fs-4">
                          {formatAmount(paymentDetails.amount)}
                        </div>
                      </div>
                      <div className="col-6 mb-3">
                        <strong>Payment Method:</strong>
                        <div>{paymentDetails.payment_method || 'Online Payment'}</div>
                      </div>
                      <div className="col-6 mb-3">
                        <strong>Payment Date:</strong>
                        <div>{formatDate(paymentDetails.created_at)}</div>
                      </div>
                      <div className="col-6 mb-3">
                        <strong>Status:</strong>
                        <span className="badge bg-success">
                          {paymentDetails.status}
                        </span>
                      </div>
                      {paymentDetails.card_type && (
                        <div className="col-6 mb-3">
                          <strong>Card Type:</strong>
                          <div>{paymentDetails.card_type}</div>
                        </div>
                      )}
                      {paymentDetails.card_no && (
                        <div className="col-6 mb-3">
                          <strong>Card Number:</strong>
                          <div>****-****-****-{paymentDetails.card_no.slice(-4)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Booking Information */}
                {paymentDetails.booking_details && (
                  <div className="card mb-4">
                    <div className="card-header bg-info text-white">
                      <h5 className="mb-0">
                        <i className="fas fa-bed me-2"></i>
                        Booking Information
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <strong>Booking ID:</strong>
                          <div>#{paymentDetails.booking_details.id}</div>
                        </div>
                        <div className="col-md-6 mb-3">
                          <strong>Room:</strong>
                          <div>{paymentDetails.booking_details.room_title}</div>
                        </div>
                        {paymentDetails.booking_details.checking_date && (
                          <>
                            <div className="col-md-6 mb-3">
                              <strong>Check-in:</strong>
                              <div>{new Date(paymentDetails.booking_details.checking_date).toLocaleDateString()}</div>
                            </div>
                            <div className="col-md-6 mb-3">
                              <strong>Check-out:</strong>
                              <div>{new Date(paymentDetails.booking_details.checkout_date).toLocaleDateString()}</div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="col-md-4">
                {/* Quick Actions */}
                <div className="card mb-4">
                  <div className="card-header">
                    <h6 className="mb-0">Quick Actions</h6>
                  </div>
                  <div className="card-body">
                    <div className="d-grid gap-2">
                      <Link 
                        to="/bookings" 
                        className="btn btn-primary"
                      >
                        <i className="fas fa-list me-2"></i>
                        View My Bookings
                      </Link>
                      <button 
                        className="btn btn-outline-secondary"
                        onClick={() => window.print()}
                      >
                        <i className="fas fa-print me-2"></i>
                        Print Receipt
                      </button>
                      <Link 
                        to="/rooms" 
                        className="btn btn-outline-primary"
                      >
                        <i className="fas fa-search me-2"></i>
                        Book Another Room
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Customer Support */}
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">Need Help?</h6>
                  </div>
                  <div className="card-body">
                    <p className="small text-muted mb-3">
                      If you have any questions about your booking or payment, our customer support team is here to help.
                    </p>
                    <div className="d-grid gap-2">
                      <a 
                        href="mailto:support@booknest.com" 
                        className="btn btn-outline-info btn-sm"
                      >
                        <i className="fas fa-envelope me-2"></i>
                        Email Support
                      </a>
                      <a 
                        href="tel:+8801234567890" 
                        className="btn btn-outline-success btn-sm"
                      >
                        <i className="fas fa-phone me-2"></i>
                        Call Us
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Important Information */}
          <div className="alert alert-info">
            <h6><i className="fas fa-info-circle me-2"></i>Important Information:</h6>
            <ul className="mb-0 small">
              <li>Please save this transaction ID for your records: <strong>{transactionId}</strong></li>
              <li>A confirmation email has been sent to your registered email address</li>
              <li>You can view and manage your bookings in the "My Bookings" section</li>
              <li>For any changes or cancellations, please contact our support team</li>
            </ul>
          </div>

          {/* Navigation */}
          <div className="text-center mt-4">
            <Link to="/" className="btn btn-primary me-2">
              <i className="fas fa-home me-2"></i>
              Back to Home
            </Link>
            <Link to="/bookings" className="btn btn-outline-primary">
              <i className="fas fa-list me-2"></i>
              My Bookings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
