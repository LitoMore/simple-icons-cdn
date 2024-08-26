import * as simpleIcons from "npm:simple-icons";
import SVGPathCommander from "npm:svg-path-commander";
import { normalizeColor } from "./utils.js";

export const getSimpleIcon = (slug) => {
  if (!slug) {
    return null;
  }

  const normaizedSlug = slug
    .toLowerCase()
    .replaceAll(" ", "plus")
    .replaceAll("+", "plus")
    .replaceAll(".", "dot");

  const iconKey = "si" + normaizedSlug.charAt(0).toUpperCase() +
    normaizedSlug.slice(1);

  if (iconKey in simpleIcons) {
    return simpleIcons[iconKey];
  }

  return null;
};

export const getIconSize = (path) => {
  const { width, height } = SVGPathCommander.getPathBBox(path);
  return { width, height };
};

export const resetIconPosition = (path, iconWidth, iconHeight) => {
  const scale = 24 / iconHeight;
  const actualViewboxWidth = iconWidth > iconHeight
    ? iconWidth * scale
    : iconWidth;
  const betterViewboxWidth = Math.ceil(actualViewboxWidth);
  const betterOffset = (betterViewboxWidth - actualViewboxWidth) / 2;
  const pathRescale = iconWidth > iconHeight
    ? new SVGPathCommander(path).transform({ scale }).toString()
    : path;
  const { x: offsetX, y: offsetY } = SVGPathCommander.getPathBBox(pathRescale);
  const pathReset = new SVGPathCommander(pathRescale)
    .transform({
      translate: [-offsetX + betterOffset, -offsetY],
    })
    .toString();
  return { path: pathReset, betterViewboxWidth };
};

export const getIconSvg = (icon, color = "", darkModeColor = "", viewbox) => {
  const hex = normalizeColor(color) || `#${icon.hex}`;
  const darkModeHex = normalizeColor(darkModeColor) || `#${icon.hex}`;
  let iconSvg = icon.svg;

  if (viewbox === "auto") {
    const { width: iconWidth, height: iconHeight } = getIconSize(icon.path);

    const { path, betterViewboxWidth } = resetIconPosition(
      icon.path,
      iconWidth,
      iconHeight,
    );
    iconSvg = iconSvg
      .replace(
        'viewBox="0 0 24 24"',
        `viewBox="0 0 ${betterViewboxWidth} 24"`,
      )
      .replace(/<path d=".*"\/>/, `<path d="${path}"/>`);
  }

  if (darkModeColor && hex !== darkModeHex) {
    return iconSvg.replace(
      "<path ",
      `<style>path{fill:${hex}} @media (prefers-color-scheme:dark){path{fill:${darkModeHex}}}</style><path `,
    );
  }

  return iconSvg.replace("<svg ", `<svg fill="${hex}" `);
};
