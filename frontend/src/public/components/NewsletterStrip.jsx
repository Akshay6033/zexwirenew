import { useEffect, useRef } from "react";
import { useNewsletterSubscribe } from "../hooks/useNewsletterSubscribe";
import "../styles/newsletter-strip.css";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

export default function NewsletterStrip({ className = "" }) {
  const {
    email,
    setEmail,
    error,
    setError,
    submitting,
    honeypot,
    setHoneypot,
    setTurnstileToken,
    submit
  } = useNewsletterSubscribe();

  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current) return undefined;

    const renderWidget = () => {
      if (!window.turnstile || !turnstileRef.current) return;
      if (widgetIdRef.current != null) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken("")
      });
    };

    if (window.turnstile) {
      renderWidget();
      return () => {
        if (widgetIdRef.current != null && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
        }
      };
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = renderWidget;
    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current != null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [setTurnstileToken]);

  const onBlur = () => {
    if (email.trim() && error) {
      setError("");
    }
  };

  return (
    <section className={`newsletter-strip ${className}`.trim()}>
      <div className="container newsroom-container">
        <div className="row align-items-center g-3">
          <div className="col-lg-6 newsletter-strip__copy">
            <p className="newsletter-strip__title mb-0">
              Sign Up to Newsletter
              <span className="newsletter-strip__subtitle">
                to get emails regarding latest offers and discounts
              </span>
            </p>
          </div>
          <div className="col-lg-6 newsletter-strip__form-col">
            <form onSubmit={submit} className="newsletter-strip__form" noValidate>
              <div className="newsletter-strip__hp" aria-hidden="true">
                <label htmlFor="newsletter-company">Company</label>
                <input
                  type="text"
                  id="newsletter-company"
                  name="company"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>
              <div className="newsletter-strip__fields">
                <input
                  type="email"
                  name="email"
                  className="form-control newsletter-strip__input"
                  placeholder="Your Email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  onBlur={onBlur}
                  aria-label="Your Email"
                  aria-invalid={error ? "true" : undefined}
                  aria-describedby={error ? "newsletter-email-error" : undefined}
                />
                <button type="submit" className="newsletter-strip__submit" disabled={submitting}>
                  {submitting ? "…" : "submit"}
                </button>
              </div>
              {error && (
                <span id="newsletter-email-error" className="newsletter-strip__error" role="alert">
                  {error}
                </span>
              )}
              {TURNSTILE_SITE_KEY ? <div ref={turnstileRef} className="newsletter-strip__turnstile" /> : null}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
