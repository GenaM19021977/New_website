/**
 * Главный компонент приложения
 * 
 * Управляет маршрутизацией и отображением компонентов.
 * Реализует логику:
 * - Автоматическое перенаправление аутентифицированных пользователей
 * - Условное отображение Header (скрыт на страницах логина/регистрации)
 * - Защита маршрутов через ProtectedRoute компонент
 */

import './App.css';
import Register from './components/pages/register/Register';
import Home from './components/pages/home/Home';
import About from './components/pages/about/About';
import Warranty from './components/pages/warranty/Warranty';
import Delivery from './components/pages/delivery/Delivery';
import Payment from './components/pages/payment/Payment';
import Return from './components/pages/return/Return';
import New from './components/pages/new/New';
import Header from './components/header/Header';
import Login from './components/pages/login/Login';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './config/constants';

function App() {
  return (
    <>
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
          path={ROUTES.WARRANTY}
          element={
            <Header>
              <Warranty />
            </Header>
          }
        />
        <Route
          path={ROUTES.DELIVERY}
          element={
            <Header>
              <Delivery />
            </Header>
          }
        />
        <Route
          path={ROUTES.PAYMENT}
          element={
            <Header>
              <Payment />
            </Header>
          }
        />
        <Route
          path={ROUTES.RETURN}
          element={
            <Header>
              <Return />
            </Header>
          }
        />
        <Route
          path={ROUTES.NEW}
          element={
            <Header>
              <New />
            </Header>
          }
        />
      </Routes>
    </>
  );
}

export default App;
