import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseGzipKiB } from "../src/lib/worker-size.ts";

// Cloudflare's own ceiling is 10 MiB gzip on the Workers Paid plan. The guard
// trips earlier so a regression is caught by the build rather than by a
// rejected deploy.
const LIMIT_KIB = 8192;

// The dry-run has to write its bundle somewhere, but nothing reads it: build it
// in a throwaway directory so this works on any machine.
const outdir = mkdtempSync(join(tmpdir(), "canopus-size-check-"));

let output: string;
try {
  output = execFileSync(
    "npx",
    ["wrangler", "deploy", "--dry-run", `--outdir=${outdir}`],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
} catch (error) {
  // wrangler exits non-zero when the bundle fails to link; its output still
  // holds the reason, so keep both streams for the message below.
  const e = error as { stdout?: string; stderr?: string };
  output = `${e.stdout ?? ""}\n${e.stderr ?? ""}`;
} finally {
  rmSync(outdir, { recursive: true, force: true });
}

const gzipKiB = parseGzipKiB(output);

if (gzipKiB === null) {
  console.error(
    "[check-worker-size] could not find the `gzip: <n> KiB` figure in " +
      "`wrangler deploy --dry-run` output, so the Worker size is unverified. " +
      "Output was:\n" +
      output,
  );
  process.exit(1);
}

console.log(`Worker gzip size: ${gzipKiB} KiB (limit ${LIMIT_KIB})`);

if (gzipKiB > LIMIT_KIB) {
  console.error(
    `[check-worker-size] the Worker is ${gzipKiB} KiB gzipped, over the ` +
      `${LIMIT_KIB} KiB limit. Something large was pulled into the bundle: ` +
      "check `find .open-next -name '*.wasm'` and `outputFileTracingExcludes` " +
      "in next.config.ts.",
  );
  process.exit(1);
}
