const prefix = "checkout_coupon_";

export function getStoredCoupon(token) {
  if (!token) return "";
  try {
    return sessionStorage.getItem(`${prefix}${token}`) || "";
  } catch {
    return "";
  }
}

export function setStoredCoupon(token, code) {
  if (!token) return;
  try {
    const trimmed = String(code || "").trim();
    if (trimmed) sessionStorage.setItem(`${prefix}${token}`, trimmed);
    else sessionStorage.removeItem(`${prefix}${token}`);
  } catch {
    /* ignore */
  }
}

export function clearStoredCoupon(token) {
  setStoredCoupon(token, "");
}
