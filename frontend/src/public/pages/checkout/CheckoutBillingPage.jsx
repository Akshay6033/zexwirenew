import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import CheckoutSteps from "../../components/checkout/CheckoutSteps";
import checkoutApi from "../../services/checkoutApi";
import { isUserLoggedIn } from "../../services/publicAuthApi";
import {
  clearStoredCoupon,
  getStoredCoupon,
  setStoredCoupon
} from "../../utils/checkoutCouponStorage";
import "../../styles/checkout.css";

export default function CheckoutBillingPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [couponInput, setCouponInput] = useState("");
  const [redemptionInput, setRedemptionInput] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (!isUserLoggedIn()) {
      navigate("/sign_in", { replace: true });
      return;
    }
    load();
  }, [token]);

  const load = async () => {
    setLoading(true);
    try {
      const stored = getStoredCoupon(token);
      const res = await checkoutApi.get(token, stored ? { coupon: stored } : undefined);
      const ctx = res.data?.data || null;
      setData(ctx);
      const appliedCode = ctx?.pricing?.couponCode || "";
      if (appliedCode) {
        setCouponInput(appliedCode);
        setStoredCoupon(token, appliedCode);
      } else {
        if (stored) clearStoredCoupon(token);
        setCouponInput("");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load checkout");
      navigate("/pricing", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const applyCoupon = async () => {
    if (!couponInput.trim()) {
      toast.error("Enter valid coupon code");
      return;
    }
    setApplyingCoupon(true);
    try {
      const code = couponInput.trim();
      const res = await checkoutApi.applyCoupon(token, code);
      setData(res.data?.data);
      setStoredCoupon(token, code);
      toast.success(res.data?.message || "Coupon applied");
    } catch (err) {
      clearStoredCoupon(token);
      toast.error(err.response?.data?.message || "Enter valid coupon code");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const redeemCode = async () => {
    if (!redemptionInput.trim()) return;
    if (hasCouponApplied) {
      toast.error("Remove the discount coupon before using a redemption code.");
      return;
    }
    setRedeeming(true);
    try {
      const res = await checkoutApi.redeemCode(
        token,
        redemptionInput.trim(),
        data?.pricing?.couponCode || couponInput.trim()
      );
      toast.success(res.data?.message);
      navigate("/Userdashboard", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not redeem code");
    } finally {
      setRedeeming(false);
    }
  };

  const proceedToPay = () => {
    const applied = data?.pricing?.couponCode || "";
    if (applied) setStoredCoupon(token, applied);
    else clearStoredCoupon(token);
    navigate(`/checkout/${token}/pay`, { state: { offer_code: applied } });
  };

  const clearCoupon = () => {
    clearStoredCoupon(token);
    setCouponInput("");
    load();
  };

  if (loading) {
    return (
      <div className="checkout-page">
        <div className="container-fluid checkout-container">
          <p className="text-center text-muted py-5">Loading checkout…</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { package: pkg, user, pricing } = data;
  const hasCouponApplied = Boolean(pricing?.couponCode) || (pricing?.discountAmount || 0) > 0;

  return (
    <div className="checkout-page checkout-page--billing">
      <div className="container-fluid checkout-container">
          <CheckoutSteps activeStep={2} />

          <div className="payment-checkout">
            <div className="payment-check-form">
              <div className="row checkout-row">
                  <div className="col-sm-4">
                    <h5>Choose Package</h5>
                    <div className="choose-free">
                      <div className="price-choose">
                        <h5>{pkg.pname}</h5>
                      </div>
                      <p>{pkg.package_validity} Days</p>
                    </div>

                    <div className="package-info">
                      <div className="package1">
                        <h5>Package Information</h5>
                        <div className="cart-item cart-item--meta">
                          <span className="item-name">
                            <b>Package Validity is :- {pkg.package_validity} Days</b>
                          </span>
                        </div>
                        <div className="cart-item cart-item--meta">
                          <span className="item-name">
                            <b>No of credits is :- {pkg.n_press_rel}</b>
                          </span>
                        </div>
                        <div className="cart-item">
                          <span className="item-name">{pkg.pname}</span>
                          <span className="item-price">$ {pricing.basePrice}</span>
                        </div>
                        <div className="cart-item">
                          <span className="item-name">Discount</span>
                          <span className="item-price discount">
                            {pricing.discountAmount > 0 ? `$ ${pricing.discountAmount}` : ""}
                          </span>
                        </div>
                      </div>
                      <div className="total-divider" />
                      <div className="total-amount">
                        <span className="item-total">Total</span>
                        <span className="total-price">$ {pricing.grandTotal}</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-sm-8 shipping-details">
                    <h5>Shipping Details</h5>
                    <div className="form-form1">
                      <h2>User Information</h2>
                      <div className="form2">
                        <div className="lable fg1">
                          <label>First Name</label>
                          <input type="text" className="form-control" value={user.first_name || ""} readOnly />
                        </div>
                        <div className="lable fg1">
                          <label>Last Name</label>
                          <input type="text" className="form-control" value={user.last_name || ""} readOnly />
                        </div>
                      </div>
                      <div className="form2">
                        <div className="lable fg1">
                          <label>Country</label>
                          <input type="text" className="form-control" value={user.iso_code || ""} readOnly />
                        </div>
                        <div className="lable fg1">
                          <label>Address</label>
                          <input type="text" className="form-control" value={user.location || ""} readOnly />
                        </div>
                      </div>
                      <div className="form2">
                        <div className="lable fg1">
                          <label>Mobile no.</label>
                          <input type="text" className="form-control" value={user.mobile || ""} readOnly />
                        </div>
                        <div className="lable fg1">
                          <label>Email</label>
                          <input type="text" className="form-control" value={user.email || ""} readOnly />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="payment-info col-sm-12">
                    <div className="form-group">
                      <label>Discount coupon (checkout only)</label>
                      <div className="promo" id="promo">
                        <input
                          type="text"
                          name="offer_code"
                          className="form-control"
                          placeholder="Enter valid coupon code"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          autoComplete="off"
                        />
                        <span>
                          <button
                            type="button"
                            className="ApplyCoupon"
                            onClick={applyCoupon}
                            disabled={applyingCoupon}
                          >
                            {applyingCoupon ? "…" : "Apply"}
                          </button>
                          {hasCouponApplied && (
                            <button type="button" className="ApplyCoupon checkout-clear-coupon" onClick={clearCoupon}>
                              Remove
                            </button>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Redemption code (grants package — no payment)</label>
                      {hasCouponApplied && (
                        <p className="checkout-field-hint">
                          Not available while a discount coupon is applied. Remove the coupon first, or proceed to pay.
                        </p>
                      )}
                      <div className="promo">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter redemption code"
                          value={redemptionInput}
                          onChange={(e) => setRedemptionInput(e.target.value.toUpperCase())}
                          autoComplete="off"
                          disabled={hasCouponApplied || redeeming}
                        />
                        <span>
                          <button
                            type="button"
                            className="ApplyCoupon"
                            onClick={redeemCode}
                            disabled={redeeming || hasCouponApplied}
                          >
                            {redeeming ? "…" : "Redeem"}
                          </button>
                        </span>
                      </div>
                    </div>

                    <div className="package-checkout-btn">
                      <button type="button" className="go-back" onClick={() => navigate("/pricing")}>
                        Go Back
                      </button>
                      <button type="button" className="proceed" onClick={proceedToPay}>
                        Proceed to Pay
                      </button>
                    </div>
                  </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
