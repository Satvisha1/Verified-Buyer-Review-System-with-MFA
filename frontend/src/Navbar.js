import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();

  const customer = JSON.parse(localStorage.getItem("customer") || "null");
  const admin = JSON.parse(localStorage.getItem("admin") || "null");
  const subAdmin = JSON.parse(localStorage.getItem("sub-admin") || "null");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const isLoggedIn = !!(customer || admin || subAdmin || user);

  const isAdmin = !!admin || user?.role === "admin";
  const isSubAdmin = !!subAdmin || user?.role === "sub-admin";
  const isCustomer = !!customer || user?.role === "customer";

  const userName =
    customer?.name ||
    admin?.name ||
    subAdmin?.name ||
    user?.name ||
    "";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("customer");
    localStorage.removeItem("admin");
    localStorage.removeItem("sub-admin");
    localStorage.removeItem("mfaPendingEmail");
    localStorage.removeItem("mfaPendingRole");
    localStorage.removeItem("pendingEmail");
    localStorage.removeItem("pendingRole");

    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">Verified Buyer Reviews</Link>
      </div>

      <ul className="navbar-links">
        <li>
          <Link to="/">Home</Link>
        </li>

        {!isAdmin && !isSubAdmin && (
          <li>
            <Link to="/products">Products</Link>
          </li>
        )}

        {isCustomer && (
          <>
            <li>
              <Link to="/my-orders">My Orders</Link>
            </li>
            <li>
              <Link to="/my-reviews">My Reviews</Link>
            </li>
          </>
        )}

        {isAdmin && (
          <>
            <li>
              <Link to="/admin-dashboard">Admin Dashboard</Link>
            </li>
            <li>
              <Link to="/admin-reviews">Admin Reviews</Link>
            </li>
            <li>
              <Link to="/admin/logs">Admin Logs</Link>
            </li>
          </>
        )}

        {isSubAdmin && (
          <>
            <li>
              <Link to="/sub-admin-dashboard">Sub Admin Dashboard</Link>
            </li>
          </>
        )}

        <li>
          <Link to="/about">About Us</Link>
        </li>

        <li>
          <Link to="/contact">Contact</Link>
        </li>

        {isLoggedIn ? (
          <>
            <li className="user-welcome">Welcome, {userName}!</li>
            <li>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </li>
          </>
        ) : (
          <li>
            <Link to="/login">Login</Link>
          </li>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;