/**
 * Оформление заказа — первый шаг (способ доставки, контакты)
 * Слева: место под изображение | Справа: форма
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { getCart } from "../../../utils/cart";
import { parsePrice, formatPrice } from "../../../utils/price";
import { ROUTES, PHONE_REGEX, PHONE_ERROR, STORAGE_KEYS } from "../../../config/constants";
import api from "../../../services/api";
import "./Checkout.css";

const DELIVERY_PICKUP = "pickup";
const DELIVERY_COURIER = "courier";

const Checkout = () => {
  const [items, setItems] = useState([]);
  const [delivery, setDelivery] = useState(DELIVERY_PICKUP);
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    const refresh = () => setItems(getCart());
    refresh();
    window.addEventListener("cart-updated", refresh);
    return () => window.removeEventListener("cart-updated", refresh);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) return;
    api
      .get("me/")
      .then((res) => {
        const userPhone = res.data?.phone;
        if (userPhone && typeof userPhone === "string") {
          setPhone(userPhone.trim());
        }
      })
      .catch(() => {});
  }, []);

  const totalByn = items.reduce(
    (sum, i) => sum + parsePrice(i.price) * Math.max(1, i.quantity || 1),
    0
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const phoneTrim = (phone || "").trim();
    if (phoneTrim && !PHONE_REGEX.test(phoneTrim)) {
      alert(PHONE_ERROR);
      return;
    }
    // TODO: переход на следующий шаг
    alert("Следующий шаг оформления — в разработке.");
  };

  if (items.length === 0) {
    return (
      <main className="page-main checkout-page">
        <div className="page-container">
          <p className="checkout-empty">Корзина пуста. Добавьте товары для оформления заказа.</p>
          <Link to={ROUTES.CART} className="checkout-back-link">
            ← В корзину
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-main checkout-page">
      <div className="page-container checkout-layout">
        <div className="checkout-left">
          <div className="checkout-image-placeholder">
            <iframe
              src="https://yandex.ru/map-widget/v1/?mode=search&text=%D0%91%D1%80%D0%B5%D1%81%D1%82%2C%20%D1%83%D0%BB.%20%D0%93%D0%BE%D0%B3%D0%BE%D0%BB%D1%8F%2089"
              title="Яндекс.Карта — г. Брест, ул. Гоголя 89"
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              style={{ position: "absolute", inset: 0, borderRadius: "12px" }}
            />
          </div>
        </div>
        <div className="checkout-right">
          <h2 className="checkout-section-title">Способ доставки</h2>
          <div className="checkout-delivery-options">
            <button
              type="button"
              className={`checkout-delivery-option ${delivery === DELIVERY_PICKUP ? "checkout-delivery-option--active" : ""}`}
              onClick={() => setDelivery(DELIVERY_PICKUP)}
            >
              Самовывоз
            </button>
            <button
              type="button"
              className={`checkout-delivery-option ${delivery === DELIVERY_COURIER ? "checkout-delivery-option--active" : ""}`}
              onClick={() => setDelivery(DELIVERY_COURIER)}
            >
              Курьером
            </button>
          </div>
          <form onSubmit={handleSubmit} className="checkout-form">
            <TextField
              label="Номер телефона для связи"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              variant="outlined"
              fullWidth
              size="small"
              placeholder="+375291234567"
              className="checkout-field"
            />
            <TextField
              label="Комментарий"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              size="small"
              className="checkout-field"
            />
            <div className="checkout-bottom">
              <div className="checkout-total">
                <span className="checkout-total-value">{formatPrice(totalByn)} BYN</span>
                <span className="checkout-total-label">Сумма заказа</span>
              </div>
              <Button type="submit" variant="contained" className="checkout-continue-btn">
                Продолжить
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

export default Checkout;
