import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

function getToken() {
  return localStorage.getItem("trex_token");
}

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = getToken();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}