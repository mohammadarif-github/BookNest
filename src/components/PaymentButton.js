import React, { useState, useContext } from 'react';
import { MyContext } from '../Context';
import axios from 'axios';

const PaymentButton = ({ booking, onPaymentInitiated }) => {
  const context = useContext(MyContext);
  const [initiatingPayment, setInitiatingPayment] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: booking?.email || '',
    phone: booking?.phone_number || '',
    address: '',
    city: 'Dhaka',
    postcode: '1000'
  });
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  const calculateAmount = () => {
    if (booking?.total_amount) {
      return parseFloat(booking.total_amount);
    }
    if (booking?.room_price && booking?.nights_count) {
      return parseFloat(booking.room_price) * booking.nights_count;
    }
    if (booking?.room_price) {
      return parseFloat(booking.room_price);
    }
    return 0;
  };

  const handlePaymentInitiation = async () => {
    if (!context.token) {
      alert('Please login to make a payment');
      return;
    }

    if (!booking?.id) {
      alert('Invalid booking information');
      return;
    }

    // Validate customer info
    if (!customerInfo.name.trim() || !customerInfo.email.trim() || !customerInfo.phone.trim()) {
      setShowCustomerForm(true);
      return;
    }

    try {
      setInitiatingPayment(true);

      const config = {
        headers: {
          Authorization: `Bearer ${context.token}`,
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
        'http://localhost:8000/hotel/payment/initiate/',
        paymentData,
        config
      );

      if (response.data.success) {
        const paymentUrl = response.data.data.payment_url;
        
        // Notify parent component
        if (onPaymentInitiated) {
          onPaymentInitiated(response.data.data);
        }

        // Redirect to SSLCommerz payment gateway
        window.open(paymentUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
        
        // Optional: You can also redirect in the same window
        // window.location.href = paymentUrl;
        
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

  if (!booking) {
    return null;
  }

  const amount = calculateAmount();

  return (
    <div className="payment-button-container">
      {/* Payment Summary Card */}
      <div className="card mb-3">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">
            <i className="fas fa-credit-card me-2"></i>
            Payment Summary
          </h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-8">
              <h6><strong>{booking.room_title || 'Room Booking'}</strong></h6>
              <p className="text-muted mb-1">
                Booking #{booking.id}
                {booking.nights_count && ` • ${booking.nights_count} nights`}
              </p>
              {booking.checking_date && booking.checkout_date && (
                <p className="text-muted mb-0">
                  <i className="fas fa-calendar me-1"></i>
                  {new Date(booking.checking_date).toLocaleDateString()} - {new Date(booking.checkout_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="col-md-4 text-end">
              <h4 className="text-primary mb-0">{formatAmount(amount)}</h4>
              <small className="text-muted">Total Amount</small>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Information Form */}
      {showCustomerForm && (
        <div className="card mb-3">
          <div className="card-header">
            <h6 className="mb-0">
              <i className="fas fa-user me-2"></i>
              Customer Information
            </h6>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6 mb-3">
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
              <div className="col-md-6 mb-3">
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
              <div className="col-md-6 mb-3">
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
              <div className="col-md-6 mb-3">
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
              <div className="col-md-8 mb-3">
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
              <div className="col-md-4 mb-3">
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
      )}

      {/* Payment Buttons */}
      <div className="d-grid gap-2">
        {!showCustomerForm ? (
          <button
            className="btn btn-success btn-lg"
            onClick={() => setShowCustomerForm(true)}
            disabled={initiatingPayment}
          >
            <i className="fas fa-credit-card me-2"></i>
            Pay Now - {formatAmount(amount)}
          </button>
        ) : (
          <div className="row">
            <div className="col-md-6 mb-2">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => setShowCustomerForm(false)}
                disabled={initiatingPayment}
              >
                <i className="fas fa-arrow-left me-2"></i>
                Back
              </button>
            </div>
            <div className="col-md-6 mb-2">
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
                    Proceed to Payment
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Methods Info */}
      <div className="card mt-3">
        <div className="card-body text-center">
          <h6 className="mb-3">We Accept</h6>
          <div className="row justify-content-center">
            <div className="col-auto">
              <i className="fab fa-cc-visa fa-2x text-primary me-2" title="Visa"></i>
              <i className="fab fa-cc-mastercard fa-2x text-warning me-2" title="MasterCard"></i>
              <i className="fab fa-cc-amex fa-2x text-info me-2" title="American Express"></i>
            </div>
          </div>
          <div className="row justify-content-center mt-2">
            <div className="col-auto">
              <span className="badge bg-success me-2">bKash</span>
              <span className="badge bg-primary me-2">Rocket</span>
              <span className="badge bg-warning me-2">Nagad</span>
              <span className="badge bg-info">Bank Transfer</span>
            </div>
          </div>
          <small className="text-muted mt-2 d-block">
            <i className="fas fa-shield-alt me-1"></i>
            Secure payment powered by SSLCommerz
          </small>
        </div>
      </div>

      {/* Payment Status Instructions */}
      <div className="alert alert-info mt-3">
        <h6><i className="fas fa-info-circle me-2"></i>Payment Instructions:</h6>
        <ul className="mb-0 small">
          <li>Click "Proceed to Payment" to open the secure SSLCommerz payment gateway</li>
          <li>Choose your preferred payment method (Card, Mobile Banking, etc.)</li>
          <li>Complete the payment and you'll be redirected back</li>
          <li>Your booking will be confirmed automatically upon successful payment</li>
        </ul>
      </div>
    </div>
  );
};

export default PaymentButton;
