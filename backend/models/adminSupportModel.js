const pool = require("../config/db").promise();

const QUERY_LABELS = {
  1: "Press Release Submission",
  2: "Customer Account/Support",
  3: "Product and services Enquiry",
  4: "Agency Preferred Program",
  5: "Business Partnership",
  6: "Editorial",
  7: "Others"
};

function buildListWhere(filters) {
  const clauses = [];
  const params = [];

  const tab = String(filters.tab || "all").toLowerCase();
  if (tab === "open") {
    clauses.push("ms.status = 1 AND ms.active = 1");
  } else if (tab === "closed") {
    clauses.push("(ms.status = 0 OR ms.active = 0)");
  }

  const search = String(filters.search || "").trim();
  if (search) {
    clauses.push("(ms.id LIKE ? OR ms.cname LIKE ? OR ms.subject LIKE ? OR ms.email LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  const dateCol = "COALESCE(ms.timestamp, ms.chatting_create_date)";
  if (filters.dateFrom) {
    clauses.push(`DATE(${dateCol}) >= ?`);
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    clauses.push(`DATE(${dateCol}) <= ?`);
    params.push(filters.dateTo);
  }

  // Extra status checkboxes only apply on "all" tab (open/closed tabs already filter above)
  if (tab === "all") {
    const statusOpen = filters.statusOpen !== false;
    const statusClosed = filters.statusClosed !== false;
    if (!statusOpen && !statusClosed) {
      clauses.push("1 = 0");
    } else if (statusOpen && !statusClosed) {
      clauses.push("ms.status = 1 AND ms.active = 1");
    } else if (!statusOpen && statusClosed) {
      clauses.push("(ms.status = 0 OR ms.active = 0)");
    }
  }

  const readFilters = filters.readFilters || [];
  if (readFilters.length) {
    const readParts = [];
    if (readFilters.includes("unread")) {
      readParts.push(`EXISTS (
        SELECT 1 FROM master_replay_message mrm
        WHERE mrm.support_id = ms.id AND mrm.view_flag = 1 AND mrm.user_id != 0
          AND mrm.active = 1 AND mrm.status = 1
      )`);
    }
    if (readFilters.includes("read")) {
      readParts.push(`NOT EXISTS (
        SELECT 1 FROM master_replay_message mrm
        WHERE mrm.support_id = ms.id AND mrm.view_flag = 1 AND mrm.user_id != 0
          AND mrm.active = 1 AND mrm.status = 1
      )`);
    }
    if (readParts.length) {
      clauses.push(`(${readParts.join(" OR ")})`);
    }
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return { where, params };
}

/** Tab card counts: date/search/read filters only (status comes from tab). */
exports.countTicketsByFilters = async (filters) => {
  const shared = {
    search: filters.search,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    readFilters: filters.readFilters || [],
    statusOpen: true,
    statusClosed: true
  };

  const countForTab = async (tab) => {
    const { where, params } = buildListWhere({ ...shared, tab });
    const [rows] = await pool.query(`SELECT COUNT(*) AS c FROM master_support ms ${where}`, params);
    return Number(rows[0]?.c) || 0;
  };

  const [all, open, closed] = await Promise.all([
    countForTab("all"),
    countForTab("open"),
    countForTab("closed")
  ]);

  return { all, open, closed };
};

exports.QUERY_LABELS = QUERY_LABELS;

exports.countOpenTickets = async () => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS c FROM master_support WHERE status = 1 AND active = 1"
  );
  return Number(rows[0]?.c) || 0;
};

exports.countClosedTickets = async () => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS c FROM master_support WHERE status = 0 OR active = 0"
  );
  return Number(rows[0]?.c) || 0;
};

exports.countAllTickets = async () => {
  const [rows] = await pool.query("SELECT COUNT(*) AS c FROM master_support");
  return Number(rows[0]?.c) || 0;
};

