import NewsletterStrip from "../components/NewsletterStrip";

export default function PublicFooter() {
  return (
    <>
      <NewsletterStrip />

      <footer className="public-footer">
        <div className="container newsroom-container">
          <div className="row g-4">
            <div className="col-md-4">
              <h6>ZEXPRWIRE</h6>
              <p className="small mb-2">
                <a href="mailto:info@zexprwire.com">info@zexprwire.com</a>
              </p>
            </div>
            <div className="col-md-4">
              <h6>Useful Links</h6>
              <ul className="list-unstyled small">
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
                  <a href="https://zexprwire.com/pricing" target="_blank" rel="noreferrer">
                    PR Packages
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-md-4">
              <h6>Legal</h6>
              <ul className="list-unstyled small">
                <li>
                  <a href="https://zexprwire.com/privacy-policy/" target="_blank" rel="noreferrer">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="https://zexprwire.com/terms-of-service-for-zex-pr-w-wire/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Terms and Conditions
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-bottom text-center">
          Copyright {new Date().getFullYear()} © Zexprwire. All rights reserved.{" "}
          <a href="https://zexprwire.com/privacy-policy/" target="_blank" rel="noreferrer">
            Privacy Policy
          </a>{" "}
          |{" "}
          <a href="https://zexprwire.com/terms-of-service-for-zex-pr-wire/" target="_blank" rel="noreferrer">
            Terms and Conditions
          </a>
        </div>
      </footer>
    </>
  );
}
