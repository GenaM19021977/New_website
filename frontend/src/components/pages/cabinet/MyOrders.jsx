/**
 * Список заказов пользователя (GET /orders/).
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import api from "../../../services/api";
import { ROUTES, STORAGE_KEYS } from "../../../config/constants";
import { formatPrice } from "../../../utils/price";
import "./MyOrders.css";

const ORDER_STATUS_LABELS = {
  new: "Новый",
  processing: "В обработке",
  shipped: "Отправлен",
};

const PAYMENT_LABELS = {
  cash_on_receipt: "Наличными при получении",
  card_online: "Банковской картой онлайн",
  card_on_receipt: "Банковской картой при получении",
};

const DELIVERY_LABELS = {
  courier: "Курьером",
  pickup: "Самовывоз",
};

function formatOrderDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

const MyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }
    api
      .get("orders/")
      .then((res) => {
        setOrders(Array.isArray(res.data) ? res.data : []);
        setError(null);
      })
      .catch((err) => {
        if (err?.response?.status === 401) {
          localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          navigate(ROUTES.LOGIN, { replace: true });
          return;
        }
        setError("Не удалось загрузить заказы.");
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <main className="page-main my-orders-page">
        <div className="page-container">
          <p className="my-orders-loading">Загрузка…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-main my-orders-page">
      <div className="page-container">
        <section className="page-section my-orders-section">
          <div className="my-orders-toolbar">
            <Button
              component={Link}
              to={ROUTES.CABINET}
              variant="text"
              className="my-orders-back"
            >
              ← Личный кабинет
            </Button>
          </div>
          <h1 className="page-section-heading my-orders-heading">Мои заказы</h1>
          {error ? <p className="my-orders-error">{error}</p> : null}
          {!error && orders.length === 0 ? (
            <p className="my-orders-empty">
              У вас пока нет оформленных заказов.{" "}
              <Link to={ROUTES.CATALOG} className="my-orders-empty-link">
                Перейти в каталог
              </Link>
            </p>
          ) : null}
          <ul className="my-orders-list">
            {orders.map((order) => (
              <li key={order.id} className="my-orders-card">
                <div className="my-orders-card-head">
                  <span className="my-orders-card-id">Заказ №{order.id}</span>
                  <span className="my-orders-card-date">
                    {formatOrderDate(order.created_at)}
                  </span>
                  <span className="my-orders-card-status">
                    {ORDER_STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
                <div className="my-orders-card-sum">
                  <span>Итого: {formatPrice(Number(order.total))} BYN</span>
                  <span className="my-orders-card-sub">
                    Товары: {formatPrice(Number(order.products_subtotal))} BYN ·
                    Доставка: {formatPrice(Number(order.delivery_cost))} BYN
                  </span>
                </div>
                <p className="my-orders-card-meta">
                  {DELIVERY_LABELS[order.delivery_type] || order.delivery_type}
                  {" · "}
                  {PAYMENT_LABELS[order.payment_method] || order.payment_method}
                </p>
                {order.city || order.street ? (
                  <p className="my-orders-card-address">
                    {[
                      order.city,
                      order.street,
                      order.house_number,
                      order.building_number && `корп. ${order.building_number}`,
                      order.apartment_number && `кв. ${order.apartment_number}`,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                ) : null}
                {order.phone ? (
                  <p className="my-orders-card-phone">Тел.: {order.phone}</p>
                ) : null}
                {order.comment ? (
                  <p className="my-orders-card-comment">
                    Комментарий: {order.comment}
                  </p>
                ) : null}
                {order.items?.length ? (
                  <ul className="my-orders-items">
                    {order.items.map((line, idx) => {
                      const name = (line.product_name || "").trim();
                      const qty = Math.max(
                        1,
                        Number(line.quantity) || 1,
                      );
                      return (
                        <li key={`${order.id}-${line.product_id}-${idx}`}>
                          {name} - {qty} шт.
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
};

export default MyOrders;
