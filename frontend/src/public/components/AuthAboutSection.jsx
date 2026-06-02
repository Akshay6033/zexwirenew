import { Link } from "react-router-dom";
import logoBlue from "../assets/logo-blue.svg";
import { useNewsletterSubscribe } from "../hooks/useNewsletterSubscribe";

const FAQ_ITEMS = [
  { id: "faq1", title: "How to Create an Account on ZEX PR WIRE" },
  { id: "faq2", title: "Verify Your ZEX PR WIRE Account" },
  { id: "faq3", title: "How to Login on ZEX PR WIRE" },
  { id: "faq4", title: "How to Buy Packages on ZEX PR WIRE" },
  { id: "faq5", title: "How to Add Company Profile" },
  { id: "faq6", title: "How to Submit Press Release" },
  { id: "faq7", title: "How to Get Press Release Report" }
];

const QUICK_LINKS = [
  { label: "About Us", href: "https://zexprwire.com/about-us/" },
  { label: "Media Kit", href: "https://zexprwire.com/media-kit/" },
  { label: "Contact Us", href: "https://zexprwire.com/contact/" },
  { label: "PR Packages", href: "/pricing" },
  { label: "Free PR Templates", href: "https://zexprwire.com/free-press-release-templates/" }
];

const SUBMIT_PR_LINKS = [
  { label: "Forbes Press Release", href: "https://zexprwire.com/" },
  { label: "Zexprwire Press Release", href: "/" },
  { label: "MarketWatch Press Release", href: "https://zexprwire.com/" },
  { label: "Get Featured in Yahoo News", href: "https://zexprwire.com/" }
];

export default function AuthAboutSection() {
  const {
    email,
    setEmail,
    error: emailError,
    submitting,
    honeypot,
    setHoneypot,
    validate,
    submit: onSubscribe
  } = useNewsletterSubscribe();

  return (
    <section className="auth-about">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="auth-about__brand">
              <img src={logoBlue} alt="ZEXPRWIRE" />
              <h6>
                ZEX PR Wire offers massive Press Release, News, Authored Articles, Editorial services, geared at
                generating massive exposure for your unique project, business, or concept.
              </h6>
              <p>
                ZEX PR WIRE is a premium press release distribution provides end-to- end solutions to produce, optimize
                and target content and then distribute and measure results. Combining the world&apos;s largest
                multi-channel, multi-cultural content distribution and optimization network with comprehensive
                workflow tools and platforms, ZEX PR WIRE serves tens of thousands of clients from offices in the
                Americas, Europe, Middle East, Africa and Asia-Pacific regions.
              </p>
            </div>
            <div className="row g-4">
              <div className="col-sm-6">
                <div className="auth-about__links">
                  <h4>Quick Links</h4>
                  {QUICK_LINKS.map((item) =>
                    item.href.startsWith("/") ? (
                      <Link key={item.label} to={item.href}>
                        {item.label}
                      </Link>
                    ) : (
                      <a key={item.label} href={item.href} target="_blank" rel="noreferrer">
                        {item.label}
                      </a>
                    )
                  )}
                </div>
              </div>
              <div className="col-sm-6">
                <div className="auth-about__links">
                  <h4>Submit PR</h4>
                  {SUBMIT_PR_LINKS.map((item) => (
                    <a key={item.label} href={item.href} target="_blank" rel="noreferrer">
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-2 d-none d-lg-block" />
          <div className="col-lg-5">
            <div className="auth-about__faq">
              <h4>FAQs</h4>
              <div className="accordion auth-faq-accordion" id="authFaqAccordion">
                {FAQ_ITEMS.map((item, index) => (
                  <div className="accordion-item" key={item.id}>
                    <h2 className="accordion-header" id={`heading-${item.id}`}>
                      <button
                        className="accordion-button collapsed"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target={`#collapse-${item.id}`}
                        aria-expanded="false"
                        aria-controls={`collapse-${item.id}`}
                      >
                        {item.title}
                        <span className="auth-faq-arrow" aria-hidden="true">
                          ↗
                        </span>
                      </button>
                    </h2>
                    <div
                      id={`collapse-${item.id}`}
                      className="accordion-collapse collapse"
                      aria-labelledby={`heading-${item.id}`}
                      data-bs-parent="#authFaqAccordion"
                    >
                      <div className="accordion-body">
                        Step-by-step guidance for {item.title.toLowerCase()}. Contact support if you need help.
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="auth-about__newsletter">
              <h4>Subscribe to our Newsletter</h4>
              <form onSubmit={onSubscribe} noValidate>
                <div className="newsletter-strip__hp" aria-hidden="true">
                  <label htmlFor="about-newsletter-company">Company</label>
                  <input
                    type="text"
                    id="about-newsletter-company"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>
                <div className="auth-about__newsletter-row">
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) validate(e.target.value);
                    }}
                    onBlur={() => email && validate(email)}
                  />
                  <button type="submit" className="auth-about__subscribe-btn" disabled={submitting}>
                    {submitting ? "…" : "Subscribe"}
                  </button>
                </div>
                {emailError && <span className="auth-about__email-error">{emailError}</span>}
              </form>
              <div className="auth-about__contact-box">
                <div>
                  <p className="mb-0 small text-muted">Email</p>
                  <a href="mailto:info@zexprwire.com">info@zexprwire.com</a>
                </div>
                <div className="auth-about__social">
                  <a href="https://www.facebook.com/zexprwire" target="_blank" rel="noreferrer" aria-label="Facebook">
                    f
                  </a>
                  <a href="https://twitter.com/zexprwire" target="_blank" rel="noreferrer" aria-label="Twitter">
                    t
                  </a>
                  <a href="https://www.instagram.com/zexprwire/" target="_blank" rel="noreferrer" aria-label="Instagram">
                    i
                  </a>
                  <a
                    href="https://www.linkedin.com/company/zexprwire/about/"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="LinkedIn"
                  >
                    in
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
