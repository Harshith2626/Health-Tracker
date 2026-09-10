import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Role } from "../types";
import { FullPageSpinner } from "./UI";
import Layout from "./Layout";

export default function ProtectedRoute({ children, role }: { children: ReactNode; role: Role }) {
  const { user, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    return <Navigate to={user.role === "PATIENT" ? "/patient" : "/doctor"} replace />;
  }

  return <Layout>{children}</Layout>;
}
