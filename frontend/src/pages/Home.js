import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Home.css";

const API = "http://localhost:5000";

function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const res = await fetch(`${API}/api/products`);
        const data = await res.json();

        if (res.ok) {
          setFeaturedProducts((data.products || []).slice(0, 3));
        } else {
          setFeaturedProducts([]);
        }
      } catch (error) {
        console.error("Failed to fetch featured products:", error);
        setFeaturedProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  return (
    <div className="home-page">
      <div className="home-container">
        <section className="home-welcome">
          <h1>Sweet Crumbs Bakery</h1>
          <p>Providing high-quality baked goods with freshness and care.</p>
        </section>

        <section className="home-featured-products">
          <h2>Featured Products</h2>

          {loadingProducts ? (
            <p>Loading featured products...</p>
          ) : featuredProducts.length === 0 ? (
            <p>No featured products available right now.</p>
          ) : (
            <div className="home-products-grid">
              {featuredProducts.map((product) => {
                const imageSrc = product.image
                  ? product.image
                  : product.imagePath
                  ? `${API}/${product.imagePath.replace(/^\/+/, "")}`
                  : null;

                return (
                  <div className="home-product-card" key={product._id}>
                    {imageSrc ? (
                      <img
                        className="home-product-image"
                        src={imageSrc}
                        alt={product.name}
                      />
                    ) : (
                      <div className="home-no-image">No Image</div>
                    )}

                    <h3>{product.name}</h3>
                    <p>Rs {product.price}</p>

                    <Link to="/products">
                      <button>Order</button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="home-place-order">
          <h2>Place Your Order</h2>
          <p>Order directly from our homepage for your favorite bakery items.</p>
          <Link to="/products">
            <button>Shop Now</button>
          </Link>
        </section>
      </div>
    </div>
  );
}

export default Home;