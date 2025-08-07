import React, { useContext, useState, useEffect } from 'react';
import { MyContext } from '../Context';
import { Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Loading from '../components/Loading';
import BookingDetailsModal from '../components/BookingDetailsModal';

const ProfilePage = () => {
  const context = useContext(MyContext);
  const navigate = useNavigate();
  const [userBookings, setUserBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings');
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    address: '',
    date_of_birth: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Check authentication status from localStorage directly to avoid timing issues
    const token = localStorage.getItem("access-token");
    const username = localStorage.getItem("username");
    
    if (token && username && !isTokenExpired(token)) {
      setAuthChecked(true);
      // Fetch data immediately if we have valid token
      fetchUserBookings();
      fetchUserProfile();
    } else {
      // Token is invalid or doesn't exist
      setAuthChecked(true);
    }
  }, []); // Remove dependency on context.isUserAuthenticated

  // Also fetch data when context becomes authenticated (for first-time login)
  useEffect(() => {
    if (context.isUserAuthenticated && authChecked) {
      fetchUserBookings();
      fetchUserProfile();
    }
  }, [context.isUserAuthenticated, authChecked]);

  // Token expiration check function
  const isTokenExpired = (token) => {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem("access-token");
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const response = await axios.get('https://booknest-jhw4.onrender.com/accounts/profile/', config);
      if (response.data.success) {
        setProfileData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUserBookings = async () => {
    try {
      const token = localStorage.getItem("access-token");
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const response = await axios.get('https://booknest-jhw4.onrender.com/hotel/user-bookings/', config);
      
      // Handle the structured API response
      if (response.data.success) {
        setUserBookings(response.data.data);
      } else {
        setUserBookings([]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setUserBookings([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setUpdateMessage('');

    try {
      const token = localStorage.getItem("access-token");
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };
      
      const response = await axios.put('https://booknest-jhw4.onrender.com/accounts/profile/', profileData, config);
      
      if (response.data.success) {
        setUpdateMessage('Profile updated successfully!');
        setProfileData(response.data.data);
      } else {
        setUpdateMessage('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setUpdateMessage('Error updating profile. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!authChecked) {
    return <Loading message="Checking authentication..." />;
  }

  // Check authentication from localStorage directly
  const token = localStorage.getItem("access-token");
  const username = localStorage.getItem("username");
  
  if (!token || !username || isTokenExpired(token)) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return <Loading message="Loading your profile..." />;
  }

  return (
    <div className="container-fluid py-4 px-3">
      <div className="row">
        <div className="col-12 col-lg-3 mb-4">
          <div className="profile-sidebar card shadow-sm">
            <div className="card-body">
              <div className="user-info text-center mb-4">
                <div className="user-avatar">
                  <i className="fas fa-user-circle fa-4x text-primary"></i>
                </div>
                <h5 className="mt-2">
                  {profileData.first_name || profileData.last_name 
                    ? `${profileData.first_name} ${profileData.last_name}`.trim()
                    : profileData.username || context.username
                  }
                </h5>
              <p className="text-muted small">@{profileData.username || context.username}</p>
              <p className="text-muted small">Welcome back!</p>
            </div>
            
            <nav className="nav flex-column nav-pills">
              <button 
                className={`nav-link text-start ${activeTab === 'bookings' ? 'active' : ''}`}
                onClick={() => setActiveTab('bookings')}
              >
                <i className="fas fa-calendar-alt me-2"></i>
                <span className="d-none d-sm-inline">My Bookings</span>
              </button>
              <button 
                className={`nav-link text-start ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <i className="fas fa-user me-2"></i>
                <span className="d-none d-sm-inline">Profile Settings</span>
              </button>
            </nav>
            </div>
          </div>
        </div>
        
        <div className="col-12 col-lg-9">
          {activeTab === 'bookings' && (
            <div className="bookings-section">
              <h3 className="mb-4">My Bookings</h3>
              {!Array.isArray(userBookings) || userBookings.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                  <h5>No bookings found</h5>
                  <p className="text-muted">Start exploring our amazing rooms!</p>
                  <a href="/rooms" className="btn btn-primary">Browse Rooms</a>
                </div>
              ) : (
                <div className="row">
                  {userBookings.map((booking, index) => {
                    const getStatusBadgeClass = (status) => {
                      switch (status) {
                        case 'pending':
                          return 'bg-warning text-dark';
                        case 'payment_pending':
                          return 'bg-info';
                        case 'awaiting_approval':
                          return 'bg-primary';
                        case 'confirmed':
                          return 'bg-success';
                        case 'cancellation_requested':
                          return 'bg-warning text-dark';
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
                          return 'bg-warning text-dark';
                        case 'unpaid':
                          return 'bg-danger';
                        case 'refunded':
                          return 'bg-info';
                        default:
                          return 'bg-secondary';
                      }
                    };

                    return (
                      <div key={index} className="col-lg-4 col-md-6 mb-4">
                        <div className="card booking-card h-100 shadow-sm">
                          <div className="card-body d-flex flex-column">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h5 className="card-title mb-0">{booking.room_title}</h5>
                              <small className="text-muted">#{booking.id}</small>
                            </div>
                            
                            <div className="mb-3">
                              <div className="row mb-2">
                                <div className="col-12 mb-2">
                                  {/* Use backend's smart status_display */}
                                  <span className={`badge ${getStatusBadgeClass(
                                    booking.status_display === 'Pending Payment' 
                                      ? 'pending' 
                                      : booking.status
                                  )} w-100`}>
                                    {booking.status_display}
                                  </span>
                                </div>
                                <div className="col-12">
                                  <span className={`badge ${getPaymentStatusBadgeClass(booking.payment_status)} w-100`}>
                                    Payment: {booking.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mb-2">
                              <i className="fas fa-calendar me-2 text-muted"></i>
                              <small className="text-muted">
                                {booking.checking_date ? 
                                  `${new Date(booking.checking_date).toLocaleDateString()} - ${new Date(booking.checkout_date).toLocaleDateString()}` :
                                  'Dates not specified'
                                }
                              </small>
                            </div>

                            {booking.total_amount && (
                              <div className="mb-2">
                                <i className="fas fa-money-bill-wave me-2 text-muted"></i>
                                <strong className="text-primary">
                                  {parseFloat(booking.total_amount).toLocaleString()} BDT
                                </strong>
                                {booking.nights_count > 1 && (
                                  <small className="text-muted"> ({booking.nights_count} nights)</small>
                                )}
                              </div>
                            )}

                            <div className="mb-3">
                              <i className="fas fa-clock me-2 text-muted"></i>
                              <small className="text-muted">
                                Booked: {new Date(booking.booking_date).toLocaleDateString()}
                              </small>
                            </div>

                            {/* Payment Due Warning */}
                            {booking.payment_status === 'unpaid' && booking.payment_due_date && (
                              <div className="alert alert-warning alert-sm py-2 mb-3">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                <small>
                                  Payment due: {new Date(booking.payment_due_date).toLocaleDateString()}
                                </small>
                              </div>
                            )}

                            <div className="mt-auto">
                              <div className="d-grid gap-2">
                                <button 
                                  className="btn btn-primary btn-sm"
                                  onClick={() => setSelectedBookingId(booking.id)}
                                >
                                  <i className="fas fa-eye me-2"></i>
                                  View Details
                                </button>
                                
                                {booking.payment_status === 'unpaid' && booking.status === 'pending' && (
                                  <button
                                    className="btn btn-success btn-sm"
                                    onClick={() => navigate(`/payment/process/${booking.id}`)}
                                  >
                                    <i className="fas fa-credit-card me-2"></i>
                                    Pay Now
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'profile' && (
            <div className="profile-section">
              <h3 className="mb-4">Profile Settings</h3>
              <div className="card">
                <div className="card-body">
                  {updateMessage && (
                    <div className={`alert ${updateMessage.includes('success') ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`} role="alert">
                      {updateMessage}
                      <button type="button" className="btn-close" onClick={() => setUpdateMessage('')}></button>
                    </div>
                  )}
                  <form onSubmit={handleProfileUpdate}>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Username</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={profileData.username} 
                          readOnly 
                        />
                        <small className="form-text text-muted">Username cannot be changed</small>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Email</label>
                        <input 
                          type="email" 
                          className="form-control" 
                          name="email"
                          value={profileData.email}
                          onChange={handleInputChange}
                          placeholder="Enter your email" 
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">First Name</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          name="first_name"
                          value={profileData.first_name}
                          onChange={handleInputChange}
                          placeholder="Enter your first name" 
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Last Name</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          name="last_name"
                          value={profileData.last_name}
                          onChange={handleInputChange}
                          placeholder="Enter your last name" 
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Phone Number</label>
                        <input 
                          type="tel" 
                          className="form-control" 
                          name="phone_number"
                          value={profileData.phone_number}
                          onChange={handleInputChange}
                          placeholder="Enter your phone number" 
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Date of Birth</label>
                        <input 
                          type="date" 
                          className="form-control" 
                          name="date_of_birth"
                          value={profileData.date_of_birth}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-12 mb-3">
                        <label className="form-label">Address</label>
                        <textarea 
                          className="form-control" 
                          name="address"
                          value={profileData.address}
                          onChange={handleInputChange}
                          rows="3"
                          placeholder="Enter your address" 
                        />
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={profileLoading}
                    >
                      {profileLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Updating...
                        </>
                      ) : (
                        'Update Profile'
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBookingId && (
        <BookingDetailsModal
          bookingId={selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
          onUpdate={fetchUserBookings}
        />
      )}
    </div>
  );
};

export default ProfilePage;
