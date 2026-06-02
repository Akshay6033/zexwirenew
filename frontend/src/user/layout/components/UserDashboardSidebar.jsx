import { NavLink } from "react-router-dom";
import logo from "../../assets/icons/logo.svg";
import iconDashboard from "../../assets/icons/Dashboard.svg";
import iconDashboardActive from "../../assets/icons/Dashboard1.svg";
import iconPr from "../../assets/icons/Press-Release.svg";
import iconPrActive from "../../assets/icons/Press-Release1.svg";
import iconCompany from "../../assets/icons/Company.svg";
import iconCompanyActive from "../../assets/icons/Company1.svg";
import iconGallery from "../../assets/icons/Gallery.svg";
import iconGalleryActive from "../../assets/icons/Gallery1.svg";
import iconPayment from "../../assets/icons/Payment-History.svg";
import iconPaymentActive from "../../assets/icons/Payment-History1.svg";
import iconNewsroom from "../../assets/icons/Newsroom.svg";
import iconNewsroomActive from "../../assets/icons/Newsroom1.svg";
import iconPricing from "../../assets/icons/Pricing.svg";
import iconPricingActive from "../../assets/icons/Pricing1.svg";
import iconSupport from "../../assets/icons/Support.svg";
import iconSupportActive from "../../assets/icons/Support1.svg";
import iconContact from "../../assets/icons/Contact-Us.svg";
import iconContactActive from "../../assets/icons/ContactUs1.svg";
import linesBg from "../../assets/icons/Lines.png";

const mainNav = [
  { to: "/Userdashboard", end: true, label: "Dashboard", icon: iconDashboard, iconActive: iconDashboardActive },
  { to: "/Userdashboard/pr", label: "PR Manager", icon: iconPr, iconActive: iconPrActive },
  { to: "/Userdashboard/sub_accounts", label: "Sub-accounts", icon: iconCompany, iconActive: iconCompanyActive },
  { to: "/Userdashboard/gallery", label: "Gallery", icon: iconGallery, iconActive: iconGalleryActive },
  { to: "/Userdashboard/payment_history", label: "Payment History", icon: iconPayment, iconActive: iconPaymentActive }
];

const secondaryNav = [
  { href: "/", label: "News room", icon: iconNewsroom, iconActive: iconNewsroomActive },
  { href: "/pricing", label: "Pricing", icon: iconPricing, iconActive: iconPricingActive },
  { to: "/Userdashboard/support", label: "Support", icon: iconSupport, iconActive: iconSupportActive },
  { to: "/Userdashboard/contact_us", label: "Contact Us", icon: iconContact, iconActive: iconContactActive }
];

function NavItem({ item }) {
  const linkClass = ({ isActive }) => (isActive ? "active" : "");
  const content = (
    <>
      <img className="img" src={item.icon} alt="" />
      <img className="img1" src={item.iconActive} alt="" />
      <span>{item.label}</span>
    </>
  );

  if (item.href) {
    return (
      <li>
        <a href={item.href}>{content}</a>
      </li>
    );
  }

  return (
    <li>
      <NavLink to={item.to} end={item.end} className={linkClass}>
        {content}
      </NavLink>
    </li>
  );
}

export default function UserDashboardSidebar() {
  return (
    <>
      <div id="logo">
        <NavLink to="/Userdashboard">
          <img src={logo} alt="ZEX PR WIRE" />
        </NavLink>
      </div>
      <nav id="left-menu">
        <ul>
          {mainNav.map((item) => (
            <NavItem key={item.label} item={item} />
          ))}
          <hr />
          {secondaryNav.map((item) => (
            <NavItem key={item.label} item={item} />
          ))}
        </ul>
        <div className="help">
          <p>Need help using the product?</p>
          <span>Click on the button below to get detailed informational videos on youtube.</span>
          <a href="https://www.youtube.com" target="_blank" rel="noreferrer">
            <button type="button">Learn More</button>
          </a>
        </div>
        <div className="lines">
          <img src={linesBg} alt="" />
        </div>
      </nav>
    </>
  );
}
