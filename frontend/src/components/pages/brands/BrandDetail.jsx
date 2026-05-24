/**
 * Детальная страница бренда по slug в URL.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../../services/api";
import { ROUTES } from "../../../config/constants";
import { normalizeBrandSlug, resolveBrandLogo } from "./brandAssets";
import "./BrandDetail.css";

const prettifyBrandName = (slug) =>
  String(slug || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const BrandDetail = () => {
  const { slug } = useParams();
  const [manufacturer, setManufacturer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) {
      setError("Бренд не найден");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    api
      .get("manufacturers/")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        const normalizedSlug = normalizeBrandSlug(slug);
        const found = list.find(
          (item) =>
            normalizeBrandSlug(item.slug) === normalizedSlug ||
            normalizeBrandSlug(item.name) === normalizedSlug,
        );
        if (!found) {
          setError("Бренд не найден");
          setManufacturer(null);
          return;
        }
        setManufacturer(found);
      })
      .catch(() => {
        setError("Ошибка загрузки");
        setManufacturer(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const brandName = useMemo(
    () => manufacturer?.name || prettifyBrandName(slug),
    [manufacturer?.name, slug],
  );
  const brandLogo = useMemo(
    () => resolveBrandLogo(manufacturer?.slug || slug, manufacturer?.name || brandName),
    [brandName, manufacturer?.name, manufacturer?.slug, slug],
  );
  const isTeknixBrand = useMemo(() => {
    const normalizedSlug = normalizeBrandSlug(manufacturer?.slug || slug);
    const normalizedName = normalizeBrandSlug(manufacturer?.name || brandName);
    return normalizedSlug === "teknix" || normalizedName === "teknix";
  }, [brandName, manufacturer?.name, manufacturer?.slug, slug]);
  const isProthermBrand = useMemo(() => {
    const normalizedSlug = normalizeBrandSlug(manufacturer?.slug || slug);
    const normalizedName = normalizeBrandSlug(manufacturer?.name || brandName);
    return normalizedSlug === "protherm" || normalizedName === "protherm";
  }, [brandName, manufacturer?.name, manufacturer?.slug, slug]);
  const isTeclineBrand = useMemo(() => {
    const normalizedSlug = normalizeBrandSlug(manufacturer?.slug || slug);
    const normalizedName = normalizeBrandSlug(manufacturer?.name || brandName);
    return (
      normalizedSlug === "tecline" ||
      normalizedSlug === "tekline" ||
      normalizedName === "tecline" ||
      normalizedName === "tekline"
    );
  }, [brandName, manufacturer?.name, manufacturer?.slug, slug]);
  const isVaillantBrand = useMemo(() => {
    const normalizedSlug = normalizeBrandSlug(manufacturer?.slug || slug);
    const normalizedName = normalizeBrandSlug(manufacturer?.name || brandName);
    return normalizedSlug === "vaillant" || normalizedName === "vaillant";
  }, [brandName, manufacturer?.name, manufacturer?.slug, slug]);

  if (loading) {
    return (
      <main className="page-main brand-detail-page">
        <div className="page-container">
          <p className="brand-detail-loading">Загрузка…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-main brand-detail-page">
        <div className="page-container">
          <p className="brand-detail-error">{error}</p>
          <Link to={ROUTES.BRANDS} className="brand-detail-back">
            Вернуться к брендам
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-main brand-detail-page">
      <div className="page-container">
        <Link to={ROUTES.BRANDS} className="brand-detail-back">
          ← Вернуться к брендам
        </Link>
        <article className="brand-detail-card">
          <h1 className="brand-detail-title">{brandName}</h1>
          {brandLogo ? (
            <img className="brand-detail-logo" src={brandLogo} alt={brandName} />
          ) : (
            <p className="brand-detail-description">Страница производителя {brandName}.</p>
          )}
          {isTeknixBrand && (
            <div className="brand-detail-video">
              <iframe
                width="560"
                height="315"
                src="https://www.youtube.com/embed/j9UtjDY0_cw?si=JTUCiGUfIdXp5NLL"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
              <iframe
                width="560"
                height="315"
                src="https://www.youtube.com/embed/iVjl6KGLsGg?si=20rD-Aa2ThmhgZNf"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
              <iframe
                width="560"
                height="315"
                src="https://www.youtube.com/embed/qoVmdVsArsg?si=G3nqzoKLeS-x15-Z"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          )}
          {isProthermBrand && (
            <div className="brand-detail-video">
              <iframe
                width="560"
                height="315"
                src="https://www.youtube.com/embed/6CguXawwv-U?si=PHQE1wKwVyUiGwjJ"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
              <iframe
                width="560"
                height="315"
                src="https://www.youtube.com/embed/2mWXfYXPsZU?si=xAjU0iukrsXpGeIW"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
              <iframe
                width="560"
                height="315"
                src="https://www.youtube.com/embed/eF3I7zWPvHk?si=yh83DSMwR9CL4VD8"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          )}
          {isTeclineBrand && (
            <div className="brand-detail-video">
              <iframe
                width="560"
                height="315"
                src="https://rutube.ru/play/embed/d4e7cb4b9d03f7b29a86f18f2651bfc6"
                title="RUTUBE video player"
                frameBorder="0"
                allow="clipboard-write; autoplay; encrypted-media; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          )}
          {isVaillantBrand && (
            <div className="brand-detail-video">
              <iframe
                width="560"
                height="315"
                src="https://rutube.ru/play/embed/ab1335f2e49ec4babcd2c4257103f775"
                title="RUTUBE video player"
                frameBorder="0"
                allow="clipboard-write; autoplay; encrypted-media; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          )}
        </article>
      </div>
    </main>
  );
};

export default BrandDetail;
