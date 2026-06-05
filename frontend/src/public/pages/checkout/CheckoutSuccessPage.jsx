import { Link, useParams } from "react-router-dom";
import CheckoutSteps from "../../components/checkout/CheckoutSteps";
import "../../styles/checkout.css";

export default function CheckoutSuccessPage() {
  const { paymentId } = useParams();

  return (
    <div className="checkout-page">
      <div className="container-fluid checkout-container">
          <CheckoutSteps activeStep={4} />

          <div className="payment-confirmation">
            <div className="checkout-success-icon" aria-hidden="true">
              ✓
            </div>
            <h5>Congratulations !</h5>
            <p className="order">Your order has been processed</p>
            {paymentId && paymentId !== "done" && (
              <h6 className="payment-id-line">
                Your Payment id is:- <b>{paymentId}</b>
              </h6>
            )}
            <Link to="/Userdashboard">
              <button type="button" className="success_dashboard">
                Dashboard
              </button>
            </Link>
          </div>
      </div>
    </div>
  );
}
