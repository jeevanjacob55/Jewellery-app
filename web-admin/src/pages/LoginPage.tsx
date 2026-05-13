import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, status } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const redirectTarget = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from && state.from.startsWith("/admin") ? state.from : "/admin/overview";
  }, [location.state]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) {
      return;
    }

    let cancelled = false;
    const scriptId = "google-identity-services";

    const handleCredentialResponse = async (response: { credential?: string }) => {
      if (!response.credential) {
        setError("Google sign-in did not return a credential.");
        return;
      }

      setError(null);
      setIsGoogleLoading(true);
      try {
        const result = await loginWithGoogle({ idToken: response.credential, rememberMe });
        if (result === null) {
          navigate(redirectTarget, { replace: true });
          return;
        }
        if (result.status === "access_required") {
          setError(`${result.message} Use Request Admin Access to start onboarding.`);
          return;
        }
        setError(result.message);
      } catch (nextError) {
        if (nextError instanceof Error) {
          setError(nextError.message);
        } else {
          setError("Unable to sign in with Google right now.");
        }
      } finally {
        if (!cancelled) {
          setIsGoogleLoading(false);
        }
      }
    };

    const renderButton = () => {
      if (cancelled || !window.google || !googleButtonRef.current) {
        return;
      }
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: "360",
      });
      setGoogleReady(true);
    };

    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.google) {
        renderButton();
      } else {
        existingScript.addEventListener("load", renderButton, { once: true });
      }
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    script.onerror = () => {
      if (!cancelled) {
        setError("Unable to load Google sign-in right now.");
      }
    };
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle, navigate, redirectTarget, rememberMe]);

  if (status === "signedIn") {
    return <Navigate to={redirectTarget} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({
        username: username.trim(),
        password,
        rememberMe,
      });
      navigate(redirectTarget, { replace: true });
    } catch (nextError) {
      if (nextError instanceof Error) {
        setError(nextError.message);
      } else {
        setError("Unable to sign in right now.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-page__brand-panel">
        <div className="login-page__background">
          <img
            alt="Association Boardroom"
            className="login-page__background-image"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAi61z0BjCtTDUfD1Z-inVOua5MwLpPg94WAHp84JJrXZG_eNZwqtidvWhlRYBbzVcm-KyC5SpsBFnL7hD_6dny51K0Cl9mrU_Slfunlgi7bONt6VPetomWBnriTJKZaaosZMZSqfcWGtW_JtGeCUQ0CoVcf6lLrqbefbB5fVkVS0rmdry9QI9DRZjU_OOsfhI--AHiJpuPeucrBV2G4wPCW5n2xQugKZ-Uq5jnODho56WTHdwArQVoquwasQUA46sNcwQrFJhD4qo"
          />
          <div className="login-page__background-overlay" />
        </div>

        <div className="login-page__brand-top">
          <div className="login-page__brand-mark">
            <span className="login-page__brand-gem">◆</span>
            <span className="login-page__brand-name">Jewellery Association</span>
          </div>
        </div>

        <div className="login-page__brand-copy">
          <h1 className="login-page__headline">Integrity in every carat, authority in every decision.</h1>
          <div className="login-page__badges">
            <span className="login-page__badge">Association Verified</span>
            <span className="login-page__badge">Encrypted Session</span>
          </div>
        </div>

        <div className="login-page__brand-footer">
          <p>© 2024 INTERNATIONAL JEWELLERY ASSOCIATION ADMIN PORTAL. ALL RIGHTS RESERVED.</p>
        </div>
      </section>

      <section className="login-page__auth-panel">
        <div className="login-page__mobile-brand">
          <span className="login-page__brand-gem">◆</span>
          <span className="login-page__mobile-brand-name">JA Admin</span>
        </div>

        <div className="login-page__form-wrap">
          <div className="login-page__intro">
            <h2 className="login-page__form-title">Portal Login</h2>
            <p className="login-page__form-copy">Use your approved credentials or a linked Google account to access the administrative dashboard.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-form__field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="admin username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </div>

            <div className="login-form__field">
              <label htmlFor="password">Password</label>
              <div className="login-form__password-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  className="login-form__visibility"
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="login-form__options">
              <label className="login-form__remember">
                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                <span>Remember Me</span>
              </label>
              <button className="login-form__text-action" type="button">
                Forgot Password?
              </button>
            </div>

            {error ? <div className="login-form__error">{error}</div> : null}

            <button className="login-form__submit" type="submit" disabled={isSubmitting}>
              <span>{isSubmitting ? "Signing In..." : "Secure Login"}</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="login-form__divider" aria-hidden="true">
            <span />
            <strong>OR</strong>
            <span />
          </div>

          <div className="login-form__google-block">
            {GOOGLE_CLIENT_ID ? (
              <>
                <div className="login-form__google-button" ref={googleButtonRef} />
                <p className="login-form__google-copy">
                  Google verifies identity only. Access still depends on an approved account already in the system.
                </p>
              </>
            ) : (
              <div className="login-form__google-disabled">
                <strong>Google sign-in is not configured yet.</strong>
                <p>Add `VITE_GOOGLE_CLIENT_ID` to enable post-approval Google login.</p>
              </div>
            )}
            {isGoogleLoading ? <p className="login-form__google-status">Verifying Google account...</p> : null}
            {GOOGLE_CLIENT_ID && !googleReady && !isGoogleLoading ? (
              <p className="login-form__google-status">Preparing Google sign-in...</p>
            ) : null}
          </div>

          <div className="login-page__support">
            <p>
              New administrator?{" "}
              <button
                className="login-form__text-action login-form__text-action--inline"
                type="button"
                onClick={() => navigate("/request-access")}
              >
                Request Admin Access
              </button>
            </p>
            <div className="login-page__trust-strip">
              <div>
                <strong>SSL Secure</strong>
              </div>
              <div>
                <strong>JA Audited</strong>
              </div>
              <div>
                <strong>Member Guard</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="login-page__mobile-footer">© 2024 JA ADMIN PORTAL</div>
      </section>
    </main>
  );
}
