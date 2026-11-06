import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const ADMIN_EMAIL = "sakshamtahkur2024@gmail.com";

function ProtectedAdminRoute({ children }) {
  const { user, loading } = useAuth();

  // Wait for Firebase to finish checking authentication
  if (loading) {
    return <div>Checking access...</div>;
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but not admin
  if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return <Navigate to="/dashboard" replace />;
  }

  // Admin
  return children;
}

export default ProtectedAdminRoute;