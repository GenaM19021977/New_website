/**
 * Главный компонент приложения
 * 
 * Управляет маршрутизацией и отображением компонентов.
 * Реализует логику:
 * - Автоматическое перенаправление аутентифицированных пользователей
 * - Условное отображение Navbar (скрыт на страницах логина/регистрации)
 * - Защита маршрутов через ProtectedRoute компонент
 */

import { useEffect } from 'react'
import './App.css'
import Register from './components/Register'
import Home from './components/Home'
import About from './components/About'
import Navbar from './components/Navbar'
import Login from './components/Login'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoutes'

function App() {
  // Хук для получения текущего пути
  const location = useLocation()
  
  // Хук для программной навигации
  const navigate = useNavigate()
  
  // Проверка аутентификации пользователя (наличие access токена)
  const isAuthenticated = !!localStorage.getItem('access_token')
  
  // Определение, нужно ли скрывать Navbar (на страницах логина и регистрации)
  const noNavbar = location.pathname === "/register" || location.pathname === "/"

  /**
   * Эффект для автоматического перенаправления аутентифицированных пользователей
   * 
   * Если пользователь уже авторизован и находится на странице логина,
   * автоматически перенаправляет его на главную страницу.
   * Исключение: если пользователь явно перешел на страницу логина
   * (через ссылку из Register компонента).
   */
  useEffect(() => {
    // Проверка флага явного перехода на страницу логина
    const isExplicitLoginNavigation = sessionStorage.getItem('explicitLoginNavigation')
    
    // Перенаправление, если пользователь авторизован и на странице логина
    if (isAuthenticated && location.pathname === "/" && !isExplicitLoginNavigation) {
      navigate('/home')
    }
    
    // Очистка флага после использования
    if (isExplicitLoginNavigation) {
      sessionStorage.removeItem('explicitLoginNavigation')
    }
  }, [isAuthenticated, location.pathname, navigate])

  return (
    <>
      {
        // Условное отображение: с Navbar или без
        noNavbar ?
          // Маршруты без Navbar (публичные страницы)
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>

          :

          // Маршруты с Navbar (защищенные страницы)
          <Navbar
            content={
              <Routes>
                {/* Защищенные маршруты требуют аутентификации */}
                <Route element={<ProtectedRoute/>}>
                  <Route path="/home" element={<Home />} />
                  <Route path="/about" element={<About />} />
                </Route>               
              </Routes>
            }
          />
      }
    </>
  )
}

export default App