exports.getTotalUnreadCount = async () => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM master_replay_message mrm
     INNER JOIN master_support ms ON ms.id = mrm.support_id
     WHERE mrm.view_flag = 1 AND mrm.user_id != 0 AND mrm.active = 1 AND mrm.status = 1
       AND ms.active = 1 AND ms.status = 1`
  );
  return Number(rows[0]?.c) || 0;
};

exports.getNotificationSummary = async () => {
  const [rows] = await pool.query(
    `SELECT ms.id,
            (SELECT COUNT(*) FROM master_replay_message mrm
             WHERE mrm.support_id = ms.id AND mrm.view_flag = 1 AND mrm.user_id != 0
               AND mrm.active = 1 AND mrm.status = 1) AS unread_count
     FROM master_support ms
     WHERE ms.active = 1 AND ms.status = 1
     HAVING unread_count > 0
     ORDER BY ms.id DESC
     LIMIT 200`
  );
  return rows.map((r) => ({ id: r.id, count: Number(r.unread_count) || 0 }));
};

exports.listTickets = async (filters) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
  const offset = (page - 1) * limit;
  const { where, params } = buildListWhere(filters);

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM master_support ms ${where}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;

  const [rows] = await pool.query(
    `SELECT ms.id, ms.cname, ms.email, ms.mobile, ms.subject, ms.query, ms.user_id,
            ms.status, ms.active, ms.close_chat_user,
            COALESCE(ms.timestamp, ms.chatting_create_date) AS timestamp,
            (SELECT COUNT(*) FROM master_replay_message mrm
             WHERE mrm.support_id = ms.id AND mrm.view_flag = 1 AND mrm.user_id != 0
               AND mrm.active = 1 AND mrm.status = 1) AS unread_count
     FROM master_support ms
     ${where}
     ORDER BY ms.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return {
    rows: rows.map((r) => ({
      ...r,
      unread_count: Number(r.unread_count) || 0,
      query_label: QUERY_LABELS[Number(r.query)] || "Others"
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      rangeStart: total ? offset + 1 : 0,
      rangeEnd: Math.min(offset + limit, total)
    }
  };
};

exports.listTicketsSidebar = async (filters, currentId) => {
  const { where, params } = buildListWhere({ ...filters, tab: filters.tab || "all" });
  const [rows] = await pool.query(
    `SELECT ms.id, ms.cname, ms.subject, ms.status, ms.active, ms.timestamp,
            (SELECT COUNT(*) FROM master_replay_message mrm
             WHERE mrm.support_id = ms.id AND mrm.view_flag = 1 AND mrm.user_id != 0
               AND mrm.active = 1 AND mrm.status = 1) AS unread_count
     FROM master_support ms
     ${where}
     ORDER BY (ms.id = ?) DESC, ms.id DESC
     LIMIT 100`,
    [...params, Number(currentId) || 0]
  );
  return rows.map((r) => ({
    ...r,
    unread_count: Number(r.unread_count) || 0,
    is_active: Number(r.id) === Number(currentId)
  }));
};

exports.getTicketById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM master_support WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
};

exports.markUserMessagesRead = async (supportId) => {
  await pool.query(
    `UPDATE master_replay_message SET view_flag = 0
     WHERE support_id = ? AND user_id != 0`,
    [supportId]
  );
};

exports.getMessages = async (supportId) => {
  const [rows] = await pool.query(
    `SELECT mrm.*,
            COALESCE(mu.first_name, '') AS user_first_name,
            COALESCE(mu.last_name, '') AS user_last_name,
            COALESCE(an.username, '') AS admin_username
     FROM master_replay_message mrm
     LEFT JOIN master_user mu ON mu.id = mrm.user_id
     LEFT JOIN admin_newswire an ON an.id = mrm.admin_subadmin_id
     WHERE mrm.support_id = ?
     ORDER BY mrm.id ASC`,
    [supportId]
  );
  return rows;
};

exports.insertMessage = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO master_replay_message
      (support_id, user_id, admin_subadmin_id, subject, description, chatting_date_time,
       selectfile, view_flag, active, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
    [
      data.support_id,
      data.user_id || 0,
      data.admin_subadmin_id || 0,
      data.subject || "",
      data.description || "",
      data.chatting_date_time,
      data.selectfile || "[]",
      data.view_flag != null ? data.view_flag : 0
    ]
  );
  return result.insertId;
};

