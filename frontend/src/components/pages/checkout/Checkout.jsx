/**
 * Оформление заказа — первый шаг (способ доставки, контакты)
 * Слева: товары из корзины | Справа: форма
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import { getCart } from "../../../utils/cart";
import { parsePrice, formatPrice } from "../../../utils/price";
import {
  ROUTES,
  PHONE_REGEX,
  PHONE_ERROR,
  STORAGE_KEYS,
  COUNTRIES,
} from "../../../config/constants";
import { API_BASE_URL } from "../../../config/api";
import api from "../../../services/api";
import "./Checkout.css";

function getImageUrl(raw) {
  if (!raw || !raw.trim?.()) return null;
  const t = String(raw).trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("//")) return `https:${t}`;
  const base = (API_BASE_URL || "").replace(/\/$/, "");
  const path = t.replace(/^\//, "");
  return base
    ? `${base}${path ? (base.endsWith("/") ? path : `/${path}`) : ""}`
    : t;
}

const DELIVERY_PICKUP = "pickup";
const DELIVERY_COURIER = "courier";

/** Поля адреса совпадают с личным кабинетом (GET/PATCH me/) */
const initialDeliveryAddress = {
  country: "",
  region: "",
  district: "",
  city: "",
  street: "",
  house_number: "",
  building_number: "",
  apartment_number: "",
};

