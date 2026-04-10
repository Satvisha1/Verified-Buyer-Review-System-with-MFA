import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./Auth.css";

const API = "http://localhost:5000";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(`${API}/api/auth/login/admin`, {
        email: email.trim(),
        password: password.trim(),
        role: "admin",
      });

      if (res.data.message && res.data.message.includes("MFA")) {
        try {
          const otpRes = await axios.post(`${API}/api/mfa/request`, {
            email: email.trim(),
          });

          console.log("OTP request success:", otpRes.data);

          navigate("/mfa", {
            state: {
              email: email.trim(),
              role: "admin",
            },
          });
        } catch (otpErr) {
          console.error("OTP request full error:", otpErr);
          console.error("OTP request response:", otpErr.response);
          console.error("OTP request data:", otpErr.response?.data);

          alert(
            JSON.stringify(
              otpErr.response?.data || { message: otpErr.message || "OTP request failed" },
              null,
              2
            )
          );
        }
      } else {
        alert("Login successful");
        localStorage.setItem("admin", JSON.stringify(res.data.user));
        navigate("/admin-dashboard");
      }
    } catch (err) {
      console.error("Admin credential check full error:", err);
      console.error("Admin credential check response:", err.response);
      console.error("Admin credential check data:", err.response?.data);

      alert(
        JSON.stringify(
          err.response?.data || { message: err.message || "Admin credential check failed" },
          null,
          2
        )
      );
    }
  };

  return (
    <div className="login-container">
      <h2>Admin Login</h2>
      <form onSubmit={handleLogin} className="login-form">
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
        <button type="submit">Login</button>
      </form>
      <p>
        Don&apos;t have an account? <Link to="/signup/admin">Signup here</Link>
      </p>
    </div>
  );
}

export default AdminLogin;