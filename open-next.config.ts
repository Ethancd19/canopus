import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache, tag cache, or queue yet. Data pages are dynamic
// (`revalidate = 0`); prerendered pages (/behind, /contact,
// /canopus-is-watching, /admin/login) are rendered by the Worker on each
// request until the R2 incremental cache is added with on-demand revalidation
// in the public-site phase.
export default defineCloudflareConfig({});
