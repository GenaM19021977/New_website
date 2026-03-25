/**
 * @file Страница оформления заказа (первый шаг).
 *
 * Макет:
 *   Слева — список позиций из localStorage (корзина), справа — выбор способа доставки, контакты, итоги.
 *
 * Самовывоз:
 *   Показывается только сумма заказа (доставка в блоке итогов не выводится).
 *
 * Курьер:
 *   - Поля адреса совпадают с личным кабинетом; при наличии JWT подтягиваются из GET me/, но правки в форме
 *     не сохраняются в профиль — только для текущего оформления.
 *   - Расстояние: геокодинг Photon (komoot) + километры по прямой от SHOP_LOCATION до точки доставки.
 *   - Стоимость доставки считается в utils/deliveryCost.js по правилам из GET delivery/ и сумме корзины.
 *
 * Дальнейшие шаги оформления (оплата и т.д.) пока не реализованы — см. TODO в handleSubmit.
 */
import { useState, useEffect, useMemo } from "react";
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
  SHOP_LOCATION,
} from "../../../config/constants";
import { API_BASE_URL } from "../../../config/api";
import api from "../../../services/api";
import {
  buildDeliveryGeocodeQuery,
  geocodeWithPhoton,
  distanceFromShopKm,
  parseCourierTariffFromDeliveryItems,
  computeCourierDeliveryQuote,
} from "../../../utils/deliveryCost";
import "./Checkout.css";

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

