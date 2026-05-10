/**
 * @file Страница оформления заказа (первый шаг).
 *
 * Макет:
 *   Слева — позиции заказа из корзины (можно менять количество, удалить, перейти в каталог за новыми товарами).
 *   Справа — доставка курьером (адрес), контакты, способ оплаты, итоги.
 *
 * Стоимость заказа (товары), расчёт доставки, стоимость доставки, итого к оплате. При оформлении сумма товаров сохраняется в БД как «Стоимость заказа, BYN».
 * Поля адреса при JWT подтягиваются из GET me/.
 * Стоимость доставки считается автоматически при изменении города и суммы заказа (GET delivery/, computeCheckoutCourierDeliveryQuote).
 *
 * POST /orders/ при «Оформить заказ» — order_history.products_subtotal = стоимость заказа по каталогу.
 */
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  getCart,
  removeFromCart,
  updateQuantity,
  clearCart,
} from "../../../utils/cart";
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
import { computeCheckoutCourierDeliveryQuote } from "../../../utils/deliveryCost";
import "./Checkout.css";

function formatOrderApiErrors(data) {
  if (data == null || typeof data !== "object") {
    return "Не удалось оформить заказ. Попробуйте позже.";
  }
  if (typeof data.detail === "string") return data.detail;
  const parts = [];
  const walk = (obj, prefix) => {
    if (obj == null) return;
    if (typeof obj === "string") {
      parts.push(prefix ? `${prefix}: ${obj}` : obj);
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach((x) => walk(x, prefix));
      return;
    }
    if (typeof obj !== "object") {
      parts.push(String(obj));
      return;
    }
    for (const [k, v] of Object.entries(obj)) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (Array.isArray(v)) {
        v.forEach((item) => walk(item, p));
      } else if (typeof v === "object" && v !== null) {
        walk(v, p);
      } else {
        parts.push(`${p}: ${v}`);
      }
    }
  };
  walk(data, "");
  return parts.length ? parts.join("\n") : "Проверьте данные формы.";
}

/**
 * Нормализует URL картинки товара: абсолютные URL оставляем, относительные дополняем API_BASE_URL бэкенда.
 */
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

/** Способ оплаты (один активен) */
const PAYMENT_CASH_ON_RECEIPT = "cash_on_receipt";
const PAYMENT_CARD_ONLINE = "card_online";
const PAYMENT_CARD_ON_RECEIPT = "card_on_receipt";

