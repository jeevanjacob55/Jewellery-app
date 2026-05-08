import { NavLink, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

type NavItem = {
  label: string;
  path: string;
  visibility: "all_admins" | "association_admin" | "company_admin";
};

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", path: "/admin/overview", visibility: "all_admins" },
  { label: "Rate Management", path: "/admin/rates", visibility: "association_admin" },
  { label: "Company Profiles", path: "/admin/company-profiles", visibility: "all_admins" },
  { label: "Advertisements", path: "/admin/advertisements", visibility: "all_admins" },
  { label: "Content", path: "/admin/content", visibility: "all_admins" },
  { label: "Company Management", path: "/admin/company", visibility: "company_admin" },
];

const PAGE_TITLES: Record<string, string> = {
  "/admin/overview": "Overview",
  "/admin/rates": "Rate Management",
  "/admin/company-profiles": "Company Profiles",
  "/admin/advertisements": "Advertisements",
  "/admin/content": "Content",
  "/admin/company": "Company Management",
};

export function AdminShell() {
  const { session, logout } = useAuth();
  const location = useLocation();
  const isAssociationAdmin = session?.user.role === "ASSOCIATION_ADMIN";
  const isCompanyAdmin = session?.user.role === "COMPANY_ADMIN";
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.visibility === "company_admin") {
      return isCompanyAdmin;
    }
    if (item.visibility === "association_admin") {
      return isAssociationAdmin;
    }
    return !isCompanyAdmin;
  });
  const pageTitle = PAGE_TITLES[location.pathname] ?? "Admin";
  const scopeLabel = session?.company?.name ?? session?.hierarchy.association ?? session?.hierarchy.state ?? "Platform";

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__gem">◆</span>
          <div>
            <p className="admin-sidebar__eyebrow">Jewellery Association</p>
            <h1 className="admin-sidebar__title">Admin Console</h1>
          </div>
        </div>

        <nav className="admin-sidebar__nav" aria-label="Admin navigation">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `admin-sidebar__link${isActive ? " admin-sidebar__link--active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <p className="admin-sidebar__scope-label">Current Scope</p>
          <strong className="admin-sidebar__scope-value">{scopeLabel}</strong>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-shell__header">
          <div>
            <p className="admin-shell__eyebrow">{isCompanyAdmin ? "Company Console" : "Protected Admin Shell"}</p>
            <h2 className="admin-shell__title">{pageTitle}</h2>
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

        <main className="admin-main__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
