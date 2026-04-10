import React, { useState, useRef } from "react";
import "./Auth.css";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function CustomerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    console.log("Login attempt:", { email, password });

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login/customer", {
        email,
        password,
        role: "customer",
      });

      console.log("Login response:", res.data);

      if (res.data.message && res.data.message.includes("MFA")) {
        await axios.post("http://localhost:5000/api/mfa/request", {
          email: email,
        });

        navigate("/mfa", {
          state: {
            email: email,
            role: "customer",
          },
        });
      }
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Login failed");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Customer Login</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <p>
        Do not have an account? <Link to="/signup/customer">Signup here</Link>
      </p>
    </div>
  );
}

export default CustomerLogin;