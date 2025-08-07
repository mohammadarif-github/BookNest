import React, { useContext, useState } from "react";
import { MyContext } from "../Context";
import { Link, Navigate, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const context = useContext(MyContext);
  const navigate = useNavigate();
  const [data, setData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    type: '',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Enhanced login handler with proper notifications
  const handleLogin = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setNotification({ show: false, type: '', message: '' });

    try {
      // Call the context login method which now returns a promise
      await context.login(event, data, navigate);
      // Success is handled by navigation in context
    } catch (error) {
      setNotification({
        show: true,
        type: 'error',
        message: error.message || 'Login failed. Please check your credentials and try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
          <div className="col-12 col-sm-8 col-md-6 col-lg-5 col-xl-4">
            <div className="card shadow-lg border-0 rounded-4">
              <div className="card-body p-4 p-sm-5">
                {/* Header */}
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <i className="fas fa-hotel fa-3x text-primary"></i>
                  </div>
                  <h2 className="fw-bold text-dark">Welcome Back!</h2>
                  <p className="text-muted">Sign in to your account</p>
                </div>

                {/* Notification */}
                {notification.show && (
                  <div className={`alert alert-${notification.type === 'error' ? 'danger' : 'success'} alert-dismissible fade show mb-4`} role="alert">
                    <i className={`fas ${notification.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'} me-2`}></i>
                    {notification.message}
                    <button type="button" className="btn-close" onClick={closeNotification}></button>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin}>
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
                      value={data.username}
                      placeholder="Enter your username"
                      onChange={(event) =>
                        setData({ ...data, username: event.target.value })
                      }
                      required
                      style={{ borderRadius: '12px' }}
                    />
                  </div>

                  {/* Password Field */}
                  <div className="mb-4">
                    <label htmlFor="password" className="form-label fw-semibold">
                      <i className="fas fa-lock me-2 text-primary"></i>Password
                    </label>
                    <div className="position-relative">
                      <input
                        id="password"
                        className="form-control form-control-lg border-2 pe-5"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={data.password}
                        placeholder="Enter your password"
                        onChange={(event) =>
                          setData({ ...data, password: event.target.value })
                        }
                        required
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
                  </div>

                  {/* Login Button */}
                  <div className="d-grid mb-3">
                    <button 
                      type="submit" 
                      className="btn btn-primary btn-lg fw-semibold"
                      disabled={isLoading}
                      style={{ borderRadius: '12px', padding: '12px' }}
                    >
                      {isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Signing In...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-sign-in-alt me-2"></i>
                          Sign In
                        </>
                      )}
                    </button>
                  </div>

                  {/* Forgot Password Link */}
                  <div className="text-center mb-4">
                    <Link 
                      to="/forgot-password" 
                      className="text-decoration-none text-primary fw-semibold"
                    >
                      <i className="fas fa-key me-1"></i>
                      Forgot your password?
                    </Link>
                  </div>

                  {/* Divider */}
                  <hr className="my-4" />

                  {/* Register Link */}
                  <div className="text-center">
                    <p className="text-muted mb-2">Don't have an account?</p>
                    <Link 
                      to="/register" 
                      className="btn btn-outline-primary fw-semibold"
                      style={{ borderRadius: '12px', padding: '10px 30px' }}
                    >
                      <i className="fas fa-user-plus me-2"></i>
                      Create Account
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
