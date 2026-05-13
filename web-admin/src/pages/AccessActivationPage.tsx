import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { completeActivation, fetchActivationTokenStatus, ActivationTokenStatus } from "../lib/api";

export function AccessActivationPage() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<ActivationTokenStatus | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadStatus() {
      if (!token) {
        setError("Activation token is missing.");
        setLoading(false);
        return;
      }
      try {
        const payload = await fetchActivationTokenStatus(token);
        if (active) {
          setStatus(payload);
        }
      } catch (nextError) {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Unable to verify this activation link.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void loadStatus();
    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Activation token is missing.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await completeActivation(token, password);
      setStatus(response.activation);
      setSuccessMessage(response.message);
      window.setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to activate this account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="request-access-page">
      <section className="request-access-page__card request-access-page__card--narrow">
        <div className="request-access-page__header">
          <p className="request-access-page__eyebrow">Account Setup</p>
          <h1 className="request-access-page__title">Finish your administrator setup</h1>
          <p className="request-access-page__copy">Create your password to activate the approved admin account.</p>
        </div>

        {loading ? (
          <div className="request-access-page__empty">
            <strong>Checking activation link...</strong>
            <p>Validating token status before account setup.</p>
          </div>
        ) : null}

        {!loading && error ? <div className="login-form__error">{error}</div> : null}
        {!loading && successMessage ? <div className="request-access-page__success">{successMessage}</div> : null}

        {!loading && status ? (
          <>
            <div className="request-access-page__summary">
              <div>
                <strong>{status.user_name}</strong>
                <p>{status.email}</p>
              </div>
              <span className={`request-access-page__status${status.is_active ? "" : " request-access-page__status--inactive"}`}>
                {status.is_active ? "Ready to activate" : "Link expired"}
              </span>
            </div>

            {status.is_active ? (
              <form className="request-access-form" onSubmit={handleSubmit}>
                <div className="request-access-form__grid">
                  <label className="request-access-form__field">
                    <span>Password</span>
                    <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
                  </label>
                  <label className="request-access-form__field">
                    <span>Confirm password</span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      minLength={8}
                    />
                  </label>
                </div>
                <div className="request-access-form__actions">
                  <button className="login-form__submit" type="submit" disabled={submitting}>
                    <span>{submitting ? "Activating..." : "Activate Account"}</span>
                  </button>
                </div>
              </form>
            ) : null}
          </>
        ) : null}

        <div className="request-access-page__footer">
          <Link className="login-form__text-action" to="/login">
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}
