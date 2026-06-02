const userModel = require("../models/userModel");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const PASSWORD_REGEX =
  /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/;

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function md5(value) {
  return crypto.createHash("md5").update(String(value || "")).digest("hex");
}

exports.getDeletedUsers = (req, res) => {
  const { start = "0", length = "10", search = "", sortBy = "id", sortOrder = "desc" } = req.query;
  const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
  const parsedLength = Math.min(Math.max(parseInt(length, 10) || 10, 1), 100);
  const searchTerm = String(search || "").trim();

  userModel.countDeletedUsers("", (totalErr, totalRows) => {
    if (totalErr) return res.status(500).json({ status: false, message: "Could not fetch deleted users count." });
    const recordsTotal = totalRows?.[0]?.total || 0;

    userModel.countDeletedUsers(searchTerm, (filteredErr, filteredRows) => {
      if (filteredErr) return res.status(500).json({ status: false, message: "Could not fetch filtered deleted users count." });
      const recordsFiltered = filteredRows?.[0]?.total || 0;

      userModel.getDeletedUsers(
        { search: searchTerm, sortBy, sortOrder, limit: parsedLength, offset: parsedStart },
        (listErr, rows) => {
          if (listErr) return res.status(500).json({ status: false, message: "Could not fetch deleted users." });
          return res.json({
            status: true,
            data: rows || [],
            meta: {
              recordsTotal,
              recordsFiltered,
              start: parsedStart,
              length: parsedLength,
              search: searchTerm,
              sortBy,
              sortOrder: String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc"
            }
          });
        }
      );
    });
  });
};

exports.getManageUserSummary = (req, res) => {
  userModel.getManageUserSummary((err, rows) => {
    if (err) return res.status(500).json({ status: false, message: "Could not fetch user summary." });
    return res.json({ status: true, data: rows?.[0] || { totalUsers: 0, activeThisMonth: 0, submittedPr: 0 } });
  });
};

exports.getUserMeta = (req, res) => {
  userModel.getCountries((err, countries) => {
    if (err) return res.status(500).json({ status: false, message: "Could not fetch user metadata." });
    userModel.getCountryCodesList((ccErr, countryCodes) => {
      if (ccErr) return res.status(500).json({ status: false, message: "Could not fetch dial codes." });
      return res.json({
        status: true,
        data: { countries: countries || [], countryCodes: countryCodes || [] }
      });
    });
  });
};

exports.getManageUsers = (req, res) => {
  const { start = "0", length = "10", search = "", sortBy = "id", sortOrder = "desc" } = req.query;
  const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
  const parsedLength = Math.min(Math.max(parseInt(length, 10) || 10, 1), 100);
  const searchTerm = String(search || "").trim();

  userModel.countManageUsers("", (totalErr, totalRows) => {
    if (totalErr) return res.status(500).json({ status: false, message: "Could not fetch users count." });
    const recordsTotal = totalRows?.[0]?.total || 0;

    userModel.countManageUsers(searchTerm, (filteredErr, filteredRows) => {
      if (filteredErr) return res.status(500).json({ status: false, message: "Could not fetch filtered users count." });
      const recordsFiltered = filteredRows?.[0]?.total || 0;

      userModel.getManageUsers(
        { search: searchTerm, sortBy, sortOrder, limit: parsedLength, offset: parsedStart },
        (listErr, rows) => {
          if (listErr) return res.status(500).json({ status: false, message: "Could not fetch users." });
          return res.json({
            status: true,
            data: rows || [],
            meta: {
              recordsTotal,
              recordsFiltered,
              start: parsedStart,
              length: parsedLength,
              search: searchTerm,
              sortBy,
              sortOrder: String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc"
            }
          });
        }
      );
    });
  });
};

