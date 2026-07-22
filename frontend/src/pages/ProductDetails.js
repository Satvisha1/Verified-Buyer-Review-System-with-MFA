import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./ProductDetails.css";

const API = "http://localhost:5000";

function Stars({ value }) {
  const n = Number(value) || 0;
  return (
    <span>
      {"★★★★★".slice(0, n)}
      <span className="stars-dim">{"★★★★★".slice(n)}</span>
    </span>
  );
}

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [backendProduct, setBackendProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const orderingRef = useRef(false);

  const [blockchainScore, setBlockchainScore] = useState(null);
  const [scoreLoading, setScoreLoading] = useState(true);
  const [scoreError, setScoreError] = useState("");

  useEffect(() => {
    if (!id) return;

    const fetchBackendProduct = async () => {
      try {
        const res = await axios.get(`${API}/api/products`);
        const list = res.data.products || [];
        const found = list.find((p) => String(p._id) === String(id));
        setBackendProduct(found || null);
      } catch {
        setBackendProduct(null);
      }
    };

    fetchBackendProduct();
  }, [id]);

  const productData = backendProduct
    ? {
        id: backendProduct._id,
        name: backendProduct.name,
        price: backendProduct.price,
        img: backendProduct.imagePath
          ? `${API}${backendProduct.imagePath}?v=${backendProduct.updatedAt || ""}`
          : "",
        desc: backendProduct.description || "",
      }
    : null;

  const fetchReviews = useCallback(async () => {
    if (!productData?.id) return;

    try {
      const res = await fetch(`${API}/api/reviews/product/${productData.id}`);
      const data = await res.json().catch(() => ({}));
      setReviews(data.reviews || []);
    } catch {
      setReviews([]);
    }
  }, [productData?.id]);

  const fetchBlockchainScore = useCallback(async () => {
    if (!productData?.id) return;

    setScoreLoading(true);
    setScoreError("");

    try {
      const res = await axios.get(
        `${API}/api/blockchain/product-score/${productData.id}`
      );
      setBlockchainScore(res.data?.score || null);
    } catch (err) {
      setBlockchainScore(null);
      setScoreError(
        err.response?.data?.message || "Failed to load blockchain score."
      );
    } finally {
      setScoreLoading(false);
    }
  }, [productData?.id]);

  useEffect(() => {
    if (!productData?.id) return;
    fetchReviews();
    fetchBlockchainScore();
  }, [productData?.id, fetchReviews, fetchBlockchainScore]);

  useEffect(() => {
    if (!id) return;

    const currentToken = localStorage.getItem("token");
    const currentUser = JSON.parse(localStorage.getItem("user") || "null");

    if (!currentToken || !currentUser || currentUser.role !== "customer") return;

    (async () => {
      try {
        const res = await fetch(`${API}/api/reviews/eligibility/${id}`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setCanReview(false);
          return;
        }

        setCanReview(!!data.canReview);
        setAlreadyReviewed(!!data.alreadyReviewed);
      } catch {
        setCanReview(false);
      }
    })();
  }, [id]);

  const placeOrder = async () => {
    if (!token || !user) {
      navigate("/login/customer");
      return;
    }

    if (ordering || orderingRef.current) return;

    orderingRef.current = true;
    setOrdering(true);

    try {
      await axios.post(
        `${API}/api/orders/create`,
        {
          products: [
            {
              productId: String(productData.id),
              name: productData.name,
              price: productData.price,
            },
          ],
          totalAmount: productData.price,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Order placed");
    } catch {
      alert("Order failed");
    } finally {
      orderingRef.current = false;
      setOrdering(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();

    if (!canReview || alreadyReviewed || !comment.trim()) return;

    setSubmitting(true);
    setMsg("");

    try {
      const res = await fetch(`${API}/api/reviews/product/${productData.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: Number(rating),
          comment: comment.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.message || "Review failed");
        return;
      }

      const awarded = Number(data?.rewards?.pointsAwarded || 0);
      const total = Number(data?.rewards?.totalRewardPoints || 0);

      setMsg(
        awarded > 0
          ? `Review submitted successfully. +${awarded} reward points earned. Total points: ${total}.`
          : "Review submitted successfully"
      );

      setAlreadyReviewed(true);
      setComment("");
      setRating(5);
      fetchReviews();
      fetchBlockchainScore();
    } catch {
      setMsg("Review failed");
    } finally {
      setSubmitting(false);
    }
  };

  const avg =
    reviews.length === 0
      ? 0
      : reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) /
        reviews.length;

  if (!backendProduct) {
    return (
      <div className="productDetails">
        <button className="backBtn" onClick={() => navigate("/products")}>
          Back
        </button>
        <p>Product not found.</p>
      </div>
    );
  }

  return (
    <div className="productDetails">
      <button className="backBtn" onClick={() => navigate("/products")}>
        Back
      </button>

      <div className="detailsCard">
        {productData?.img ? (
          <img
            className="detailsImg"
            src={productData.img}
            alt={productData.name}
          />
        ) : (
          <div className="detailsImgPlaceholder">No Image</div>
        )}

        <div className="detailsInfo">
          <h2>{productData?.name}</h2>
          <p className="price">Rs {productData?.price}</p>
          <p className="desc">{productData?.desc}</p>

          <button className="orderBtn" onClick={placeOrder} disabled={ordering}>
            {ordering ? "Ordering..." : "Order Now"}
          </button>

          <div className="ratingLine">
            <Stars value={Math.round(avg)} />{" "}
            <span className="muted">({reviews.length} reviews)</span>
          </div>

          <div className="blockchain-score-box">
            <div className="blockchain-score-header">
              <h3>Blockchain Verified Score</h3>
              <span className="blockchain-score-badge">On-Chain</span>
            </div>

            {scoreLoading ? (
              <p className="muted">Loading...</p>
            ) : scoreError ? (
              <p className="score-error">{scoreError}</p>
            ) : (
              <div className="blockchain-score-grid minimal">
                <div className="score-metric">
                  <span className="score-label">Average</span>
                  <strong className="score-value">
                    {Number(blockchainScore?.averageRating || 0) % 1 === 0
                      ? Number(blockchainScore?.averageRating || 0)
                      : Number(blockchainScore?.averageRating || 0).toFixed(2)
                    } / 5
                  </strong>
                </div>

                <div className="score-metric">
                  <span className="score-label">Verified Reviews</span>
                  <strong className="score-value">
                    {Number(blockchainScore?.reviewCount || 0)}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="reviewsBox">
        <h3>Reviews</h3>

        {reviews.length === 0 ? (
          <p className="muted">No reviews yet.</p>
        ) : (
          <div className="reviewsList">
            {reviews.map((r) => (
              <div className="reviewItem" key={r._id}>
                <div className="reviewTop">
                  <Stars value={r.rating} />
                  <span className="muted">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="reviewText">{r.comment}</div>

                {r.onChainStored && (
                  <span className="reviewVerifiedBadge">
                    Blockchain Verified
                  </span>
                )}

                {r.reviewKey && (
                  <button
                    className="transparency-btn"
                    onClick={() => navigate(`/review-transparency/${r.reviewKey}`)}
                  >
                    View Proof
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="reviewFormBox">
          <h4>Write a review</h4>

          {!token || !user ? (
            <p className="muted">Login as customer to write a review.</p>
          ) : alreadyReviewed ? (
            <p className="muted">You already reviewed this product.</p>
          ) : !canReview ? (
            <p className="muted">Only verified buyers can review.</p>
          ) : (
            <form onSubmit={submitReview} className="reviewForm">
              <select value={rating} onChange={(e) => setRating(e.target.value)}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write your review..."
              />

              <button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          )}

          {msg && <p className="msg">{msg}</p>}
        </div>
      </div>
    </div>
  );
}

export default ProductDetails;