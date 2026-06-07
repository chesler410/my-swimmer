// Tiny free CORS fetch-helper for my-swimmer (Cloudflare Worker).
// It fetches a public heat-sheet PDF and re-serves it with CORS headers so the
// browser app can read it. Stateless: stores nothing. PDFs only.
//
// Deploy (free, ~5 min):
//   1. npm i -g wrangler && wrangler login
//   2. from this folder: wrangler deploy
//   3. copy the printed URL and paste it in the app's About screen as:
//        https://<your-worker>.workers.dev/?url={url}
//
// Safety: only proxies http(s) URLs that look like PDFs, caps response size.

const MAX_BYTES = 30 * 1024 * 1024; // 30 MB

export default {
  async fetch(request) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    const target = new URL(request.url).searchParams.get("url");
    if (!target || !/^https?:\/\//i.test(target)) {
      return new Response("Pass ?url=<https pdf link>", { status: 400, headers: cors });
    }

    let upstream;
    try {
      upstream = await fetch(target, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/pdf,*/*" },
        redirect: "follow",
      });
    } catch (e) {
      return new Response("Fetch failed: " + e, { status: 502, headers: cors });
    }
    if (!upstream.ok) return new Response("Upstream " + upstream.status, { status: 502, headers: cors });

    const len = Number(upstream.headers.get("content-length") || 0);
    if (len > MAX_BYTES) return new Response("PDF too large", { status: 413, headers: cors });

    return new Response(upstream.body, {
      headers: { ...cors, "Content-Type": "application/pdf", "Cache-Control": "public, max-age=3600" },
    });
  },
};
