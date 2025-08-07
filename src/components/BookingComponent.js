import React, { useContext } from "react";
import { useState } from "react";
import { MyContext } from "../Context";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import TextInput from "../components/TextInput";

export default function BookingComponent({ room }) {
  const context = useContext(MyContext);
  const navigate = useNavigate();
  const token = context.token;
  const user_id = parseInt(context.user_id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [data, setData] = useState({
    email: "",
    phone_number: "",
    checking_date: "",
    checkout_date: "",
  });

  const isValid = () => {
    // More flexible phone validation
    const phone = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    if (!phone.test(data.phone_number.trim())) {
      document.getElementById("phoneID").style.display = "block";
      document.getElementById("phone").innerHTML = "Please enter a valid phone number (minimum 10 digits)";
      return false;
    }
    document.getElementById("phoneID").style.display = "none";
    document.getElementById("phone").innerHTML = "";
    
    // Check if checkout date is after check-in date
    const checkIn = new Date(data.checking_date);
    const checkOut = new Date(data.checkout_date);
    if (checkOut <= checkIn) {
      document.getElementById("checkoutID").style.display = "block";
      document.getElementById("checkout").innerHTML =
        "Check-out date must be after check-in date";
      return false;
    }
    
    // Check if check-in date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkIn < today) {
      document.getElementById("checkoutID").style.display = "block";
      document.getElementById("checkout").innerHTML =
        "Check-in date cannot be in the past";
      return false;
    }
    
    document.getElementById("checkoutID").style.display = "none";
    document.getElementById("checkout").innerHTML = "";
    return true;
  };
  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return; // Prevent double submission
    
    let isFormValid = isValid();
    if (!isFormValid) return;
    
    setIsSubmitting(true);
    
    let bookingData = {
      email: data.email,
      phone_number: data.phone_number,
      checking_date: data.checking_date,
      checkout_date: data.checkout_date,
      room: room.id,
      customer: user_id,
    };
    
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };
    
    axios
      .post("http://localhost:8000/hotel/book/", bookingData, config)
      .then((response) => {
        setData({
          email: "",
          phone_number: "",
          checking_date: "",
          checkout_date: "",
        });
        context.handleBook(room.id);
        
        // Store booking details for payment
        const bookingDetails = {
          ...response.data.booking_data,
          room_title: room.title,
          room_price: getRoomPrice(),
          total_amount: calculateTotalAmount(),
          nights_count: calculateNights(),
          email: data.email,
          phone_number: data.phone_number,
          checking_date: data.checking_date,
          checkout_date: data.checkout_date,
        };
        
        setCreatedBooking(bookingDetails);
        setBookingSuccess(true);
        
        return response.data;
      })
      .then((response) => {
        // Handle new API response format
        const message = response.success 
          ? response.message 
          : (response["response"] || "Booking successful! You can now proceed to payment.");
          
        document.getElementById("common-message").innerHTML = message;
        setTimeout(function () {
          document.getElementById("common-message").innerHTML = "";
        }, 5000);
      })
      .catch((error) => {
        // Show user-friendly error message
        const errorMessage = error.response?.data?.message || 
          "Booking failed. Please try again or contact support.";
        document.getElementById("common-message").innerHTML = errorMessage;
        setTimeout(function () {
          document.getElementById("common-message").innerHTML = "";
        }, 5000);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const calculateNights = () => {
    if (data.checking_date && data.checkout_date) {
      const checkIn = new Date(data.checking_date);
      const checkOut = new Date(data.checkout_date);
      const timeDiff = checkOut.getTime() - checkIn.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      return daysDiff > 0 ? daysDiff : 0;
    }
    return 0;
  };

  const calculateTotalAmount = () => {
    const nights = calculateNights();
    const roomPrice = parseFloat(room.price_per_night || room.price || 0);
    return nights * roomPrice;
  };

  const getRoomPrice = () => {
    return parseFloat(room.price_per_night || room.price || 0);
  };
  return (
    <div className="booking-form mt-5">
      {/* Common Message Display */}
      <div className="row">
        <div className="col-12">
          <div id="common-message" className="alert alert-info" style={{ display: 'none' }}></div>
        </div>
      </div>

      {!bookingSuccess ? (
        /* Booking Form */
        <div className="card">
          <div className="card-header">
            <h4 className="mb-0">Book Room: {room.title}</h4>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-12 text-center mb-3">
                  <Link to={`/single-room/${room.room_slug}`} className="btn btn-outline-secondary">
                    View Room Details
                  </Link>
                </div>
              </div>

              {/* Room Price Display */}
              <div className="row mb-3">
                <div className="col-12">
                  <div className="card bg-light">
                    <div className="card-body text-center">
                      <h5 className="text-primary">Room Price: {getRoomPrice().toLocaleString()} BDT per night</h5>
                      {data.checking_date && data.checkout_date && calculateNights() > 0 && (
                        <p className="mb-0">
                          <strong>{calculateNights()} nights × {getRoomPrice().toLocaleString()} BDT = {calculateTotalAmount().toLocaleString()} BDT</strong>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <TextInput
                    divClass="form-group"
                    htmlForLabel="inputEmail"
                    labelName="Email"
                    inputClass="form-control"
                    inputType="email"
                    inputName="email"
                    inputValue={data.email}
                    inputPlaceHolder="Enter Email"
                    onChange={(event) => setData({ ...data, email: event.target.value })}
                    required={true}
                  />
                </div>

                <div className="col-md-6">
                  <TextInput
                    divClass="form-group"
                    htmlForLabel="inputPhoneNumber"
                    labelName="Phone Number"
                    inputClass="form-control"
                    inputType="text"
                    inputName="phone_number"
                    inputValue={data.phone_number}
                    inputPlaceHolder="Enter Phone Number"
                    onChange={(event) =>
                      setData({ ...data, phone_number: event.target.value })
                    }
                    required={true}
                  />
                </div>
              </div>

              <div className="row" id="phoneID" style={{ display: "none" }}>
                <div className="col-12">
                  <div className="alert alert-danger">
                    <p id="phone"></p>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <TextInput
                    divClass="form-group"
                    htmlForLabel="inputCheckingDate"
                    labelName="Check-in Date"
                    inputClass="form-control"
                    inputType="datetime-local"
                    inputName="checking_date"
                    inputValue={data.checking_date}
                    inputPlaceHolder="Enter Checking Date"
                    onChange={(event) =>
                      setData({ ...data, checking_date: event.target.value })
                    }
                    required={true}
                  />
                </div>

                <div className="col-md-6">
                  <TextInput
                    divClass="form-group"
                    htmlForLabel="inputCheckoutDate"
                    labelName="Check-out Date"
                    inputClass="form-control"
                    inputType="datetime-local"
                    inputName="checkout_date"
                    inputValue={data.checkout_date}
                    inputPlaceHolder="Enter Checkout Date"
                    onChange={(event) =>
                      setData({ ...data, checkout_date: event.target.value })
                    }
                    required={true}
                  />
                </div>
              </div>

              <div className="row" id="checkoutID" style={{ display: "none" }}>
                <div className="col-12">
                  <div className="alert alert-danger">
                    <p id="checkout"></p>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-12 text-center">
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-lg px-5 my-3"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Processing...
                      </>
                    ) : (
                      'Book Room'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Payment Section - Shown after successful booking */
        <div>
          <div className="card border-success mb-4">
            <div className="card-header bg-success text-white">
              <h4 className="mb-0">
                <i className="fas fa-check-circle me-2"></i>
                Booking Confirmed!
              </h4>
            </div>
            <div className="card-body">
              <div className="alert alert-success">
                <h5 className="alert-heading">Great! Your room has been reserved.</h5>
                <p className="mb-0">
                  Please proceed with the payment to confirm your booking. 
                  Your reservation will be held for a limited time.
                </p>
              </div>
              
              {createdBooking && (
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>Booking ID:</strong> #{createdBooking.id}
                  </div>
                  <div className="col-md-6">
                    <strong>Total Amount:</strong> {calculateTotalAmount().toLocaleString()} BDT
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Section */}
          <div className="card">
            <div className="card-body text-center">
              <h5 className="mb-3">
                <i className="fas fa-credit-card me-2 text-success"></i>
                Complete Your Payment
              </h5>
              <p className="text-muted mb-4">
                Please proceed with the payment to confirm your booking.
              </p>
              <button
                className="btn btn-success btn-lg"
                onClick={() => navigate(`/payment/process/${createdBooking.id}`)}
              >
                <i className="fas fa-credit-card me-2"></i>
                Pay Now
              </button>
            </div>
          </div>

          {/* Alternative Actions */}
          <div className="card mt-4">
            <div className="card-body text-center">
              <h6>Want to pay later?</h6>
              <p className="text-muted small">
                You can complete the payment from your booking history within the next 24 hours.
              </p>
              <Link to="/profile" className="btn btn-outline-primary me-2">
                <i className="fas fa-user me-2"></i>
                View My Bookings
              </Link>
              <button 
                className="btn btn-outline-secondary"
                onClick={() => {
                  setBookingSuccess(false);
                  setCreatedBooking(null);
                }}
              >
                <i className="fas fa-plus me-2"></i>
                Book Another Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
