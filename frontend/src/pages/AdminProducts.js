import React, { useEffect, useState, useCallback } from "react";
import "./AdminProducts.css";

const API = "http://localhost:5000";

function AdminProducts() {
  const token = localStorage.getItem("token");

  const [products, setProducts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [requestActionLoading, setRequestActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
  });

  const [imageFile, setImageFile] = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API}/api/admin/products`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch products");
      }

      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchRequests = useCallback(async () => {
    try {
      setRequestsLoading(true);
      setError("");

      const res = await fetch(`${API}/api/admin/product-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch product requests");
      }

      setRequests(data.requests || []);
    } catch (err) {
      setError(err.message || "Failed to load product requests");
    } finally {
      setRequestsLoading(false);
    }
  }, [token]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchProducts(), fetchRequests()]);
  }, [fetchProducts, fetchRequests]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0] || null);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
    });
    setImageFile(null);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const url = editingId
        ? `${API}/api/admin/products/${editingId}`
        : `${API}/api/admin/products`;

      const method = editingId ? "PUT" : "POST";

      const body = new FormData();
      body.append("name", formData.name);
      body.append("description", formData.description);
      body.append("price", formData.price);

      if (imageFile) {
        body.append("image", imageFile);
      }

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Product action failed");
      }

      setMessage(
        data.message ||
          (editingId
            ? "Product updated successfully"
            : "Product created successfully")
      );

      resetForm();
      fetchProducts();
    } catch (err) {
      setError(err.message || "Failed to save product");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product._id);
    setFormData({
      name: product.name || "",
      description: product.description || "",
      price: product.price ?? "",
    });
    setImageFile(null);
    setMessage("");
    setError("");
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this product?");
    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const res = await fetch(`${API}/api/admin/products/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete product");
      }

      setMessage(data.message || "Product deleted successfully");
      fetchProducts();
    } catch (err) {
      setError(err.message || "Failed to delete product");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewNoteChange = (requestId, value) => {
    setReviewNotes((prev) => ({
      ...prev,
      [requestId]: value,
    }));
  };

  const handleApproveRequest = async (requestId) => {
    try {
      setRequestActionLoading(true);
      setError("");
      setMessage("");

      const res = await fetch(`${API}/api/admin/product-requests/${requestId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reviewNote: reviewNotes[requestId] || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to approve request");
      }

      setMessage(data.message || "Request approved successfully");
      refreshAll();
    } catch (err) {
      setError(err.message || "Failed to approve request");
    } finally {
      setRequestActionLoading(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      setRequestActionLoading(true);
      setError("");
      setMessage("");

      const res = await fetch(`${API}/api/admin/product-requests/${requestId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reviewNote: reviewNotes[requestId] || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to reject request");
      }

      setMessage(data.message || "Request rejected successfully");
      refreshAll();
    } catch (err) {
      setError(err.message || "Failed to reject request");
    } finally {
      setRequestActionLoading(false);
    }
  };

  const pendingRequests = requests.filter((req) => req.status === "pending");
  const processedRequests = requests.filter((req) => req.status !== "pending");

  return (
    <div className="admin-products-page">
      <div className="admin-products-container">
        <div className="admin-products-header-row">
          <div>
            <h1 className="admin-products-heading">Admin Product Management</h1>
            <p className="admin-products-subheading">
              Create, update, delete products, and review sub-admin approval requests.
            </p>
          </div>

          <button className="admin-products-refresh-button" onClick={refreshAll}>
            Refresh
          </button>
        </div>

        {message && <div className="admin-products-success-box">{message}</div>}
        {error && <div className="admin-products-error-box">{error}</div>}

        <div className="admin-products-grid">
          <div className="admin-products-form-card">
            <h2>{editingId ? "Edit Product" : "Add New Product"}</h2>

            <form onSubmit={handleSubmit} className="admin-products-form">
              <input
                type="text"
                name="name"
                placeholder="Product Name"
                value={formData.name}
                onChange={handleChange}
                required
              />

              <textarea
                name="description"
                placeholder="Product Description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="4"
              />

              <input
                type="number"
                name="price"
                placeholder="Price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
              />

              <input
                type="file"
                name="image"
                accept="image/*"
                onChange={handleFileChange}
              />

              <div className="admin-products-form-actions">
                <button type="submit" disabled={actionLoading}>
                  {actionLoading
                    ? "Saving..."
                    : editingId
                    ? "Update Product"
                    : "Add Product"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    className="admin-products-cancel-button"
                    onClick={resetForm}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="admin-products-list-card">
            <h2>Products</h2>
            {loading ? (
              <div className="admin-products-loading-box">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="admin-products-empty-box">No products found.</div>
            ) : (
              <div className="admin-products-list">
                {products.map((product) => (
                  <div className="admin-products-item" key={product._id}>
                    <div className="admin-products-image-wrap">
                      {product.imagePath ? (
                        <img
                          src={`${API}${product.imagePath}?v=${product.updatedAt || ""}`}
                          alt={product.name}
                          className="admin-products-image"
                        />
                      ) : (
                        <div className="admin-products-image-placeholder">
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="admin-products-details">
                      <h3>{product.name}</h3>
                      <p>{product.description}</p>
                      <span>Rs. {product.price}</span>
                      {product.createdBy?.name && (
                        <small className="admin-products-owner">
                          Owner: {product.createdBy.name}
                        </small>
                      )}
                    </div>

                    <div className="admin-products-item-actions">
                      <button onClick={() => handleEdit(product)}>Edit</button>
                      <button
                        className="admin-products-delete-button"
                        onClick={() => handleDelete(product._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="admin-products-requests-card">
          <h2>Pending Product Requests</h2>

          {requestsLoading ? (
            <div className="admin-products-loading-box">Loading requests...</div>
          ) : pendingRequests.length === 0 ? (
            <div className="admin-products-empty-box">No pending product requests.</div>
          ) : (
            <div className="admin-products-request-list">
              {pendingRequests.map((request) => (
                <div className="admin-products-request-item" key={request._id}>
                  <div className="admin-products-request-header">
                    <div>
                      <h3>{request.name || request.productId?.name || "Unnamed Product"}</h3>
                      <p>
                        Type: <strong>{request.requestType}</strong>
                      </p>
                      <p>
                        Requested By:{" "}
                        <strong>
                          {request.requestedBy?.name || "Unknown"}{" "}
                          {request.requestedBy?.email
                            ? `(${request.requestedBy.email})`
                            : ""}
                        </strong>
                      </p>
                      <p>Status: {request.status}</p>
                    </div>

                    {request.imagePath && (
                      <div className="admin-products-request-image-wrap">
                        <img
                          src={`${API}${request.imagePath}`}
                          alt={request.name || "Request"}
                          className="admin-products-request-image"
                        />
                      </div>
                    )}
                  </div>

                  <div className="admin-products-request-body">
                    <p>
                      <strong>Description:</strong> {request.description || "-"}
                    </p>
                    <p>
                      <strong>Price:</strong>{" "}
                      {request.price !== undefined && request.price !== null
                        ? `Rs. ${request.price}`
                        : "-"}
                    </p>

                    <textarea
                      className="admin-products-request-note"
                      placeholder="Optional review note"
                      value={reviewNotes[request._id] || ""}
                      onChange={(e) =>
                        handleReviewNoteChange(request._id, e.target.value)
                      }
                      rows="3"
                    />

                    <div className="admin-products-request-actions">
                      <button
                        disabled={requestActionLoading}
                        onClick={() => handleApproveRequest(request._id)}
                      >
                        {requestActionLoading ? "Processing..." : "Approve"}
                      </button>
                      <button
                        disabled={requestActionLoading}
                        className="admin-products-delete-button"
                        onClick={() => handleRejectRequest(request._id)}
                      >
                        {requestActionLoading ? "Processing..." : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-products-requests-card">
          <h2>Processed Product Requests</h2>

          {requestsLoading ? (
            <div className="admin-products-loading-box">Loading requests...</div>
          ) : processedRequests.length === 0 ? (
            <div className="admin-products-empty-box">No processed product requests.</div>
          ) : (
            <div className="admin-products-request-list">
              {processedRequests.map((request) => (
                <div className="admin-products-request-item" key={request._id}>
                  <div className="admin-products-request-header">
                    <div>
                      <h3>{request.name || request.productId?.name || "Unnamed Product"}</h3>
                      <p>
                        Type: <strong>{request.requestType}</strong>
                      </p>
                      <p>
                        Requested By:{" "}
                        <strong>
                          {request.requestedBy?.name || "Unknown"}{" "}
                          {request.requestedBy?.email
                            ? `(${request.requestedBy.email})`
                            : ""}
                        </strong>
                      </p>
                      <p>
                        Status: <strong>{request.status}</strong>
                      </p>
                      <p>
                        Reviewed By:{" "}
                        <strong>{request.reviewedBy?.name || "-"}</strong>
                      </p>
                    </div>

                    {request.imagePath && (
                      <div className="admin-products-request-image-wrap">
                        <img
                          src={`${API}${request.imagePath}`}
                          alt={request.name || "Request"}
                          className="admin-products-request-image"
                        />
                      </div>
                    )}
                  </div>

                  <div className="admin-products-request-body">
                    <p>
                      <strong>Description:</strong> {request.description || "-"}
                    </p>
                    <p>
                      <strong>Price:</strong>{" "}
                      {request.price !== undefined && request.price !== null
                        ? `Rs. ${request.price}`
                        : "-"}
                    </p>
                    <p>
                      <strong>Review Note:</strong> {request.reviewNote || "-"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminProducts;