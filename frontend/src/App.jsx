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
  const location = useLocation()
  const navigate = useNavigate()
  const isAuthenticated = !!localStorage.getItem('access_token')
  const noNavbar = location.pathname === "/register" || location.pathname === "/"

  // Перенаправляем аутентифицированных пользователей с страницы логина на главную
  // Но не перенаправляем, если пользователь явно переходит на страницу логина
  useEffect(() => {
    const isExplicitLoginNavigation = sessionStorage.getItem('explicitLoginNavigation')
    if (isAuthenticated && location.pathname === "/" && !isExplicitLoginNavigation) {
      navigate('/home')
    }
    // Очищаем флаг после использования
    if (isExplicitLoginNavigation) {
      sessionStorage.removeItem('explicitLoginNavigation')
    }
  }, [isAuthenticated, location.pathname, navigate])

  return (
    <>
      {
        noNavbar ?
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>

          :

          <Navbar
            content={
              <Routes>
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
