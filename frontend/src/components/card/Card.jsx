import { Link } from "react-router-dom";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import IconButton from "@mui/material/IconButton";
import styles from "./Card.module.css";
import defaultImage from "../../images/kat_01.png";
import { API_BASE_URL } from "../../config/api";
import { ROUTES, AUTH_REQUIRED_FAVORITES } from "../../config/constants";
import { addToCartIfAuth } from "../../utils/cart";
import { addToFavoritesIfAuth } from "../../utils/favorites";
import { useCurrency } from "../../context/CurrencyContext";
import { formatPriceWithCurrency } from "../../utils/price";

/** Берёт URL из image_1; относительные пути превращает в абсолютные. */
function getBoilerImageUrl(product) {
  const raw = product?.image_1?.trim?.();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  const base = (API_BASE_URL || "").replace(/\/$/, "");
  const path = raw.replace(/^\//, "");
  return base
    ? `${base}${path ? (base.endsWith("/") ? path : `/${path}`) : ""}`
    : raw;
}

/** Есть ли в цене хотя бы одна цифра (числовая цена), иначе — текст */
function isNumericPrice(price) {
  return price != null && price !== "" && /\d/.test(String(price));
}

const Card = ({ product }) => {
  const { currency, convertPrice } = useCurrency();
  const imageSrc = getBoilerImageUrl(product) || defaultImage;
  const title = product?.name || "Котёл";

  const hasPrice = product?.price != null && product?.price !== "";
  const numericPrice = hasPrice && isNumericPrice(product.price);
  const priceInBYN = hasPrice
    ? formatPriceWithCurrency(product.price, "BYN", null)
    : null;
  const priceInSelected =
    hasPrice && currency !== "BYN"
      ? formatPriceWithCurrency(product.price, currency, convertPrice)
      : null;
  const priceDisplayTextOnly = hasPrice && !numericPrice ? String(product.price).trim() : null;

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = defaultImage;
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCartIfAuth(product);
  };

  const handleAddToFavorites = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!addToFavoritesIfAuth(product)) {
      alert(AUTH_REQUIRED_FAVORITES);
    }
  };

  return (
    <article className={styles.card}>
      <Link
        to={ROUTES.productById(product.id)}
        className={styles.card__link}
        aria-label={`Перейти к описанию: ${title}`}
      >
        <img
          className={styles.card__image}
          src={imageSrc}
          alt={title}
          onError={handleImageError}
        />
        <div className={styles.card__body}>
          <h3 className={styles.card__title}>{title}</h3>
          {priceDisplayTextOnly != null && (
            <p className={styles.card__price}>{priceDisplayTextOnly}</p>
          )}
          {numericPrice && priceInBYN && (
            <p className={styles.card__price}>
              {priceInBYN}
              {priceInSelected != null && priceInSelected !== "" && (
                <span className={styles.card__priceSecondary}> {priceInSelected}</span>
              )}
            </p>
          )}
        </div>
      </Link>
      <div className={styles.card__actions}>
        <button
          type="button"
          className={styles.card__cartBtn}
          onClick={handleAddToCart}
        >
          В корзину
        </button>
        <IconButton
          className={styles.card__favoritesIcon}
          onClick={handleAddToFavorites}
          aria-label="В избранное"
          size="small"
        >
          <FavoriteBorderIcon />
        </IconButton>
      </div>
    </article>
  );
};

export default Card;
