import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import checkoutApi from "../../services/checkoutApi";

function loadStripeScript() {
  return new Promise((resolve) => {
    if (window.Stripe) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutStripeSection({
  token,
  appliedOfferCode,
  paying,
  setPaying,
  onSuccess,
  onFailed
}) {
  const mountRef = useRef(null);
  const cardRef = useRef(null);
  const stripeRef = useRef(null);
  const clientSecretRef = useRef("");
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setReady(false);
      setInitError("");
      if (cardRef.current) {
        cardRef.current.destroy();
        cardRef.current = null;
      }

      const ok = await loadStripeScript();
      if (!ok) {
        setInitError("Could not load Stripe.");
        return;
      }

      try {
        const res = await checkoutApi.createStripeIntent(token, appliedOfferCode);
        const { clientSecret, publishableKey } = res.data?.data || {};
        if (!clientSecret || !publishableKey) {
          setInitError("Could not start Stripe payment.");
          return;
        }
        if (cancelled) return;

        clientSecretRef.current = clientSecret;
        stripeRef.current = window.Stripe(publishableKey);
        const elements = stripeRef.current.elements();
        const card = elements.create("card", {
          style: {
            base: {
              fontSize: "16px",
              color: "#2d3550",
              "::placeholder": { color: "#9ca3af" }
            }
          }
        });
        card.mount(mountRef.current);
        cardRef.current = card;
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setInitError(err.response?.data?.message || "Stripe is not configured.");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (cardRef.current) {
        cardRef.current.destroy();
        cardRef.current = null;
      }
    };
  }, [token, appliedOfferCode]);

  const handlePay = async () => {
    if (!ready || !stripeRef.current || !cardRef.current || !clientSecretRef.current) return;
    setPaying(true);
    try {
      const { error, paymentIntent } = await stripeRef.current.confirmCardPayment(
        clientSecretRef.current,
        { payment_method: { card: cardRef.current } }
      );
      if (error) {
        toast.error(error.message || "Card payment failed");
        return;
      }
      if (paymentIntent?.status !== "succeeded") {
        toast.error("Payment was not completed.");
        onFailed?.();
        return;
      }

      const verifyRes = await checkoutApi.confirmStripe(token, {
        payment_intent_id: paymentIntent.id,
        offer_code: appliedOfferCode
      });
      onSuccess?.(verifyRes.data?.data?.paymentId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Stripe payment failed");
      onFailed?.();
    } finally {
      setPaying(false);
    }
  };

  if (initError) {
    return <p className="checkout-stripe-error">{initError}</p>;
  }

  return (
    <div className="checkout-stripe-section">
      <div ref={mountRef} className="checkout-stripe-card" />
      <button type="button" className="proceed checkout-stripe-pay" onClick={handlePay} disabled={!ready || paying}>
        {paying ? "Processing…" : "Pay with Stripe"}
      </button>
    </div>
  );
}
