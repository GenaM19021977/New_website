import { useCallback, useEffect, useRef, useState } from "react";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import carouselSlides from "./carouselSlides";
import "./Carousel3D.css";

const AUTOPLAY_MS = 4500;
const VISIBLE_RADIUS = 3;

function wrapOffset(index, activeIndex, total) {
  let offset = index - activeIndex;
  if (offset > total / 2) offset -= total;
  if (offset < -total / 2) offset += total;
  return offset;
}

function slideStyle(offset) {
  const abs = Math.abs(offset);
  if (abs > VISIBLE_RADIUS) {
    return {
      opacity: 0,
      pointerEvents: "none",
      transform:
        "translate(-50%, -50%) translateX(0) rotateY(0deg) translateZ(-400px) scale(0.5)",
      zIndex: 0,
    };
  }

  const rotateY = offset * 42;
  const translateX = offset * 28;
  const translateZ = 120 - abs * 90;
  const scale = 1 - abs * 0.14;
  const opacity = 1 - abs * 0.22;

  return {
    opacity,
    pointerEvents: abs === 0 ? "auto" : "none",
    transform: `translate(-50%, -50%) translateX(${translateX}%) rotateY(${rotateY}deg) translateZ(${translateZ}px) scale(${scale})`,
    zIndex: 10 - abs,
  };
}

const Carousel3D = ({ slides = carouselSlides }) => {
  const total = slides.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);

  const goTo = useCallback(
    (index) => {
      if (total === 0) return;
      setActiveIndex(((index % total) + total) % total);
    },
    [total],
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  useEffect(() => {
    if (total <= 1 || paused) return undefined;
    const id = window.setInterval(goNext, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [total, paused, goNext]);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const delta = end - start;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) goNext();
    else goPrev();
  };

  if (total === 0) {
    return null;
  }

  return (
    <div
      className="carousel-3d"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Галерея котлов"
    >
      <div className="carousel-3d-body">
        {total > 1 ? (
          <IconButton
            type="button"
            className="carousel-3d-nav carousel-3d-nav--prev"
            onClick={goPrev}
            aria-label="Предыдущий слайд"
          >
            <ChevronLeftIcon />
          </IconButton>
        ) : null}

        <div
          className="carousel-3d-viewport"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="carousel-3d-stage">
            {slides.map((slide, index) => {
              const offset = wrapOffset(index, activeIndex, total);
              return (
                <figure
                  key={`${slide.src}-${index}`}
                  className={`carousel-3d-slide${
                    offset === 0 ? " carousel-3d-slide--active" : ""
                  }`}
                  style={slideStyle(offset)}
                  aria-hidden={offset !== 0}
                >
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    loading="lazy"
                    draggable={false}
                  />
                </figure>
              );
            })}
          </div>
        </div>

        {total > 1 ? (
          <IconButton
            type="button"
            className="carousel-3d-nav carousel-3d-nav--next"
            onClick={goNext}
            aria-label="Следующий слайд"
          >
            <ChevronRightIcon />
          </IconButton>
        ) : null}
      </div>

    </div>
  );
};

export default Carousel3D;
