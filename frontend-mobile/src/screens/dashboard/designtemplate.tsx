import { useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BullionRate {
  label: string;
  price: string;
  trend: "up" | "down";
}

interface GlobalTrend {
  label: string;
  value: string;
  trend: "up" | "down";
}

interface NewsItem {
  id: number;
  icon: "calendar" | "gavel" | "bell";
  title: string;
  subtitle: string;
  time: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const TrendUpIcon = ({ color = "#22c55e" }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="17 6 23 6 23 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrendDownIcon = ({ color = "#ef4444" }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="17 18 23 18 23 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#d97706" : "none"} stroke={active ? "#d97706" : "#9ca3af"} strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const MarketIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#d97706" : "#9ca3af"} strokeWidth="2">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const NewsIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#d97706" : "#9ca3af"} strokeWidth="2">
    <path d="M4 6h16M4 10h16M4 14h10M4 18h6" strokeLinecap="round" />
    <rect x="2" y="3" width="20" height="18" rx="2" />
  </svg>
);

const ServicesIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#d97706" : "#9ca3af"} strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
  </svg>
);

const ProfileIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#d97706" : "#9ca3af"} strokeWidth="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const BellIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="2">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
    <circle cx="18" cy="6" r="4" fill="#ef4444" stroke="none" />
  </svg>
);

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
    <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
    <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round" />
  </svg>
);

const AssociationsIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8">
    <rect x="2" y="7" width="20" height="14" rx="1" />
    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    <line x1="8" y1="12" x2="8" y2="17" />
    <line x1="12" y1="12" x2="12" y2="17" />
    <line x1="16" y1="12" x2="16" y2="17" />
  </svg>
);

const OtherStatesIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8">
    <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const GavelIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
    <path d="M14 6l-8.5 8.5" strokeLinecap="round" />
    <path d="M9 3l3 3-7 7-3-3z" />
    <path d="M13 8l3 3 2-2-3-3z" />
    <line x1="2" y1="22" x2="10" y2="14" strokeLinecap="round" />
  </svg>
);

const AlertBellIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

const QuickMarketIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const QuickNewsIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8">
    <rect x="2" y="3" width="20" height="18" rx="2" />
    <line x1="7" y1="8" x2="17" y2="8" />
    <line x1="7" y1="12" x2="17" y2="12" />
    <line x1="7" y1="16" x2="13" y2="16" />
  </svg>
);

const QuickServicesIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
  </svg>
);

const QuickSearchIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// ─── Data ─────────────────────────────────────────────────────────────────────

const bullionRates: BullionRate[] = [
  { label: "GOLD 22K (1G)", price: "₹5,450", trend: "up" },
  { label: "GOLD 24K (1G)", price: "₹5,900", trend: "down" },
  { label: "SILVER (1G)", price: "₹75", trend: "up" },
];

const globalTrends: GlobalTrend[] = [
  { label: "USD → INR", value: "₹83.50", trend: "up" },
  { label: "Gold/Oz (USD)", value: "$2,350", trend: "down" },
];

const newsItems: NewsItem[] = [
  {
    id: 1,
    icon: "calendar",
    title: "General Body Meeting ...",
    subtitle: "All members are requested to attend the...",
    time: "10m ago",
  },
  {
    id: 2,
    icon: "gavel",
    title: "New GST Update for...",
    subtitle: "Revised tax implications on gold import...",
    time: "2h ago",
  },
  {
    id: 3,
    icon: "bell",
    title: "Emergency Rate Alert",
    subtitle: "Market volatility detected. Check revised...",
    time: "5h ago",
  },
];

const quickActions: QuickAction[] = [
  { id: "market", label: "Market", icon: <QuickMarketIcon /> },
  { id: "news", label: "News", icon: <QuickNewsIcon /> },
  { id: "services", label: "Services", icon: <QuickServicesIcon /> },
  { id: "search", label: "Search", icon: <QuickSearchIcon /> },
];

