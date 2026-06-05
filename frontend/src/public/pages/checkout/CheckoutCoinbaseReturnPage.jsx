import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import checkoutApi from "../../services/checkoutApi";
import { getStoredCoupon } from "../../utils/checkoutCouponStorage";

const MAX_RETRIES = 8;
const RETRY_MS = 3000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function CheckoutCoinbaseReturnPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Completing Coinbase payment…");

  useEffect(() => {
    const oid = searchParams.get("oid");
    const cancelled = searchParams.get("cancel") === "1";

    if (!oid) {
      navigate("/checkout/failed", { replace: true });
      return;
    }

    if (cancelled) {
      (async () => {
        try {
          await checkoutApi.cancelCoinbase(token, { coinbase_order_id: oid });
        } catch {
          /* ignore */
        }
        navigate("/checkout/failed", { replace: true });
      })();
      return;
    }

    (async () => {
      const offerCode = getStoredCoupon(token);
      for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
        try {
          const res = await checkoutApi.completeCoinbase(token, {
            coinbase_order_id: oid,
            offer_code: offerCode
          });
          const id = res.data?.data?.paymentId;
          navigate(`/checkout/success/${id || "done"}`, { replace: true });
          return;
        } catch (err) {
          if (err.response?.data?.cancelled) {
            navigate("/checkout/failed", { replace: true });
            return;
          }
          if (err.response?.status === 202 || err.response?.data?.pending) {
            setMessage(
              `Waiting for blockchain confirmation… (${attempt + 1}/${MAX_RETRIES})`
            );
            if (attempt < MAX_RETRIES - 1) {
              await sleep(RETRY_MS);
              continue;
            }
          }
          setMessage(err.response?.data?.message || "Payment could not be completed.");
          setTimeout(() => navigate("/checkout/failed", { replace: true }), 2500);
          return;
        }
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
