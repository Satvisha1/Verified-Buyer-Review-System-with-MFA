import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Auth.css";

const API = "http://localhost:5000";

function SubAdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting || submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await axios.post(`${API}/api/auth/login/sub-admin`, {
        email: email.trim(),
        password: password.trim(),
        role: "sub-admin",
      });

      if (res.data.message && res.data.message.includes("MFA")) {
        await axios.post(`${API}/api/mfa/request`, {
          email: email.trim(),
        });

        navigate("/mfa", {
          state: {
            email: email.trim(),
            role: "sub-admin",
          },
        });
      } else {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.setItem("sub-admin", JSON.stringify(res.data.user));

        alert("Login successful");
        navigate("/sub-admin-dashboard");
      }
    } catch (err) {
      console.error("Sub-admin login error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Sub-admin login failed");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Sub Admin Login</h2>

      <form onSubmit={handleSubmit} className="login-form">
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          required
        />

        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          required
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <p>
        Don&apos;t have an account?{" "}
        <Link to="/sub-admin-signup">Signup here</Link>
      </p>
    </div>
  );
}

export default SubAdminLogin;