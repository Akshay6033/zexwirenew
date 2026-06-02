const analyticsOverviewService = require("../services/analyticsOverviewService");
const analyticsPrService = require("../services/analyticsPrService");
const analyticsSalesModel = require("../models/analyticsSalesModel");
const analyticsSalesService = require("../services/analyticsSalesService");
const analyticsUsersModel = require("../models/analyticsUsersModel");
const analyticsUsersService = require("../services/analyticsUsersService");

exports.getOverview = async (req, res) => {
  try {
    const { start_date, end_date, mode } = req.query;
    const data = await analyticsOverviewService.buildOverview(start_date, end_date, mode);
    return res.json({ status: true, data });
  } catch (err) {
    console.error("getAnalyticsOverview", err);
    return res.status(500).json({ status: false, message: "Could not load analytics overview." });
  }
};

exports.getPr = async (req, res) => {
  try {
    const { start_date, end_date, mode } = req.query;
    const data = await analyticsPrService.buildPr(start_date, end_date, mode);
    return res.json({ status: true, data });
  } catch (err) {
    console.error("getAnalyticsPr", err);
    return res.status(500).json({ status: false, message: "Could not load PR analytics." });
  }
};

exports.getUsersSummary = async (req, res) => {
  try {
    const { start_date, end_date, mode } = req.query;
    const data = await analyticsUsersService.buildUsers(start_date, end_date, mode);
    return res.json({ status: true, data });
  } catch (err) {
    console.error("getUsersSummary", err);
    return res.status(500).json({ status: false, message: "Could not load users analytics." });
  }
};

exports.getUsersList = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const { start, end } = analyticsUsersService.parseRange(start_date, end_date);
    const paging = analyticsUsersService.parsePaging(req.query);
    const [recordsFiltered, rows] = await Promise.all([
      analyticsUsersModel.countUserPrSales(start, end, paging.search),
      analyticsUsersModel.getUserPrSalesPaged({
        start,
        end,
        search: paging.search,
        sortBy: paging.sortBy,
        sortOrder: paging.sortOrder,
        limit: paging.limit,
        offset: paging.offset
      })
    ]);
    return res.json({
      status: true,
      data: (rows || []).map((row, i) => ({
        sr_no: paging.start + i + 1,
        userid: row.userid,
        customer_name: (row.customer_name || "").trim() || "—",
        country_name: row.country_name || "—",
        pr_count: Number(row.pr_count || 0),
        total_amount: Number(row.total_amount || 0),
        payment_count: Number(row.payment_count || 0),
        signup_date: row.signup_date ? String(row.signup_date).slice(0, 10) : "—"
      })),
      meta: {
        recordsTotal: recordsFiltered,
        recordsFiltered,
        start: paging.start,
        length: paging.length,
        search: paging.search,
        sortBy: paging.sortBy,
        sortOrder: paging.sortOrder
      }
    });
  } catch (err) {
    console.error("getUsersList", err);
    return res.status(500).json({ status: false, message: "Could not load users list." });
  }
};

exports.getSalesSummary = async (req, res) => {
  try {
    const data = await analyticsSalesService.buildSalesSummary(req.query.start_date, req.query.end_date);
    return res.json({ status: true, data });
  } catch (err) {
    console.error("getSalesSummary", err);
    return res.status(500).json({ status: false, message: "Could not load sales summary." });
  }
};

async function pagedSalesList(req, res, countFn, listFn, mapRow) {
  try {
    const { start_date, end_date } = req.query;
    const { start, end } = analyticsSalesService.parseRange(start_date, end_date);
    const paging = analyticsSalesService.parsePaging(req.query);
    const paymentFilter = req.query.payment_filter;
    const recordsFiltered =
      paymentFilter !== undefined
        ? await countFn(start, end, paging.search, paymentFilter || "All")
        : await countFn(start, end, paging.search);
    const rows = await listFn({
      start,
      end,
      search: paging.search,
      sortBy: paging.sortBy,
      sortOrder: paging.sortOrder,
      limit: paging.limit,
      offset: paging.offset,
      ...(paymentFilter !== undefined ? { filter: paymentFilter || "All" } : {})
    });
    const meta = {
      recordsTotal: recordsFiltered,
      recordsFiltered,
      start: paging.start,
      length: paging.length,
      search: paging.search,
      sortBy: paging.sortBy,
      sortOrder: paging.sortOrder
    };
    return res.json({
      status: true,
      data: (rows || []).map((row, i) => mapRow(row, i, meta)),
      meta
    });
  } catch (err) {
    console.error("pagedSalesList", err);
    return res.status(500).json({ status: false, message: "Could not load sales data." });
  }
}

