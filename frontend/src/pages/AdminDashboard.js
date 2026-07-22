import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const API = "http://localhost:5000";

function AdminDashboard() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [processingOrderId, setProcessingOrderId] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || `Failed (${res.status})`);
      }

      setOrders(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to fetch orders");
    }
  }, [token]);

  useEffect(() => {
    if (!token || !user || user.role !== "admin") {
      navigate("/", { replace: true });
      return;
    }

    fetchOrders();
  }, [token, user, navigate, fetchOrders]);

  const completePayment = async (id) => {
    if (processingOrderId === id) return;

    setProcessingOrderId(id);

    try {
      const res = await fetch(`${API}/api/admin/complete-payment/${id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || `Failed (${res.status})`);
      }

      setOrders((prev) =>
        prev.map((o) => (o._id === id ? { ...o, paymentStatus: "completed" } : o))
      );
    } catch (err) {
      alert(err.message || "Failed to mark completed");
    } finally {
      setProcessingOrderId(null);
    }
  };

  const verifyPayment = async (id) => {
    if (processingOrderId === id) return;

    setProcessingOrderId(id);

    try {
      const res = await fetch(`${API}/api/admin/verify-payment/${id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || `Failed (${res.status})`);
      }

      setOrders((prev) =>
        prev.map((o) =>
          o._id === id
            ? { ...o, paymentStatus: "verified", deliveryCode: data.deliveryCode }
            : o
        )
      );
    } catch (err) {
      alert(err.message || "Failed to verify payment");
    } finally {
      setProcessingOrderId(null);
    }
  };

  const markDelivered = async (id) => {
    if (processingOrderId === id) return;

    setProcessingOrderId(id);

    try {
      const res = await fetch(`${API}/api/orders/update-delivery`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: id, status: "delivered" }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || `Failed (${res.status})`);
      }

      setOrders((prev) =>
        prev.map((o) =>
          o._id === id
            ? { ...o, deliveryStatus: "delivered", isDelivered: true }
            : o
        )
      );
    } catch (err) {
      alert(err.message || "Failed to mark delivered");
    } finally {
      setProcessingOrderId(null);
    }
  };

  return (
    <div className="admin">
      <div className="top">
        <h2>Admin Dashboard</h2>
        <button className="admin-dashboard-button" onClick={fetchOrders}>
          Refresh
        </button>
      </div>

      <div className="admin-dashboard-cards">
        <div
          className="admin-dashboard-card"
          onClick={() => navigate("/admin-users")}
        >
          <h3>User Management</h3>
          <p>View all users and activate or deactivate accounts</p>
        </div>

        <div
          className="admin-dashboard-card"
          onClick={() => navigate("/admin-reviews")}
        >
          <h3>Review Monitoring</h3>
          <p>View all submitted reviews for admin monitoring</p>
        </div>

        <div
          className="admin-dashboard-card"
          onClick={() => navigate("/admin-products")}
        >
          <h3>Product Management</h3>
          <p>Create, edit, and delete products with image</p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <table className="admin-dashboard-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Payment</th>
            <th>SDC</th>
            <th>Delivery</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {orders.map((o) => (
            <tr key={o._id}>
              <td className="mono">{o._id}</td>
              <td>{o.customerId?.email || "-"}</td>
              <td>{o.totalAmount ?? "-"}</td>
              <td>{o.paymentStatus || "pending"}</td>
              <td className="mono">{o.deliveryCode || "-"}</td>

              <td>
                {o.deliveryStatus === "delivered" || o.isDelivered ? (
                  <span>Delivered</span>
                ) : (
                  <span>{o.deliveryStatus || "pending"}</span>
                )}
              </td>

              <td>
                {o.paymentStatus === "pending" && (
                  <button
                    className="admin-dashboard-button"
                    onClick={() => completePayment(o._id)}
                    disabled={processingOrderId === o._id}
                  >
                    {processingOrderId === o._id ? "Processing..." : "Complete"}
                  </button>
                )}

                {o.paymentStatus === "completed" && (
                  <button
                    className="admin-dashboard-button"
                    onClick={() => verifyPayment(o._id)}
                    disabled={processingOrderId === o._id}
                  >
                    {processingOrderId === o._id ? "Processing..." : "Verify"}
                  </button>
                )}

                {o.paymentStatus === "verified" &&
                  (o.deliveryStatus === "delivered" || o.isDelivered ? (
                    <span>Done</span>
                  ) : (
                    <button
                      className="admin-dashboard-button"
                      onClick={() => markDelivered(o._id)}
                      disabled={processingOrderId === o._id}
                    >
                      {processingOrderId === o._id
                        ? "Processing..."
                        : "Mark Delivered"}
                    </button>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDashboard;