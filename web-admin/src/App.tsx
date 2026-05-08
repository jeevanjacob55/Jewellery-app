import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminShell } from "./components/AdminShell";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { LoginPage } from "./pages/LoginPage";

function AppRoutes() {
  const { status } = useAuth();

  if (status === "booting") {
    return (
      <div className="app-loading-shell">
        <div className="app-loading-card">
          <p className="app-loading-eyebrow">Jewellery Association Admin</p>
          <h1 className="app-loading-title">Preparing secure session</h1>
          <p className="app-loading-copy">Checking saved credentials and loading admin access.</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={status === "signedIn" ? <Navigate to="/admin/overview" replace /> : <LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/overview" replace />} />
        <Route path="overview" element={<AdminDashboardPage />} />
      </Route>
      <Route path="/" element={<Navigate to={status === "signedIn" ? "/admin/overview" : "/login"} replace />} />
      <Route path="*" element={<Navigate to={status === "signedIn" ? "/admin/overview" : "/login"} replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
