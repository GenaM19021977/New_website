/**
 * Защита маршрутов корзины и оформления заказа.
 * Показывает сообщение и ссылки на вход/регистрацию для неавторизованных.
 */
import { Link } from "react-router-dom";
import { isAuth } from "../../utils/cart";
import { ROUTES, AUTH_REQUIRED_PURCHASE } from "../../config/constants";
import "./PurchaseAuthGuard.css";

export default function PurchaseAuthGuard({ children, message }) {
  if (isAuth()) {
    return children;
  }

  return (
    <main className="page-main purchase-auth-guard">
      <div className="page-container">
        <div className="purchase-auth-guard__box">
          <p className="purchase-auth-guard__message">{message ?? AUTH_REQUIRED_PURCHASE}</p>
          <div className="purchase-auth-guard__actions">
            <Link to={ROUTES.LOGIN} className="purchase-auth-guard__btn purchase-auth-guard__btn--primary">
              Войти
            </Link>
            <Link to={ROUTES.REGISTER} className="purchase-auth-guard__btn purchase-auth-guard__btn--secondary">
              Регистрация
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