exports.createUser = (req, res) => {
  const firstName = String(req.body.first_name || "").trim();
  const lastName = String(req.body.last_name || "").trim();
  const email = String(req.body.email || "").trim();
  const password = String(req.body.password || "");
  const location = String(req.body.location || "").trim();
  const country = Number(req.body.country || 0);
  const mobile = String(req.body.mobile || "").trim();
  const company_name = String(req.body.company_name || "").trim();
  const company_address = String(req.body.company_address || "").trim();
  const company_country = Number(req.body.company_country || 0);
  const company_website = String(req.body.company_website || "").trim();
  const any_other = String(req.body.any_other || "").trim();
  const countrycodeid = req.body.countrycodeid;

  if (!firstName || !lastName || !email || !password || !location || !country || !mobile) {
    return res.status(400).json({ status: false, message: "Required fields are missing." });
  }
  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      status: false,
      message:
        "Please set password 8 to 15 characters which contain at least one lowercase letter, one uppercase letter, one numeric digit, and one special character"
    });
  }

  userModel.getUserByEmail(email, 0, (findErr, rows) => {
    if (findErr) return res.status(500).json({ status: false, message: "Could not verify email availability." });
    if (rows?.length) return res.status(400).json({ status: false, message: "Email already exists." });

    userModel.createUser(
      {
        first_name: firstName,
        last_name: lastName,
        email,
        password: md5(password),
        location,
        country,
        mobile,
        company_name,
        company_address,
        company_country,
        company_website,
        any_other,
        countrycodeid
      },
      (insertErr) => {
        if (insertErr) return res.status(500).json({ status: false, message: "Could not add user." });
        return res.json({ status: true, message: "User added successfully" });
      }
    );
  });
};

exports.updateUser = (req, res) => {
  const userId = Number(req.params.id);
  const firstName = String(req.body.first_name || "").trim();
  const lastName = String(req.body.last_name || "").trim();
  const email = String(req.body.email || "").trim();
  const password = String(req.body.password || "");
  const location = String(req.body.location || "").trim();
  const country = Number(req.body.country || 0);
  const mobile = String(req.body.mobile || "").trim();
  const company_name = String(req.body.company_name || "").trim();
  const company_address = String(req.body.company_address || "").trim();
  const company_country = Number(req.body.company_country || 0);
  const company_website = String(req.body.company_website || "").trim();
  const any_other = String(req.body.any_other || "").trim();
  const countrycodeid = req.body.countrycodeid;

  if (!userId) return res.status(400).json({ status: false, message: "User id is required." });
  if (!firstName || !lastName || !email || !location || !country || !mobile) {
    return res.status(400).json({ status: false, message: "Required fields are missing." });
  }
  if (password && !PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      status: false,
      message:
        "Please set password 8 to 15 characters which contain at least one lowercase letter, one uppercase letter, one numeric digit, and one special character"
    });
  }

  const payload = {
    first_name: firstName,
    last_name: lastName,
    email,
    location,
    country,
    mobile,
    company_name,
    company_address,
    company_country,
    company_website,
    any_other,
    countrycodeid
  };

  userModel.getUserByEmail(email, userId, (findErr, rows) => {
    if (findErr) return res.status(500).json({ status: false, message: "Could not verify email availability." });
    if (rows?.length) return res.status(400).json({ status: false, message: "Email already exists." });

    userModel.getUserById(userId, (prevErr, prevRows) => {
      if (prevErr) return res.status(500).json({ status: false, message: "Could not load user." });
      const prev = prevRows?.[0];

      userModel.updateUser(userId, payload, (updateErr, result) => {
        if (updateErr) return res.status(500).json({ status: false, message: "Could not update user." });
        if (!result?.affectedRows) return res.status(404).json({ status: false, message: "User not found." });

        const nextCc = Number(payload.countrycodeid || 0) || 0;
        const prevCc = Number(prev?.countrycodeid || 0) || 0;
        const phoneChanged =
          prev && (String(prev.mobile || "") !== mobile || prevCc !== nextCc);

        const sendSuccess = () => {
          if (!password) return res.json({ status: true, message: "User updated successfully" });
          userModel.updateUserPassword(userId, md5(password), (passErr) => {
            if (passErr) {
              return res.status(500).json({ status: false, message: "User updated but password update failed." });
            }
            return res.json({ status: true, message: "User updated successfully" });
          });
        };

        if (phoneChanged) {
          userModel.runOptionalPhoneVerificationReset(userId, () => sendSuccess());
        } else {
          sendSuccess();
        }
      });
    });
  });
};

exports.updateUserStatus = (req, res) => {
  const userId = Number(req.params.id);
  const nextActive = Number(req.body.active) === 1 ? 1 : 0;
  if (!userId) return res.status(400).json({ status: false, message: "User id is required." });
  userModel.updateUserStatus(userId, nextActive, (err, result) => {
    if (err) return res.status(500).json({ status: false, message: "Could not update user status." });
    if (!result?.affectedRows) return res.status(404).json({ status: false, message: "User not found." });
    return res.json({ status: true, message: nextActive ? "User activated successfully" : "User deactivated successfully" });
  });
};

