/**
 * Главный компонент приложения
 *
 * Управляет маршрутизацией и отображением компонентов.
 * Реализует логику:
 * - Автоматическое перенаправление аутентифицированных пользователей
 * - Условное отображение Header (скрыт на страницах логина/регистрации)
 * - Защита маршрутов через ProtectedRoute компонент
 */

import "./App.css";
import Register from "./components/pages/register/Register";
import Home from "./components/pages/home/Home";
import About from "./components/pages/about/About";
import Catalog from "./components/pages/catalog/Catalog";
import ProductDetail from "./components/pages/product/ProductDetail";
import Selection from "./components/pages/selection/Selection";
import Brands from "./components/pages/brands/Brands";
import Contacts from "./components/pages/contacts/Contacts";
import PersonalCabinet from "./components/pages/cabinet/PersonalCabinet";
import Cart from "./components/pages/cart/Cart";
import Checkout from "./components/pages/checkout/Checkout";
import PurchaseAuthGuard from "./components/auth/PurchaseAuthGuard";
import Header from "./components/header/Header";
import Login from "./components/pages/login/Login";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ROUTES } from "./config/constants";

/** При смене маршрута прокручивает страницу вверх (для ссылок: Домашняя, О нас, Каталог, Подбор, Бренды, Контакты, логотип). */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Публичные маршруты без Header */}
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.REGISTER} element={<Register />} />

        {/* Перенаправление с корня на /home */}
        <Route path="/" element={<Navigate to={ROUTES.HOME} replace />} />

        {/* Публичные маршруты с Header (доступны без авторизации) */}
        <Route
          path={ROUTES.HOME}
          element={
            <Header>
              <Home />
            </Header>
          }
        />
        <Route
          path={ROUTES.ABOUT}
          element={
            <Header>
              <About />
            </Header>
          }
        />
        <Route
          path={ROUTES.CATALOG}
          element={
            <Header>
              <Catalog />
            </Header>
          }
        />
        <Route
          path="/catalog/:id"
          element={
            <Header>
              <ProductDetail />
            </Header>
          }
        />
        <Route
          path={ROUTES.SELECTION}
          element={
            <Header>
              <Selection />
            </Header>
          }
        />
        <Route
          path={ROUTES.BRANDS}
          element={
            <Header>
              <Brands />
            </Header>
          }
        />
        <Route
          path={ROUTES.CONTACTS}
          element={
            <Header>
              <Contacts />
            </Header>
          }
        />
        <Route
          path={ROUTES.CABINET}
          element={
            <Header>
              <PersonalCabinet />
            </Header>
          }
        />
        <Route
          path={ROUTES.CART}
          element={
            <Header>
              <PurchaseAuthGuard>
                <Cart />
              </PurchaseAuthGuard>
            </Header>
          }
        />
        <Route
          path={ROUTES.CHECKOUT}
          element={
            <Header>
              <PurchaseAuthGuard>
                <Checkout />
              </PurchaseAuthGuard>
            </Header>
          }
        />
      </Routes>
    </>
  );
}

export default App;