/** Внутреннее значение переключателя «Самовывоз» */
const DELIVERY_PICKUP = "pickup";
/** Внутреннее значение переключателя «Курьером» */
const DELIVERY_COURIER = "courier";

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
  const [delivery, setDelivery] = useState(DELIVERY_PICKUP);
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  /** Адрес доставки для курьера: подставляется из профиля, можно править только в форме заказа */
  const [deliveryAddress, setDeliveryAddress] = useState(initialDeliveryAddress);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [deliveryRules, setDeliveryRules] = useState([]);
  /**
   * Состояние гео-расчёта для курьера (Photon + расстояние по прямой):
   * status: idle | loading | ok | error; message — текст ошибки.
   */
  const [geoState, setGeoState] = useState({
    status: "idle",
    distanceKm: null,
    message: "",
  });

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

  /**
   * Условия доставки из той же таблицы, что и модальное окно «Доставка» на странице «О нас».
   * Нужны для parseCourierTariffFromDeliveryItems → расчёт суммы доставки.
   */
  useEffect(() => {
    api
      .get("delivery/")
      .then((res) => {
        setDeliveryRules(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => setDeliveryRules([]));
  }, []);

  /** Кэшированный разбор тарифов доставки из deliveryRules */
  const courierTariff = useMemo(
    () => parseCourierTariffFromDeliveryItems(deliveryRules),
    [deliveryRules],
  );

  /**
   * Пересчёт расстояния при режиме «Курьером» и изменении адреса.
   * Debounce 700 мс снижает число запросов к Photon при быстром вводе.
   */
  useEffect(() => {
    if (delivery !== DELIVERY_COURIER) {
      setGeoState({ status: "idle", distanceKm: null, message: "" });
      return;
    }
    const city = (deliveryAddress.city || "").trim();
    const street = (deliveryAddress.street || "").trim();
    const house = (deliveryAddress.house_number || "").trim();
    if (!city || !street || !house) {
      setGeoState({ status: "idle", distanceKm: null, message: "" });
      return;
    }
    const destQuery = buildDeliveryGeocodeQuery(deliveryAddress);
    if (!destQuery) {
      setGeoState({ status: "idle", distanceKm: null, message: "" });
      return;
    }

    setGeoState((prev) => ({
      ...prev,
      status: "loading",
      message: "",
    }));

    const controller = new AbortController();
    let cancelled = false;

    const timer = setTimeout(() => {
      const run = async () => {
        try {
          const { lat, lon } = await geocodeWithPhoton(destQuery, controller.signal);
          if (cancelled) return;
          const km = distanceFromShopKm(lat, lon);
          setGeoState({
            status: "ok",
            distanceKm: km,
            message: "",
          });
        } catch (err) {
          if (err?.name === "AbortError" || cancelled) return;
          setGeoState({
            status: "error",
            distanceKm: null,
            message:
              "Не удалось найти адрес (геокодер Photon). Укажите страну и город, уточните улицу и дом.",
          });
        }
      };

      run();
    }, 700);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    delivery,
    deliveryAddress.city,
    deliveryAddress.street,
    deliveryAddress.house_number,
    deliveryAddress.building_number,
    deliveryAddress.apartment_number,
    deliveryAddress.country,
    deliveryAddress.region,
    deliveryAddress.district,
  ]);

  /** Локальное обновление одного поля объекта адреса без мутации состояния */
  const setAddressField = (field, value) => {
    setDeliveryAddress((prev) => ({ ...prev, [field]: value }));
  };

  /** Сумма товаров в корзине в BYN (цены парсятся из строк, количество не меньше 1) */
  const totalByn = items.reduce(
    (sum, i) => sum + parsePrice(i.price) * Math.max(1, i.quantity || 1),
    0,
  );

  /**
   * Расчёт стоимости курьера по км из geoState и тарифам delivery; учитывает порог бесплатной доставки от суммы заказа.
   * Для самовывоза или пока нет валидных км — null.
   */
  const deliveryQuote = useMemo(() => {
    if (delivery !== DELIVERY_COURIER) return null;
    if (geoState.status !== "ok" || geoState.distanceKm == null) return null;
    return computeCourierDeliveryQuote(geoState.distanceKm, courierTariff, totalByn);
  }, [delivery, geoState.status, geoState.distanceKm, courierTariff, totalByn]);

  /** Число BYN для строки «Сумма доставки»; null означает «—» в UI (нет км или нет тарифа за км в админке) */
  const deliveryCostByn =
    delivery !== DELIVERY_COURIER
      ? 0
      : deliveryQuote == null
        ? null
        : deliveryQuote.amount;

  /** Итог к оплате при курьере: товары + доставка; если доставку посчитать нельзя — только товары */
  const grandTotalByn = useMemo(() => {
    if (delivery !== DELIVERY_COURIER) return totalByn;
    if (deliveryCostByn == null) return totalByn;
    return Math.round((totalByn + deliveryCostByn) * 100) / 100;
  }, [delivery, totalByn, deliveryCostByn]);

  /**
   * Строка «До:» в том же стиле, что и «От:» (страна, г. город, ул. …, дом, при необходимости корп.).
   * Квартира в подпись не включается. После адреса — точка.
   */
  const deliveryRouteDestinationLabel = useMemo(() => {
    const country = (deliveryAddress.country || "").trim();
    const city = (deliveryAddress.city || "").trim();
    const streetRaw = (deliveryAddress.street || "").trim();
    const house = (deliveryAddress.house_number || "").trim();
    const building = (deliveryAddress.building_number || "").trim();

    const parts = [];
    if (country) parts.push(country);
    if (city) parts.push(`г. ${city}`);
    if (streetRaw) {
      const withUl = /^ул\.?\s/i.test(streetRaw)
        ? streetRaw.replace(/^ул\.?\s*/i, "ул. ")
        : `ул. ${streetRaw}`;
      parts.push(withUl);
    }
    if (house) {
      let tail = house;
      if (building) tail += `, корп. ${building}`;
      parts.push(tail);
    }

    if (parts.length === 0) return "—";
    return parts.join(", ");
  }, [
    deliveryAddress.country,
    deliveryAddress.city,
    deliveryAddress.street,
    deliveryAddress.house_number,
    deliveryAddress.building_number,
  ]);

  /** Дополнительные пояснения под «От / До» (маршрут, тариф, бесплатная доставка) — одной строкой или пусто */
  const courierRouteDetailParts = useMemo(() => {
    const parts = [];
    if (geoState.status === "ok") {
      parts.push("Расстояние по прямой между точкой отправления и адресом доставки (геокодинг Photon).");
    }
    if (geoState.status === "ok" && deliveryQuote != null && courierTariff.ratePerKm != null) {
      parts.push(`Тарификация пробега: ${deliveryQuote.billableKm} км (каждый начатый километр).`);
    }
    if (geoState.status === "ok" && deliveryQuote?.isFreeByOrder) {
      parts.push(
        `Доставка бесплатна при сумме заказа от ${formatPrice(courierTariff.freeDeliveryOrderMin)} BYN.`,
      );
    }
    return parts.join(" ");
  }, [geoState.status, deliveryQuote, courierTariff.ratePerKm, courierTariff.freeDeliveryOrderMin]);

  /**
   * Отправка формы первого шага: валидация телефона (если заполнен) и обязательных полей адреса для курьера.
   * Переход на оплату / создание заказа на бэкенде — в следующих задачах.
   */
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
                {delivery === DELIVERY_COURIER && (
                  <>
                    <div className="checkout-total-line checkout-total-line--compact">
                      <span className="checkout-total-sublabel">Расстояние</span>
                      <span className="checkout-total-meta">
                        {geoState.status === "loading" && "Определение…"}
                        {geoState.status === "idle" && "—"}
                        {geoState.status === "ok" &&
                          geoState.distanceKm != null &&
                          `~ ${geoState.distanceKm.toFixed(1)} км`}
                        {geoState.status === "error" && "—"}
                      </span>
                    </div>
                    <div className="checkout-route-notes">
                      <p className="checkout-total-note">От: {SHOP_LOCATION.label}.</p>
                      <p className="checkout-total-note">
                        До: {deliveryRouteDestinationLabel}
                        {deliveryRouteDestinationLabel !== "—" ? "." : ""}
                      </p>
                      {courierRouteDetailParts ? (
                        <p className="checkout-total-note checkout-total-note--detail">{courierRouteDetailParts}</p>
                      ) : null}
                    </div>
                    {geoState.status === "error" && geoState.message && (
                      <p className="checkout-total-warning">{geoState.message}</p>
                    )}
                  </>
                )}
                {delivery === DELIVERY_COURIER && (
                  <div className="checkout-total-line">
                    <span className="checkout-total-value checkout-total-value--delivery">
                      {geoState.status === "loading" && "…"}
                      {geoState.status !== "loading" && geoState.status !== "ok" && "—"}
                      {geoState.status === "ok" &&
                        deliveryCostByn != null &&
                        `${formatPrice(deliveryCostByn)} BYN`}
                      {geoState.status === "ok" && deliveryCostByn == null && "—"}
                    </span>
                    <span className="checkout-total-label">Сумма доставки</span>
                  </div>
                )}
                {delivery === DELIVERY_COURIER &&
                  geoState.status === "ok" &&
                  deliveryCostByn == null && (
                    <p className="checkout-total-warning">
                      В админке «Доставка» задайте тариф за км (в названии — «км», число = BYN за 1 км). По желанию:
                      «базов»/«подъезд»/«выезд» — фикс к сумме; «минимальн» / «макс» — нижняя и верхняя граница;
                      «бесплатн» + «заказ» — порог суммы заказа для бесплатной доставки.
                    </p>
                  )}
                {delivery === DELIVERY_COURIER && (
                  <>
                    <hr className="checkout-total-divider" />
                    <div className="checkout-total-line">
                      <span className="checkout-total-value checkout-total-value--grand">
                        {formatPrice(grandTotalByn)} BYN
                      </span>
                      <span className="checkout-total-label">К оплате</span>
                    </div>
                  </>
                )}
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
