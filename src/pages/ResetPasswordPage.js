import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResetPasswordPage = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(true);

  useEffect(() => {
    // Check if uid and token are present
    if (!uid || !token) {
      setValidToken(false);
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [uid, token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (formData.new_password !== formData.confirm_password) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.new_password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('https://booknest-jhw4.onrender.com/accounts/password-reset/confirm/', {
        uid: uid,
        token: token,
        new_password: formData.new_password,
        confirm_password: formData.confirm_password
      });

      if (response.data.success) {
        setMessage('Password reset successful! You can now login with your new password.');
        setFormData({ new_password: '', confirm_password: '' });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(response.data.error || 'Password reset failed. Please try again.');
      }
    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response.data.error || 'Invalid or expired reset token. Please request a new reset.');
      } else if (err.response?.status === 429) {
        setError('Too many requests. Please wait before trying again.');
      } else {
        setError('Failed to reset password. Please try again.');
      }
      console.error('Password reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!validToken) {
    return (
      <div className="container-fluid">
        <div className="row min-vh-100">
          <div className="col-12 d-flex align-items-center justify-content-center">
            <div className="card shadow-lg border-0" style={{ maxWidth: '500px', width: '100%' }}>
              <div className="card-body p-5 text-center">
                <div className="text-danger mb-4">
                  <i className="fas fa-exclamation-triangle fa-4x"></i>
                </div>
                <h3 className="text-danger">Invalid Reset Link</h3>
                <p className="text-muted mb-4">
                  This password reset link is invalid or has expired. 
                  Please request a new password reset.
                </p>
                <Link to="/forgot-password" className="btn btn-primary me-3">
                  Request New Reset
                </Link>
                <Link to="/login" className="btn btn-outline-primary">
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row min-vh-100">
        <div className="col-md-6 d-flex align-items-center justify-content-center">
          <div className="card shadow-lg border-0" style={{ maxWidth: '400px', width: '100%' }}>
            <div className="card-body p-5">
              <div className="text-center mb-4">
                <h2 className="card-title text-primary">Reset Password</h2>
                <p className="text-muted">
                  Enter your new password below.
                </p>
              </div>

              {message && (
                <div className="alert alert-success" role="alert">
                  <i className="fas fa-check-circle me-2"></i>
                  {message}
                  <div className="mt-2">
                    <small>Redirecting to login page...</small>
                  </div>
                </div>
              )}

              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="fas fa-exclamation-circle me-2"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="new_password" className="form-label">
                    New Password
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-lock"></i>
                    </span>
                    <input
                      type="password"
                      className="form-control"
                      id="new_password"
                      name="new_password"
                      placeholder="Enter new password"
                      value={formData.new_password}
                      onChange={handleChange}
                      required
                      minLength="8"
                    />
                  </div>
                  <small className="form-text text-muted">
                    Password must be at least 8 characters long.
                  </small>
                </div>

                <div className="mb-4">
                  <label htmlFor="confirm_password" className="form-label">
                    Confirm New Password
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-lock"></i>
                    </span>
                    <input
                      type="password"
                      className="form-control"
                      id="confirm_password"
                      name="confirm_password"
                      placeholder="Confirm new password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      required
                      minLength="8"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Resetting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-key me-2"></i>
                      Reset Password
                    </>
                  )}
                </button>
              </form>

              <div className="text-center">
                <Link to="/login" className="text-decoration-none">
                  <i className="fas fa-arrow-left me-2"></i>
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 d-none d-md-flex align-items-center justify-content-center bg-primary">
          <div className="text-center text-white">
            <i className="fas fa-shield-alt fa-5x mb-4"></i>
            <h3>Secure Password Reset</h3>
            <p className="lead">
              Create a strong new password to keep your account secure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
