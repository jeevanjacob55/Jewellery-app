import { Outlet } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export function AdminShell() {
  const { session, logout } = useAuth();

  return (
    <div className="admin-shell">
      <header className="admin-shell__header">
        <div>
          <p className="admin-shell__eyebrow">Protected Admin Shell</p>
          <h1 className="admin-shell__title">Overview</h1>
        </div>
        <div className="admin-shell__actions">
          <div className="admin-shell__identity">
            <span className="admin-shell__name">{session?.user.name ?? "Admin User"}</span>
            <span className="admin-shell__role">{session?.user.role_display_name ?? "Administrator"}</span>
          </div>
          <button className="admin-shell__logout" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
