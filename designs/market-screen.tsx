import React from "react";

// Tailwind config is assumed to be set up with the custom theme tokens.
// This component uses inline styles where custom CSS variables are needed.

const GoldMarket: React.FC = () => {
  return (
    <div
      className="font-sans text-on-surface"
      style={{ fontFamily: "Inter, sans-serif", backgroundColor: "#fbf9f9", minHeight: "100dvh" }}
    >
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          font-size: 24px;
          line-height: 1;
          display: inline-block;
        }
        .fill-icon {
          font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Main Content Scroll Area */}
      <main style={{ paddingBottom: "96px" }}>

        {/* Section 1: Featured Partners */}
        <section style={{ marginBottom: "24px" }}>
          <h2 style={{
            fontSize: "24px", lineHeight: "1.3", fontWeight: 500,
            padding: "24px 24px 8px", color: "#000000"
          }}>
            Featured Partners
          </h2>
          <div style={{ padding: "0 24px" }}>
            <div style={{
              position: "relative",
              display: "flex",
              minHeight: "320px",
              flexDirection: "column",
              justifyContent: "flex-end",
              overflow: "hidden",
              borderRadius: "0.5rem",
              backgroundImage: `linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuCXF1lc-j6uLrrYo_jtebxVSYHLETbEQRRcgGBdpprhesEjKTQwrBduWNXk5PYA9ynysArXvOabhdwF9qlaw5ve1ugx8d0wjgwotfsKlTiTKSH3D7JVMSvWJCjrXy73VyR_Qualm4ffERfcriVK_UvlHE6zruONAbMjeyiorGcSjviFhsMO2Yu_jxF24MF3xVele3JrWim5NQCzvRDn5w9G4UpcgZdfGeiIiY8oyXZc3w5FIn2-peqjoMOwppGTN9mmS9Io65JQgu0")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}>
              <div style={{ padding: "24px" }}>
                <span style={{
                  display: "inline-block",
                  padding: "4px 8px",
                  backgroundColor: "#775a19",
                  color: "#ffffff",
                  fontSize: "12px", lineHeight: 1, letterSpacing: "0.08em", fontWeight: 600,
                  borderRadius: "0.125rem",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                }}>
                  Premium Member
                </span>
                <h3 style={{ color: "#ffffff", fontSize: "32px", lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: 600 }}>
                  Aurora Gold Exchange
                </h3>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "16px", lineHeight: "1.5" }}>
                  Manhattan • New York, NY
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Product Categories */}
        <section style={{ marginBottom: "24px" }}>
          <h2 style={{
            fontSize: "12px", lineHeight: 1, letterSpacing: "0.08em", fontWeight: 600,
            padding: "0 24px 8px", color: "#7e7576", textTransform: "uppercase"
          }}>
            Product Categories
          </h2>
          <div
            className="hide-scrollbar"
            style={{ display: "flex", gap: "16px", overflowX: "auto", padding: "0 24px" }}
          >
            {[
              { symbol: "AU", label: "Gold" },
              { symbol: "AG", label: "Silver" },
              { symbol: "PT", label: "Platinum" },
              { symbol: "DI", label: "Diamonds" },
              { symbol: "GM", label: "Gems" },
              { symbol: "BL", label: "Bullion" },
            ].map((cat) => (
              <div key={cat.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <div style={{
                  width: "64px", height: "64px", borderRadius: "9999px",
                  backgroundColor: "#efeded",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1px solid #cfc4c5"
                }}>
                  <span style={{ color: "#775a19", fontWeight: 700, fontSize: "18px" }}>{cat.symbol}</span>
                </div>
                <span style={{ fontSize: "13px", lineHeight: "1.4", fontWeight: 500 }}>{cat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Established Members */}
        <section style={{ marginBottom: "24px" }}>
          <h2 style={{
            fontSize: "24px", lineHeight: "1.3", fontWeight: 500,
            padding: "0 24px 8px", color: "#000000"
          }}>
            Established Members
          </h2>
          <div
            className="hide-scrollbar"
            style={{ display: "flex", gap: "24px", overflowX: "auto", padding: "0 24px" }}
          >
            {/* Member 1 */}
            <div style={{
              width: "256px", flexShrink: 0, borderRadius: "0.5rem",
              backgroundColor: "#ffffff", overflow: "hidden",
              boxShadow: "0px 4px 20px rgba(0,0,0,0.05)"
            }}>
              <div style={{
                height: "160px",
                backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuCxGCGZlkM948d_WsqCv1oiSVkj1XK6g8S9Eikw8ntZUy9DC5MMpLAaP6k8_5WnhL3dcBKOam26i-pu7J0cG7Pc-Tu-2wcLJRpkaRUsHGUpN8L9HjgeSXdO2QlTFFnecgEhBz5eYKn8WsZ1HXGdoq3jMWivhYe1L66e5bkVmGBGtqM57UNl0lz-6qG018t1rBvDyERbdeYIQ16e3d_Zw8S2belSdbueReEFhW8QsUBZUcDvgtklg3ECyHs_8ZKM_bZh1MtkJpxEElQ")`,
                backgroundSize: "cover", backgroundPosition: "center"
              }} />
              <div style={{ padding: "16px" }}>
                <h4 style={{ fontWeight: 600, color: "#000000", fontSize: "16px", lineHeight: "1.5" }}>Heritage Goldsmiths</h4>
                <p style={{ fontSize: "13px", lineHeight: "1.4", fontWeight: 500, color: "#7e7576" }}>London, UK</p>
              </div>
            </div>

            {/* Member 2 */}
            <div style={{
              width: "256px", flexShrink: 0, borderRadius: "0.5rem",
              backgroundColor: "#ffffff", overflow: "hidden",
              boxShadow: "0px 4px 20px rgba(0,0,0,0.05)"
            }}>
              <div style={{
                height: "160px",
                backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuAaumTw7OFygtdVpS7FT4Q9XEK_Q2E_10d3ovGBNo1-ZDXFF173qu6FHPzVMfm8JI0nHJt7PedvuzpmXqe-CpjVibv6ohlyVP8jiNJN_087L2lFA43RQ8Gb3u9eVHG2boxzUsDfRe6mIwkztM6NwNeWEC8kY26r3XDRoy0LirrON-HjAYR0IOt2NAo9VlvD_9xgLwG_JP8Ph82HD7BrGsLn-OQZBGIb4wIUkpaSswp-Kf9m503xY37eEa1TYB3Za9xnR5cu7jlwU-8")`,
                backgroundSize: "cover", backgroundPosition: "center"
              }} />
              <div style={{ padding: "16px" }}>
                <h4 style={{ fontWeight: 600, color: "#000000", fontSize: "16px", lineHeight: "1.5" }}>Solitaire Collective</h4>
                <p style={{ fontSize: "13px", lineHeight: "1.4", fontWeight: 500, color: "#7e7576" }}>Paris, FR</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: New Arrivals */}
        <section style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px 8px" }}>
            <h2 style={{ fontSize: "24px", lineHeight: "1.3", fontWeight: 500, color: "#000000" }}>New Arrivals</h2>
            <span style={{ fontSize: "13px", lineHeight: "1.4", fontWeight: 500, color: "#775a19", cursor: "pointer" }}>View All</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", padding: "0 24px" }}>
            {/* Product 1 */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{
                aspectRatio: "1 / 1", borderRadius: "0.5rem",
                backgroundColor: "#f5f3f3", overflow: "hidden", marginBottom: "8px",
                border: "1px solid rgba(207,196,197,0.3)"
              }}>
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBRn5Ba6ltfvfPAP43nfmn_t6SfueN9PIIdpb02GTztz280ZY7c0Q37UlNoXJ2mlNSMeNowTAqcevsLqcUZSMjcXxnOUDDEo2Yoo1FqDkwZPuKVtj2a0zsoR247cBYHG6rzZaNJjdrIsiuVuVq2MpoROQGHXHjJ7AbqrDhdxSbjzSjcCsrPCPPjzgDCxmKm7VHlepCWCm57bJAtSFBAq94SLzXG5fy3vQQnQJ5IxACxQWaFp7GhrmjKyQBBH-Be-w-_ofNQNd_vYlE"
                  alt="Gold Ingot 10oz"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <p style={{ fontSize: "12px", lineHeight: 1, letterSpacing: "0.08em", fontWeight: 600, color: "#775a19", textTransform: "uppercase" }}>99.9% Purity</p>
              <h4 style={{ fontWeight: 600, fontSize: "16px", lineHeight: "1.5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Gold Ingot 10oz</h4>
              <p style={{ fontSize: "13px", lineHeight: "1.4", fontWeight: 500, color: "#7e7576" }}>Royal Mint • 311g</p>
            </div>

            {/* Product 2 */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{
                aspectRatio: "1 / 1", borderRadius: "0.5rem",
                backgroundColor: "#f5f3f3", overflow: "hidden", marginBottom: "8px",
                border: "1px solid rgba(207,196,197,0.3)"
              }}>
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAegPOkfozXEWDPTzYu93qi-t94xfGxKoX8JQOOwMpdegC6Oa1BPcZYNJQievK9K3_cSlhq2Hm20FHFoVEhkULh4G5fOWGGdpha7k-WdjaJViCPEs4enXpA6iLS3zOLB9U1ccWGFphphB4KsO3d78qLr8FQazKUq-vpuW4kiQ6e3IEkImGx6_02ZLv6mGQJBRHOJSQbGIGqBTvaKck8PM_uGgPwzTlErYWPeTGmAUHWt0pVCghwj08J4MRSTwuTaWleWoAvjCeYino"
                  alt="Diamond Studs"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <p style={{ fontSize: "12px", lineHeight: 1, letterSpacing: "0.08em", fontWeight: 600, color: "#775a19", textTransform: "uppercase" }}>D Color / VVS1</p>
              <h4 style={{ fontWeight: 600, fontSize: "16px", lineHeight: "1.5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Diamond Studs</h4>
              <p style={{ fontSize: "13px", lineHeight: "1.4", fontWeight: 500, color: "#7e7576" }}>Vera Gems • 2ct</p>
            </div>
          </div>
        </section>

        {/* Section 5: General Directory */}
        <section style={{ marginBottom: "80px" }}>
          <h2 style={{
            fontSize: "24px", lineHeight: "1.3", fontWeight: 500,
            padding: "0 24px 8px", color: "#000000"
          }}>
            General Directory
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", padding: "0 24px" }}>
            {[
              { initial: "S", name: "Sterling & Co", location: "Chicago, IL" },
              { initial: "B", name: "Beacon Alloys", location: "Boston, MA" },
              { initial: "O", name: "Opal Optics", location: "Sydney, AU" },
              { initial: "M", name: "Modern Metals", location: "Dubai, UAE" },
            ].map((entry) => (
              <div key={entry.name} style={{
                backgroundColor: "#ffffff",
                padding: "16px", borderRadius: "0.5rem",
                boxShadow: "0px 4px 20px rgba(0,0,0,0.05)",
                border: "1px solid rgba(207,196,197,0.2)",
                display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center"
              }}>
                <div style={{
                  width: "64px", height: "64px", borderRadius: "9999px",
                  backgroundColor: "#efeded", overflow: "hidden",
                  marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <span style={{ fontSize: "24px", lineHeight: "1.3", fontWeight: 500, color: "#7e7576" }}>{entry.initial}</span>
                </div>
                <h4 style={{
                  fontWeight: 600, fontSize: "16px", lineHeight: "1.5",
                  width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                }}>
                  {entry.name}
                </h4>
                <p style={{ fontSize: "13px", lineHeight: "1.4", fontWeight: 500, color: "#7e7576", marginBottom: "8px" }}>
                  {entry.location}
                </p>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  fontSize: "10px", textTransform: "uppercase", fontWeight: 700,
                  color: "#775a19",
                  backgroundColor: "rgba(254,212,136,0.2)",
                  padding: "4px 8px", borderRadius: "9999px"
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>verified</span>
                  Verified
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Fixed Bottom Navigation Bar */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        backgroundColor: "#ffffff", borderTop: "1px solid #cfc4c5"
      }}>
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "8px 24px" }}>
          <a href="#" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: "#000000", textDecoration: "none" }}>
            <span className="material-symbols-outlined fill-icon">storefront</span>
            <span style={{ fontSize: "10px", lineHeight: 1, letterSpacing: "0.08em", fontWeight: 600, textTransform: "uppercase" }}>Market</span>
          </a>
          <a href="#" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: "#7e7576", textDecoration: "none" }}>
            <span className="material-symbols-outlined">pie_chart</span>
            <span style={{ fontSize: "10px", lineHeight: 1, letterSpacing: "0.08em", fontWeight: 600, textTransform: "uppercase" }}>Portfolio</span>
          </a>
          <a href="#" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: "#7e7576", textDecoration: "none" }}>
            <span className="material-symbols-outlined">swap_horiz</span>
            <span style={{ fontSize: "10px", lineHeight: 1, letterSpacing: "0.08em", fontWeight: 600, textTransform: "uppercase" }}>Trade</span>
          </a>
          <a href="#" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: "#7e7576", textDecoration: "none" }}>
            <span className="material-symbols-outlined">person</span>
            <span style={{ fontSize: "10px", lineHeight: 1, letterSpacing: "0.08em", fontWeight: 600, textTransform: "uppercase" }}>Profile</span>
          </a>
        </div>
      </nav>
    </div>
  );
};

export default GoldMarket;
