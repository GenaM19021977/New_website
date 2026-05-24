/**
 * Точка входа приложения
 * 
 * Инициализирует React приложение и подключает маршрутизацию.
 * Использует React 18 API с createRoot для рендеринга.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter as Router } from 'react-router-dom';
import { CurrencyProvider } from './context/CurrencyContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

const googleClientId = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();

const appTree = (
  <Router>
    <CurrencyProvider>
      <App />
    </CurrencyProvider>
  </Router>
);

// Создание корневого элемента и рендеринг приложения
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>{appTree}</GoogleOAuthProvider>
    ) : (
      appTree
    )}
  </React.StrictMode>
);