/**
 * Начальное состояние адреса доставки; имена полей совпадают с ответом GET me/ и телом PATCH me/update_profile/.
 */
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
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  /** Адрес доставки: подставляется из профиля, можно править только в форме заказа */
  const [deliveryAddress, setDeliveryAddress] = useState(
    initialDeliveryAddress,
  );
  const [profileLoaded, setProfileLoaded] = useState(false);
  /** BYN; обновляется автоматически при смене города и суммы заказа */
  const [courierDeliveryCostByn, setCourierDeliveryCostByn] = useState(0);
  const [deliveryCalcLoading, setDeliveryCalcLoading] = useState(false);
  /** Подсказка, если автоматический тариф недоступен (без всплывающих alert) */
  const [deliveryQuoteNote, setDeliveryQuoteNote] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_CASH_ON_RECEIPT);
  const [orderSubmitLoading, setOrderSubmitLoading] = useState(false);

  /** Подписка на событие обновления корзины из других частей приложения */
  useEffect(() => {
    const refresh = () => setItems(getCart());
    refresh();
    window.addEventListener("cart-updated", refresh);
    return () => window.removeEventListener("cart-updated", refresh);
  }, []);

  /**
   * Загрузка профиля для автозаполнения телефона и адреса (только при наличии access-токена).
   * Ошибки 401 здесь не обрабатываем как редирект — пользователь может оформить заказ без входа.
   */
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

  /** Локальное обновление одного поля объекта адреса без мутации состояния */
  const setAddressField = (field, value) => {
    setDeliveryAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckoutQtyDelta = (productId, delta) => {
    const item = items.find((i) => i.id === productId);
    if (!item) return;
    const current = Math.max(1, item.quantity ?? 1);
    if (delta < 0) {
      if (current <= 1) {
        removeFromCart(productId);
      } else {
        updateQuantity(productId, current - 1);
      }
    } else {
      updateQuantity(productId, current + 1);
    }
  };

  const handleCheckoutRemove = (productId) => {
    removeFromCart(productId);
  };

  /** Сумма товаров в корзине в BYN (цены парсятся из строк, количество не меньше 1) */
  const totalByn = items.reduce(
    (sum, i) => sum + parsePrice(i.price) * Math.max(1, i.quantity || 1),
    0,
  );

  /**
   * Автоматический расчёт доставки: город + сумма заказа.
   * Задержка, чтобы не дергать API на каждый символ в поле «Город».
   */
  useEffect(() => {
    const city = (deliveryAddress.city || "").trim();
    if (!city) {
      setCourierDeliveryCostByn(0);
      setDeliveryQuoteNote(null);
      setDeliveryCalcLoading(false);
      return;
    }

    let cancelled = false;
    setDeliveryQuoteNote(null);

    const timer = setTimeout(async () => {
      if (cancelled) return;
      setDeliveryCalcLoading(true);
      try {
        const res = await api.get("delivery/");
        if (cancelled) return;
        const rules = Array.isArray(res.data) ? res.data : [];
        const quote = computeCheckoutCourierDeliveryQuote(
          rules,
          totalByn,
          city,
        );
        if (quote.noRule) {
          setCourierDeliveryCostByn(0);
          setDeliveryQuoteNote(
            "Нет тарифа для выбранного города и суммы заказа. Уточните условия у менеджера.",
          );
          return;
        }
        if (quote.needsManager) {
          setCourierDeliveryCostByn(0);
          setDeliveryQuoteNote("Стоимость доставки уточняется у менеджера.");
          return;
        }
        setCourierDeliveryCostByn(quote.amount ?? 0);
      } catch {
        if (!cancelled) {
          setCourierDeliveryCostByn(0);
          setDeliveryQuoteNote(
            "Не удалось загрузить условия доставки. Попробуйте позже.",
          );
        }
      } finally {
        if (!cancelled) setDeliveryCalcLoading(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [deliveryAddress.city, totalByn]);

  /** Товары + доставка (доставка по умолчанию 0 BYN). */
  const courierOrderGrandByn = useMemo(
    () => Math.round((totalByn + courierDeliveryCostByn) * 100) / 100,
    [totalByn, courierDeliveryCostByn],
  );

  /**
   * Оформление: POST /orders/ — запись в order_history, стоимость заказа в products_subtotal.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const phoneTrim = (phone || "").trim();
    if (phoneTrim && !PHONE_REGEX.test(phoneTrim)) {
      alert(PHONE_ERROR);
      return;
    }
    const city = (deliveryAddress.city || "").trim();
    const street = (deliveryAddress.street || "").trim();
    const house = (deliveryAddress.house_number || "").trim();
    if (!city || !street || !house) {
      alert("Укажите город, улицу и номер дома для доставки.");
      return;
    }
    if (!items.length) {
      alert("Корзина пуста.");
      return;
    }

    const payload = {
      payment_method: paymentMethod,
      delivery_type: "courier",
      phone: phoneTrim,
      comment: (comment || "").trim(),
      items: items.map((i) => ({
        id: i.id,
        quantity: Math.max(1, i.quantity || 1),
      })),
      delivery_address: { ...deliveryAddress },
      courier_delivery_cost_byn:
        Math.round(courierDeliveryCostByn * 100) / 100,
      products_subtotal_byn: Math.round(totalByn * 100) / 100,
    };

    setOrderSubmitLoading(true);
    try {
      await api.post("orders/", payload);
      clearCart();
      alert("Ваш заказ успешно оформлен!");
    } catch (err) {
      alert(formatOrderApiErrors(err.response?.data));
    } finally {
      setOrderSubmitLoading(false);
    }
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
                      <div className="checkout-order-item__row">
                        <div
                          className="checkout-order-item__qty-controls"
                          aria-label="Количество"
                        >
                          <button
                            type="button"
                            className="checkout-order-item__qty-btn"
                            onClick={() =>
                              handleCheckoutQtyDelta(item.id, -1)
                            }
                            aria-label="Уменьшить количество"
                          >
                            −
                          </button>
                          <span className="checkout-order-item__qty-value">
                            {qty}
                          </span>
                          <button
                            type="button"
                            className="checkout-order-item__qty-btn"
                            onClick={() =>
                              handleCheckoutQtyDelta(item.id, 1)
                            }
                            aria-label="Увеличить количество"
                          >
                            +
                          </button>
                        </div>
                        <span className="checkout-order-item__sum">
                          {formatPrice(lineSum)} BYN
                        </span>
                        <IconButton
                          type="button"
                          size="small"
                          onClick={() => handleCheckoutRemove(item.id)}
                          aria-label="Удалить из заказа"
                          className="checkout-order-item__remove"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="checkout-order-items__add-more">
              <Link
                to={ROUTES.CATALOG}
                className="checkout-order-items__add-more-link"
              >
                Добавить товары из каталога
              </Link>
            </p>
          </div>
        </div>
        <div className="checkout-right">
          <h2 className="checkout-section-title">Оформление заказа</h2>
          <form onSubmit={handleSubmit} className="checkout-form">
            <div className="checkout-address-block">
              <h3 className="checkout-address-title">Адрес доставки</h3>
              <p className="checkout-address-hint">
                {profileLoaded ? (
                  "Адрес из личного кабинета. При необходимости измените его только для этого заказа."
                ) : (
                  <>
                    Укажите адрес доставки. Чтобы подставить сохранённый адрес,
                    войдите в аккаунт или заполните профиль в{" "}
                    <Link
                      to={ROUTES.CABINET}
                      className="checkout-address-hint-link"
                    >
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
                  onChange={(e) =>
                    setAddressField("district", e.target.value)
                  }
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
                  onChange={(e) =>
                    setAddressField("house_number", e.target.value)
                  }
                  variant="outlined"
                  fullWidth
                  size="small"
                  required
                  className="checkout-field"
                />
                <TextField
                  label="Корпус"
                  value={deliveryAddress.building_number}
                  onChange={(e) =>
                    setAddressField("building_number", e.target.value)
                  }
                  variant="outlined"
                  fullWidth
                  size="small"
                  className="checkout-field"
                />
                <TextField
                  label="Квартира"
                  value={deliveryAddress.apartment_number}
                  onChange={(e) =>
                    setAddressField("apartment_number", e.target.value)
                  }
                  variant="outlined"
                  fullWidth
                  size="small"
                  className="checkout-field"
                />
              </div>
            </div>
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
                  <span className="checkout-total-label">Стоимость заказа</span>
                </div>
                <p className="checkout-delivery-auto-hint">
                  {deliveryCalcLoading
                    ? "Расчёт доставки…"
                    : "Стоимость доставки считается автоматически по городу и сумме заказа."}
                </p>
                <div className="checkout-total-line">
                  <span className="checkout-total-value checkout-total-value--delivery">
                    {`${formatPrice(courierDeliveryCostByn)} BYN`}
                  </span>
                  <span className="checkout-total-label">
                    Стоимость доставки
                  </span>
                </div>
                {deliveryQuoteNote ? (
                  <p className="checkout-delivery-note" role="status">
                    {deliveryQuoteNote}
                  </p>
                ) : null}
                <div className="checkout-total-line">
                  <span className="checkout-total-value">
                    {`${formatPrice(courierOrderGrandByn)} BYN`}
                  </span>
                  <span className="checkout-total-label">
                    Итого к оплате
                  </span>
                </div>
              </div>
              <div className="checkout-payment-block">
                <h3 className="checkout-payment-title">Способ оплаты</h3>
                <div className="checkout-payment-options">
                  <FormControlLabel
                    className="checkout-payment-option"
                    control={
                      <Checkbox
                        checked={paymentMethod === PAYMENT_CASH_ON_RECEIPT}
                        onChange={() =>
                          setPaymentMethod(PAYMENT_CASH_ON_RECEIPT)
                        }
                        disableRipple
                      />
                    }
                    label="Наличными при получении"
                  />
                  <FormControlLabel
                    className="checkout-payment-option"
                    control={
                      <Checkbox
                        checked={paymentMethod === PAYMENT_CARD_ONLINE}
                        onChange={() =>
                          setPaymentMethod(PAYMENT_CARD_ONLINE)
                        }
                        disableRipple
                      />
                    }
                    label="Банковской картой онлайн"
                  />
                  <FormControlLabel
                    className="checkout-payment-option"
                    control={
                      <Checkbox
                        checked={paymentMethod === PAYMENT_CARD_ON_RECEIPT}
                        onChange={() =>
                          setPaymentMethod(PAYMENT_CARD_ON_RECEIPT)
                        }
                        disableRipple
                      />
                    }
                    label="Банковской картой при получении"
                  />
                </div>
              </div>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                className="checkout-continue-btn"
                disabled={orderSubmitLoading}
              >
                {orderSubmitLoading ? "Отправка…" : "Оформить заказ"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

export default Checkout;
