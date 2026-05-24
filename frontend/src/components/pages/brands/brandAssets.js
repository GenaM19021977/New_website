import prothermLogo from "../../../images/logo brands/protherm.webp";
import tecLineLogo from "../../../images/logo brands/TECLine.webp";
import teknixLogo from "../../../images/logo brands/teknix.png";
import woillantLogo from "../../../images/logo brands/woillant.webp";

export const brandLogos = {
  protherm: prothermLogo,
  tecline: tecLineLogo,
  teknix: teknixLogo,
  woillant: woillantLogo,
  vaillant: woillantLogo,
};

export const normalizeBrandSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export const resolveBrandLogo = (slug, name) =>
  brandLogos[normalizeBrandSlug(slug)] || brandLogos[normalizeBrandSlug(name)] || null;