exports.createTicket = async (data) => {
  const now = new Date();
  const chattingDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const createDate = now.toISOString().slice(0, 10);

  const [result] = await pool.query(
    `INSERT INTO master_support
      (cname, email, mobile, countryCode, subject, description, chatting_date_time, chatting_create_date,
       query, user_id, status, active, close_chat_user)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0)`,
    [
      data.cname,
      data.email,
      data.mobile || "",
      data.countryCode || "",
      data.subject,
      data.description,
      chattingDate,
      createDate,
      data.query,
      data.user_id || 0
    ]
  );
  const ticketId = result.insertId;

  await exports.insertMessage({
    support_id: ticketId,
    user_id: data.user_id || 0,
    admin_subadmin_id: data.admin_subadmin_id || 0,
    subject: data.subject,
    description: data.description,
    chatting_date_time: chattingDate,
    selectfile: "[]",
    view_flag: 0
  });

  return ticketId;
};

exports.closeTicket = async (supportId) => {
  await pool.query("UPDATE master_support SET active = 0, status = 0 WHERE id = ?", [supportId]);
  await pool.query("UPDATE master_replay_message SET active = 0, status = 0 WHERE support_id = ?", [
    supportId
  ]);
};

exports.setCloseChatUser = async (supportId, closeChatUser) => {
  await pool.query("UPDATE master_support SET close_chat_user = ? WHERE id = ?", [
    closeChatUser,
    supportId
  ]);
};

exports.approveUserCloseRequest = async (supportId, supportRow, adminId) => {
  await pool.query("UPDATE master_support SET close_chat_user = 3, status = 0, active = 0 WHERE id = ?", [
    supportId
  ]);
  await exports.insertMessage({
    support_id: supportId,
    user_id: supportRow.user_id || 0,
    admin_subadmin_id: adminId,
    subject: supportRow.subject,
    description: "Support ticket has been closed. as per your request thank you !",
    chatting_date_time: formatChatDateTime(),
    selectfile: "[]",
    view_flag: 0
  });
  await pool.query("UPDATE master_replay_message SET active = 0, status = 0 WHERE support_id = ?", [
    supportId
  ]);
};

exports.declineUserCloseRequest = async (supportId, supportRow, adminId) => {
  await pool.query("UPDATE master_support SET close_chat_user = 2 WHERE id = ?", [supportId]);
  await exports.insertMessage({
    support_id: supportId,
    user_id: supportRow.user_id || 0,
    admin_subadmin_id: adminId,
    subject: supportRow.subject,
    description: "Support ticket has not been closed. for some resoan thank you !",
    chatting_date_time: formatChatDateTime(),
    selectfile: "[]",
    view_flag: 0
  });
};

exports.getCountryCodes = async () => {
  try {
    const [rows] = await pool.query(
      `SELECT country_code_id AS id,
              iso_code,
              country_code,
              TRIM(CONCAT(IFNULL(iso_code, ''), ' | ', IFNULL(country_code, ''))) AS label
       FROM country_code
       WHERE active = 1
       ORDER BY iso_code ASC`
    );
    return rows.map((r) => ({
      id: Number(r.id),
      iso_code: r.iso_code || "",
      country_code: r.country_code || "",
      label: String(r.label || `${r.iso_code || ""} | ${r.country_code || ""}`).trim()
    }));
  } catch {
    try {
      const [rows] = await pool.query(
        `SELECT id,
                country_name AS iso_code,
                phonecode AS country_code,
                TRIM(CONCAT(IFNULL(country_name, ''), ' | ', IFNULL(phonecode, ''))) AS label
         FROM master_country
         WHERE active = 1
         ORDER BY country_name ASC`
      );
      return rows.map((r) => ({
        id: Number(r.id),
        iso_code: r.iso_code || "",
        country_code: r.country_code || "",
        label: String(r.label || "").trim()
      }));
    } catch {
      return [];
    }
  }
};

exports.findUserIdByEmail = async (email) => {
  const [rows] = await pool.query(
    "SELECT id FROM master_user WHERE email = ? AND active != 2 LIMIT 1",
    [email]
  );
  return rows[0]?.id || 0;
};

function formatChatDateTime() {
  const now = new Date();
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

exports.formatChatDateTime = formatChatDateTime;
