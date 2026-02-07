import { useEffect, useState, useCallback } from 'react';
import Card from '../../card/Card';
import api from '../../../services/api';
import './Catalog.css';

/** Интервал опроса API для обновления списка при изменении данных в БД (мс) */
const REFRESH_INTERVAL_MS = 45000;

const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(() => {
    api
      .get('boilers/')
      .then((res) => {
        setProducts(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      api
        .get('boilers/')
        .then((res) => {
          setProducts(Array.isArray(res.data) ? res.data : []);
        })
        .catch(() => setProducts([]));
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProducts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchProducts]);

  return (
    <main className="page-main catalog-page">
      <div className="page-container">
        <section className="page-section" id="catalog" aria-labelledby="catalog-heading">
          <span className="section-number" aria-hidden>03</span>
          <h1 id="catalog-heading" className="page-section-heading">
            Каталог
          </h1>
          <p className="page-section-text">
            Каталог отопительного оборудования: котлы, водонагреватели, насосы и сопутствующие товары.
          </p>
        </section>
        <section id="catalog-preview" className="home-section home-catalog" aria-labelledby="catalog-heading">
          <div className="page-container">
            {loading ? (
              <p className="catalog-loading">Загрузка…</p>
            ) : (
              <div className="catalog-cards catalog-cards-4">
                {products.map((product) => (
                  <Card key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Catalog;
