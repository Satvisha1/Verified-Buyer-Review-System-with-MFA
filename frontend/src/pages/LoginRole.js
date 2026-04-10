import React from "react";
import { useNavigate } from "react-router-dom";
import "./LoginRole.css";

const LoginRole = () => {
  const navigate = useNavigate();

  return (
    <div className="login-role-page">
      <div className="login-role-container">
        <div className="login-role-card">
          <h1>Select Login Role</h1>
          <p>Choose your role to continue.</p>

          <div className="login-role-section">
            <button onClick={() => navigate("/login/customer")}>
              Customer Login
            </button>
            <button onClick={() => navigate("/sub-admin-login")}>
              Sub Admin Login
            </button>
            <button onClick={() => navigate("/login/admin")}>
              Admin Login
            </button>
          </div>

          <div className="login-role-section">
            <button onClick={() => navigate("/signup/customer")}>
              Customer Signup
            </button>
            <button onClick={() => navigate("/sub-admin-signup")}>
              Sub Admin Signup
            </button>
            <button onClick={() => navigate("/signup/admin")}>
              Admin Signup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginRole;