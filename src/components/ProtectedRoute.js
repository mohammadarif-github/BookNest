import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { MyContext } from '../Context';

const ProtectedRoute = ({ children, requiredRoles = [], fallbackPath = '/login' }) => {
  const context = useContext(MyContext);
  
  if (!context.isUserAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }
  
  if (requiredRoles.length > 0 && !context.hasAnyRole(requiredRoles)) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger text-center">
          <h4>🚫 Access Denied</h4>
          <p>You don't have permission to access this page.</p>
          <p>Required roles: {requiredRoles.join(', ')}</p>
          <p>Your role: {context.userRole || 'None'}</p>
        </div>
      </div>
    );
  }
  
  return children;
};

export default ProtectedRoute;
