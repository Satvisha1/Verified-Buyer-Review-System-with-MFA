import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./ReviewTransparency.css";

const API = "http://localhost:5000";

function ReviewTransparency() {
  const { reviewKey } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchTransparency = async () => {
      try {
        setLoading(true);
        setError("");

        const verifyRes = await axios.get(
          `${API}/api/blockchain/verify/key/${reviewKey}`
        );

        setData(verifyRes.data || null);

        if (token) {
          try {
            const myReviewsRes = await axios.get(`${API}/api/reviews/my`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            const matchedReview = (myReviewsRes.data.reviews || []).find(
              (r) => r.reviewKey === reviewKey
            );
            setReview(matchedReview || null);
          } catch {
            setReview(null);
          }
        } else {
          setReview(null);
        }
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load transparency details."
        );
      } finally {
        setLoading(false);
      }
    };

    if (reviewKey) {
      fetchTransparency();
    }
  }, [reviewKey, token]);

  if (loading) {
    return (
      <div className="review-transparency-page">
        <p>Loading transparency details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="review-transparency-page">
        <button className="back-btn" onClick={() => navigate(-1)}>
          Back
        </button>
        <p className="page-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="review-transparency-page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        Back
      </button>

      <h2>Review Transparency</h2>

      {review && (
        <div className="transparency-card">
          <h3>Review Summary</h3>
          <p>
            <strong>Product:</strong> {review.productName || review.productId}
          </p>
          <p>
            <strong>Rating:</strong> {review.rating} / 5
          </p>
          <p>
            <strong>Comment:</strong> {review.comment}
          </p>
          <p>
            <strong>Submitted:</strong>{" "}
            {review.createdAt ? new Date(review.createdAt).toLocaleString() : "-"}
          </p>
        </div>
      )}

      {data && (
        <>
          <div className="transparency-card">
            <h3>Verification Status</h3>
            <p>
              <strong>Overall Verification:</strong>{" "}
              <span className={data.verified ? "verified-text" : "failed-text"}>
                {data.verified ? "Verified" : "Verification Failed"}
              </span>
            </p>
            <p>
              <strong>Exists On Chain:</strong> {data.existsOnChain ? "Yes" : "No"}
            </p>
            <p>
              <strong>Stored on Blockchain:</strong>{" "}
              {data.onChainStored ? "Yes" : "No"}
            </p>
            <p>
              <strong>Review Key:</strong> {data.reviewKey || "-"}
            </p>
          </div>

          <div className="transparency-card">
            <h3>Storage Details</h3>
            <p>
              <strong>Storage Provider:</strong> {data.ipfsProvider || "Pinata"}
            </p>
            <p>
              <strong>Network:</strong> IPFS
            </p>
            <p>
              <strong>CID in Database:</strong>{" "}
              <span className="mono">{data.dbCid || "-"}</span>
            </p>
            <p>
              <strong>CID on Blockchain:</strong>{" "}
              <span className="mono">{data.onChainCid || "-"}</span>
            </p>
          </div>

          <div className="transparency-card">
            <h3>Integrity Verification</h3>
            <p>
              <strong>Database Hash:</strong>{" "}
              <span className="mono">{data.dbHash || "-"}</span>
            </p>
            <p>
              <strong>On-Chain Hash:</strong>{" "}
              <span className="mono">{data.onChainHash || "-"}</span>
            </p>
            <p>
              <strong>DB Matches Blockchain:</strong>{" "}
              {data.dbMatchesBlockchain ? "Yes" : "No"}
            </p>
            <p>
              <strong>CID Matches:</strong> {data.cidMatches ? "Yes" : "No"}
            </p>
            <p>
              <strong>IPFS Fetched:</strong> {data.ipfsFetched ? "Yes" : "No"}
            </p>
            <p>
              <strong>IPFS Hash:</strong>{" "}
              <span className="mono">{data.ipfsHash
                  ? data.ipfsHash.startsWith("0x")
                    ? data.ipfsHash
                    : `0x${data.ipfsHash}`
                  : "-"}</span>
            </p>
            <p>
              <strong>IPFS Matches DB:</strong>{" "}
              {data.ipfsMatchesDb ? "Yes" : "No"}
            </p>
            <p>
              <strong>IPFS Matches Blockchain:</strong>{" "}
              {data.ipfsMatchesBlockchain ? "Yes" : "No"}
            </p>

            {data.ipfsUrl ? (
              <p>
                <strong>IPFS Record:</strong>{" "}
                <a href={data.ipfsUrl} target="_blank" rel="noreferrer">
                  Open IPFS Record
                </a>
              </p>
            ) : (
              <p>
                <strong>IPFS Record:</strong> -
              </p>
            )}
          </div>

          <div className="transparency-card">
            <h3>Blockchain Details</h3>
            {data.txHash ? (
              <p>
                <strong>Transaction Hash:</strong>{" "}
                <a
                  href={`https://sepolia.etherscan.io/tx/${data.txHash}`}
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

            {data.contractAddress ? (
              <p>
                <strong>Contract Address:</strong>{" "}
                <a
                  href={`https://sepolia.etherscan.io/address/${data.contractAddress}`}
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
              <strong>Block Number:</strong> {data.blockNumber || "-"}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default ReviewTransparency;