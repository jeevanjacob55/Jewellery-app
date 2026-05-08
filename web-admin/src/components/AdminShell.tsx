import { NavLink, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

type NavItem = {
  label: string;
  path: string;
  associationOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Rate Management", path: "/admin/rates", associationOnly: true },
  { label: "Overview", path: "/admin/overview" },
  { label: "Company Profiles", path: "/admin/company-profiles" },
  { label: "Advertisements", path: "/admin/advertisements" },
  { label: "Content", path: "/admin/content" },
];

const PAGE_TITLES: Record<string, string> = {
  "/admin/overview": "Overview",
  "/admin/rates": "Rate Management",
  "/admin/company-profiles": "Company Profiles",
  "/admin/advertisements": "Advertisements",
  "/admin/content": "Content",
};

export function AdminShell() {
  const { session, logout } = useAuth();
  const location = useLocation();
  const isAssociationAdmin = session?.user.role === "ASSOCIATION_ADMIN";
  const visibleItems = NAV_ITEMS.filter((item) => !item.associationOnly || isAssociationAdmin);
  const pageTitle = PAGE_TITLES[location.pathname] ?? "Admin";

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
          <strong className="admin-sidebar__scope-value">{session?.hierarchy.association ?? session?.hierarchy.state ?? "Platform"}</strong>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-shell__header">
          <div>
            <p className="admin-shell__eyebrow">Protected Admin Shell</p>
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
