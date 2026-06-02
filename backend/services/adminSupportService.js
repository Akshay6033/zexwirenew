const adminSupportModel = require("../models/adminSupportModel");

function parseFiles(selectfile) {
  if (!selectfile) return [];
  try {
    const parsed = JSON.parse(selectfile);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function mapMessage(row) {
  const isUser = Number(row.user_id) > 0;
  const senderName = isUser
    ? `${row.user_first_name || ""} ${row.user_last_name || ""}`.trim() || "User"
    : row.admin_username || "Admin";
  return {
    id: row.id,
    support_id: row.support_id,
    description: row.description,
    subject: row.subject,
    chatting_date_time: row.chatting_date_time,
    is_user: isUser,
    sender_name: senderName,
    files: parseFiles(row.selectfile).map((f) => ({
      name: f,
      url: `/uploads/chats/${f}`
    }))
  };
}

function mapTicket(row) {
  const isOpen = Number(row.status) === 1 && Number(row.active) === 1;
  return {
    id: row.id,
    cname: row.cname,
    email: row.email,
    mobile: row.mobile,
    subject: row.subject,
    query: row.query,
    query_label: row.query_label || adminSupportModel.QUERY_LABELS[Number(row.query)] || "Others",
    user_id: row.user_id,
    status: isOpen ? "open" : "closed",
    status_code: Number(row.status),
    active: Number(row.active),
    timestamp: row.timestamp,
    unread_count: Number(row.unread_count) || 0,
    close_chat_user: Number(row.close_chat_user) || 0
  };
}

exports.getMeta = async () => {
  const [allCount, openCount, closedCount, totalUnread, countries] = await Promise.all([
    adminSupportModel.countAllTickets(),
    adminSupportModel.countOpenTickets(),
    adminSupportModel.countClosedTickets(),
    adminSupportModel.getTotalUnreadCount(),
    adminSupportModel.getCountryCodes()
  ]);
  return {
    counts: {
      all: allCount,
      open: openCount,
      closed: closedCount
    },
    open_count: openCount,
    total_unread: totalUnread,
    query_options: Object.entries(adminSupportModel.QUERY_LABELS).map(([value, label]) => ({
      value: Number(value),
      label
    })),
    countries,
    countryCodes: countries
  };
};

exports.getNotifications = async () => {
  const [items, totalUnread] = await Promise.all([
    adminSupportModel.getNotificationSummary(),
    adminSupportModel.getTotalUnreadCount()
  ]);
  return { total_unread: totalUnread, tickets: items };
};

exports.listTickets = async (filters) => {
  const [result, counts] = await Promise.all([
    adminSupportModel.listTickets(filters),
    adminSupportModel.countTicketsByFilters(filters)
  ]);
  return {
    tickets: result.rows.map(mapTicket),
    pagination: result.pagination,
    counts
  };
};

exports.getTicketDetail = async (ticketId, adminId, markRead = true) => {
  const ticket = await adminSupportModel.getTicketById(ticketId);
  if (!ticket) return null;

  if (markRead) {
    await adminSupportModel.markUserMessagesRead(ticketId);
  }

  const messages = await adminSupportModel.getMessages(ticketId);
  const mapped = mapTicket({
    ...ticket,
    unread_count: 0,
    query_label: adminSupportModel.QUERY_LABELS[Number(ticket.query)]
  });

  return {
    ticket: mapped,
    messages: messages.map(mapMessage),
    show_approve_decline: Number(ticket.close_chat_user) === 1
  };
};

exports.sendMessage = async ({ ticketId, adminId, description, fileName }) => {
  const ticket = await adminSupportModel.getTicketById(ticketId);
  if (!ticket) throw new Error("Ticket not found");
  if (Number(ticket.status) === 0 || Number(ticket.active) === 0) {
    throw new Error("This ticket is closed");
  }

  const files = fileName ? [fileName] : [];
  await adminSupportModel.insertMessage({
    support_id: ticketId,
    user_id: 0,
    admin_subadmin_id: adminId,
    subject: ticket.subject,
    description: description || "",
    chatting_date_time: adminSupportModel.formatChatDateTime(),
    selectfile: JSON.stringify(files),
    view_flag: 0
  });
  return exports.getTicketDetail(ticketId, adminId, false);
};

exports.createTicket = async (body, adminId) => {
  let userId = Number(body.user_id) || 0;
  if (!userId && body.email) {
    userId = await adminSupportModel.findUserIdByEmail(body.email);
  }
  const cname = body.cname || body.name || body.email?.split("@")[0] || "Guest";

  const ticketId = await adminSupportModel.createTicket({
    cname,
    email: body.email || "",
    mobile: body.mobile || body.phone || "",
    countryCode: body.countryCode || body.country_code || "",
    subject: body.subject,
    description: body.description,
    query: Number(body.query) || 7,
    user_id: userId,
    admin_subadmin_id: adminId
  });

  return exports.getTicketDetail(ticketId, adminId, false);
};

exports.resolveTicket = async (ticketId, adminId, resolutionNote) => {
  const ticket = await adminSupportModel.getTicketById(ticketId);
  if (!ticket) throw new Error("Ticket not found");

  if (resolutionNote?.trim()) {
    await adminSupportModel.insertMessage({
      support_id: ticketId,
      user_id: 0,
      admin_subadmin_id: adminId,
      subject: ticket.subject,
      description: resolutionNote.trim(),
      chatting_date_time: adminSupportModel.formatChatDateTime(),
      selectfile: "[]",
      view_flag: 0
    });
  }

  await adminSupportModel.closeTicket(ticketId);
  return { success: true };
};

exports.approveTicket = async (ticketId, adminId) => {
  const ticket = await adminSupportModel.getTicketById(ticketId);
  if (!ticket) throw new Error("Ticket not found");
  await adminSupportModel.approveUserCloseRequest(ticketId, ticket, adminId);
  return { success: true };
};

exports.declineTicket = async (ticketId, adminId) => {
  const ticket = await adminSupportModel.getTicketById(ticketId);
  if (!ticket) throw new Error("Ticket not found");
  await adminSupportModel.declineUserCloseRequest(ticketId, ticket, adminId);
  return exports.getTicketDetail(ticketId, adminId, false);
};
