import React, { useEffect } from 'react';

const Toast = ({ show, type, message, onClose, duration = 5000 }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, onClose, duration]);

  if (!show) return null;

  const getToastClass = () => {
    switch (type) {
      case 'success':
        return 'bg-success text-white';
      case 'error':
        return 'bg-danger text-white';
      case 'warning':
        return 'bg-warning text-dark';
      case 'info':
        return 'bg-info text-white';
      default:
        return 'bg-light text-dark';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'fa-check-circle';
      case 'error':
        return 'fa-exclamation-circle';
      case 'warning':
        return 'fa-exclamation-triangle';
      case 'info':
        return 'fa-info-circle';
      default:
        return 'fa-bell';
    }
  };

  return (
    <div 
      className="position-fixed top-0 end-0 p-3" 
      style={{ zIndex: 1055 }}
    >
      <div 
        className={`toast show ${getToastClass()}`} 
        role="alert" 
        aria-live="assertive" 
        aria-atomic="true"
        style={{ minWidth: '300px' }}
      >
        <div className="toast-header">
          <i className={`fas ${getIcon()} me-2`}></i>
          <strong className="me-auto">
            {type === 'success' ? 'Success' : 
             type === 'error' ? 'Error' : 
             type === 'warning' ? 'Warning' : 
             type === 'info' ? 'Info' : 'Notification'}
          </strong>
          <button 
            type="button" 
            className="btn-close" 
            onClick={onClose}
            aria-label="Close"
          ></button>
        </div>
        <div className="toast-body">
          {message}
        </div>
      </div>
    </div>
  );
};

export default Toast;
