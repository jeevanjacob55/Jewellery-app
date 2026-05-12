import { useEffect, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import { fetchAdminMarketScreenSettings, MarketScreenSettings, updateAdminMarketScreenSettings } from "../lib/api";

const TIMING_OPTIONS: Array<MarketScreenSettings["hero_auto_scroll_seconds"]> = [3, 5];

export function MarketScreenPage() {
  const { session } = useAuth();
  const isSuperAdmin = session?.user.role === "SUPER_ADMIN";
  const [settings, setSettings] = useState<MarketScreenSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingValue, setSavingValue] = useState<MarketScreenSettings["hero_auto_scroll_seconds"] | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadSettings() {
      setLoading(true);
      setError("");
      try {
        const nextSettings = await fetchAdminMarketScreenSettings();
        if (!active) {
          return;
        }
        setSettings(nextSettings);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Unable to load market screen settings.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, [isSuperAdmin]);

  async function handleSelectTiming(nextValue: MarketScreenSettings["hero_auto_scroll_seconds"]) {
    if (savingValue !== null || settings?.hero_auto_scroll_seconds === nextValue) {
      return;
    }

    setSavingValue(nextValue);
    setError("");
    setSuccessMessage("");

    try {
      const nextSettings = await updateAdminMarketScreenSettings({ hero_auto_scroll_seconds: nextValue });
      setSettings(nextSettings);
      setSuccessMessage(`Hero auto-scroll timing updated to ${nextSettings.hero_auto_scroll_seconds} seconds.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update market screen settings.");
    } finally {
      setSavingValue(null);
    }
  }

  if (!isSuperAdmin) {
    return (
      <section className="admin-placeholder">
        <div className="admin-placeholder__card">
          <p className="admin-placeholder__eyebrow">Restricted</p>
          <h2 className="admin-placeholder__title">Market Screen is limited to super admins.</h2>
          <p className="admin-placeholder__copy">Only super admins can control the global hero auto-scroll timing used by the mobile market screen.</p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="market-screen-page">
        <div className="rates-panel">
          <h3 className="rates-panel__title">Loading market screen settings</h3>
          <p className="admin-placeholder__copy">Fetching the current hero auto-scroll timing for the mobile market screen.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="market-screen-page">
      <div className="market-screen-page__hero">
        <div>
          <p className="market-screen-page__eyebrow">Global Market Control</p>
          <h2 className="market-screen-page__title">Manage the mobile market hero timing</h2>
          <p className="market-screen-page__copy">Choose how quickly the featured hero cards advance on the mobile market screen. Changes are saved globally and picked up the next time the feed reloads.</p>
        </div>
        <div className="market-screen-page__hero-meta">
          <div className="market-screen-page__badge">Mobile Market</div>
          <p className="market-screen-page__updated">Current timing: {settings?.hero_auto_scroll_seconds ?? 5} seconds</p>
        </div>
      </div>

      {error ? <div className="rates-feedback rates-feedback--error">{error}</div> : null}
      {successMessage ? <div className="rates-feedback rates-feedback--success">{successMessage}</div> : null}

      <div className="market-screen-page__grid">
        <section className="rates-panel">
          <h3 className="rates-panel__title">Hero auto-scroll timing</h3>
          <p className="market-screen-page__panel-copy">Select the speed used by the featured hero carousel in the mobile market screen.</p>
          <div className="market-screen-page__toggle-group" role="group" aria-label="Hero auto-scroll timing">
            {TIMING_OPTIONS.map((value) => {
              const isActive = settings?.hero_auto_scroll_seconds === value;
              const isSaving = savingValue === value;
              return (
                <button
                  key={value}
                  type="button"
                  className={`market-screen-page__toggle${isActive ? " market-screen-page__toggle--active" : ""}`}
                  onClick={() => void handleSelectTiming(value)}
                  disabled={savingValue !== null}
                >
                  <span>{value} seconds</span>
                  <small>{isSaving ? "Saving..." : isActive ? "Active" : "Set timing"}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rates-panel">
          <h3 className="rates-panel__title">Behavior</h3>
          <p className="market-screen-page__panel-copy">This setting affects only the featured hero carousel on the mobile market screen.</p>
          <p className="market-screen-page__panel-copy">Manual swiping still pauses auto-scroll until the user interaction finishes.</p>
          <p className="market-screen-page__panel-copy">The current mobile fallback remains 5 seconds if settings are temporarily unavailable.</p>
        </section>
      </div>
    </section>
  );
}
