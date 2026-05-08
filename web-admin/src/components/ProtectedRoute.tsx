import { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "signedOut") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
