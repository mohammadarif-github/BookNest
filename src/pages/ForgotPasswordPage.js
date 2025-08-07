import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailUpdate, setShowEmailUpdate] = useState(false);
  const [emailUpdateMode, setEmailUpdateMode] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (!email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('https://booknest-jhw4.onrender.com/accounts/password-reset/', {
        email: email
      });

      if (response.data.success) {
        setMessage(response.data.message);
        setEmail('');
      } else {
        setError(response.data.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Too many requests. Please wait before trying again.');
      } else if (err.response?.data?.requires_email_update) {
        // User found but no email - show email update form
        setShowEmailUpdate(true);
        setEmailUpdateMode(true);
        setUsername(err.response.data.username);
        setError('This account doesn\'t have an email address. Please provide your email to continue.');
      } else {
        setError('Failed to send reset email. Please check your email and try again.');
      }
      console.error('Password reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailUpdateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (!username || !email) {
      setError('Both username and email are required');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('https://booknest-jhw4.onrender.com/accounts/password-reset/with-email-update/', {
        username: username,
        email: email
      });

      if (response.data.success) {
        setMessage(response.data.message);
        setEmail('');
        setUsername('');
        setShowEmailUpdate(false);
        setEmailUpdateMode(false);
      } else {
        setError(response.data.message || 'Failed to update email and send reset instructions.');
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Too many requests. Please wait before trying again.');
      } else if (err.response?.status === 404) {
        setError('Username not found. Please check and try again.');
      } else {
        setError(err.response?.data?.message || 'Failed to update email. Please try again.');
      }
      console.error('Email update error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowEmailUpdate(false);
    setEmailUpdateMode(false);
    setEmail('');
    setUsername('');
    setMessage('');
    setError('');
  };

  return (
    <div className="container-fluid">
      <div className="row min-vh-100">
        <div className="col-md-6 d-flex align-items-center justify-content-center">
                      <div className="card shadow-lg border-0" style={{ maxWidth: '450px', width: '100%' }}>
            <div className="card-body p-5">
              <div className="text-center mb-4">
                <h2 className="card-title text-primary">
                  {emailUpdateMode ? 'Update Email & Reset Password' : 'Forgot Password'}
                </h2>
                <p className="text-muted">
                  {emailUpdateMode 
                    ? 'Please provide your email address to receive reset instructions.'
                    : 'Enter your email address and we will send you instructions to reset your password.'
                  }
                </p>
              </div>

              {message && (
                <div className="alert alert-success" role="alert">
                  <i className="fas fa-check-circle me-2"></i>
                  {message}
                </div>
              )}

              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="fas fa-exclamation-circle me-2"></i>
                  {error}
                </div>
              )}

              <form onSubmit={emailUpdateMode ? handleEmailUpdateSubmit : handleSubmit}>
                {emailUpdateMode && (
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">
                      Username
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fas fa-user"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        id="username"
                        placeholder="Your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        readOnly
                      />
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    {emailUpdateMode ? 'New Email Address' : 'Email Address'}
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-envelope"></i>
                    </span>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      placeholder={emailUpdateMode ? "Enter your email address" : "Enter your email"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  {emailUpdateMode && (
                    <small className="form-text text-muted">
                      This will become your new email address for the account.
                    </small>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      {emailUpdateMode ? 'Updating & Sending...' : 'Sending...'}
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane me-2"></i>
                      {emailUpdateMode ? 'Update Email & Send Reset' : 'Send Reset Instructions'}
                    </>
                  )}
                </button>
              </form>

              <div className="text-center">
                {emailUpdateMode ? (
                  <button 
                    onClick={resetForm}
                    className="btn btn-link text-decoration-none me-3"
                  >
                    <i className="fas fa-arrow-left me-2"></i>
                    Back to Email Reset
                  </button>
                ) : (
                  <button 
                    onClick={() => setEmailUpdateMode(true)}
                    className="btn btn-link text-decoration-none me-3"
                  >
                    <i className="fas fa-user-edit me-2"></i>
                    Don't have email? Click here
                  </button>
                )}
                
                <Link to="/login" className="text-decoration-none">
                  <i className="fas fa-sign-in-alt me-2"></i>
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 d-none d-md-flex align-items-center justify-content-center bg-primary">
          <div className="text-center text-white">
            <i className="fas fa-bed fa-5x mb-4"></i>
            <h3>BookNest</h3>
            <p className="lead">
              Don't worry, we'll help you get back into your account securely.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
