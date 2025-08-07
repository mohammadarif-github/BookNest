import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MyContext } from '../Context';
import axios from 'axios';

const PaymentFailure = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const context = useContext(MyContext);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryAttempts, setRetryAttempts] = useState(0);

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
        `http://localhost:8000/hotel/payment/details/${transactionId}/`,
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

  const handleRetryPayment = async () => {
    if (!paymentDetails?.booking_details?.id) {
      alert('Booking information not available for retry');
      return;
    }

    setRetryAttempts(prev => prev + 1);
    
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${context.token}`,
          'Content-Type': 'application/json',
        },
      };

      const retryData = {
        booking_id: paymentDetails.booking_details.id,
        customer_info: {
          name: paymentDetails.customer_name || 'Customer',
          email: paymentDetails.customer_email || '',
          phone: paymentDetails.customer_phone || '',
          address: paymentDetails.customer_address || 'Dhaka, Bangladesh',
          city: paymentDetails.customer_city || 'Dhaka',
          postcode: paymentDetails.customer_postcode || '1000'
        }
      };

      const response = await axios.post(
        'http://localhost:8000/hotel/payment/initiate/',
        retryData,
        config
      );

      if (response.data.success) {
        const paymentUrl = response.data.data.payment_url;
        window.location.href = paymentUrl;
      } else {
        alert(`Payment retry failed: ${response.data.message}`);
      }
    } catch (err) {
      console.error('Payment retry error:', err);
      alert(`Error retrying payment: ${err.response?.data?.message || err.message}`);
    }
  };

  const formatAmount = (amount) => {
    return `${parseFloat(amount).toLocaleString()} BDT`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString();
  };

  const getFailureReason = () => {
    if (!paymentDetails) return 'Payment could not be processed';
    
    if (paymentDetails.failure_reason) {
      return paymentDetails.failure_reason;
    }
    
    switch (paymentDetails.status?.toLowerCase()) {
      case 'failed':
        return 'Payment was declined by your bank or payment provider';
      case 'cancelled':
        return 'Payment was cancelled by user';
      case 'expired':
        return 'Payment session expired';
      default:
        return 'Payment could not be completed';
    }
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-warning mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h5>Checking Payment Status...</h5>
                <p className="text-muted">Please wait while we verify your payment status.</p>
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
          {/* Failure Header */}
          <div className="card border-danger mb-4">
            <div className="card-body text-center py-5">
              <div className="mb-4">
                <i className="fas fa-times-circle fa-4x text-danger"></i>
              </div>
              <h2 className="text-danger mb-3">Payment Failed</h2>
              <p className="lead text-muted">
                Unfortunately, your payment could not be processed.
              </p>
              {transactionId && (
                <div className="mt-4">
                  <h5 className="text-muted">Transaction ID: {transactionId}</h5>
                </div>
              )}
            </div>
          </div>

          <div className="row">
            <div className="col-md-8">
              {/* Failure Details */}
              <div className="card mb-4">
                <div className="card-header bg-danger text-white">
                  <h5 className="mb-0">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    What Happened?
                  </h5>
                </div>
                <div className="card-body">
                  <div className="alert alert-warning">
                    <h6><i className="fas fa-info-circle me-2"></i>Reason for Failure:</h6>
                    <p className="mb-0">{getFailureReason()}</p>
                  </div>
                  
                  {paymentDetails && (
                    <div className="row">
                      <div className="col-6 mb-3">
                        <strong>Attempted Amount:</strong>
                        <div className="text-danger fs-5">
                          {formatAmount(paymentDetails.amount)}
                        </div>
                      </div>
                      <div className="col-6 mb-3">
                        <strong>Attempt Date:</strong>
                        <div>{formatDate(paymentDetails.created_at)}</div>
                      </div>
                      <div className="col-6 mb-3">
                        <strong>Status:</strong>
                        <span className="badge bg-danger">
                          {paymentDetails.status}
                        </span>
                      </div>
                      {paymentDetails.payment_method && (
                        <div className="col-6 mb-3">
                          <strong>Payment Method:</strong>
                          <div>{paymentDetails.payment_method}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Information */}
              {paymentDetails?.booking_details && (
                <div className="card mb-4">
                  <div className="card-header bg-info text-white">
                    <h5 className="mb-0">
                      <i className="fas fa-bed me-2"></i>
                      Booking Information (Still Pending)
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="alert alert-info">
                      <i className="fas fa-clock me-2"></i>
                      <strong>Your booking is still reserved!</strong> You have some time to complete the payment.
                    </div>
                    
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

              {/* Common Reasons */}
              <div className="card mb-4">
                <div className="card-header">
                  <h6 className="mb-0">
                    <i className="fas fa-question-circle me-2"></i>
                    Common Reasons for Payment Failure
                  </h6>
                </div>
                <div className="card-body">
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <i className="fas fa-credit-card text-warning me-2"></i>
                      <strong>Insufficient Funds:</strong> Your account doesn't have enough balance
                    </li>
                    <li className="mb-2">
                      <i className="fas fa-ban text-warning me-2"></i>
                      <strong>Card Declined:</strong> Your bank or card issuer declined the transaction
                    </li>
                    <li className="mb-2">
                      <i className="fas fa-wifi text-warning me-2"></i>
                      <strong>Network Issue:</strong> Connection problem during payment processing
                    </li>
                    <li className="mb-2">
                      <i className="fas fa-user-times text-warning me-2"></i>
                      <strong>Cancelled by User:</strong> Payment was cancelled before completion
                    </li>
                    <li className="mb-2">
                      <i className="fas fa-clock text-warning me-2"></i>
                      <strong>Session Expired:</strong> Payment session timed out
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              {/* Action Buttons */}
              <div className="card mb-4">
                <div className="card-header">
                  <h6 className="mb-0">What's Next?</h6>
                </div>
                <div className="card-body">
                  <div className="d-grid gap-2">
                    {paymentDetails?.booking_details && retryAttempts < 3 && (
                      <button 
                        className="btn btn-primary"
                        onClick={handleRetryPayment}
                      >
                        <i className="fas fa-redo me-2"></i>
                        Try Payment Again
                      </button>
                    )}
                    
                    <Link 
                      to="/bookings" 
                      className="btn btn-outline-primary"
                    >
                      <i className="fas fa-list me-2"></i>
                      View My Bookings
                    </Link>
                    
                    <Link 
                      to="/rooms" 
                      className="btn btn-outline-secondary"
                    >
                      <i className="fas fa-search me-2"></i>
                      Find Another Room
                    </Link>
                    
                    <hr />
                    
                    <a 
                      href="mailto:support@hotel.com" 
                      className="btn btn-outline-info"
                    >
                      <i className="fas fa-envelope me-2"></i>
                      Contact Support
                    </a>
                  </div>
                </div>
              </div>

              {/* Payment Tips */}
              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">
                    <i className="fas fa-lightbulb me-2"></i>
                    Payment Tips
                  </h6>
                </div>
                <div className="card-body">
                  <ul className="small list-unstyled mb-0">
                    <li className="mb-2">
                      <i className="fas fa-check text-success me-2"></i>
                      Ensure your card has sufficient balance
                    </li>
                    <li className="mb-2">
                      <i className="fas fa-check text-success me-2"></i>
                      Check if international transactions are enabled
                    </li>
                    <li className="mb-2">
                      <i className="fas fa-check text-success me-2"></i>
                      Try a different payment method
                    </li>
                    <li className="mb-2">
                      <i className="fas fa-check text-success me-2"></i>
                      Contact your bank if issues persist
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Retry Limit Warning */}
          {retryAttempts >= 3 && (
            <div className="alert alert-warning mt-4">
              <h6><i className="fas fa-exclamation-triangle me-2"></i>Payment Retry Limit Reached</h6>
              <p className="mb-0">
                You've reached the maximum number of retry attempts. Please contact our support team for assistance or try booking again later.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="text-center mt-4">
            <Link to="/" className="btn btn-primary me-2">
              <i className="fas fa-home me-2"></i>
              Back to Home
            </Link>
            <a href="mailto:support@hotel.com" className="btn btn-outline-primary">
              <i className="fas fa-headset me-2"></i>
              Get Help
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;
