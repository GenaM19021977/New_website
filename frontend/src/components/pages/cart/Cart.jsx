/**
 * Страница корзины
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import { getCart, removeFromCart, updateQuantity } from "../../../utils/cart";
import { API_BASE_URL } from "../../../config/api";
import { ROUTES } from "../../../config/constants";
import "./Cart.css";

function getImageUrl(raw) {
  if (!raw || !raw.trim?.()) return null;
  const t = raw.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("//")) return `https:${t}`;
  const base = (API_BASE_URL || "").replace(/\/$/, "");
  const path = t.replace(/^\//, "");
  return base ? `${base}${path ? (base.endsWith("/") ? path : `/${path}`) : ""}` : t;
}

const Cart = () => {
  const [items, setItems] = useState([]);

  const refresh = () => setItems(getCart());

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("cart-updated", handler);
    return () => window.removeEventListener("cart-updated", handler);
  }, []);

  const handleRemove = (id) => {
    removeFromCart(id);
  };

  const handleQuantityChange = (id, delta) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    updateQuantity(id, (item.quantity || 1) + delta);
  };

  if (items.length === 0) {
    return (
      <main className="page-main cart-page">
        <div className="page-container">
          <h1 className="page-section-heading cart-heading">Корзина</h1>
          <div className="cart-empty">
            <p className="cart-empty__text">Корзина пуста</p>
            <Link to={ROUTES.CATALOG} className="cart-empty__link">
              Перейти в каталог
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-main cart-page">
      <div className="page-container">
        <h1 className="page-section-heading cart-heading">Корзина</h1>
        <div className="cart-list">
          {items.map((item) => {
            const imgSrc = getImageUrl(item.image_1);
            const qty = item.quantity || 1;
            return (
              <article key={item.id} className="cart-item">
                <div className="cart-item__image">
                  {imgSrc ? (
                    <img src={imgSrc} alt={item.name} />
                  ) : (
                    <div className="cart-item__image-placeholder" />
                  )}
                </div>
                <div className="cart-item__body">
                  <Link to={ROUTES.productById(item.id)} className="cart-item__title">
                    {item.name}
                  </Link>
                  {item.price && (
                    <p className="cart-item__price">{item.price}</p>
                  )}
                  <div className="cart-item__actions">
                    <div className="cart-item__qty">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.id, -1)}
                        aria-label="Уменьшить"
                      >
                        −
                      </button>
                      <span>{qty}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.id, 1)}
                        aria-label="Увеличить"
                      >
                        +
                      </button>
                    </div>
                    <IconButton
                      onClick={() => handleRemove(item.id)}
                      aria-label="Удалить из корзины"
                      className="cart-item__remove"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <div className="cart-footer">
          <Link to={ROUTES.CATALOG} className="cart-back-link">
            ← Продолжить покупки
          </Link>
        </div>
      </div>
    </main>
  );
};

export default Cart;
