import { readFileSync, writeFileSync } from "node:fs";
import { stripSecrets } from "../src/lib/strip-baked-env.ts";

const FILE = ".open-next/cloudflare/next-env.mjs";

const { output, dropped } = stripSecrets(readFileSync(FILE, "utf8"));
writeFileSync(FILE, output);
// Key names only: never log the values.
console.log(
  `[strip-baked-env] removed ${dropped.length} non-public env value(s) from ${FILE}` +
    (dropped.length ? `: ${dropped.join(", ")}` : ""),
);
