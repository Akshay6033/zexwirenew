import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import CheckoutSteps from "../../components/checkout/CheckoutSteps";
import CheckoutStripeSection from "../../components/checkout/CheckoutStripeSection";
import checkoutApi from "../../services/checkoutApi";
import { isUserLoggedIn } from "../../services/publicAuthApi";
import {
  clearStoredCoupon,
  getStoredCoupon,
  setStoredCoupon
} from "../../utils/checkoutCouponStorage";
import "../../styles/checkout.css";

const PAYMENT_LOGOS = {
  1: "https://pr.zexprwire.com/assets/newsimages/razorpaylogo.png",
  2: "https://pr.zexprwire.com/assets/newsimages/PayPallogo.png",
  3: "https://pr.zexprwire.com/assets/newsimages/stripelog.png",
  4: "https://pr.zexprwire.com/assets/newsimages/coinbase-1.png"
};

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function PaymentLogo({ methodId, name }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = PAYMENT_LOGOS[methodId];
  if (!src || imgFailed) {
    return <span className="payment-badge-fallback">{name}</span>;
  }
  return (
    <img
      src={src}
      alt={name}
      className="payment_images"
      onError={() => setImgFailed(true)}
    />
  );
}

export default function CheckoutPaymentPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [methods, setMethods] = useState([]);
  const [checkout, setCheckout] = useState(null);
  const [appliedOfferCode, setAppliedOfferCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);

  useEffect(() => {
    if (!isUserLoggedIn()) {
      navigate("/sign_in", { replace: true });
      return;
    }
    loadMethods();
  }, [token]);

  const loadMethods = async () => {
    setLoading(true);
    try {
      const requested =
        location.state?.offer_code || getStoredCoupon(token) || "";
      const res = await checkoutApi.getPaymentMethods(token, requested);
      const payload = res.data?.data || {};
      const ctx = payload.checkout || null;
      const validated = ctx?.pricing?.couponCode || "";

      if (requested && !validated) clearStoredCoupon(token);
      if (validated) setStoredCoupon(token, validated);
      else clearStoredCoupon(token);

      setAppliedOfferCode(validated);
      setMethods(payload.paymentMethods || []);
      setCheckout(ctx);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load payment methods");
      navigate(`/checkout/${token}`, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const startRazorpay = async () => {
    setPaying(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) {
        toast.error("Could not load Razorpay");
        return;
      }
      const orderRes = await checkoutApi.createRazorpayOrder(token, appliedOfferCode);
      const { orderId, keyId, amount, currency, user } = orderRes.data?.data || {};
      if (!orderId || !keyId) {
        toast.error("Could not create payment order");
        return;
      }

      const options = {
        key: keyId,
        amount,
        currency: currency || "USD",
        name: "ZEXPRWIRE",
        description: "Package purchase",
        order_id: orderId,
        handler: async (response) => {
          try {
            const verifyRes = await checkoutApi.verifyRazorpay(token, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              offer_code: appliedOfferCode
            });
            const paymentId = verifyRes.data?.data?.paymentId;
            navigate(`/checkout/success/${paymentId || "done"}`, { replace: true });
          } catch (err) {
            toast.error(err.response?.data?.message || "Payment verification failed");
            navigate("/checkout/failed", { replace: true });
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.contact || ""
        },
        theme: { color: "#6e71e2" },
        modal: {
          ondismiss: () => setPaying(false)
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        navigate("/checkout/failed", { replace: true });
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || "Razorpay error");
    } finally {
      setPaying(false);
    }
  };

  const startPaypal = async () => {
    setPaying(true);
    try {
      if (appliedOfferCode) setStoredCoupon(token, appliedOfferCode);
      const res = await checkoutApi.createPaypalOrder(token, appliedOfferCode);
      const url = res.data?.data?.approvalUrl;
      if (!url) {
        toast.error("Could not start PayPal");
        return;
      }
      window.location.href = url;
    } catch (err) {
      toast.error(err.response?.data?.message || "PayPal error");
      setPaying(false);
    }
  };

  const startCoinbase = async () => {
    setPaying(true);
    try {
      if (appliedOfferCode) setStoredCoupon(token, appliedOfferCode);
      const res = await checkoutApi.createCoinbaseCharge(token, appliedOfferCode);
      const url = res.data?.data?.hostedUrl;
      if (!url) {
        toast.error("Could not start Coinbase payment");
        setPaying(false);
        return;
      }
      window.location.href = url;
    } catch (err) {
      toast.error(err.response?.data?.message || "Coinbase error");
      setPaying(false);
    }
  };

  const onSelect = (methodId) => {
    if (paying) return;
    setSelectedMethod(methodId);
    if (methodId === 1) startRazorpay();
    else if (methodId === 2) startPaypal();
    else if (methodId === 4) startCoinbase();
  };

  const methodLabel = (m) => {
    if (m.name) return m.name;
    if (m.id === 1) return "Razorpay";
    if (m.id === 2) return "PayPal";
    if (m.id === 3) return "Stripe";
    if (m.id === 4) return "Coinbase";
    return "Payment";
  };

  const pricing = checkout?.pricing;
  const pkg = checkout?.package;

  if (loading) {
    return (
      <div className="checkout-page">
        <div className="container-fluid checkout-container">
          <p className="text-center text-muted py-5">Loading payment options…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container-fluid checkout-container">
          <div className="payment-checkout-method">
            <CheckoutSteps activeStep={3} />

            <div className="payment-checkout-method1">
              <div className="paymentmessage">
                <h5>Payment</h5>
                <span>All transactions are secure and encrypted.</span>
              </div>

              {pricing && pkg && (
                <div className="checkout-payment-summary">
                  <div className="cart-item">
                    <span className="item-name">{pkg.pname}</span>
                    <span className="item-price">$ {pricing.basePrice}</span>
                  </div>
                  {pricing.discountAmount > 0 && (
                    <div className="cart-item">
                      <span className="item-name">
                        Discount{pricing.couponCode ? ` (${pricing.couponCode})` : ""}
                      </span>
                      <span className="item-price discount">$ {pricing.discountAmount}</span>
                    </div>
                  )}
                  <div className="total-amount checkout-payment-total">
                    <span className="item-total">Amount to pay</span>
                    <span className="total-price">$ {pricing.grandTotal}</span>
                  </div>
                </div>
              )}

              {methods.length === 0 && (
                <p className="text-muted">No payment methods are enabled. Contact support.</p>
              )}

              {methods.map((m) => (
                <div key={m.id} className="paymentlinks">
                  <div className="form-group">
                    <label className="payment-option-label">
                      <input
                        type="radio"
                        name="payment"
                        className="payments_button"
                        checked={selectedMethod === m.id}
                        disabled={paying}
                        onChange={() => onSelect(m.id)}
                      />
                      <span className="payment-label-text">{methodLabel(m)}</span>
                      <PaymentLogo methodId={m.id} name={methodLabel(m)} />
                    </label>
                  </div>
                </div>
              ))}

              {selectedMethod === 3 && methods.some((m) => m.id === 3) && (
                <CheckoutStripeSection
                  token={token}
                  appliedOfferCode={appliedOfferCode}
                  paying={paying}
                  setPaying={setPaying}
                  onSuccess={(paymentId) =>
                    navigate(`/checkout/success/${paymentId || "done"}`, { replace: true })
                  }
                  onFailed={() => navigate("/checkout/failed", { replace: true })}
                />
              )}

              <div className="package-checkout-btn">
                <button
                  type="button"
                  className="go-back"
                  onClick={() =>
                    navigate(`/checkout/${token}`, {
                      state: { offer_code: appliedOfferCode }
                    })
                  }
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
