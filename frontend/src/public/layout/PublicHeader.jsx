import { Link, NavLink } from "react-router-dom";
import logo from "../../admin/assets/images/logo.svg";
import { isUserLoggedIn, userCanSubmitPr } from "../services/publicAuthApi";

function getUserDisplayName() {
  const first = localStorage.getItem("userFirstName") || "";
  const last = localStorage.getItem("userLastName") || "";
  const full = `${first} ${last}`.trim();
  return full || localStorage.getItem("userEmail") || "Account";
}

export default function PublicHeader() {
  const isAdminLoggedIn = Boolean(localStorage.getItem("token"));
  const isEndUserLoggedIn = isUserLoggedIn();
  const displayName = getUserDisplayName();
  const submitPrTo =
    isEndUserLoggedIn && userCanSubmitPr() ? "/Userdashboard/submit_pr" : "/pricing";

  return (
    <header className="public-header">
      <nav className="navbar navbar-expand-lg navbar-dark public-header__nav">
        <div className="container newsroom-container">
          <Link className="navbar-brand" to="/">
            <img src={logo} alt="ZEXPRWIRE" />
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#publicNav"
            aria-controls="publicNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="publicNav">
            <ul className="navbar-nav ms-auto align-items-lg-center public-header__links">
              <li className="nav-item">
                <NavLink to="/" className="nav-link" end>
                  Newsroom
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/pricing" className="nav-link">
                  Pricing
                </NavLink>
              </li>
              <li className="nav-item">
                {isAdminLoggedIn ? (
                  <a href="/admindashboard/manage_editorial" className="nav-link">
                    Support
                  </a>
                ) : isEndUserLoggedIn ? (
                  <Link to="/Userdashboard/support" className="nav-link">
                    Support
                  </Link>
                ) : (
                  <Link to="/sign_in" className="nav-link">
                    Support
                  </Link>
                )}
              </li>
              <li className="nav-item">
                {isEndUserLoggedIn ? (
                  <Link to="/Userdashboard/contact_us" className="nav-link">
                    Contact us
                  </Link>
                ) : (
                  <a href="https://zexprwire.com/contact/" className="nav-link" target="_blank" rel="noreferrer">
                    Contact us
                  </a>
                )}
              </li>

              {!isAdminLoggedIn && !isEndUserLoggedIn && (
                <>
                  <li className="nav-item">
                    <Link to="/sign_up" className="btn btn-outline-light btn-sm public-header__auth-btn">
                      Sign Up
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/sign_in" className="btn btn-outline-light btn-sm public-header__auth-btn">
                      Sign In
                    </Link>
                  </li>
                </>
              )}

              {isEndUserLoggedIn && !isAdminLoggedIn && (
                <>
                  <li className="nav-item">
                    <Link to={submitPrTo} className="btn btn-outline-light btn-sm public-header__submit-pr">
                      Submit PR
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/Userdashboard" className="nav-link public-header__user-name">
                      {displayName}
                    </Link>
                  </li>
                </>
              )}

              {isAdminLoggedIn && (
                <li className="nav-item">
                  <Link to="/admindashboard/manage_editorial" className="btn btn-outline-light btn-sm public-header__auth-btn">
                    Dashboard
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}
