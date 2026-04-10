import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AdminReviews.css";

const API = "http://localhost:5000";

function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const fetchAllReviews = async () => {
    try {
      setLoading(true);

      if (!token || !user || user.role !== "admin") {
        setError("Access denied. Admin only.");
        setReviews([]);
        return;
      }

      const res = await axios.get(`${API}/api/admin/reviews`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setReviews(res.data.reviews || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load reviews.");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="admin-reviews-page">
      <div className="admin-reviews-container">
        <div className="admin-reviews-header">
          <div>
            <h2 className="admin-reviews-heading">Admin Review Monitoring</h2>
            <p className="admin-reviews-subheading">
              Review all submitted feedback and verify blockchain and IPFS proof details.
            </p>
          </div>

          <button
            className="admin-reviews-refresh-button"
            onClick={fetchAllReviews}
            type="button"
          >
            Refresh
          </button>
        </div>

        {loading && (
          <div className="admin-reviews-loading-box">Loading reviews...</div>
        )}

        {!loading && error && (
          <div className="admin-reviews-error-box">{error}</div>
        )}

        {!loading && !error && reviews.length === 0 && (
          <div className="admin-reviews-empty-box">No reviews found.</div>
        )}

        {!loading && !error && reviews.length > 0 && (
          <div className="admin-reviews-grid">
            {reviews.map((review) => (
              <div className="admin-review-card" key={review._id}>
                <div className="admin-review-top">
                  <div>
                    <h3>{review.productName || review.productId}</h3>
                    <p className="admin-review-user">
                      {review.customerId?.name || "Unknown"}{" "}
                      <span>({review.customerId?.email || "-"})</span>
                    </p>
                  </div>

                  {review.onChainStored ? (
                    <span className="admin-review-status verified">
                      Blockchain Verified
                    </span>
                  ) : (
                    <span className="admin-review-status pending">
                      Not Verified On-Chain
                    </span>
                  )}
                </div>

                <div className="admin-review-basic">
                  <p>
                    <strong>Rating:</strong> {review.rating} / 5
                  </p>
                  <p>
                    <strong>Comment:</strong> {review.comment}
                  </p>
                  <p>
                    <strong>Submitted:</strong>{" "}
                    {review.createdAt
                      ? new Date(review.createdAt).toLocaleString()
                      : "-"}
                  </p>
                </div>

                <div className="admin-proof-box">
                  <p className="admin-proof-title">Blockchain / IPFS Proof</p>

                  <p>
                    <strong>Stored on Blockchain:</strong>{" "}
                    {review.onChainStored ? "Yes" : "No"}
                  </p>

                  <p>
                    <strong>Review Key:</strong> {review.reviewKey || "-"}
                  </p>

                  <p>
                    <strong>Review Hash:</strong>{" "}
                    <span className="mono-cell">{review.reviewHash || "-"}</span>
                  </p>

                  <p>
                    <strong>IPFS CID:</strong>{" "}
                    <span className="mono-cell">{review.ipfsCid || "-"}</span>
                  </p>

                  {review.ipfsUrl ? (
                    <p>
                      <strong>IPFS Record:</strong>{" "}
                      <a
                        href={review.ipfsUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open IPFS Record
                      </a>
                    </p>
                  ) : (
                    <p>
                      <strong>IPFS Record:</strong> -
                    </p>
                  )}

                  {review.txHash ? (
                    <p>
                      <strong>Transaction Hash:</strong>{" "}
                      <a
                        href={`https://sepolia.etherscan.io/tx/${review.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Transaction
                      </a>
                    </p>
                  ) : (
                    <p>
                      <strong>Transaction Hash:</strong> -
                    </p>
                  )}

                  {review.contractAddress ? (
                    <p>
                      <strong>Contract Address:</strong>{" "}
                      <a
                        href={`https://sepolia.etherscan.io/address/${review.contractAddress}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Contract
                      </a>
                    </p>
                  ) : (
                    <p>
                      <strong>Contract Address:</strong> -
                    </p>
                  )}

                  <p>
                    <strong>Block Number:</strong> {review.blockNumber || "-"}
                  </p>

                  <p>
                    <strong>Network:</strong> {review.blockchainNetwork || "-"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminReviews;