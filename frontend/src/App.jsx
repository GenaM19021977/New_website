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
import Catalog from './components/pages/catalog/Catalog';
import Selection from './components/pages/selection/Selection';
import Brands from './components/pages/brands/Brands';
import Contacts from './components/pages/contacts/Contacts';
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
          path={ROUTES.CATALOG}
          element={
            <Header>
              <Catalog />
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
      </Routes>
    </>
  );
}

export default App;
