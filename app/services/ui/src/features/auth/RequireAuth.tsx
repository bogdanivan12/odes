import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { USER_LOGIN_ROUTE } from '../../config/routes';

function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const t = localStorage.getItem('authToken');
  return !!t && t.trim().length > 0;
}

export const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to={USER_LOGIN_ROUTE} state={{ from: location }} replace />;
  }
  return children;
};

export default RequireAuth;