exports.deleteUserPermanently = (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) return res.status(400).json({ status: false, message: "User id is required." });
  userModel.deleteUserPermanently(userId, (err, result) => {
    if (err) return res.status(500).json({ status: false, message: "Could not delete user permanently." });
    if (!result?.affectedRows) return res.status(404).json({ status: false, message: "User not found." });
    return res.json({ status: true, message: "User deleted permanently" });
  });
};

exports.exportUsersCsv = (req, res) => {
  userModel.getManageUsersForExport((err, rows) => {
    if (err) return res.status(500).json({ status: false, message: "Could not export users." });
    const header = ["ID", "First Name", "Last Name", "Email", "Phone", "Status", "Created Date"];
    const body = (rows || []).map((item) => [
      item.id,
      item.first_name,
      item.last_name,
      item.email,
      item.mobile,
      Number(item.active) === 1 ? "Active" : "Deactive",
      item.created_date
    ]);
    const csv = [header, ...body].map((line) => line.map(csvEscape).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=\"users-${Date.now()}.csv\"`);
    return res.send(csv);
  });
};

exports.getManageStaff = (req, res) => {
  const { start = "0", length = "10", search = "", sortBy = "id", sortOrder = "desc" } = req.query;
  const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
  const parsedLength = Math.min(Math.max(parseInt(length, 10) || 10, 1), 100);
  const searchTerm = String(search || "").trim();

  userModel.countManageStaff("", (totalErr, totalRows) => {
    if (totalErr) return res.status(500).json({ status: false, message: "Could not fetch staff count." });
    const recordsTotal = totalRows?.[0]?.total || 0;

    userModel.countManageStaff(searchTerm, (filteredErr, filteredRows) => {
      if (filteredErr) return res.status(500).json({ status: false, message: "Could not fetch filtered staff count." });
      const recordsFiltered = filteredRows?.[0]?.total || 0;

      userModel.getManageStaff(
        { search: searchTerm, sortBy, sortOrder, limit: parsedLength, offset: parsedStart },
        (listErr, rows) => {
          if (listErr) return res.status(500).json({ status: false, message: "Could not fetch staff list." });
          return res.json({
            status: true,
            data: rows || [],
            meta: {
              recordsTotal,
              recordsFiltered,
              start: parsedStart,
              length: parsedLength,
              search: searchTerm,
              sortBy,
              sortOrder: String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc"
            }
          });
        }
      );
    });
  });
};

exports.createStaff = async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim();
    const phone = String(req.body.phone || "").trim();
    const password = String(req.body.password || "");

    if (!username || !email || !phone || !password) {
      return res.status(400).json({ status: false, message: "Required fields are missing." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ status: false, message: "Please enter a valid email." });
    }
    if (phone.length < 10 || phone.length > 13) {
      return res.status(400).json({ status: false, message: "Phone should be 10 to 13 digits." });
    }
    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        status: false,
        message:
          "Please set password 8 to 15 characters which contain at least one lowercase letter, one uppercase letter, one numeric digit, and one special character"
      });
    }

    userModel.getStaffByEmailOrUsername(email, username, 0, async (findErr, rows) => {
      if (findErr) return res.status(500).json({ status: false, message: "Could not verify staff uniqueness." });
      if (rows?.length) {
        const match = rows[0];
        if (String(match.email || "").toLowerCase() === email.toLowerCase()) {
          return res.status(400).json({ status: false, message: "Email already exists." });
        }
        return res.status(400).json({ status: false, message: "Username already exists." });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      userModel.createStaff({ username, email, phone, password: hashedPassword, user_type: 1 }, (insertErr) => {
        if (insertErr) return res.status(500).json({ status: false, message: "Could not add staff." });
        return res.json({ status: true, message: "Staff added successfully" });
      });
    });
  } catch {
    return res.status(500).json({ status: false, message: "Could not add staff." });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const staffId = Number(req.params.id);
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim();
    const phone = String(req.body.phone || "").trim();
    const password = String(req.body.password || "");
    if (!staffId) return res.status(400).json({ status: false, message: "Staff id is required." });
    if (!username || !email || !phone) {
      return res.status(400).json({ status: false, message: "Required fields are missing." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ status: false, message: "Please enter a valid email." });
    }
    if (phone.length < 10 || phone.length > 13) {
      return res.status(400).json({ status: false, message: "Phone should be 10 to 13 digits." });
    }
    if (password && !PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        status: false,
        message:
          "Please set password 8 to 15 characters which contain at least one lowercase letter, one uppercase letter, one numeric digit, and one special character"
      });
    }

    userModel.getStaffByEmailOrUsername(email, username, staffId, async (findErr, rows) => {
      if (findErr) return res.status(500).json({ status: false, message: "Could not verify staff uniqueness." });
      if (rows?.length) {
        const match = rows[0];
        if (String(match.email || "").toLowerCase() === email.toLowerCase()) {
          return res.status(400).json({ status: false, message: "Email already exists." });
        }
        return res.status(400).json({ status: false, message: "Username already exists." });
      }

      userModel.updateStaff(staffId, { username, email, phone }, async (updateErr, result) => {
        if (updateErr) return res.status(500).json({ status: false, message: "Could not update staff." });
        if (!result?.affectedRows) return res.status(404).json({ status: false, message: "Staff not found." });
        if (!password) return res.json({ status: true, message: "Staff updated successfully" });
        const hashedPassword = await bcrypt.hash(password, 10);
        userModel.updateStaffPassword(staffId, hashedPassword, (passErr) => {
          if (passErr) return res.status(500).json({ status: false, message: "Staff updated but password update failed." });
          return res.json({ status: true, message: "Staff updated successfully" });
        });
      });
    });
  } catch {
    return res.status(500).json({ status: false, message: "Could not update staff." });
  }
};

