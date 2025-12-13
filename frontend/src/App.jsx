import { useState } from 'react'
import './App.css'
import Register from './components/Register'
import Home from './components/Home'
import Navbar from './components/Navbar'
import Login from './components/Login'
import { Routes, Route } from 'react-router-dom'

function App() {

  return (
    <>
     <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/home" element={<Home />} />
      <Route path="/navbar" element={<Navbar />} />
     </Routes>
    </>
  )
}

export default App
