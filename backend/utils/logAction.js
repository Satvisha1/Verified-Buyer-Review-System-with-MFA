const AuditLog = require("../models/AuditLog");

const logAction = async ({
  action,
  performedBy,
  role,
  targetId,
  details,
}) => {
  try {
    await AuditLog.create({
      action,
      performedBy,
      role,
      targetId,
      details,
    });
  } catch (err) {
    console.error("Audit log error:", err.message);
  }
};

module.exports = logAction;