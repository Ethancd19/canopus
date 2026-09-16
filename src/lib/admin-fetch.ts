/**
 * fetch() for /api/admin/* calls from admin pages. When the session has
 * expired the API answers 401; send the user to the login page instead of
 * letting the page misread the error body as empty data.
 */
export async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/admin/login";
    // Never resolves for callers: the page is navigating away.
    return new Promise<Response>(() => {});
  }
  return res;
}
