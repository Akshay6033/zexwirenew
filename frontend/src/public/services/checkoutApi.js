import userApi from "../../user/services/userApi";

const checkoutApi = {
  start: (packageId) => userApi.post("/user/checkout/start", { package_id: packageId }),
  get: (token, params) => userApi.get(`/user/checkout/${token}`, { params }),
  applyCoupon: (token, offerCode) => userApi.post(`/user/checkout/${token}/coupon`, { offer_code: offerCode }),
  redeemCode: (token, codeName, offerCode) =>
    userApi.post(`/user/checkout/${token}/redeem`, {
      code_name: codeName,
      offer_code: offerCode || ""
    }),
  getPaymentMethods: (token, offerCode) =>
    userApi.post(`/user/checkout/${token}/payment-methods`, { offer_code: offerCode || "" }),
  createRazorpayOrder: (token, offerCode) =>
    userApi.post(`/user/checkout/${token}/razorpay/order`, { offer_code: offerCode || "" }),
  verifyRazorpay: (token, payload) => userApi.post(`/user/checkout/${token}/razorpay/verify`, payload),
  createPaypalOrder: (token, offerCode) =>
    userApi.post(`/user/checkout/${token}/paypal/create`, { offer_code: offerCode || "" }),
  capturePaypal: (token, params) => userApi.get(`/user/checkout/${token}/paypal/capture`, { params }),
  createStripeIntent: (token, offerCode) =>
    userApi.post(`/user/checkout/${token}/stripe/intent`, { offer_code: offerCode || "" }),
  confirmStripe: (token, payload) => userApi.post(`/user/checkout/${token}/stripe/confirm`, payload),
  createCoinbaseCharge: (token, offerCode) =>
    userApi.post(`/user/checkout/${token}/coinbase/create`, { offer_code: offerCode || "" }),
  completeCoinbase: (token, payload) =>
    userApi.post(`/user/checkout/${token}/coinbase/complete`, payload),
  cancelCoinbase: (token, payload) =>
    userApi.post(`/user/checkout/${token}/coinbase/cancel`, payload)
};

export default checkoutApi;
