/**
 * Главный компонент приложения
 * 
 * Управляет маршрутизацией и отображением компонентов.
 * Реализует логику:
 * - Автоматическое перенаправление аутентифицированных пользователей
 * - Условное отображение Header (скрыт на страницах логина/регистрации)
 * - Защита маршрутов через ProtectedRoute компонент
 */

import './App.css'
import Register from './components/Register'
import Home from './components/Home'
import About from './components/About'
import Header from './components/Header'
import Login from './components/Login'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoutes'

function App() {
  return (
    <>
      <Routes>
        {/* Публичные маршруты без Header */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Перенаправление с корня на /home */}
        <Route path="/" element={<Navigate to="/home" replace />} />

        {/* Защищенные маршруты с Header */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/home"
            element={
              <Header>
                <Home />
              </Header>
            }
          />
          <Route
            path="/about"
            element={
              <Header>
                <About />
              </Header>
            }
          />
        </Route>
      </Routes>
    </>
  )
}

export default App
