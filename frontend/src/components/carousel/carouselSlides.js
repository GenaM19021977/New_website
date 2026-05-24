/**
 * Слайды карусели из frontend/src/images/image carousel/
 */
const carouselContext = require.context(
  "../../images/image carousel",
  true,
  /\.webp$/i,
);

function slideAltFromPath(relativePath) {
  const parts = relativePath.replace(/^\.\//, "").split("/");
  const brand = parts[0] || "Котёл";
  const file = (parts[parts.length - 1] || "").replace(/\.webp$/i, "");
  return file === "i" ? brand : `${brand} — ${file}`;
}

const carouselSlides = carouselContext
  .keys()
  .sort((a, b) => a.localeCompare(b, "ru"))
  .map((key) => {
    const mod = carouselContext(key);
    return {
      src: mod?.default ?? mod,
      alt: slideAltFromPath(key),
    };
  });

export default carouselSlides;
