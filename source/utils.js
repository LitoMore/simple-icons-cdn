import { cssKeywords } from "./colors.js";

export const normalizeColor = (style) => {
  if (style in cssKeywords) {
    return cssKeywords[style];
  }

  if (/^([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(style)) {
    return "#" + style;
  }

  return "";
};

export const svgToPath = (svg) => svg.split('"', 8)[7];