const Checkout = () => {
  const [items, setItems] = useState([]);
  const [delivery, setDelivery] = useState(DELIVERY_PICKUP);
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  /** Адрес доставки для курьера: подставляется из профиля, можно править только в форме заказа */
  const [deliveryAddress, setDeliveryAddress] = useState(initialDeliveryAddress);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    const refresh = () => setItems(getCart());
    refresh();
    window.addEventListener("cart-updated", refresh);
    return () => window.removeEventListener("cart-updated", refresh);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      setProfileLoaded(false);
      return;
    }
    api
      .get("me/")
      .then((res) => {
        const d = res.data;
        if (!d) return;
        setProfileLoaded(true);
        const userPhone = d.phone;
        if (userPhone && typeof userPhone === "string") {
          setPhone(userPhone.trim());
        }
        setDeliveryAddress({
          country: d.country || "",
          region: d.region || "",
          district: d.district || "",
          city: d.city || "",
          street: d.street || "",
          house_number: d.house_number || "",
          building_number: d.building_number || "",
          apartment_number: d.apartment_number || "",
        });
      })
      .catch(() => {
        setProfileLoaded(false);
      });
  }, []);

  const setAddressField = (field, value) => {
    setDeliveryAddress((prev) => ({ ...prev, [field]: value }));
  };

  const totalByn = items.reduce(
    (sum, i) => sum + parsePrice(i.price) * Math.max(1, i.quantity || 1),
    0,
  );

  /** Стоимость доставки: самовывоз — 0; курьер — пока без расчёта (null → «—») */
  const deliverySumByn = delivery === DELIVERY_PICKUP ? 0 : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const phoneTrim = (phone || "").trim();
    if (phoneTrim && !PHONE_REGEX.test(phoneTrim)) {
      alert(PHONE_ERROR);
      return;
    }
    if (delivery === DELIVERY_COURIER) {
      const city = (deliveryAddress.city || "").trim();
      const street = (deliveryAddress.street || "").trim();
      const house = (deliveryAddress.house_number || "").trim();
      if (!city || !street || !house) {
        alert("Для доставки курьером укажите город, улицу и номер дома.");
        return;
      }
    }
    // TODO: переход на следующий шаг (delivery, deliveryAddress, phone, comment)
    alert("Следующий шаг оформления — в разработке.");
  };

  if (items.length === 0) {
    return (
      <main className="page-main checkout-page">
        <div className="page-container">
          <p className="checkout-empty">
            Корзина пуста. Добавьте товары для оформления заказа.
          </p>
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
          <div className="checkout-order-items">
            <h3 className="checkout-order-items__title">Товары в заказе</h3>
            <ul className="checkout-order-items__list">
              {items.map((item) => {
                const qty = Math.max(1, item.quantity ?? 1);
                const lineSum = parsePrice(item.price) * qty;
                const imgSrc = getImageUrl(item.image_1);
                return (
                  <li key={item.id} className="checkout-order-item">
                    <div className="checkout-order-item__image">
                      {imgSrc ? (
                        <img src={imgSrc} alt={item.name} />
                      ) : (
                        <div className="checkout-order-item__image-placeholder" />
                      )}
                    </div>
                    <div className="checkout-order-item__body">
                      <Link
                        to={ROUTES.productById(item.id)}
                        className="checkout-order-item__name"
                      >
                        {item.name}
                      </Link>
                      <span className="checkout-order-item__qty">× {qty}</span>
                      <span className="checkout-order-item__sum">
                        {formatPrice(lineSum)} BYN
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
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
            {delivery === DELIVERY_COURIER && (
              <div className="checkout-address-block">
                <h3 className="checkout-address-title">Адрес доставки</h3>
                <p className="checkout-address-hint">
                  {profileLoaded ? (
                    "Адрес из личного кабинета. При необходимости измените его только для этого заказа."
                  ) : (
                    <>
                      Укажите адрес доставки. Чтобы подставить сохранённый адрес, войдите в аккаунт или заполните
                      профиль в{" "}
                      <Link to={ROUTES.CABINET} className="checkout-address-hint-link">
                        личном кабинете
                      </Link>
                      .
                    </>
                  )}
                </p>
                <div className="checkout-address-grid">
                  <TextField
                    select
                    label="Страна"
                    value={deliveryAddress.country}
                    onChange={(e) => setAddressField("country", e.target.value)}
                    variant="outlined"
                    fullWidth
                    size="small"
                    className="checkout-field"
                  >
                    <MenuItem value="">
                      <em>Не выбрано</em>
                    </MenuItem>
                    {COUNTRIES.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Область"
                    value={deliveryAddress.region}
                    onChange={(e) => setAddressField("region", e.target.value)}
                    variant="outlined"
                    fullWidth
                    size="small"
                    className="checkout-field"
                  />
                  <TextField
                    label="Район"
                    value={deliveryAddress.district}
                    onChange={(e) => setAddressField("district", e.target.value)}
                    variant="outlined"
                    fullWidth
                    size="small"
                    className="checkout-field"
                  />
                  <TextField
                    label="Город"
                    value={deliveryAddress.city}
                    onChange={(e) => setAddressField("city", e.target.value)}
                    variant="outlined"
                    fullWidth
                    size="small"
                    required
                    className="checkout-field"
                  />
                  <TextField
                    label="Улица"
                    value={deliveryAddress.street}
                    onChange={(e) => setAddressField("street", e.target.value)}
                    variant="outlined"
                    fullWidth
                    size="small"
                    required
                    className="checkout-field"
                  />
                  <TextField
                    label="Номер дома"
                    value={deliveryAddress.house_number}
                    onChange={(e) => setAddressField("house_number", e.target.value)}
                    variant="outlined"
                    fullWidth
                    size="small"
                    required
                    className="checkout-field"
                  />
                  <TextField
                    label="Корпус"
                    value={deliveryAddress.building_number}
                    onChange={(e) => setAddressField("building_number", e.target.value)}
                    variant="outlined"
                    fullWidth
                    size="small"
                    className="checkout-field"
                  />
                  <TextField
                    label="Квартира"
                    value={deliveryAddress.apartment_number}
                    onChange={(e) => setAddressField("apartment_number", e.target.value)}
                    variant="outlined"
                    fullWidth
                    size="small"
                    className="checkout-field"
                  />
                </div>
              </div>
            )}
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
                <div className="checkout-total-line">
                  <span className="checkout-total-value">
                    {formatPrice(totalByn)} BYN
                  </span>
                  <span className="checkout-total-label">Сумма заказа</span>
                </div>
                <div className="checkout-total-line">
                  <span className="checkout-total-value checkout-total-value--delivery">
                    {deliverySumByn === null ? "—" : `${formatPrice(deliverySumByn)} BYN`}
                  </span>
                  <span className="checkout-total-label">Сумма доставки</span>
                </div>
              </div>
              <Button
                type="submit"
                variant="contained"
                className="checkout-continue-btn"
              >
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
