import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./MyReviews.css";

const API = "http://localhost:5000";

function MyReviews() {
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [rewardPoints, setRewardPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    const fetchReviewData = async () => {
      try {
        if (!token || !user) {
          setError("Please login first.");
          setLoading(false);
          return;
        }

        const [reviewsRes, rewardsRes] = await Promise.all([
          axios.get(`${API}/api/reviews/my`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          axios.get(`${API}/api/auth/me/rewards`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        setReviews(reviewsRes.data.reviews || []);
        setRewardPoints(Number(rewardsRes.data.rewardPoints || 0));
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load reviews.");
      } finally {
        setLoading(false);
      }
    };

    fetchReviewData();
  }, [token, user]);

  if (loading) {
    return (
      <div className="my-reviews-page">
        <p>Loading reviews...</p>
      </div>
    );
  }

  return (
    <div className="my-reviews-page">
      <div className="my-reviews-header">
        <div>
          <h2>My Reviews</h2>
          <p className="my-reviews-subtitle">
            Verified review records and earned reward points
          </p>
        </div>

        <div className="rewards-summary-card">
          <span className="rewards-summary-label">Reward Points</span>
          <strong className="rewards-summary-value">{rewardPoints}</strong>
          <p className="rewards-summary-note">
            Earned after successful verified review submission
          </p>
        </div>
      </div>

      {error && <p className="page-error">{error}</p>}

      {!error && reviews.length === 0 && (
        <p className="empty-message">No reviews found.</p>
      )}

      {!error && reviews.length > 0 && (
        <div className="reviews-grid">
          {reviews.map((review) => (
            <div className="review-card" key={review._id}>
              <div className="review-card-top">
                <h3>{review.productName || `Product ${review.productId}`}</h3>
                {review.onChainStored ? (
                  <span className="review-status verified">
                    Blockchain Verified
                  </span>
                ) : (
                  <span className="review-status pending">
                    Not Verified On-Chain
                  </span>
                )}
              </div>

              <p>
                <strong>Product ID:</strong> {review.productId}
              </p>

              <p>
                <strong>Rating:</strong> {review.rating} / 5
              </p>

              <p>
                <strong>Review:</strong> {review.comment}
              </p>

              <p>
                <strong>Submitted:</strong>{" "}
                {review.createdAt
                  ? new Date(review.createdAt).toLocaleString()
                  : "-"}
              </p>

              <div className="reward-earned-chip">Reward Eligible Review</div>

              <button
                className="transparency-btn"
                onClick={() =>
                  navigate(`/review-transparency/${review.reviewKey}`)
                }
                disabled={!review.reviewKey}
              >
                View Transparency
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyReviews;