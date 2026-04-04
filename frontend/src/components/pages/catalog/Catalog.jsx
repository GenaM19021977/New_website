import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "../../card/Card";
import api from "../../../services/api";
import { parsePrice } from "../../../utils/price";
import "./Catalog.css";

/** Интервал опроса API для обновления списка при изменении данных в БД (мс) */
const REFRESH_INTERVAL_MS = 45000;

/** 5 рядов × 3 карточки в ряд = 15 карточек на странице */
const ROWS_PER_PAGE = 5;
const COLS_PER_ROW = 3;
const CARDS_PER_PAGE = ROWS_PER_PAGE * COLS_PER_ROW;

/** Производитель в БД — третье слово в названии (как в API /manufacturers/) */
function getManufacturerSlug(name) {
  const words = (name || "").trim().split(/\s+/);
  return words.length >= 3 ? words[2].toLowerCase() : "";
}

/** Граница «от/до» из поля ввода; пусто или невалидно → null */
function parseFilterBound(str) {
  const t = String(str ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");
  if (t === "") return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

/** Числовая цена для фильтра; текст без цифр («по запросу») → null */
function getNumericCatalogPrice(product) {
  const raw = product?.price;
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!/\d/.test(s)) return null;
  return parsePrice(raw);
}

const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const manufacturerSlug = (searchParams.get("manufacturer") || "")
    .trim()
    .toLowerCase();
  const searchQuery = (searchParams.get("search") || "").trim().toLowerCase();

  const [products, setProducts] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPower, setSelectedPower] = useState("");
  const [selectedHeatingArea, setSelectedHeatingArea] = useState("");
  const [priceFromInput, setPriceFromInput] = useState("");
  const [priceToInput, setPriceToInput] = useState("");

  const [loadingManufacturers, setLoadingManufacturers] = useState(true);

  const priceMinBound = useMemo(
    () => parseFilterBound(priceFromInput),
    [priceFromInput],
  );
  const priceMaxBound = useMemo(
    () => parseFilterBound(priceToInput),
    [priceToInput],
  );
  const priceFilterActive =
    priceMinBound != null || priceMaxBound != null;

  const fetchManufacturers = useCallback(() => {
    setLoadingManufacturers(true);
    api
      .get("manufacturers/")
      .then((res) => {
        setManufacturers(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => setManufacturers([]))
      .finally(() => setLoadingManufacturers(false));
  }, []);

  useEffect(() => {
    fetchManufacturers();
  }, [fetchManufacturers]);

  const powerOptions = useMemo(() => {
    const s = new Set();
    products.forEach((p) => {
      const v = (p.power || "").trim();
      if (v) s.add(v);
    });
    return Array.from(s).sort((a, b) =>
      a.localeCompare(b, "ru", { sensitivity: "base" }),
    );
  }, [products]);

  const heatingAreaOptions = useMemo(() => {
    const s = new Set();
    products.forEach((p) => {
      const v = (p.heating_area || "").trim();
      if (v) s.add(v);
    });
    return Array.from(s).sort((a, b) =>
      a.localeCompare(b, "ru", { sensitivity: "base" }),
    );
  }, [products]);

  const manufacturerLabel = useMemo(() => {
    const m = manufacturers.find((x) => x.slug === manufacturerSlug);
    return m?.name || manufacturerSlug || "";
  }, [manufacturers, manufacturerSlug]);

  const setManufacturerFilter = useCallback(
    (slug) => {
      setSearchParams((prev) => {
        const n = new URLSearchParams(prev);
        const s = (slug || "").trim().toLowerCase();
        if (s) n.set("manufacturer", s);
        else n.delete("manufacturer");
        return n;
      });
    },
    [setSearchParams],
  );

  const resetFilters = useCallback(() => {
    setSelectedPower("");
    setSelectedHeatingArea("");
    setPriceFromInput("");
    setPriceToInput("");
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

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
    if (selectedPower) {
      result = result.filter(
        (p) => (p.power || "").trim() === selectedPower,
      );
    }
    if (selectedHeatingArea) {
      result = result.filter(
        (p) => (p.heating_area || "").trim() === selectedHeatingArea,
      );
    }
    if (priceFilterActive) {
      result = result.filter((p) => {
        const n = getNumericCatalogPrice(p);
        if (n === null) return false;
        if (priceMinBound != null && n < priceMinBound) return false;
        if (priceMaxBound != null && n > priceMaxBound) return false;
        return true;
      });
    }
    return result;
  }, [
    products,
    manufacturerSlug,
    searchQuery,
    selectedPower,
    selectedHeatingArea,
    priceFilterActive,
    priceMinBound,
    priceMaxBound,
  ]);

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
  }, [
    manufacturerSlug,
    searchQuery,
    selectedPower,
    selectedHeatingArea,
    priceFromInput,
    priceToInput,
  ]);

  useEffect(() => {
    if (selectedPower && !powerOptions.includes(selectedPower)) {
      setSelectedPower("");
    }
  }, [powerOptions, selectedPower]);

  useEffect(() => {
    if (
      selectedHeatingArea &&
      !heatingAreaOptions.includes(selectedHeatingArea)
    ) {
      setSelectedHeatingArea("");
    }
  }, [heatingAreaOptions, selectedHeatingArea]);

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
              <div className="catalog-layout">
                <aside
                  className="catalog-filters"
                  aria-label="Фильтры каталога"
                >
                  <h2 className="catalog-filters__title">Фильтры</h2>

                  <fieldset className="catalog-filters__fieldset">
                    <legend className="catalog-filters__legend">
                      Производитель
                    </legend>
                    {loadingManufacturers ? (
                      <p className="catalog-filters__muted">Загрузка…</p>
                    ) : (
                      <ul className="catalog-filters__list" role="list">
                        <li>
                          <button
                            type="button"
                            className={
                              manufacturerSlug
                                ? "catalog-filters__chip"
                                : "catalog-filters__chip catalog-filters__chip--active"
                            }
                            onClick={() => setManufacturerFilter("")}
                          >
                            Все
                          </button>
                        </li>
                        {manufacturers.map((m) => (
                          <li key={m.slug}>
                            <button
                              type="button"
                              className={
                                manufacturerSlug === m.slug
                                  ? "catalog-filters__chip catalog-filters__chip--active"
                                  : "catalog-filters__chip"
                              }
                              onClick={() => setManufacturerFilter(m.slug)}
                            >
                              {m.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </fieldset>

                  <fieldset className="catalog-filters__fieldset">
                    <legend className="catalog-filters__legend">
                      Цена, BYN
                    </legend>
                    <div className="catalog-filters__price-row">
                      <div className="catalog-filters__price-field">
                        <label
                          className="catalog-filters__price-label"
                          htmlFor="catalog-price-from"
                        >
                          От
                        </label>
                        <input
                          id="catalog-price-from"
                          type="text"
                          inputMode="decimal"
                          className="catalog-filters__number-input"
                          placeholder="0"
                          value={priceFromInput}
                          onChange={(e) => setPriceFromInput(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <div className="catalog-filters__price-field">
                        <label
                          className="catalog-filters__price-label"
                          htmlFor="catalog-price-to"
                        >
                          До
                        </label>
                        <input
                          id="catalog-price-to"
                          type="text"
                          inputMode="decimal"
                          className="catalog-filters__number-input"
                          placeholder=""
                          value={priceToInput}
                          onChange={(e) => setPriceToInput(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </fieldset>

                  {powerOptions.length > 0 && (
                    <fieldset className="catalog-filters__fieldset">
                      <legend className="catalog-filters__legend">
                        Мощность, KВт
                      </legend>
                      <select
                        id="catalog-power-select"
                        className="catalog-filters__select"
                        aria-label="Мощность, кВт"
                        value={selectedPower}
                        onChange={(e) => setSelectedPower(e.target.value)}
                      >
                        <option value="">Все значения</option>
                        {powerOptions.map((pw) => (
                          <option key={pw} value={pw}>
                            {pw}
                          </option>
                        ))}
                      </select>
                    </fieldset>
                  )}

                  {heatingAreaOptions.length > 0 && (
                    <fieldset className="catalog-filters__fieldset">
                      <legend className="catalog-filters__legend">
                        Отапливаемая площадь, м²
                      </legend>
                      <select
                        id="catalog-heating-area-select"
                        className="catalog-filters__select"
                        aria-label="Отапливаемая площадь, м²"
                        value={selectedHeatingArea}
                        onChange={(e) => setSelectedHeatingArea(e.target.value)}
                      >
                        <option value="">Все значения</option>
                        {heatingAreaOptions.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                    </fieldset>
                  )}

                  <p className="catalog-filters__count" aria-live="polite">
                    Найдено: {filteredProducts.length}
                    {filteredProducts.length !== products.length
                      ? ` из ${products.length}`
                      : ""}
                  </p>

                  <button
                    type="button"
                    className="catalog-filters__btn catalog-filters__btn--ghost"
                    onClick={resetFilters}
                    disabled={
                      !manufacturerSlug &&
                      !searchQuery &&
                      !selectedPower &&
                      !selectedHeatingArea &&
                      !priceFromInput.trim() &&
                      !priceToInput.trim()
                    }
                  >
                    Сбросить фильтры
                  </button>
                </aside>

                <div className="catalog-main">
                  {(manufacturerSlug ||
                    searchQuery ||
                    selectedPower ||
                    selectedHeatingArea ||
                    priceFilterActive) && (
                    <p className="catalog-filter-hint">
                      {manufacturerSlug && (
                        <>
                          Производитель:{" "}
                          <span className="catalog-filter-hint__slug">
                            {manufacturerLabel || manufacturerSlug}
                          </span>
                        </>
                      )}
                      {manufacturerSlug &&
                        (searchQuery ||
                          selectedPower ||
                          selectedHeatingArea ||
                          priceFilterActive) &&
                        " · "}
                      {searchQuery && (
                        <>
                          Поиск:{" "}
                          <span className="catalog-filter-hint__slug">
                            {searchQuery}
                          </span>
                        </>
                      )}
                      {searchQuery &&
                        (selectedPower ||
                          selectedHeatingArea ||
                          priceFilterActive) &&
                        " · "}
                      {selectedPower && (
                        <>
                          Мощность, кВт:{" "}
                          <span className="catalog-filter-hint__slug">
                            {selectedPower}
                          </span>
                        </>
                      )}
                      {selectedPower &&
                        (selectedHeatingArea || priceFilterActive) &&
                        " · "}
                      {selectedHeatingArea && (
                        <>
                          Площадь, м²:{" "}
                          <span className="catalog-filter-hint__slug">
                            {selectedHeatingArea}
                          </span>
                        </>
                      )}
                      {selectedHeatingArea && priceFilterActive && " · "}
                      {priceFilterActive && (
                        <>
                          Цена, BYN:{" "}
                          <span className="catalog-filter-hint__slug">
                            {priceMinBound != null ? `от ${priceMinBound}` : ""}
                            {priceMinBound != null && priceMaxBound != null
                              ? " "
                              : ""}
                            {priceMaxBound != null ? `до ${priceMaxBound}` : ""}
                          </span>
                        </>
                      )}
                    </p>
                  )}
                  {filteredProducts.length === 0 ? (
                    <p className="catalog-empty">
                      По выбранным фильтрам ничего не найдено. Попробуйте изменить
                      условия или{" "}
                      <button
                        type="button"
                        className="catalog-empty__link"
                        onClick={resetFilters}
                      >
                        сбросить фильтры
                      </button>
                      .
                    </p>
                  ) : (
                    <>
                      <div className="catalog-cards catalog-cards-3">
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
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Catalog;
