import { getIconSvg, getSimpleIcon } from "./icon.js";
import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";

const router = new Router();

router.get("/", (ctx) => {
  ctx.response.headers.set(
    "Cache-Control",
    "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800",
  );
  ctx.response.status = 307;
  ctx.response.redirect("https://github.com/LitoMore/simple-icons-cdn");
});
router.get("/favicon.ico", (ctx) => {
  ctx.response.headers.set(
    "Cache-Control",
    "public, max-age=31536000, s-maxage=31536000, immutable",
  );
  ctx.response.status = 204;
});
router.get("/:iconSlug/:color?/:darkModeColor?", (ctx) => {
  const { method, url } = ctx.request;
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set(
    "Cache-Control",
    "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800",
  );

  const { iconSlug, color, darkModeColor } = ctx.params;
  const viewbox = ctx.request.url.searchParams.get("viewbox");
  const icon = getSimpleIcon(iconSlug);

  if (icon) {
    const iconSvg = getIconSvg(icon, color, darkModeColor, viewbox);
    ctx.response.headers.set("Content-Type", "image/svg+xml");
    ctx.response.body = iconSvg;
    console.log([method, url, 200].join("\t"));
    return;
  }

  ctx.response.status = 404;
  console.log([method, url, 404].join("\t"));
  return;
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());
app.listen({ port: 8080 });

console.log("Server running at http://localhost:8080/simpleicons");