const navItems = [
  { id: "home", label: "HOME", Icon: HomeIcon },
  { id: "market", label: "MARKET", Icon: MarketIcon },
  { id: "news", label: "NEWS", Icon: NewsIcon },
  { id: "services", label: "SERVICES", Icon: ServicesIcon },
  { id: "profile", label: "PROFILE", Icon: ProfileIcon },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const NewsItemRow = ({ item }: { item: NewsItem }) => {
  const IconMap = {
    calendar: <CalendarIcon />,
    gavel: <GavelIcon />,
    bell: <AlertBellIcon />,
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "12px 0",
        borderBottom: "1px solid #f3f4f6",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          backgroundColor: "#fff7ed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {IconMap[item.icon]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontWeight: 600, fontSize: "14px", color: "#111827", lineHeight: 1.3 }}>
            {item.title}
          </span>
          <span style={{ fontSize: "11px", color: "#9ca3af", flexShrink: 0, marginLeft: "8px" }}>
            {item.time}
          </span>
        </div>
        <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px", lineHeight: 1.4 }}>
          {item.subtitle}
        </p>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ThrissurAssocApp() {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [activeDot, setActiveDot] = useState<number>(0);

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
        maxWidth: "390px",
        margin: "0 auto",
        position: "relative",
        paddingBottom: "72px",
        overflowX: "hidden",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <button style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
          <MenuIcon />
        </button>
        <span style={{ fontWeight: 700, fontSize: "16px", letterSpacing: "0.08em", color: "#111827" }}>
          THRISSUR ASSOC
        </span>
        <button style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", position: "relative" }}>
          <BellIcon />
        </button>
      </div>

      <div style={{ overflowY: "auto" }}>
        {/* ── Bullion Rates Card ── */}
        <div
          style={{
            margin: "16px",
            borderRadius: "16px",
            background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
            padding: "20px",
            color: "#ffffff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Watermark */}
          <div
            style={{
              position: "absolute",
              right: "16px",
              bottom: "16px",
              opacity: 0.08,
            }}
          >
            <svg width="90" height="70" viewBox="0 0 90 70" fill="white">
              <rect x="5" y="5" width="80" height="60" rx="4" stroke="white" strokeWidth="3" fill="none" />
              <circle cx="30" cy="30" r="10" stroke="white" strokeWidth="3" fill="none" />
              <line x1="50" y1="20" x2="80" y2="20" stroke="white" strokeWidth="3" />
              <line x1="50" y1="35" x2="80" y2="35" stroke="white" strokeWidth="3" />
              <line x1="50" y1="50" x2="80" y2="50" stroke="white" strokeWidth="3" />
            </svg>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <p style={{ color: "#d97706", fontWeight: 700, fontSize: "13px", letterSpacing: "0.05em" }}>
                THRISSUR JEWELLERY<br />ASSOCIATION
              </p>
              <p style={{ color: "#9ca3af", fontSize: "11px", marginTop: "2px", letterSpacing: "0.08em" }}>
                LIVE BULLION RATES
              </p>
            </div>
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                borderRadius: "8px",
                padding: "6px 10px",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: "10px", color: "#d1d5db" }}>Updated:</p>
              <p style={{ fontSize: "11px", color: "#ffffff", fontWeight: 600 }}>10:30 AM</p>
            </div>
          </div>

          {bullionRates.map((rate, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: idx < bullionRates.length - 1 ? "14px" : 0,
              }}
            >
              <div>
                <p style={{ fontSize: "10px", color: "#9ca3af", letterSpacing: "0.06em", marginBottom: "2px" }}>
                  {rate.label}
                </p>
                <p style={{ fontSize: "30px", fontWeight: 700, lineHeight: 1, color: "#ffffff" }}>
                  {rate.price}
                </p>
              </div>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: rate.trend === "up" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {rate.trend === "up" ? <TrendUpIcon /> : <TrendDownIcon />}
              </div>
            </div>
          ))}
        </div>

        {/* ── Quick Shortcuts ── */}
        <div style={{ display: "flex", gap: "12px", padding: "0 16px 16px" }}>
          {[
            { label: "Other\nAssociations", Icon: <AssociationsIcon /> },
            { label: "Other States", Icon: <OtherStatesIcon /> },
          ].map((item, idx) => (
            <button
              key={idx}
              style={{
                flex: 1,
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "14px 12px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              {item.Icon}
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151", whiteSpace: "pre-line", textAlign: "left" }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* ── Global Trends ── */}
        <div
          style={{
            margin: "0 16px 16px",
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e5e7eb",
            padding: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px" }}>
            <GlobeIcon />
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "#6b7280" }}>
              GLOBAL TRENDS
            </span>
          </div>

          {globalTrends.map((trend, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "#f9fafb",
                borderRadius: "10px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: idx < globalTrends.length - 1 ? "8px" : 0,
              }}
            >
              <div>
                <p style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "3px" }}>{trend.label}</p>
                <p style={{ fontSize: "20px", fontWeight: 700, color: "#111827" }}>{trend.value}</p>
              </div>
              {trend.trend === "up" ? (
                <TrendUpIcon color="#16a34a" />
              ) : (
                <TrendDownIcon color="#dc2626" />
              )}
            </div>
          ))}
        </div>

        {/* ── Featured Offer Banner ── */}
        <div
          style={{
            margin: "0 16px 16px",
            borderRadius: "14px",
            overflow: "hidden",
            position: "relative",
            height: "150px",
            cursor: "pointer",
          }}
        >
          {/* Gradient overlay over a gold-toned background */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, #78350f 0%, #92400e 40%, #b45309 70%, #d97706 100%)",
            }}
          />
          {/* Jewellery texture overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "radial-gradient(ellipse at 70% 50%, rgba(251,191,36,0.3) 0%, transparent 60%)",
            }}
          />
          <div style={{ position: "absolute", inset: 0, padding: "20px" }}>
            <span
              style={{
                backgroundColor: "#d97706",
                color: "#ffffff",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                padding: "3px 8px",
                borderRadius: "4px",
              }}
            >
              FEATURED OFFER
            </span>
            <h2 style={{ color: "#ffffff", fontSize: "20px", fontWeight: 700, marginTop: "8px", lineHeight: 1.2 }}>
              New Membership Perks
            </h2>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px", marginTop: "6px" }}>
              Exclusive access to trade analysis tools starting this...
            </p>
          </div>

          {/* Dots */}
          <div style={{ position: "absolute", bottom: "12px", left: "20px", display: "flex", gap: "5px" }}>
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                onClick={() => setActiveDot(i)}
                style={{
                  width: i === activeDot ? "16px" : "6px",
                  height: "6px",
                  borderRadius: "3px",
                  backgroundColor: i === activeDot ? "#ffffff" : "rgba(255,255,255,0.4)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div style={{ padding: "0 16px 16px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "#6b7280", marginBottom: "12px" }}>
            QUICK ACTIONS
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {quickActions.map((action) => (
              <button
                key={action.id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "14px",
                  border: "1px solid #e5e7eb",
                  padding: "20px 16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                {action.icon}
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Latest News ── */}
        <div style={{ padding: "0 16px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "#6b7280" }}>
              LATEST NEWS
            </p>
            <button
              style={{ background: "none", border: "none", cursor: "pointer", color: "#d97706", fontSize: "13px", fontWeight: 600 }}
            >
              View All →
            </button>
          </div>
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e5e7eb",
              padding: "4px 16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            {newsItems.map((item) => (
              <NewsItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Navigation ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "390px",
          backgroundColor: "#ffffff",
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          padding: "10px 0 14px",
          zIndex: 50,
          boxShadow: "0 -4px 12px rgba(0,0,0,0.06)",
        }}
      >
        {navItems.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 10px",
              }}
            >
              <Icon active={isActive} />
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: isActive ? "#d97706" : "#9ca3af",
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}