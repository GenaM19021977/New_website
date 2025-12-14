import { useEffect } from 'react'
import './App.css'
import Register from './components/Register'
import Home from './components/Home'
import About from './components/About'
import Navbar from './components/Navbar'
import Login from './components/Login'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const isAuthenticated = !!localStorage.getItem('access_token')
  const noNavbar = location.pathname === "/register" || location.pathname === "/"

  // Перенаправляем аутентифицированных пользователей с страницы логина на главную
  useEffect(() => {
    if (isAuthenticated && location.pathname === "/") {
      navigate('/home')
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
            <Route path="/home" element={<Home />} />
            <Route path="/about" element={<About />} />
          </Routes>
        }
     
      />
      }  
    </>
  )
}

export default App
