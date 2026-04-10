import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AdminLogs.css";

const API = "http://localhost:5000";

function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        if (!token || !user || user.role !== "admin") {
          setError("Access denied. Admin only.");
          setLoading(false);
          return;
        }

        const res = await axios.get(`${API}/api/admin/logs`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setLogs(res.data.logs || []);
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load logs.");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [token, user]);

  if (loading) {
    return <div className="admin-logs-page"><p>Loading logs...</p></div>;
  }

  return (
    <div className="admin-logs-page">
      <h2>System Audit Logs</h2>

      {error && <p className="page-error">{error}</p>}

      {!error && logs.length === 0 && (
        <p className="empty-message">No logs found.</p>
      )}

      {!error && logs.length > 0 && (
        <div className="logs-table-wrapper">
          <table className="logs-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>User</th>
                <th>Role</th>
                <th>Target</th>
                <th>Details</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td>{log.action}</td>

                  <td>
                    {log.performedBy?.name || "Unknown"}
                    <br />
                    <small>{log.performedBy?.email || "-"}</small>
                  </td>

                  <td>{log.role}</td>

                  <td className="mono">{log.targetId || "-"}</td>

                  <td>{log.details || "-"}</td>

                  <td>
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminLogs;