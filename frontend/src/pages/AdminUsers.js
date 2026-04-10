import React, { useEffect, useState } from "react";
import "./AdminUsers.css";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://localhost:5000/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch users");
      }

      setUsers(data);
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusChange = async (userId, currentStatus) => {
    try {
      setActionLoadingId(userId);
      setError("");
      setMessage("");

      const response = await fetch(
        `http://localhost:5000/api/admin/users/${userId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isActive: !currentStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update user status");
      }

      setMessage(data.message || "User status updated successfully");

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user._id === userId
            ? { ...user, isActive: !currentStatus }
            : user
        )
      );
    } catch (err) {
      setError(err.message || "Failed to update user status");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="admin-users-page">
      <div className="admin-users-container">
        <div className="admin-users-header-row">
          <div>
            <h1 className="admin-users-heading">Admin User Management</h1>
            <p className="admin-users-subheading">
              View registered users and activate or deactivate accounts.
            </p>
          </div>

          <button onClick={fetchUsers} className="admin-users-refresh-button">
            Refresh
          </button>
        </div>

        {message && <div className="admin-users-success-box">{message}</div>}
        {error && <div className="admin-users-error-box">{error}</div>}

        {loading ? (
          <div className="admin-users-loading-box">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="admin-users-empty-box">No users found.</div>
        ) : (
          <div className="admin-users-table-wrapper">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span
                        className={`admin-users-role-badge ${
                          user.role === "admin"
                            ? "admin-users-admin-badge"
                            : "admin-users-customer-badge"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-users-status-badge ${
                          user.isActive
                            ? "admin-users-active-badge"
                            : "admin-users-inactive-badge"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleString()
                        : "-"}
                    </td>
                    <td>
                      <button
                        onClick={() =>
                          handleStatusChange(user._id, user.isActive)
                        }
                        disabled={actionLoadingId === user._id}
                        className={`admin-users-action-button ${
                          user.isActive
                            ? "admin-users-deactivate-button"
                            : "admin-users-activate-button"
                        } ${
                          actionLoadingId === user._id
                            ? "admin-users-disabled-button"
                            : ""
                        }`}
                      >
                        {actionLoadingId === user._id
                          ? "Updating..."
                          : user.isActive
                          ? "Deactivate"
                          : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;