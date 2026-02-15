import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "../../card/Card";
import api from "../../../services/api";
import "./Catalog.css";

/** Интервал опроса API для обновления списка при изменении данных в БД (мс) */
const REFRESH_INTERVAL_MS = 45000;

/** 5 рядов × 4 карточки в ряд = 20 карточек на странице */
const ROWS_PER_PAGE = 5;
const COLS_PER_ROW = 4;
const CARDS_PER_PAGE = ROWS_PER_PAGE * COLS_PER_ROW;

/** Производитель в БД — третье слово в названии (как в API /manufacturers/) */
function getManufacturerSlug(name) {
  const words = (name || "").trim().split(/\s+/);
  return words.length >= 3 ? words[2].toLowerCase() : "";
}

const Catalog = () => {
  const [searchParams] = useSearchParams();
  const manufacturerSlug = (searchParams.get("manufacturer") || "")
    .trim()
    .toLowerCase();
  const searchQuery = (searchParams.get("search") || "").trim().toLowerCase();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (manufacturerSlug) {
      result = result.filter(
        (p) => getManufacturerSlug(p.name) === manufacturerSlug,
      );
    }
    if (searchQuery) {
      result = result.filter((p) => {
        const name = (p.name || "").toLowerCase();
        const power = (p.power || "").toLowerCase();
        return (
          name.includes(searchQuery) ||
          power.includes(searchQuery)
        );
      });
    }
    return result;
  }, [products, manufacturerSlug, searchQuery]);

  const fetchProducts = useCallback(() => {
    api
      .get("boilers/")
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
    setCurrentPage(1);
  }, [manufacturerSlug, searchQuery]);

  useEffect(() => {
    setCurrentPage((p) => {
      const totalPages = Math.max(
        1,
        Math.ceil(filteredProducts.length / CARDS_PER_PAGE),
      );
      return p > totalPages ? totalPages : p;
    });
  }, [filteredProducts.length]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / CARDS_PER_PAGE),
  );
  const startIndex = (currentPage - 1) * CARDS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(
    startIndex,
    startIndex + CARDS_PER_PAGE,
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      api
        .get("boilers/")
        .then((res) => {
          setProducts(Array.isArray(res.data) ? res.data : []);
        })
        .catch(() => setProducts([]));
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchProducts();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchProducts]);

  return (
    <main className="page-main catalog-page">
      <div className="page-container">
        <section
          className="page-section"
          id="catalog"
          aria-labelledby="catalog-heading"
        >
          <span className="section-number" aria-hidden>
            03
          </span>
          <h1 id="catalog-heading" className="page-section-heading">
            Каталог
          </h1>
          <p className="page-section-text">
            Каталог отопительного оборудования: котлы, водонагреватели, насосы и
            сопутствующие товары.
          </p>
        </section>
        <section
          id="catalog-preview"
          className="home-section home-catalog"
          aria-labelledby="catalog-heading"
        >
          <div className="page-container">
            {loading ? (
              <p className="catalog-loading">Загрузка…</p>
            ) : (
              <>
                {(manufacturerSlug || searchQuery) && (
                  <p className="catalog-filter-hint">
                    {manufacturerSlug && (
                      <>
                        Котлы производителя:{" "}
                        <span className="catalog-filter-hint__slug">
                          {manufacturerSlug}
                        </span>
                      </>
                    )}
                    {manufacturerSlug && searchQuery && " · "}
                    {searchQuery && (
                      <>
                        Поиск:{" "}
                        <span className="catalog-filter-hint__slug">
                          {searchQuery}
                        </span>
                      </>
                    )}
                  </p>
                )}
                <div className="catalog-cards catalog-cards-4">
                  {paginatedProducts.map((product) => (
                    <Card key={product.id} product={product} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <nav
                    className="catalog-pagination"
                    aria-label="Пагинация каталога"
                  >
                    <button
                      type="button"
                      className="catalog-pagination__btn"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      aria-label="Предыдущая страница"
                    >
                      Назад
                    </button>
                    <span className="catalog-pagination__info">
                      Страница {currentPage} из {totalPages}
                    </span>
                    <button
                      type="button"
                      className="catalog-pagination__btn"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      aria-label="Следующая страница"
                    >
                      Вперёд
                    </button>
                  </nav>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Catalog;
