import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import "./Auth.css";

const API = "http://localhost:5000";

function MFA() {
  const [otp, setOtp] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const hasChecked = useRef(false);

  const { email } = location.state || {};

  useEffect(() => {
    if (!hasChecked.current && !email) {
      hasChecked.current = true;
      alert("MFA must be completed through login");
      navigate("/", { replace: true });
    }
  }, [email, navigate]);

  if (!email) return null;

  const verifyOTP = async () => {
    try {
      const res = await axios.post(`${API}/api/mfa/verify`, {
        email,
        otp: otp.trim(),
      });

      console.log("MFA Response:", res.data);

      alert(res.data.message);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem(res.data.user.role, JSON.stringify(res.data.user));

      localStorage.removeItem("mfaPending");
      localStorage.removeItem("pendingEmail");
      localStorage.removeItem("pendingRole");

      if (res.data.user.role === "admin") {
        navigate("/admin-dashboard", { replace: true });
      } else if (res.data.user.role === "sub-admin") {
        navigate("/sub-admin-dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("OTP verification error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "OTP verification failed");
    }
  };

  return (
    <div className="mfa-container">
      <h2>Multi-Factor Authentication</h2>
      <p>Please enter the OTP sent to your email.</p>
      <input
        type="text"
        placeholder="Enter OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />
      <button onClick={verifyOTP}>Verify OTP</button>
    </div>
  );
}

export default MFA;