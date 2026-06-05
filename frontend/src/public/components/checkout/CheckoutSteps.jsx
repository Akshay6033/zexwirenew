const IMG_BASE = "/checkout-steps";

const STEPS = [
  {
    key: 1,
    label: "Browse Packages",
    sub: "Step 1",
    img: `${IMG_BASE}/brows-package.png`,
    imgActive: `${IMG_BASE}/brows-package1.png`
  },
  {
    key: 2,
    label: "Billing Info",
    sub: "Step 2",
    img: `${IMG_BASE}/billing-info.png`,
    imgActive: `${IMG_BASE}/billing-info1.png`
  },
  {
    key: 3,
    label: "Payment Methods",
    sub: "Step 3",
    img: `${IMG_BASE}/Payment-method.png`,
    imgActive: `${IMG_BASE}/Payment-method1.png`
  },
  {
    key: 4,
    label: "Confirmation",
    sub: "Step 4",
    img: `${IMG_BASE}/Sucessful.png`,
    imgActive: `${IMG_BASE}/Sucessful1.png`
  }
];

export default function CheckoutSteps({ activeStep = 2 }) {
  return (
    <div className="payment-steps">
      <ul className="paymet-step-list">
        {STEPS.map((step) => {
          const isCurrent = step.key === activeStep;
          return (
            <li key={step.key} className={`hover-img ${isCurrent ? "active" : ""}`}>
              <div className="step-icon-stack">
                <img src={step.img} alt="" className="step-icon step-icon--muted" />
                <img src={step.imgActive} alt="" className="step-icon img-top" />
              </div>
              <div className="step-heading">
                <span>{step.label}</span>
                <p>{step.sub}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
