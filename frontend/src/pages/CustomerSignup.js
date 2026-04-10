import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Auth.css";

function CustomerSignup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Signup button clicked");

    try {
      const res = await axios.post("http://localhost:5000/api/auth/signup/customer", {
        name,
        email,
        password,
        role: "customer",
      });

      console.log("Signup response:", res.data);

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
      } else {
        alert("Signup successful! Please login.");
        navigate("/login/customer");
      }
    } catch (err) {
      console.error("Signup error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="signup-container">
      <h2>Customer Signup</h2>
      <form onSubmit={handleSubmit} className="signup-form">
        <label>Full Name:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

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

        <button type="submit">Sign Up</button>
      </form>

      <p>
        Already have an account? <Link to="/login/customer">Login here</Link>
      </p>
    </div>
  );
}

export default CustomerSignup;