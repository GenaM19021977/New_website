/**
 * Страница "Бренды"
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../services/api";
import { ROUTES } from "../../../config/constants";
import { normalizeBrandSlug, resolveBrandLogo } from "./brandAssets";
import "./Brands.css";

const Brands = () => {
  const [manufacturers, setManufacturers] = useState([]);
  const [loadingManufacturers, setLoadingManufacturers] = useState(true);

  useEffect(() => {
    setLoadingManufacturers(true);
    api
      .get("manufacturers/")
      .then((res) => {
        setManufacturers(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        setManufacturers([]);
      })
      .finally(() => {
        setLoadingManufacturers(false);
      });
  }, []);

  return (
    <main className="page-main brands-page">
      <div className="page-container">
        <section
          className="page-section"
          id="brands"
          aria-labelledby="brands-heading"
        >
          <span className="section-number" aria-hidden>
            04
          </span>
          {/* <h1 id="brands-heading" className="page-section-heading">
            Бренды
          </h1> */}
          <p className="page-section-text">
            Проверенные производители отопительного оборудования.
          </p>
          {loadingManufacturers ? (
            <p className="brands-loading">Загрузка брендов...</p>
          ) : manufacturers.length === 0 ? (
            <p className="brands-empty">Список брендов пока пуст.</p>
          ) : (
            <ul
              className="brands-cards"
              role="list"
              aria-label="Список производителей котлов"
            >
              {manufacturers.map((manufacturer) => {
                // Формируем slug для маршрута по аналогии с карточкой товара в каталоге.
                const slug = normalizeBrandSlug(manufacturer.slug || manufacturer.name);
                const logo = resolveBrandLogo(manufacturer.slug, manufacturer.name);
                return (
                  <li key={manufacturer.slug || manufacturer.name} className="brands-card">
                    <Link
                      to={ROUTES.brandBySlug(slug)}
                      className="brands-card__button"
                      aria-label={`Перейти к бренду: ${manufacturer.name}`}
                    >
                      {logo ? (
                        <img
                          className="brands-card__logo"
                          src={logo}
                          alt={manufacturer.name}
                          loading="lazy"
                        />
                      ) : (
                        <span className="brands-card__name">
                          {manufacturer.name}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
};

export default Brands;
