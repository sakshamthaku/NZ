import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const ADMIN_EMAIL = "sakshamtahkur2024@gmail.com";

function ProtectedAdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Checking access...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedAdminRoute;