import { Link } from "react-router-dom";
import styles from "./Card.module.css";
import defaultImage from "../../images/kat_01.png";
import { API_BASE_URL } from "../../config/api";
import { ROUTES } from "../../config/constants";
import { addToCartIfAuth } from "../../utils/cart";
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

const Card = ({ product }) => {
  const { currency, convertPrice } = useCurrency();
  const imageSrc = getBoilerImageUrl(product) || defaultImage;
  const title = product?.name || "Котёл";
  const priceDisplay =
    product?.price != null && product?.price !== ""
      ? formatPriceWithCurrency(product.price, currency, convertPrice)
      : null;

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = defaultImage;
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCartIfAuth(product);
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
          {priceDisplay && <p className={styles.card__price}>{priceDisplay}</p>}
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
      </div>
    </article>
  );
};

export default Card;
