const adminSupportService = require("../services/adminSupportService");

function adminId(req) {
  return req.user?.id || req.user?.userId || 0;
}

exports.getMeta = async (_req, res) => {
  try {
    const data = await adminSupportService.getMeta();
    return res.json({ status: true, data });
  } catch (err) {
    console.error("getMeta support:", err);
    return res.status(500).json({ status: false, message: err.message || "Failed to load support meta" });
  }
};

exports.getNotifications = async (_req, res) => {
  try {
    const data = await adminSupportService.getNotifications();
    return res.json({ status: true, data });
  } catch (err) {
    console.error("getNotifications support:", err);
    return res.status(500).json({ status: false, message: err.message || "Failed to load notifications" });
  }
};

exports.listTickets = async (req, res) => {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search || req.query.q,
      tab: req.query.tab,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      statusOpen: req.query.statusOpen !== "false",
      statusClosed: req.query.statusClosed !== "false",
      readFilters: req.query.readFilters ? String(req.query.readFilters).split(",") : []
    };
    const data = await adminSupportService.listTickets(filters);
    return res.json({ status: true, data });
  } catch (err) {
    console.error("listTickets support:", err);
    return res.status(500).json({
      status: false,
      message: err.message || "Failed to load tickets"
    });
  }
};

exports.getTicket = async (req, res) => {
  try {
    const data = await adminSupportService.getTicketDetail(req.params.id, adminId(req));
    if (!data) return res.status(404).json({ status: false, message: "Ticket not found" });
    return res.json({ status: true, data });
  } catch (err) {
    console.error("getTicket support:", err);
    return res.status(500).json({ status: false, message: "Failed to load ticket" });
  }
};

exports.createTicket = async (req, res) => {
  try {
    const { email, subject, description } = req.body || {};
    if (!email?.trim() || !subject?.trim() || !description?.trim()) {
      return res.status(400).json({ status: false, message: "Email, subject and description are required." });
    }
    const data = await adminSupportService.createTicket(req.body, adminId(req));
    return res.json({ status: true, message: "Ticket created successfully", data });
  } catch (err) {
    console.error("createTicket support:", err);
    return res.status(500).json({ status: false, message: err.message || "Failed to create ticket" });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const description = req.body?.description || "";
    const fileName = req.file?.filename || null;
    if (!description.trim() && !fileName) {
      return res.status(400).json({ status: false, message: "Message or attachment is required." });
    }
    const data = await adminSupportService.sendMessage({
      ticketId,
      adminId: adminId(req),
      description,
      fileName
    });
    return res.json({ status: true, message: "Message sent", data });
  } catch (err) {
    console.error("sendMessage support:", err);
    return res.status(400).json({ status: false, message: err.message || "Failed to send message" });
  }
};

exports.resolveTicket = async (req, res) => {
  try {
    const note = String(req.body?.note || "").trim();
    if (!note) {
      return res.status(400).json({ status: false, message: "Resolution note is required." });
    }
    await adminSupportService.resolveTicket(req.params.id, adminId(req), note);
    return res.json({ status: true, message: "Ticket resolved successfully" });
  } catch (err) {
    console.error("resolveTicket support:", err);
    return res.status(400).json({ status: false, message: err.message || "Failed to resolve ticket" });
  }
};

exports.approveTicket = async (req, res) => {
  try {
    await adminSupportService.approveTicket(req.params.id, adminId(req));
    return res.json({ status: true, message: "Ticket approved and closed" });
  } catch (err) {
    console.error("approveTicket support:", err);
    return res.status(400).json({ status: false, message: err.message || "Failed to approve" });
  }
};

exports.declineTicket = async (req, res) => {
  try {
    const data = await adminSupportService.declineTicket(req.params.id, adminId(req));
    return res.json({ status: true, message: "Request declined", data });
  } catch (err) {
    console.error("declineTicket support:", err);
    return res.status(400).json({ status: false, message: err.message || "Failed to decline" });
  }
};
