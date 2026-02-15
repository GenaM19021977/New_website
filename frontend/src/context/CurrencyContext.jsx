/**
 * Контекст выбранной валюты для отображения цен по всему приложению
 */
import { createContext, useContext, useState, useEffect } from "react";
import { STORAGE_KEYS, CURRENCIES } from "../config/constants";

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENCY);
    return CURRENCIES.includes(saved) ? saved : "RUB";
  });

  useEffect(() => {
    const handler = () => {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENCY);
      if (CURRENCIES.includes(saved)) setCurrencyState(saved);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setCurrency = (code) => {
    if (CURRENCIES.includes(code)) {
      setCurrencyState(code);
      localStorage.setItem(STORAGE_KEYS.CURRENCY, code);
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENCY);
    return {
      currency: CURRENCIES.includes(saved) ? saved : "RUB",
      setCurrency: () => {},
    };
  }
  return ctx;
}
