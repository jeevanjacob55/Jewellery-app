import { FormEvent, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, status } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTarget = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from && state.from.startsWith("/admin") ? state.from : "/admin/overview";
  }, [location.state]);

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
            <p className="login-page__form-copy">Enter your admin username and password to access the administrative dashboard.</p>
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

          <div className="login-page__support">
            <p>
              New administrator?{" "}
              <button className="login-form__text-action login-form__text-action--inline" type="button">
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
