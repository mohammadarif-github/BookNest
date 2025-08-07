import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MyContext } from '../Context';
import axios from 'axios';

const PaymentProcessing = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const context = useContext(MyContext);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [initiatingPayment, setInitiatingPayment] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: 'Dhaka',
    postcode: '1000'
  });

  useEffect(() => {
    // Only fetch if we have bookingId and some form of authentication
    if (bookingId && (localStorage.getItem('token') || context.token)) {
      fetchBookingDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      // Check both localStorage and context for token
      const token = localStorage.getItem('token') || context.token;
      if (!token) {
        setError('Please log in to continue with payment');
        navigate('/login');
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      console.log(`Fetching booking details for ID: ${bookingId}`);
      const response = await axios.get(
        `https://booknest-jhw4.onrender.com/hotel/booking-detail/${bookingId}/`,
        config
      );

      if (response.data && response.data.success) {
        console.log('Booking data received:', response.data.data);
        setBooking(response.data.data); // Use response.data.data instead of response.data
        // Pre-fill customer info if available
        setCustomerInfo(prev => ({
          ...prev,
          email: response.data.data.email || '',
          phone: response.data.data.phone_number || '',
          name: response.data.data.customer?.username || ''
        }));
      } else {
        setError('No booking data found');
      }
    } catch (err) {
      console.error('Error fetching booking:', err);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (err.response?.status === 404) {
        setError('Booking not found. Please check your booking history.');
      } else if (err.response?.data?.detail) {
        setError(`Error: ${err.response.data.detail}`);
      } else {
        setError('Failed to load booking details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateAmount = () => {
    if (booking?.total_amount) {
      return parseFloat(booking.total_amount);
    }
    if (booking?.room?.price_per_night && booking?.nights_count) {
      return parseFloat(booking.room.price_per_night) * booking.nights_count;
    }
    if (booking?.room?.price_per_night) {
      return parseFloat(booking.room.price_per_night);
    }
    return 0;
  };

  const handlePaymentInitiation = async () => {
    if (!context.token && !localStorage.getItem('token')) {
      alert('Please login to make a payment');
      navigate('/login');
      return;
    }

    // Validate customer info
    if (!customerInfo.name.trim() || !customerInfo.email.trim() || !customerInfo.phone.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setInitiatingPayment(true);

      const token = context.token || localStorage.getItem('token');
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      const paymentData = {
        booking_id: booking.id,
        customer_info: {
          name: customerInfo.name.trim(),
          email: customerInfo.email.trim(),
          phone: customerInfo.phone.trim(),
          address: customerInfo.address.trim() || 'Dhaka, Bangladesh',
          city: customerInfo.city.trim() || 'Dhaka',
          postcode: customerInfo.postcode.trim() || '1000'
        }
      };

      const response = await axios.post(
        'https://booknest-jhw4.onrender.com/hotel/payment/initiate/',
        paymentData,
        config
      );

      if (response.data.success) {
        const paymentUrl = response.data.data.payment_url;
        // Redirect to SSLCommerz payment gateway
        window.location.href = paymentUrl;
      } else {
        alert(`Payment initiation failed: ${response.data.message}`);
      }
    } catch (err) {
      console.error('Payment initiation error:', err);
      alert(`Error initiating payment: ${err.response?.data?.message || err.message}`);
    } finally {
      setInitiatingPayment(false);
    }
  };

  const handleCustomerInfoChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatAmount = (amount) => {
    return `${parseFloat(amount).toLocaleString()} BDT`;
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Loading payment details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="alert alert-danger text-center">
              <h4>Error</h4>
              <p>{error || 'Booking not found'}</p>
              <Link to="/profile" className="btn btn-primary">
                Back to Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const amount = calculateAmount();

  return (
    <div className="container-fluid px-3 py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8 col-xl-7">
          {/* Header */}
          <div className="text-center mb-4">
            <h2 className="h3">
              <i className="fas fa-credit-card me-2 text-primary"></i>
              Payment Processing
            </h2>
            <p className="text-muted">Complete your booking payment</p>
          </div>

          {/* Payment Summary Card */}
          <div className="card mb-4 shadow-sm">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0 h6">
                <i className="fas fa-receipt me-2"></i>
                Booking Summary
              </h5>
            </div>
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-12 col-md-8 mb-3 mb-md-0">
                  <h6 className="mb-1"><strong>{booking.room?.title || 'Room Booking'}</strong></h6>
                  <p className="text-muted mb-1 small">
                    Booking #{booking.id}
                    {booking.nights_count && ` • ${booking.nights_count} nights`}
                  </p>
                  {booking.checking_date && booking.checkout_date && (
                    <p className="text-muted mb-0 small">
                      <i className="fas fa-calendar me-1"></i>
                      {new Date(booking.checking_date).toLocaleDateString()} - {new Date(booking.checkout_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="col-12 col-md-4 text-center text-md-end">
                  <h4 className="text-primary mb-0">{formatAmount(amount)}</h4>
                  <small className="text-muted">Total Amount</small>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information Form */}
          <div className="card mb-4 shadow-sm">
            <div className="card-header">
              <h6 className="mb-0">
                <i className="fas fa-user me-2"></i>
                Customer Information
              </h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12 col-sm-6">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={customerInfo.name}
                    onChange={handleCustomerInfoChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={customerInfo.email}
                    onChange={handleCustomerInfoChange}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    className="form-control"
                    name="phone"
                    value={customerInfo.phone}
                    onChange={handleCustomerInfoChange}
                    placeholder="+880xxxxxxxxxx"
                    required
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="form-control"
                    name="city"
                    value={customerInfo.city}
                    onChange={handleCustomerInfoChange}
                    placeholder="Dhaka"
                  />
                </div>
                <div className="col-12 col-md-8">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    className="form-control"
                    name="address"
                    value={customerInfo.address}
                    onChange={handleCustomerInfoChange}
                    placeholder="Enter your address"
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label">Postal Code</label>
                  <input
                    type="text"
                    className="form-control"
                    name="postcode"
                    value={customerInfo.postcode}
                    onChange={handleCustomerInfoChange}
                    placeholder="1000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Actions */}
          <div className="card mb-4 shadow-sm">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12 col-sm-6">
                  <Link to="/profile" className="btn btn-outline-secondary w-100">
                    <i className="fas fa-arrow-left me-2"></i>
                    Back to Profile
                  </Link>
                </div>
                <div className="col-12 col-sm-6">
                  <button
                    className="btn btn-success w-100"
                    onClick={handlePaymentInitiation}
                    disabled={initiatingPayment || !customerInfo.name.trim() || !customerInfo.email.trim() || !customerInfo.phone.trim()}
                  >
                    {initiatingPayment ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-lock me-2"></i>
                        <span className="d-none d-sm-inline">Proceed to Payment - </span>{formatAmount(amount)}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods Info */}
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h6 className="mb-3">Accepted Payment Methods</h6>
              <div className="row justify-content-center mb-3">
                <div className="col-auto">
                  <i className="fab fa-cc-visa fa-2x text-primary me-2" title="Visa"></i>
                  <i className="fab fa-cc-mastercard fa-2x text-warning me-2" title="MasterCard"></i>
                  <i className="fab fa-cc-amex fa-2x text-info" title="American Express"></i>
                </div>
              </div>
              <div className="row justify-content-center mb-3">
                <div className="col-auto">
                  <span className="badge bg-success me-2">bKash</span>
                  <span className="badge bg-primary me-2">Rocket</span>
                  <span className="badge bg-warning me-2">Nagad</span>
                  <span className="badge bg-info">Bank Transfer</span>
                </div>
              </div>
              <small className="text-muted">
                <i className="fas fa-shield-alt me-1"></i>
                Secure payment powered by SSLCommerz
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentProcessing;
