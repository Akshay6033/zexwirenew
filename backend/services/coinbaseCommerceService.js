const COINBASE_API = "https://api.commerce.coinbase.com";
const API_VERSION = "2018-03-22";

function getApiKey() {
  return process.env.COINBASE_COMMERCE_API_KEY || "";
}

async function coinbaseRequest(path, { method = "GET", body = null } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Coinbase Commerce is not configured.");
  }

  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Cc-Api-Key": apiKey,
      "X-Cc-Version": API_VERSION
    }
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${COINBASE_API}${path}`, opts);
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || "Coinbase Commerce request failed.";
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function createCharge({ name, description, amountUsd, redirectUrl, cancelUrl }) {
  return coinbaseRequest("/charges/", {
    method: "POST",
    body: {
      name,
      description,
      local_price: {
        amount: String(amountUsd),
        currency: "USD"
      },
      pricing_type: "fixed_price",
      requested_info: ["email"],
      redirect_url: redirectUrl,
      cancel_url: cancelUrl
    }
  });
}

async function getCharge(chargeCode) {
  return coinbaseRequest(`/charges/${encodeURIComponent(chargeCode)}`);
}

module.exports = { createCharge, getCharge, getApiKey };
