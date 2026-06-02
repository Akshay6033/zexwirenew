/** In-memory rate limit for newsletter signups (per IP). */
const hitsByIp = new Map();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const MIN_SUBMIT_MS = 2500;

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function checkRateLimit(ip) {
  const now = Date.now();
  let record = hitsByIp.get(ip);
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + WINDOW_MS };
  }
  record.count += 1;
  hitsByIp.set(ip, record);
  return record.count <= MAX_PER_WINDOW;
}

async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token, remoteip: ip })
  });
  const data = await res.json();
  return Boolean(data.success);
}

/**
 * Returns null if OK, or { status, message } to send to client.
 */
async function validateNewsletterRequest(req) {
  const ip = getClientIp(req);
  const body = req.body || {};
  const email = String(body.email || "").trim();
  const honeypot = String(body.company || body.website || "").trim();
  const loadedAt = Number(body._ts);

  if (honeypot) {
    return { status: 400, message: "Could not subscribe." };
  }

  if (loadedAt && Number.isFinite(loadedAt)) {
    const elapsed = Date.now() - loadedAt;
    if (elapsed < MIN_SUBMIT_MS) {
      return { status: 400, message: "Could not subscribe." };
    }
  }

  if (!checkRateLimit(ip)) {
    return { status: 429, message: "Too many attempts. Please try again later." };
  }

  const turnstileRequired = Boolean(process.env.TURNSTILE_SECRET_KEY);
  if (turnstileRequired) {
    const ok = await verifyTurnstile(body.turnstileToken, ip);
    if (!ok) {
      return { status: 400, message: "Please complete the verification check." };
    }
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 400, message: "Please enter a valid email address." };
  }

  return null;
}

module.exports = { validateNewsletterRequest, getClientIp };
