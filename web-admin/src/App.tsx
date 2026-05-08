import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminShell } from "./components/AdminShell";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { CompanyManagementPage } from "./pages/CompanyManagementPage";
import { LoginPage } from "./pages/LoginPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { RateManagementPage } from "./pages/RateManagementPage";

function getDefaultAdminPath(role: string | undefined) {
  return role === "COMPANY_ADMIN" ? "/admin/company" : "/admin/overview";
}

function AppRoutes() {
  const { session, status } = useAuth();
  const defaultAdminPath = getDefaultAdminPath(session?.user.role);

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
      <Route path="/login" element={status === "signedIn" ? <Navigate to={defaultAdminPath} replace /> : <LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={defaultAdminPath} replace />} />
        <Route
          path="overview"
          element={session?.user.role === "COMPANY_ADMIN" ? <Navigate to="/admin/company" replace /> : <AdminDashboardPage />}
        />
        <Route path="company" element={<CompanyManagementPage />} />
        <Route path="rates" element={<RateManagementPage />} />
        <Route
          path="company-profiles"
          element={
            <PlaceholderPage
              eyebrow="Phase 1 Placeholder"
              title="Company Profiles page is ready for the next implementation step."
              description="This destination is wired into the sidebar and protected shell so the company-profile workflow can be added without changing navigation later."
            />
          }
        />
        <Route
          path="advertisements"
          element={
            <PlaceholderPage
              eyebrow="Phase 1 Placeholder"
              title="Advertisements page is connected as an empty module."
              description="The sidebar route is live now, and the page is intentionally minimal until the advertisement workflow is built."
            />
          }
        />
        <Route
          path="content"
          element={
            <PlaceholderPage
              eyebrow="Phase 1 Placeholder"
              title="Content page is ready to receive news and meeting tools."
              description="This empty page keeps the shell structure stable while the content-management flows are implemented later."
            />
          }
        />
      </Route>
      <Route path="/" element={<Navigate to={status === "signedIn" ? defaultAdminPath : "/login"} replace />} />
      <Route path="*" element={<Navigate to={status === "signedIn" ? defaultAdminPath : "/login"} replace />} />
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
