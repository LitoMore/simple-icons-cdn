import * as si from "npm:simple-icons";
import { getIconSize, resetIconPosition } from "../source/icon.js";

const knownIssues = ["Create React App", "Google News"];

const checkAutoViewboxPath = (icon) => {
  const start = performance.now();
  try {
    const { path } = icon;
    const { width, height } = getIconSize(path);
    resetIconPosition(
      path,
      width,
      height,
    );
    const end = performance.now();
    return { title: icon.title, time: end - start };
  } catch (e) {
    const end = performance.now();
    console.error(`Error in icon: ${icon.title}: ${e.message}`);
    return { title: icon.title, time: end - start, fail: true };
  }
};

const result = Object.values(si).map(checkAutoViewboxPath);
const iconsFailed = result.filter((r) => r.fail);

console.log("Top 20 slow icons:");
console.table(result.sort((a, b) => b.time - a.time).slice(0, 20));
console.log(`Failed icons:`);
console.table(iconsFailed);

if (iconsFailed.filter((icon) => knownIssues.includes(icon.title))) {
  Deno.exit(1);
} else {
  console.log("All icons passed");
  Deno.exit(0);
}
