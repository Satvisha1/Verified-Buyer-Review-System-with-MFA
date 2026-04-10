import React, { useEffect, useState } from "react";
import axios from "axios";
import "./MyOrders.css";

const API = "http://localhost:5000";

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        if (!token || !user) {
          setError("Please login first.");
          setLoading(false);
          return;
        }

        const res = await axios.get(`${API}/api/orders/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setOrders(res.data.orders || []);
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load orders.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [token, user]);

  if (loading) {
    return <div className="my-orders-page"><p>Loading orders...</p></div>;
  }

  return (
    <div className="my-orders-page">
      <h2>My Orders</h2>

      {error && <p className="page-error">{error}</p>}

      {!error && orders.length === 0 && (
        <p className="empty-message">No orders found.</p>
      )}

      {!error && orders.length > 0 && (
        <div className="orders-table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Product Name</th>
                <th>Payment Status</th>
                <th>Delivery Status</th>
                <th>Delivery Code (SDC)</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const productNames =
                  order.products?.map((p) => p.name).join(", ") || "N/A";

                return (
                  <tr key={order._id}>
                    <td>{order._id}</td>
                    <td>{productNames}</td>
                    <td>{order.paymentStatus || "pending"}</td>
                    <td>{order.deliveryStatus || "pending"}</td>
                    <td>{order.deliveryCode || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MyOrders;