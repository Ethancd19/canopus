/**
 * `opennextjs-cloudflare build` writes `.open-next/cloudflare/next-env.mjs`
 * with one `export const <mode> = {...};` line per Next.js mode, populated from
 * every `.env*` file. Anything in `.env.local` would therefore ship inside the
 * Worker script, so the build strips every non-public key back out: the
 * deployed Worker reads its secrets from `wrangler secret` instead.
 */
export function stripSecrets(source: string): {
  output: string;
  dropped: string[];
} {
  const dropped: string[] = [];
  const output = source.replace(
    /^export const (\w+) = (\{.*\});$/gm,
    (_match, mode: string, json: string) => {
      const obj = JSON.parse(json) as Record<string, string>;
      const kept: Record<string, string> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith("NEXT_PUBLIC_")) {
          kept[key] = value;
        } else {
          dropped.push(`${mode}.${key}`);
        }
      }
      return `export const ${mode} = ${JSON.stringify(kept)};`;
    },
  );
  return { output, dropped };
}
