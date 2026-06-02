import { useCallback, useRef, useState } from "react";
import { toast } from "react-toastify";
import { publicApi } from "../services/publicApi";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useNewsletterSubscribe({ showToast = true } = {}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const mountTs = useRef(Date.now());

  const validate = useCallback((value) => {
    const v = (value ?? email).trim();
    if (!v || !EMAIL_REGEX.test(v)) {
      setError("* Email is required");
      return false;
    }
    setError("");
    return true;
  }, [email]);

  const submit = useCallback(
    async (e) => {
      e?.preventDefault();
      if (!validate(email)) return false;

      setSubmitting(true);
      try {
        const res = await publicApi.subscribeNewsletter({
          email: email.trim().toLowerCase(),
          company: honeypot,
          _ts: mountTs.current,
          turnstileToken: turnstileToken || undefined
        });
        if (showToast) {
          toast.success(res.data?.message || "Thank you for subscribing to our newsletter.");
        }
        setEmail("");
        setTurnstileToken("");
        mountTs.current = Date.now();
        return true;
      } catch (err) {
        const msg = err.response?.data?.message || "Could not subscribe. Please try again.";
        if (err.response?.status === 409) {
          if (showToast) toast.error("You have already Subscribed");
        } else if (showToast) {
          toast.error(msg);
        } else {
          setError(msg);
        }
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [email, honeypot, showToast, turnstileToken, validate]
  );

  return {
    email,
    setEmail,
    error,
    setError,
    submitting,
    honeypot,
    setHoneypot,
    turnstileToken,
    setTurnstileToken,
    validate,
    submit
  };
}