exports.updateStaffStatus = (req, res) => {
  const staffId = Number(req.params.id);
  const nextActive = Number(req.body.active) === 1 ? 1 : 0;
  if (!staffId) return res.status(400).json({ status: false, message: "Staff id is required." });
  userModel.updateStaffStatus(staffId, nextActive, (err, result) => {
    if (err) return res.status(500).json({ status: false, message: "Could not update staff status." });
    if (!result?.affectedRows) return res.status(404).json({ status: false, message: "Staff not found." });
    return res.json({ status: true, message: nextActive ? "Staff activated successfully" : "Staff deactivated successfully" });
  });
};

exports.deleteStaffPermanently = (req, res) => {
  const staffId = Number(req.params.id);
  if (!staffId) return res.status(400).json({ status: false, message: "Staff id is required." });
  userModel.deleteStaffPermanently(staffId, (err, result) => {
    if (err) return res.status(500).json({ status: false, message: "Could not delete staff permanently." });
    if (!result?.affectedRows) return res.status(404).json({ status: false, message: "Staff not found." });
    return res.json({ status: true, message: "Staff deleted permanently" });
  });
};

exports.getCompanyMeta = (req, res) => {
  userModel.getCompanyMeta((err, data) => {
    if (err) return res.status(500).json({ status: false, message: "Could not fetch company metadata." });
    return res.json({ status: true, data: data || { countries: [], staff: [] } });
  });
};

exports.getManageCompanies = (req, res) => {
  const { start = "0", length = "10", search = "", sortBy = "id", sortOrder = "desc" } = req.query;
  const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
  const parsedLength = Math.min(Math.max(parseInt(length, 10) || 10, 1), 100);
  const searchTerm = String(search || "").trim();

  userModel.countManageCompanies("", (totalErr, totalRows) => {
    if (totalErr) return res.status(500).json({ status: false, message: "Could not fetch company count." });
    const recordsTotal = totalRows?.[0]?.total || 0;

    userModel.countManageCompanies(searchTerm, (filteredErr, filteredRows) => {
      if (filteredErr) return res.status(500).json({ status: false, message: "Could not fetch filtered company count." });
      const recordsFiltered = filteredRows?.[0]?.total || 0;

      userModel.getManageCompanies(
        { search: searchTerm, sortBy, sortOrder, limit: parsedLength, offset: parsedStart },
        (listErr, rows) => {
          if (listErr) return res.status(500).json({ status: false, message: "Could not fetch company list." });
          return res.json({
            status: true,
            data: rows || [],
            meta: {
              recordsTotal,
              recordsFiltered,
              start: parsedStart,
              length: parsedLength,
              search: searchTerm,
              sortBy,
              sortOrder: String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc"
            }
          });
        }
      );
    });
  });
};

