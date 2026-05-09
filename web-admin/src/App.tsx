import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminShell } from "./components/AdminShell";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ApprovalDashboardPage } from "./pages/ApprovalDashboardPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminNewsCreatePage } from "./pages/AdminNewsCreatePage";
import { AdvertisementUploadPage } from "./pages/AdvertisementUploadPage";
import { CompanyManagementPage } from "./pages/CompanyManagementPage";
import { LoginPage } from "./pages/LoginPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { RateManagementPage } from "./pages/RateManagementPage";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

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
        <Route path="approvals" element={<ApprovalDashboardPage />} />
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
          element={<AdvertisementUploadPage />}
        />
        <Route
          path="content"
          element={<Navigate to="/admin/content/news/new" replace />}
        />
        <Route path="content/news/new" element={<AdminNewsCreatePage />} />
      </Route>
      <Route path="/" element={<Navigate to={status === "signedIn" ? defaultAdminPath : "/login"} replace />} />
      <Route path="*" element={<Navigate to={status === "signedIn" ? defaultAdminPath : "/login"} replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </AppErrorBoundary>
    </BrowserRouter>
  );
}
