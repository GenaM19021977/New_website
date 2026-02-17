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

// Создание корневого элемента и рендеринг приложения
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <CurrencyProvider>
        <App />
      </CurrencyProvider>
    </Router>
  </React.StrictMode>
);

