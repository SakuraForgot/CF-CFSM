import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve("dist");
assert.deepEqual(fs.readdirSync(root).sort(), ["assets", "index.html"]);
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(html, /name="theme-version" content="CFSM Cloud v/);
assert.match(html, /name="apiBase"/);
for (const [, asset] of html.matchAll(
  /(?:src|href)="(\.\/assets\/[^"?#]+)"/g,
)) {
  assert.ok(fs.existsSync(path.join(root, asset)), `Missing asset: ${asset}`);
}
assert.ok(
  !fs.existsSync(path.join(root, "assets/flags")),
  "Host flags must not be bundled",
);
assert.ok(
  !fs.existsSync(path.join(root, "assets/os-icons")),
  "Host OS icons must not be bundled",
);
for (const name of fs
  .readdirSync(path.join(root, "assets"))
  .filter((name) => name.endsWith(".js"))) {
  const source = fs.readFileSync(path.join(root, "assets", name), "utf8");
  assert.ok(
    !source.includes("dev mock API enabled"),
    `Mock code found in ${name}`,
  );
}
console.log(
  "Verified CFSM theme layout, version, asset references, host icons and absence of dev mocks.",
);
