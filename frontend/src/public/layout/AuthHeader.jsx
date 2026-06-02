import { Link, useLocation } from "react-router-dom";
import { isUserLoggedIn } from "../services/publicAuthApi";
import logoBlue from "../assets/logo-blue.svg";

export default function AuthHeader() {
  const { pathname } = useLocation();
  const loggedIn = isUserLoggedIn();
  const firstName = localStorage.getItem("userFirstName") || "";
  const lastName = localStorage.getItem("userLastName") || "";
  const displayName = `${firstName} ${lastName}`.trim();

  return (
    <header className="auth-header2">
      <div className="container">
        <nav className="navbar navbar-expand-lg navbar-light auth-header2__nav">
          <Link className="navbar-brand auth-header2__brand" to="/">
            <img src={logoBlue} alt="ZEXPRWIRE" className="auth-header2__logo" width="160" height="64" />
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#authNavbar"
            aria-controls="authNavbar"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="authNavbar">
            <ul className="navbar-nav ms-auto align-items-lg-center">
              <li className="nav-item">
                <a href="https://zexprwire.com/about-us/" className="nav-link" target="_blank" rel="noreferrer">
                  About
                </a>
              </li>
              <li className="nav-item">
                <a
                  href="https://zexprwire.com/free-press-release-templates/"
                  className="nav-link"
                  target="_blank"
                  rel="noreferrer"
                >
                  PR Templates
                </a>
              </li>
              <li className="nav-item dropdown">
                <button
                  className="btn dropdown-toggle auth-header2__dropdown-btn"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Pricing
                </button>
                <ul className="dropdown-menu">
                  <li>
                    <Link className="dropdown-item" to="/pricing">
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/pricing/reseller">
                      Reseller
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/pricing/crypto">
                      Crypto
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/pricing/indian">
                      Indian PR
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/pricing/whitelabel">
                      White Label
                    </Link>
                  </li>
                </ul>
              </li>
              <li className="nav-item">
                <Link to={loggedIn ? "/" : "/sign_in"} className="nav-link">
                  Press Room
                </Link>
              </li>
              <li className="nav-item dropdown">
                <button
                  className="btn dropdown-toggle auth-header2__dropdown-btn"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Submit PR
                </button>
                <ul className="dropdown-menu">
                  <li>
                    <Link className="dropdown-item" to={loggedIn ? "/pricing" : "/sign_in"}>
                      Submit PR
                    </Link>
                  </li>
                </ul>
              </li>
              <li className="nav-item">
                <a href="https://zexprwire.com/contact/" className="nav-link" target="_blank" rel="noreferrer">
                  Contact
                </a>
              </li>
              <li className="nav-item">
                <a href="https://zexprwire.com/events/" className="nav-link" target="_blank" rel="noreferrer">
                  Events
                </a>
              </li>
              {!loggedIn && (
                <li className="nav-item">
                  <Link
                    to="/sign_up"
                    className={`nav-link auth-header2__sign-up ${pathname === "/sign_up" ? "is-active" : ""}`}
                  >
                    Sign Up
                  </Link>
                </li>
              )}
              <li className="nav-item">
                {!loggedIn ? (
                  <Link
                    to="/sign_in"
                    className={`nav-link auth-header2__sign-in ${pathname === "/sign_in" ? "is-active" : ""}`}
                  >
                    Sign In
                  </Link>
                ) : (
                  <Link to="/pricing" className="nav-link auth-header2__sign-in">
                    {displayName || "Dashboard"}
                  </Link>
                )}
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </header>
  );
}
