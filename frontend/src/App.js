import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import About from "./pages/About";
import Contact from "./pages/Contact";
import LoginRole from "./pages/LoginRole";
import CustomerLogin from "./pages/CustomerLogin";
import CustomerSignup from "./pages/CustomerSignup";
import AdminLogin from "./pages/AdminLogin";
import AdminSignup from "./pages/AdminSignup";
import MFA from "./pages/MFA";
import AdminDashboard from "./pages/AdminDashboard";
import MyOrders from "./pages/MyOrders";
import MyReviews from "./pages/MyReviews";
import AdminReviews from "./pages/AdminReviews";
import AdminUsers from "./pages/AdminUsers";
import AdminProducts from "./pages/AdminProducts";
import AdminLogs from "./pages/AdminLogs";
import ReviewTransparency from "./pages/ReviewTransparency";
import SubAdminLogin from "./pages/SubAdminLogin";
import SubAdminSignup from "./pages/SubAdminSignup";
import SubAdminDashboard from "./pages/SubAdminDashboard";
import Navbar from "./Navbar";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetails />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<LoginRole />} />
        <Route path="/login/customer" element={<CustomerLogin />} />
        <Route path="/signup/customer" element={<CustomerSignup />} />
        <Route path="/login/admin" element={<AdminLogin />} />
        <Route path="/signup/admin" element={<AdminSignup />} />
        <Route path="/mfa" element={<MFA />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/my-reviews" element={<MyReviews />} />
        <Route path="/admin-reviews" element={<AdminReviews />} />
        <Route path="/admin-users" element={<AdminUsers />} />
        <Route path="/admin-products" element={<AdminProducts />} />
        <Route path="/admin/logs" element={<AdminLogs />} />
        <Route path="/review-transparency/:reviewKey" element={<ReviewTransparency />} />
        <Route path="/sub-admin-login" element={<SubAdminLogin />} />
        <Route path="/sub-admin-signup" element={<SubAdminSignup />} />
        <Route path="/sub-admin-dashboard" element={<SubAdminDashboard />} />        
      </Routes>
    </BrowserRouter>
  );
}

export default App;