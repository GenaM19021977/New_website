/**
 * Страница описания товара (котла)
 * Отображает полную информацию о товаре согласно модели ElectricBoiler
 */
import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import api from "../../../services/api";
import { API_BASE_URL } from "../../../config/api";
import { ROUTES } from "../../../config/constants";
import { addToCartIfAuth } from "../../../utils/cart";
import { useCurrency } from "../../../context/CurrencyContext";
import { formatPriceWithCurrency } from "../../../utils/price";
import "./ProductDetail.css";

/** Поля спецификаций: ключ API → подпись для отображения */
const SPEC_LABELS = {
  power: "Мощность, кВт",
  power_regulation: "Регулировка мощности",
  heating_area: "Площадь отопления, рекомендуемая до",
  country: "Страна-производитель",
  work_type: "Начальный вариант работы",
  self_work: "Возможность для работы самостоятельно",
  water_heating: "Возможность для нагрева воды",
  floor_heating: "Возможность нагрева теплого пола",
  expansion_tank: "Расширительный бак",
  circulation_pump: "Циркуляционный насос",
  voltage: "Питание от сети, В",
  cable: "Кабель подключения",
  fuse: "Предохранитель, А",
  temp_range: "Диапазон температур, °C",
  temp_range_radiator: "Диапазон температур (радиаторное отопление), °C",
  temp_range_floor: "Диапазон температур (тёплый пол), °C",
  connection: "Подключение к системе",
  dimensions: "Габаритные размеры, мм",
  wifi: "Подключение WiFi",
  thermostat: "Подключение комнатного термостата",
  thermostat_included: "Комнатный термостат в комплекте",
  outdoor_sensor: "Датчик уличной температуры",
};

/** URL-ы эмодзи/плейсхолдеров (лупа и т.п.), которые не показываем */
const EXCLUDED_IMAGE_URLS = [
  "s.w.org/images/core/emoji",
  "1f50d.svg", // лупа
];

function isExcludedImageUrl(url) {
  if (!url || typeof url !== "string") return true;
  return EXCLUDED_IMAGE_URLS.some((x) => url.includes(x));
}

/** Берёт URL изображения; относительные пути превращает в абсолютные */
function getImageUrl(raw) {
  if (!raw || !raw.trim?.()) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
    return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  const base = (API_BASE_URL || "").replace(/\/$/, "");
  const path = trimmed.replace(/^\//, "");
  return base ? `${base}${path ? (base.endsWith("/") ? path : `/${path}`) : ""}` : trimmed;
}

const ProductDetail = () => {
  const { id } = useParams();
  const { currency, convertPrice } = useCurrency();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const imageFields = ["image_1", "image_2", "image_3", "image_4", "image_5"];
  const images = product
    ? imageFields
        .map((key) => getImageUrl(product[key]))
        .filter((url) => url && !isExcludedImageUrl(url))
    : [];

  const openLightbox = useCallback(() => {
    setLightboxIndex(selectedImageIndex);
    setLightboxOpen(true);
  }, [selectedImageIndex]);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  const goToPrev = useCallback(() => {
    setLightboxIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setLightboxIndex((i) => (i >= images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api
      .get(`boilers/${id}/`)
      .then((res) => setProduct(res.data))
      .catch((err) => {
        setError(err?.response?.status === 404 ? "Товар не найден" : "Ошибка загрузки");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [product?.id]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, closeLightbox, goToPrev, goToNext]);

  if (loading) {
    return (
      <main className="page-main product-detail-page">
        <div className="page-container">
          <p className="product-detail-loading">Загрузка…</p>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="page-main product-detail-page">
        <div className="page-container">
          <p className="product-detail-error">{error || "Товар не найден"}</p>
          <Link to={ROUTES.CATALOG} className="product-detail-back">
            Вернуться в каталог
          </Link>
        </div>
      </main>
    );
  }

  const specs = Object.entries(SPEC_LABELS)
    .map(([key, label]) => ({
      label,
      value: product[key],
    }))
    .filter((s) => s.value != null && String(s.value).trim() !== "");

  const hasImages = images.length > 0;
  const mainImage = images[selectedImageIndex] ?? images[0];

  return (
    <main className="page-main product-detail-page">
      <div className="page-container">
        <Link to={ROUTES.CATALOG} className="product-detail-back">
          ← Вернуться в каталог
        </Link>

        <article className={`product-detail ${!hasImages ? "product-detail--no-gallery" : ""}`}>
          {hasImages && (
            <div className="product-detail__gallery">
              <div className="product-detail__main-image">
                <img
                  src={mainImage}
                  alt={product.name}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                <button
                  type="button"
                  className="product-detail__zoom-btn"
                  onClick={openLightbox}
                  aria-label="Увеличить изображение"
                >
                  <ZoomInIcon />
                </button>
              </div>
              {images.length > 1 && (
                <div className="product-detail__thumbs">
                  {images.slice(0, 5).map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`product-detail__thumb ${selectedImageIndex === i ? "product-detail__thumb--active" : ""}`}
                      onClick={() => setSelectedImageIndex(i)}
                      aria-label={`Показать фото ${i + 1}`}
                      aria-pressed={selectedImageIndex === i}
                    >
                      <img
                        src={src}
                        alt={`${product.name} — фото ${i + 1}`}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="product-detail__info">
            <h1 className="product-detail__title">{product.name}</h1>
            {product.price && (
              <p className="product-detail__price">
                {formatPriceWithCurrency(product.price, currency, convertPrice)}
              </p>
            )}
            <div className="product-detail__actions">
              <button
                type="button"
                className="product-detail__cart-btn"
                onClick={() => addToCartIfAuth(product)}
              >
                В корзину
              </button>
            </div>
            {product.product_url && (
              <a
                href={product.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="product-detail__external-link"
              >
                Подробнее на сайте продавца →
              </a>
            )}

            {product.description && (
              <section className="product-detail__description">
                <h2>Описание</h2>
                <p className="product-detail__description-text">
                  {product.description}
                </p>
              </section>
            )}

            {specs.length > 0 && (
              <section className="product-detail__specs">
                <h2>Характеристики</h2>
                <dl className="product-detail__spec-list">
                  {specs.map(({ label, value }) => (
                    <div key={label} className="product-detail__spec-row">
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {product.documentation && (
              <a
                href={product.documentation}
                target="_blank"
                rel="noopener noreferrer"
                className="product-detail__doc-link"
              >
                Инструкция / документация
              </a>
            )}
          </div>
        </article>
      </div>

      {lightboxOpen && images.length > 0 && (
        <div
          className="product-detail-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр изображений"
          onClick={(e) => e.target === e.currentTarget && closeLightbox()}
        >
          <button
            type="button"
            className="product-detail-lightbox__close"
            onClick={closeLightbox}
            aria-label="Закрыть"
          >
            <CloseIcon />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                className="product-detail-lightbox__nav product-detail-lightbox__nav--prev"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrev();
                }}
                aria-label="Предыдущее изображение"
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                className="product-detail-lightbox__nav product-detail-lightbox__nav--next"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                aria-label="Следующее изображение"
              >
                <ChevronRightIcon />
              </button>
            </>
          )}
          <div className="product-detail-lightbox__content">
            <img
              src={images[lightboxIndex]}
              alt={`${product.name} — фото ${lightboxIndex + 1}`}
              onClick={(e) => e.stopPropagation()}
            />
            {images.length > 1 && (
              <span className="product-detail-lightbox__counter">
                {lightboxIndex + 1} / {images.length}
              </span>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default ProductDetail;