exports.createCompany = (req, res) => {
  const payload = {
    created_by: Number(req.body.created_by || 0),
    cname: String(req.body.cname || "").trim(),
    address: String(req.body.address || "").trim(),
    contact_person: String(req.body.contact_person || "").trim(),
    mobile: String(req.body.mobile || "").trim(),
    email: String(req.body.email || "").trim(),
    website: String(req.body.website || "").trim(),
    state: String(req.body.state || "").trim(),
    country: Number(req.body.country || 0)
  };
  if (!payload.cname || !payload.contact_person || !payload.mobile || !payload.email || !payload.website || !payload.state || !payload.country) {
    return res.status(400).json({ status: false, message: "Required fields are missing." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return res.status(400).json({ status: false, message: "Please enter a valid email." });
  }
  if (payload.mobile.length < 10 || payload.mobile.length > 13) {
    return res.status(400).json({ status: false, message: "Phone should be 10 to 13 digits." });
  }

  userModel.getCompanyByNameOrEmail(payload.cname, payload.email, 0, (findErr, rows) => {
    if (findErr) return res.status(500).json({ status: false, message: "Could not verify company uniqueness." });
    if (rows?.length) {
      const match = rows[0];
      if (String(match.email || "").toLowerCase() === payload.email.toLowerCase()) {
        return res.status(400).json({ status: false, message: "Company email already exists." });
      }
      return res.status(400).json({ status: false, message: "Company name already exists." });
    }
    userModel.createCompany(payload, (insertErr) => {
      if (insertErr) return res.status(500).json({ status: false, message: "Could not add company." });
      return res.json({ status: true, message: "Company added successfully" });
    });
  });
};

exports.updateCompany = (req, res) => {
  const companyId = Number(req.params.id);
  const payload = {
    created_by: Number(req.body.created_by || 0),
    cname: String(req.body.cname || "").trim(),
    address: String(req.body.address || "").trim(),
    contact_person: String(req.body.contact_person || "").trim(),
    mobile: String(req.body.mobile || "").trim(),
    email: String(req.body.email || "").trim(),
    website: String(req.body.website || "").trim(),
    state: String(req.body.state || "").trim(),
    country: Number(req.body.country || 0)
  };
  if (!companyId) return res.status(400).json({ status: false, message: "Company id is required." });
  if (!payload.cname || !payload.contact_person || !payload.mobile || !payload.email || !payload.website || !payload.state || !payload.country) {
    return res.status(400).json({ status: false, message: "Required fields are missing." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return res.status(400).json({ status: false, message: "Please enter a valid email." });
  }
  if (payload.mobile.length < 10 || payload.mobile.length > 13) {
    return res.status(400).json({ status: false, message: "Phone should be 10 to 13 digits." });
  }

  userModel.getCompanyByNameOrEmail(payload.cname, payload.email, companyId, (findErr, rows) => {
    if (findErr) return res.status(500).json({ status: false, message: "Could not verify company uniqueness." });
    if (rows?.length) {
      const match = rows[0];
      if (String(match.email || "").toLowerCase() === payload.email.toLowerCase()) {
        return res.status(400).json({ status: false, message: "Company email already exists." });
      }
      return res.status(400).json({ status: false, message: "Company name already exists." });
    }
    userModel.updateCompany(companyId, payload, (updateErr, result) => {
      if (updateErr) return res.status(500).json({ status: false, message: "Could not update company." });
      if (!result?.affectedRows) return res.status(404).json({ status: false, message: "Company not found." });
      return res.json({ status: true, message: "Company updated successfully" });
    });
  });
};

exports.updateCompanyStatus = (req, res) => {
  const companyId = Number(req.params.id);
  const nextActive = Number(req.body.active) === 1 ? 1 : 0;
  if (!companyId) return res.status(400).json({ status: false, message: "Company id is required." });
  userModel.updateCompanyStatus(companyId, nextActive, (err, result) => {
    if (err) return res.status(500).json({ status: false, message: "Could not update company status." });
    if (!result?.affectedRows) return res.status(404).json({ status: false, message: "Company not found." });
    return res.json({ status: true, message: nextActive ? "Company activated successfully" : "Company deactivated successfully" });
  });
};

exports.deleteCompanyPermanently = (req, res) => {
  const companyId = Number(req.params.id);
  if (!companyId) return res.status(400).json({ status: false, message: "Company id is required." });
  userModel.deleteCompanyPermanently(companyId, (err, result) => {
    if (err) return res.status(500).json({ status: false, message: "Could not delete company permanently." });
    if (!result?.affectedRows) return res.status(404).json({ status: false, message: "Company not found." });
    return res.json({ status: true, message: "Company deleted permanently" });
  });
};
