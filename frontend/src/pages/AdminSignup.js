import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./Auth.css";

function AdminSignup() {
  const [name, setName] = useState("");
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

    const data = {
      name: name.trim(),
      email: email.trim(),
      password: password.trim(),
      role: "admin",
    };

    console.log("Admin signup data:", data);

    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/signup/admin",
        data
      );

      console.log("Admin signup response:", res.data);

      if (res.data.message && res.data.message.includes("MFA")) {
        await axios.post("http://localhost:5000/api/mfa/request", {
          email: email.trim(),
        });

        navigate("/mfa", {
          state: {
            email: email.trim(),
            role: "admin",
          },
        });
      } else {
        alert("Admin signup successful! Please login.");
        navigate("/login/admin");
      }
    } catch (err) {
      console.error("Admin signup error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Signup failed");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="signup-container">
      <h2>Admin Signup</h2>

      <form onSubmit={handleSubmit} className="signup-form">
        <label>Full Name:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
          required
        />

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
          {isSubmitting ? "Signing up..." : "Sign Up"}
        </button>
      </form>

      <p>
        Already have an account? <Link to="/login/admin">Login here</Link>
      </p>
    </div>
  );
}

export default AdminSignup;