exports.getSalesPackages = (req, res) =>
  pagedSalesList(
    req,
    res,
    (s, e, search) => analyticsSalesModel.countPackagesSold(s, e, search),
    (opts) => analyticsSalesModel.getPackagesSoldPaged(opts),
    (row, i, meta) => ({
      sr_no: meta.start + i + 1,
      package_id: row.package_id,
      item_name: row.pname || "—",
      quantity_sold: Number(row.quantity || 0),
      total_amount: Number(row.total_amount || 0),
      average_price: Number(row.avg_price || 0),
      list_price: Number(row.list_price || 0)
    })
  );

exports.getSalesCustomers = (req, res) =>
  pagedSalesList(
    req,
    res,
    (s, e, search) => analyticsSalesModel.countCustomersSold(s, e, search),
    (opts) => analyticsSalesModel.getCustomersSoldPaged(opts),
    (row, i, meta) => ({
      sr_no: meta.start + i + 1,
      userid: row.userid,
      customer_name: (row.customer_name || "").trim() || "—",
      payment_count: Number(row.payment_count || 0),
      total_amount: Number(row.total_amount || 0)
    })
  );

exports.getSalesPayments = (req, res) =>
  pagedSalesList(
    req,
    res,
    (s, e, search, filter) => analyticsSalesModel.countPaymentsSold(s, e, filter, search),
    (opts) => analyticsSalesModel.getPaymentsSoldPaged(opts),
    (row, i, meta) => ({
      sr_no: meta.start + i + 1,
      userid: row.userid,
      customer_name: (row.customer_name || "").trim() || "—",
      transaction_id: row.payment_id || "—",
      payment_method: row.payment_method || "—",
      total_amount: Number(row.total_amount || 0),
      date_current: row.date_current
        ? String(row.date_current).slice(0, 10)
        : "—"
    })
  );

exports.getSalesPackageBuyers = async (req, res) => {
  try {
    const { package_id, start_date, end_date } = req.query;
    const packageId = parseInt(package_id, 10);
    if (!packageId) {
      return res.status(400).json({ status: false, message: "Invalid package." });
    }
    const { start, end } = analyticsSalesService.parseRange(start_date, end_date);
    const paging = analyticsSalesService.parsePaging(req.query);
    const recordsFiltered = await analyticsSalesModel.countPackageBuyers(
      packageId,
      start,
      end,
      paging.search
    );
    const rows = await analyticsSalesModel.getPackageBuyersPaged({
      packageId,
      start,
      end,
      search: paging.search,
      sortBy: paging.sortBy,
      sortOrder: paging.sortOrder,
      limit: paging.limit,
      offset: paging.offset
    });
    return res.json({
      status: true,
      data: (rows || []).map((row, i) => ({
        sr_no: paging.start + i + 1,
        userid: row.userid,
        user_name: (row.user_name || "").trim() || "—",
        buy_count: Number(row.buy_count || 0),
        date_current: row.date_current ? String(row.date_current).slice(0, 10) : "—"
      })),
      meta: {
        recordsTotal: recordsFiltered,
        recordsFiltered,
        start: paging.start,
        length: paging.length,
        search: paging.search,
        sortBy: paging.sortBy,
        sortOrder: paging.sortOrder,
        package_id: packageId
      }
    });
  } catch (err) {
    console.error("getSalesPackageBuyers", err);
    return res.status(500).json({ status: false, message: "Could not load package buyers." });
  }
};
