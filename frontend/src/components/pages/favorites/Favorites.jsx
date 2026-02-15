/**
 * Страница избранного
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  getFavorites,
  removeFromFavorites,
} from "../../../utils/favorites";
import { API_BASE_URL } from "../../../config/api";
import { ROUTES } from "../../../config/constants";
import { useCurrency } from "../../../context/CurrencyContext";
import { parsePrice, formatPrice } from "../../../utils/price";
import "./Favorites.css";

function getImageUrl(raw) {
  if (!raw || !raw.trim?.()) return null;
  const t = raw.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("//")) return `https:${t}`;
  const base = (API_BASE_URL || "").replace(/\/$/, "");
  const path = t.replace(/^\//, "");
  return base ? `${base}${path ? (base.endsWith("/") ? path : `/${path}`) : ""}` : t;
}

const Favorites = () => {
  const navigate = useNavigate();
  const { currency, convertPrice } = useCurrency();
  const [items, setItems] = useState([]);

  const refresh = () => setItems(getFavorites());

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("favorites-updated", handler);
    return () => window.removeEventListener("favorites-updated", handler);
  }, []);

  const handleRemove = (id) => {
    removeFromFavorites(id);
  };

  const handleGoToCart = () => {
    navigate(ROUTES.CART);
  };

  if (items.length === 0) {
    return (
      <main className="page-main favorites-page">
        <div className="page-container">
          <h1 className="page-section-heading favorites-heading">Избранное</h1>
          <div className="favorites-empty">
            <p className="favorites-empty__text">В избранном пока ничего нет</p>
            <Link to={ROUTES.CATALOG} className="favorites-empty__link">
              Перейти в каталог
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-main favorites-page">
      <div className="page-container">
        <h1 className="page-section-heading favorites-heading">Избранное</h1>
        <div className="favorites-list">
          {items.map((item) => {
            const imgSrc = getImageUrl(item.image_1);
            const priceByn = parsePrice(item.price);
            const priceDisplay = convertPrice ? convertPrice(priceByn) : priceByn;
            return (
              <article key={item.id} className="favorites-item">
                <div className="favorites-item__image">
                  {imgSrc ? (
                    <img src={imgSrc} alt={item.name} />
                  ) : (
                    <div className="favorites-item__image-placeholder" />
                  )}
                </div>
                <div className="favorites-item__body">
                  <Link
                    to={ROUTES.productById(item.id)}
                    className="favorites-item__title"
                  >
                    {item.name}
                  </Link>
                  <p className="favorites-item__price">
                    {formatPrice(priceDisplay)} {currency}
                  </p>
                  <div className="favorites-item__actions">
                    <button
                      type="button"
                      className="favorites-item__cart-btn"
                      onClick={handleGoToCart}
                    >
                      В корзине
                    </button>
                    <IconButton
                      onClick={() => handleRemove(item.id)}
                      aria-label="Удалить из избранного"
                      className="favorites-item__remove"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <div className="favorites-footer">
          <Link to={ROUTES.CATALOG} className="favorites-back-link">
            ← Продолжить покупки
          </Link>
        </div>
      </div>
    </main>
  );
};

export default Favorites;
