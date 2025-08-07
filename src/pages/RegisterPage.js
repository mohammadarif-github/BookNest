import React, { useContext, useState } from "react";
import { MyContext } from "../Context";
import { Navigate, Link, useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const context = useContext(MyContext);
  const navigate = useNavigate();
  const [data, setData] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    type: '',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const { username, email, password, password2 } = data;

  // Enhanced register handler with proper notifications
  const handleRegister = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setNotification({ show: false, type: '', message: '' });

    // Client-side validation
    if (password !== password2) {
      setNotification({
        show: true,
        type: 'error',
        message: 'Passwords do not match'
      });
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setNotification({
        show: true,
        type: 'error',
        message: 'Password must be at least 8 characters long'
      });
      setIsLoading(false);
      return;
    }

    try {
      // Call the context register method which now returns a promise
      await context.register(event, data, navigate);
      setNotification({
        show: true,
        type: 'success',
        message: 'Registration successful! Redirecting to login...'
      });
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setNotification({
        show: true,
        type: 'error',
        message: error.message || 'Registration failed. Please check your information and try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const closeNotification = () => {
    setNotification({ show: false, type: '', message: '' });
  };
  
  if (context.isUserAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-vh-100 d-flex align-items-center py-4 px-3" style={{ backgroundColor: '#f8f9fa' }}>
      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5">
            <div className="card shadow-lg border-0 rounded-4">
              <div className="card-body p-4 p-sm-5">
                {/* Header */}
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <i className="fas fa-user-plus fa-3x text-primary"></i>
                  </div>
                  <h2 className="fw-bold text-dark">Create Account</h2>
                  <p className="text-muted">Join us today and start booking!</p>
                </div>

                {/* Notification */}
                {notification.show && (
                  <div className={`alert alert-${notification.type === 'error' ? 'danger' : 'success'} alert-dismissible fade show mb-4`} role="alert">
                    <i className={`fas ${notification.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'} me-2`}></i>
                    {notification.message}
                    <button type="button" className="btn-close" onClick={closeNotification}></button>
                  </div>
                )}

                {/* Register Form */}
                <form onSubmit={handleRegister}>
                  {/* Username Field */}
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label fw-semibold">
                      <i className="fas fa-user me-2 text-primary"></i>Username
                    </label>
                    <input
                      id="username"
                      className="form-control form-control-lg border-2"
                      type="text"
                      name="username"
                      value={username}
                      placeholder="Choose a username"
                      onChange={(event) =>
                        setData({ ...data, username: event.target.value })
                      }
                      required
                      style={{ borderRadius: '12px' }}
                    />
                  </div>

                  {/* Email Field */}
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label fw-semibold">
                      <i className="fas fa-envelope me-2 text-primary"></i>Email Address
                    </label>
                    <input
                      id="email"
                      className="form-control form-control-lg border-2"
                      type="email"
                      name="email"
                      value={email}
                      placeholder="Enter your email address"
                      onChange={(event) =>
                        setData({ ...data, email: event.target.value })
                      }
                      required
                      style={{ borderRadius: '12px' }}
                    />
                  </div>

                  {/* Password Field */}
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label fw-semibold">
                      <i className="fas fa-lock me-2 text-primary"></i>Password
                    </label>
                    <div className="position-relative">
                      <input
                        id="password"
                        className="form-control form-control-lg border-2 pe-5"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={password}
                        placeholder="Create a strong password"
                        onChange={(event) =>
                          setData({ ...data, password: event.target.value })
                        }
                        required
                        minLength="8"
                        style={{ borderRadius: '12px' }}
                      />
                      <button
                        type="button"
                        className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted border-0"
                        onClick={togglePasswordVisibility}
                        style={{ zIndex: 10 }}
                      >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                    <small className="text-muted">Must be at least 8 characters long</small>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="mb-4">
                    <label htmlFor="password2" className="form-label fw-semibold">
                      <i className="fas fa-lock me-2 text-primary"></i>Confirm Password
                    </label>
                    <div className="position-relative">
                      <input
                        id="password2"
                        className="form-control form-control-lg border-2 pe-5"
                        type={showConfirmPassword ? "text" : "password"}
                        name="password2"
                        value={password2}
                        placeholder="Confirm your password"
                        onChange={(event) =>
                          setData({ ...data, password2: event.target.value })
                        }
                        required
                        style={{ borderRadius: '12px' }}
                      />
                      <button
                        type="button"
                        className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted border-0"
                        onClick={toggleConfirmPasswordVisibility}
                        style={{ zIndex: 10 }}
                      >
                        <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>

                  {/* Register Button */}
                  <div className="d-grid mb-4">
                    <button 
                      type="submit" 
                      className="btn btn-primary btn-lg fw-semibold"
                      disabled={isLoading}
                      style={{ borderRadius: '12px', padding: '12px' }}
                    >
                      {isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Creating Account...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-user-plus me-2"></i>
                          Create Account
                        </>
                      )}
                    </button>
                  </div>

                  {/* Divider */}
                  <hr className="my-4" />

                  {/* Login Link */}
                  <div className="text-center">
                    <p className="text-muted mb-2">Already have an account?</p>
                    <Link 
                      to="/login" 
                      className="btn btn-outline-primary fw-semibold"
                      style={{ borderRadius: '12px', padding: '10px 30px' }}
                    >
                      <i className="fas fa-sign-in-alt me-2"></i>
                      Sign In
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
