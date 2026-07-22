import React, { useEffect, useState } from "react";
import "./SubAdminDashboard.css";

const API_BASE = "http://localhost:5000/api";
const BACKEND_BASE = "http://localhost:5000";

const parseJsonSafely = async (res) => {
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Server did not return valid JSON");
  }
};

function SubAdminDashboard() {
  const token = localStorage.getItem("token");

  const [activeTab, setActiveTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [approvedProducts, setApprovedProducts] = useState([]);
  const [productRequests, setProductRequests] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [processingOrderId, setProcessingOrderId] = useState(null);
  const [processingProductId, setProcessingProductId] = useState(null);
  const [creatingRequest, setCreatingRequest] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    price: "",
    image: null,
  });

  const [updateForms, setUpdateForms] = useState({});

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const changeTab = (tabName) => {
    setMessage("");
    setActiveTab(tabName);
  };

  const loadOverview = async () => {
    const res = await fetch(`${API_BASE}/sub-admin/overview`, {
      headers: authHeaders,
    });
    const data = await parseJsonSafely(res);

    if (!res.ok) {
      throw new Error(data.message || "Failed to load overview");
    }

    setOverview(data.overview);
  };

  const loadApprovedProducts = async () => {
    const res = await fetch(`${API_BASE}/sub-admin/approved-products`, {
      headers: authHeaders,
    });
    const data = await parseJsonSafely(res);

    if (!res.ok) {
      throw new Error(data.message || "Failed to load products");
    }

    setApprovedProducts(data.products || []);
  };

  const loadProductRequests = async () => {
    const res = await fetch(`${API_BASE}/sub-admin/product-requests`, {
      headers: authHeaders,
    });
    const data = await parseJsonSafely(res);

    if (!res.ok) {
      throw new Error(data.message || "Failed to load requests");
    }

    setProductRequests(data.requests || []);
  };

  const loadOrders = async () => {
    const res = await fetch(`${API_BASE}/sub-admin/orders`, {
      headers: authHeaders,
    });
    const data = await parseJsonSafely(res);

    if (!res.ok) {
      throw new Error(data.message || "Failed to load orders");
    }

    setOrders(data.orders || []);
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setMessage("");

      await Promise.all([
        loadOverview(),
        loadApprovedProducts(),
        loadProductRequests(),
        loadOrders(),
      ]);
    } catch (err) {
      setMessage(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  const handleCreateChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "image") {
      setCreateForm((prev) => ({
        ...prev,
        image: files?.[0] || null,
      }));
      return;
    }

    setCreateForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const submitCreateRequest = async (e) => {
    e.preventDefault();

    if (creatingRequest) return;
    setCreatingRequest(true);

    try {
      setMessage("");

      const formData = new FormData();
      formData.append("name", createForm.name);
      formData.append("description", createForm.description);
      formData.append("price", createForm.price);

      if (createForm.image) {
        formData.append("image", createForm.image);
      }

      const res = await fetch(`${API_BASE}/sub-admin/product-requests/create`, {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });

      const data = await parseJsonSafely(res);

      if (!res.ok) {
        throw new Error(data.message || "Failed to submit create request");
      }

      setCreateForm({
        name: "",
        description: "",
        price: "",
        image: null,
      });

      const fileInput = document.getElementById("subadmin-create-image");
      if (fileInput) {
        fileInput.value = "";
      }

      await loadOverview();
      await loadProductRequests();
      changeTab("requests");
    } catch (err) {
      setMessage(err.message || "Failed to submit create request");
    } finally {
      setCreatingRequest(false);
    }
  };

  const startEdit = (product) => {
    setMessage("");
    setUpdateForms((prev) => ({
      ...prev,
      [product._id]: {
        name: product.name,
        description: product.description,
        price: product.price,
        image: null,
        open: !prev[product._id]?.open,
      },
    }));
  };

  const handleUpdateFormChange = (productId, e) => {
    const { name, value, files } = e.target;

    setUpdateForms((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [name]: name === "image" ? files?.[0] || null : value,
      },
    }));
  };

  const submitUpdateRequest = async (productId) => {
    if (processingProductId === productId) return;
    setProcessingProductId(productId);

    try {
      const form = updateForms[productId];
      if (!form) return;

      setMessage("");

      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("description", form.description);
      formData.append("price", form.price);

      if (form.image) {
        formData.append("image", form.image);
      }

      const res = await fetch(
        `${API_BASE}/sub-admin/product-requests/update/${productId}`,
        {
          method: "POST",
          headers: authHeaders,
          body: formData,
        }
      );

      const data = await parseJsonSafely(res);

      if (!res.ok) {
        throw new Error(data.message || "Failed to submit update request");
      }

      await loadOverview();
      await loadProductRequests();

      setUpdateForms((prev) => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          open: false,
        },
      }));

      changeTab("requests");
    } catch (err) {
      setMessage(err.message || "Failed to submit update request");
    } finally {
      setProcessingProductId(null);
    }
  };

  const submitDeleteRequest = async (productId) => {
    if (processingProductId === productId) return;
    setProcessingProductId(productId);

    const ok = window.confirm(
      "Submit a delete request for this product? Admin approval is required."
    );
    if (!ok) {
      setProcessingProductId(null);
      return;
    }

    try {
      setMessage("");

      const res = await fetch(
        `${API_BASE}/sub-admin/product-requests/delete/${productId}`,
        {
          method: "POST",
          headers: authHeaders,
        }
      );

      const data = await parseJsonSafely(res);

      if (!res.ok) {
        throw new Error(data.message || "Failed to submit delete request");
      }

      await loadOverview();
      await loadProductRequests();
      changeTab("requests");
    } catch (err) {
      setMessage(err.message || "Failed to submit delete request");
    } finally {
      setProcessingProductId(null);
    }
  };

  const updateOrder = async (url, body = null, orderId = null) => {
    try {
      setMessage("");

      if (orderId) {
        setProcessingOrderId(orderId);
      }

      const res = await fetch(url, {
        method: "POST",
        headers: body
          ? {
              ...authHeaders,
              "Content-Type": "application/json",
            }
          : authHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await parseJsonSafely(res);

      if (!res.ok) {
        throw new Error(data.message || "Action failed");
      }

      if (data.order) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === data.order._id ? data.order : order
          )
        );
      }

      await loadOverview();
    } catch (err) {
      setMessage(err.message || "Action failed");
    } finally {
      if (orderId) {
        setProcessingOrderId(null);
      }
    }
  };

  return (
    <div className="subadmin-dashboard-page">
      <div className="subadmin-dashboard-container">
        <h1>Sub Admin Dashboard</h1>
        <p className="subadmin-subtext">
          Submit product requests, track approval status, and handle order operations.
        </p>

        {message && <div className="subadmin-message">{message}</div>}

        <div className="subadmin-tabs">
          <button
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => changeTab("overview")}
          >
            Overview
          </button>
          <button
            className={activeTab === "create" ? "active" : ""}
            onClick={() => changeTab("create")}
          >
            New Product Request
          </button>
          <button
            className={activeTab === "approved" ? "active" : ""}
            onClick={() => changeTab("approved")}
          >
            Approved Products
          </button>
          <button
            className={activeTab === "requests" ? "active" : ""}
            onClick={() => changeTab("requests")}
          >
            Request History
          </button>
          <button
            className={activeTab === "orders" ? "active" : ""}
            onClick={() => changeTab("orders")}
          >
            Order Verification
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {activeTab === "overview" && overview && (
              <div className="subadmin-card-grid">
                <div className="subadmin-card">
                  <h3>Approved Products</h3>
                  <p>{overview.ownedProductsCount}</p>
                </div>
                <div className="subadmin-card">
                  <h3>Pending Requests</h3>
                  <p>{overview.pendingRequestsCount}</p>
                </div>
                <div className="subadmin-card">
                  <h3>Relevant Orders</h3>
                  <p>{overview.relevantOrdersCount}</p>
                </div>
                <div className="subadmin-card">
                  <h3>Pending Payment</h3>
                  <p>{overview.pendingPaymentCount}</p>
                </div>
                <div className="subadmin-card">
                  <h3>Pending Delivery</h3>
                  <p>{overview.pendingDeliveryCount}</p>
                </div>
              </div>
            )}

            {activeTab === "create" && (
              <div className="subadmin-panel">
                <h2>Create Product Request</h2>
                <form onSubmit={submitCreateRequest} className="subadmin-form">
                  <label>Product Name</label>
                  <input
                    type="text"
                    name="name"
                    value={createForm.name}
                    onChange={handleCreateChange}
                    required
                  />

                  <label>Description</label>
                  <textarea
                    name="description"
                    rows="4"
                    value={createForm.description}
                    onChange={handleCreateChange}
                    required
                  />

                  <label>Price</label>
                  <input
                    type="number"
                    name="price"
                    value={createForm.price}
                    onChange={handleCreateChange}
                    required
                  />

                  <label>Image</label>
                  <input
                    id="subadmin-create-image"
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={handleCreateChange}
                  />

                  <button type="submit" disabled={creatingRequest}>
                    {creatingRequest ? "Submitting..." : "Submit for Approval"}
                  </button>
                </form>
              </div>
            )}

            {activeTab === "approved" && (
              <div className="subadmin-panel">
                <h2>Approved Products</h2>

                {approvedProducts.length === 0 ? (
                  <p>No approved products found.</p>
                ) : (
                  <div className="subadmin-product-list">
                    {approvedProducts.map((product) => (
                      <div key={product._id} className="subadmin-product-card">
                        <div className="subadmin-product-image-wrap">
                          {product.imagePath ? (
                            <img
                              src={`${BACKEND_BASE}${product.imagePath}`}
                              alt={product.name}
                              className="subadmin-product-image"
                            />
                          ) : (
                            <div className="subadmin-no-image">No Image</div>
                          )}
                        </div>

                        <div className="subadmin-product-info">
                          <h3>{product.name}</h3>
                          <p>{product.description}</p>
                          <strong>Rs. {product.price}</strong>

                          <div className="subadmin-action-row">
                            <button
                              type="button"
                              onClick={() => startEdit(product)}
                            >
                              {updateForms[product._id]?.open
                                ? "Close Update Form"
                                : "Request Update"}
                            </button>
                            <button
                              type="button"
                              className="danger"
                              disabled={processingProductId === product._id}
                              onClick={() => submitDeleteRequest(product._id)}
                            >
                              {processingProductId === product._id
                                ? "Submitting..."
                                : "Request Delete"}
                            </button>
                          </div>

                          {updateForms[product._id]?.open && (
                            <div className="subadmin-inline-form">
                              <input
                                type="text"
                                name="name"
                                value={updateForms[product._id]?.name || ""}
                                onChange={(e) =>
                                  handleUpdateFormChange(product._id, e)
                                }
                              />
                              <textarea
                                name="description"
                                rows="3"
                                value={updateForms[product._id]?.description || ""}
                                onChange={(e) =>
                                  handleUpdateFormChange(product._id, e)
                                }
                              />
                              <input
                                type="number"
                                name="price"
                                value={updateForms[product._id]?.price || ""}
                                onChange={(e) =>
                                  handleUpdateFormChange(product._id, e)
                                }
                              />
                              <input
                                type="file"
                                name="image"
                                accept="image/*"
                                onChange={(e) =>
                                  handleUpdateFormChange(product._id, e)
                                }
                              />
                              <button
                                type="button"
                                disabled={processingProductId === product._id}
                                onClick={() => submitUpdateRequest(product._id)}
                              >
                                {processingProductId === product._id
                                  ? "Submitting..."
                                  : "Submit Update Request"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "requests" && (
              <div className="subadmin-panel">
                <h2>Request History</h2>

                {productRequests.length === 0 ? (
                  <p>No requests submitted yet.</p>
                ) : (
                  <div className="subadmin-table-wrap">
                    <table className="subadmin-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Product</th>
                          <th>Status</th>
                          <th>Review Note</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productRequests.map((request) => (
                          <tr key={request._id}>
                            <td>{request.requestType}</td>
                            <td>{request.name || request.productId?.name || "-"}</td>
                            <td>{request.status}</td>
                            <td>{request.reviewNote || "-"}</td>
                            <td>{new Date(request.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "orders" && (
              <div className="subadmin-panel">
                <h2>Order Verification</h2>

                {orders.length === 0 ? (
                  <p>No relevant orders found.</p>
                ) : (
                  <div className="subadmin-table-wrap">
                    <table className="subadmin-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Customer</th>
                          <th>Payment</th>
                          <th>Delivery</th>
                          <th>Delivery Code</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order._id}>
                            <td>{order._id}</td>
                            <td>{order.customerId?.name || "Unknown"}</td>
                            <td>{order.paymentStatus}</td>
                            <td>{order.deliveryStatus}</td>
                            <td>{order.deliveryCode || "-"}</td>
                            <td>
                              <div className="subadmin-order-actions">
                                {order.paymentStatus === "pending" && (
                                  <button
                                    type="button"
                                    disabled={processingOrderId === order._id}
                                    onClick={() =>
                                      updateOrder(
                                        `${API_BASE}/sub-admin/orders/complete-payment/${order._id}`,
                                        null,
                                        order._id
                                      )
                                    }
                                  >
                                    {processingOrderId === order._id
                                      ? "Processing..."
                                      : "Complete Payment"}
                                  </button>
                                )}

                                {order.paymentStatus === "completed" && (
                                  <button
                                    type="button"
                                    disabled={processingOrderId === order._id}
                                    onClick={() =>
                                      updateOrder(
                                        `${API_BASE}/sub-admin/orders/verify-payment/${order._id}`,
                                        null,
                                        order._id
                                      )
                                    }
                                  >
                                    {processingOrderId === order._id
                                      ? "Processing..."
                                      : "Verify Payment"}
                                  </button>
                                )}

                                {order.paymentStatus === "verified" &&
                                  order.deliveryStatus === "pending" && (
                                    <button
                                      type="button"
                                      disabled={processingOrderId === order._id}
                                      onClick={() =>
                                        updateOrder(
                                          `${API_BASE}/sub-admin/orders/delivery-status/${order._id}`,
                                          { deliveryStatus: "shipped" },
                                          order._id
                                        )
                                      }
                                    >
                                      {processingOrderId === order._id
                                        ? "Processing..."
                                        : "Mark Shipped"}
                                    </button>
                                  )}

                                {order.paymentStatus === "verified" &&
                                  order.deliveryStatus === "shipped" && (
                                    <button
                                      type="button"
                                      disabled={processingOrderId === order._id}
                                      onClick={() =>
                                        updateOrder(
                                          `${API_BASE}/sub-admin/orders/delivery-status/${order._id}`,
                                          { deliveryStatus: "out_for_delivery" },
                                          order._id
                                        )
                                      }
                                    >
                                      {processingOrderId === order._id
                                        ? "Processing..."
                                        : "Out For Delivery"}
                                    </button>
                                  )}

                                {order.paymentStatus === "verified" &&
                                  order.deliveryStatus === "out_for_delivery" && (
                                    <button
                                      type="button"
                                      disabled={processingOrderId === order._id}
                                      onClick={() =>
                                        updateOrder(
                                          `${API_BASE}/sub-admin/orders/delivery-status/${order._id}`,
                                          { deliveryStatus: "delivered" },
                                          order._id
                                        )
                                      }
                                    >
                                      {processingOrderId === order._id
                                        ? "Processing..."
                                        : "Mark Delivered"}
                                    </button>
                                  )}

                                {order.paymentStatus === "verified" &&
                                  order.deliveryStatus === "delivered" && (
                                    <span className="subadmin-status-badge">
                                      Completed
                                    </span>
                                  )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SubAdminDashboard;