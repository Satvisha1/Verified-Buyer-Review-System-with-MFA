import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import "./Products.css";

const API = "http://localhost:5000";

function Products() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        const res = await axios.get(`${API}/api/products`);

        const backendProducts = (res.data.products || []).map((p) => ({
          id: p._id,
          name: p.name,
          price: p.price,
          img: p.imagePath ? `${API}${p.imagePath}?v=${p.updatedAt || ""}` : "",
        }));

        setProducts(backendProducts);
      } catch (err) {
        console.error("Error fetching backend products:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const openProduct = (id) => {
    navigate(`/products/${id}`);
  };

  return (
    <div className="products-page">
      <div className="products-container">
        <h1>Our Products</h1>

        {loading && <p>Loading products...</p>}

        <div className="products-grid-list">
          {products.map((p) => (
            <div
              className="products-card clickable"
              key={p.id}
              onClick={() => openProduct(p.id)}
            >
              {p.img ? (
                <img className="products-card-image" src={p.img} alt={p.name} />
              ) : (
                <div className="products-image-placeholder">No Image</div>
              )}

              <h3>{p.name}</h3>
              <p>Rs {p.price}</p>

              <button
                className="view-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  openProduct(p.id);
                }}
              >
                View Product
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Products;