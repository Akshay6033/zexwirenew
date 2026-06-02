import { Link } from "react-router-dom";
import NewsletterStrip from "../components/NewsletterStrip";
import logo from "../assets/logo-blue.svg";

const PAYMENT_IMG = "https://pr.zexprwire.com/images_data/payment.png";

export default function AuthSiteFooter() {
  return (
    <>
      <NewsletterStrip className="auth-newsletter-strip" />

      <footer className="auth-ps-footer">
        <div className="container-fluid">
          <div className="row g-4">
            <div className="col-lg-4">
              <img src={logo} alt="ZEXPRWIRE" className="auth-ps-footer__logo" />
              <ul className="auth-ps-footer__contact list-unstyled">
                <li>
                  <a href="mailto:info@zexprwire.com">info@zexprwire.com</a>
                </li>
              </ul>
              <ul className="auth-ps-footer__social list-unstyled d-flex gap-2">
                <li>
                  <a href="https://www.facebook.com/zexprwire" target="_blank" rel="noreferrer" aria-label="Facebook">
                    f
                  </a>
                </li>
                <li>
                  <a href="https://twitter.com/zexprwire" target="_blank" rel="noreferrer" aria-label="Twitter">
                    t
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/company/zexprwire/about/"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="LinkedIn"
                  >
                    in
                  </a>
                </li>
                <li>
                  <a href="https://www.instagram.com/zexprwire/" target="_blank" rel="noreferrer" aria-label="Instagram">
                    i
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-lg-4">
              <h6>Useful Links</h6>
              <ul className="list-unstyled auth-ps-footer__links">
                <li>
                  <a href="https://zexprwire.com/about-us/" target="_blank" rel="noreferrer">
                    About us
                  </a>
                </li>
                <li>
                  <a href="https://zexprwire.com/contact/" target="_blank" rel="noreferrer">
                    Contact Us
                  </a>
                </li>
                <li>
                  <Link to="/pricing">PR Packages</Link>
                </li>
                <li>
                  <a href="https://zexprwire.com/free-press-release-templates/" target="_blank" rel="noreferrer">
                    Free PR Templates
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-lg-3">
              <img src={PAYMENT_IMG} alt="Payment methods" className="auth-ps-footer__payments w-100" />
            </div>
          </div>
        </div>
        <div className="auth-ps-footer__bottom">
          <p>
            Copyright {new Date().getFullYear()} © Zexprwire. All rights reserved.{" "}
            <a href="https://zexprwire.com/privacy-policy/" target="_blank" rel="noreferrer">
              Privacy Policy
            </a>{" "}
            |{" "}
            <a href="https://zexprwire.com/terms-of-service-for-zex-pr-wire/" target="_blank" rel="noreferrer">
              Terms and Conditions
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
