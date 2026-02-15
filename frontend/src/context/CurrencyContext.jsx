/**
 * Контекст выбранной валюты и курсов НБРБ для конвертации цен
 * Базовая валюта: BYN. Цены конвертируются по курсу НБРБ.
 */
import { createContext, useContext, useState, useEffect } from "react";
import { STORAGE_KEYS, CURRENCIES } from "../config/constants";
import { fetchExchangeRates, convertFromBYN } from "../services/exchangeRates";

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENCY);
    return CURRENCIES.includes(saved) ? saved : "BYN";
  });
  const [rates, setRates] = useState(null);

  useEffect(() => {
    fetchExchangeRates().then(setRates);
  }, []);

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

  /** Конвертирует цену из BYN в выбранную валюту */
  const convertPrice = (amountInBYN) => {
    return convertFromBYN(amountInBYN, currency, rates);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convertPrice, ratesLoaded: !!rates }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENCY);
    return {
      currency: CURRENCIES.includes(saved) ? saved : "BYN",
      setCurrency: () => {},
      convertPrice: (n) => n,
      ratesLoaded: false,
    };
  }
  return ctx;
}
