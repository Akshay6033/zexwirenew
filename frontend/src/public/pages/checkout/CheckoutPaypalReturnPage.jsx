import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import checkoutApi from "../../services/checkoutApi";
import { getStoredCoupon } from "../../utils/checkoutCouponStorage";

export default function CheckoutPaypalReturnPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Completing PayPal payment…");

  useEffect(() => {
    // PayPal Orders v2 returns ?token=ORDER_ID&PayerID=...
    const paypalOrderId = searchParams.get("token");
    const payerId = searchParams.get("PayerID") || searchParams.get("PayerId");

    if (!paypalOrderId || !payerId) {
      navigate("/checkout/failed", { replace: true });
      return;
    }

    (async () => {
      try {
        const res = await checkoutApi.capturePaypal(token, {
          token: paypalOrderId,
          PayerID: payerId,
          offer_code: getStoredCoupon(token)
        });
        const id = res.data?.data?.paymentId;
        navigate(`/checkout/success/${id || "done"}`, { replace: true });
      } catch (err) {
        setMessage(err.response?.data?.message || "Payment could not be completed.");
        setTimeout(() => navigate("/checkout/failed", { replace: true }), 2500);
      }
    })();
  }, [token, searchParams, navigate]);

  return (
    <div className="checkout-page">
      <div className="container-fluid checkout-container text-center py-5">
        <p>{message}</p>
      </div>
    </div>
  );
}
