import { Link } from "react-router-dom";
import "../../styles/checkout.css";

export default function CheckoutFailedPage() {
  return (
    <div className="checkout-page">
      <div className="container-fluid checkout-container">
          <div className="checkout-failed-wrap">
            <h4>ZEXPRWIRE</h4>
            <div className="checkout-failed-icon" aria-hidden="true">
              !
            </div>
            <h6>Your payment process Failed. Please try again</h6>
            <Link to="/pricing" className="btn btn-primary">
              Buy Package
            </Link>
          </div>
      </div>
    </div>
  );
}
