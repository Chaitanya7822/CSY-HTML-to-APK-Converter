const OWNER = "Chaitanya7822";
const REPO = "CSY-Android-Builder";
const WORKFLOW = "android-build.yml";
const BRANCH = "main";
const SITE_KEY = "0x4AAAAAAG047Wne_AvEcPBw";
const ALLOWED_HOSTNAME = "csy-apk-builder.yashwantchaitanya7.workers.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}
function challengePage() {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CSY Security Check</title><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script><style>body{font-family:system-ui,sans-serif;margin:0;padding:12px;background:#fff;color:#111827;text-align:center}.cf-turnstile{display:flex;justify-content:center}.hint{font-size:13px;margin:4px}</style></head><body><div class="hint">Complete the security check to start your APK build.</div><div class="cf-turnstile" data-sitekey="${SITE_KEY}" data-callback="onVerified" data-error-callback="onError" data-expired-callback="onError" data-theme="light"></div><script>function onVerified(token){parent.postMessage({type:'CSY_TURNSTILE_TOKEN',token:token},'*')}function onError(){parent.postMessage({type:'CSY_TURNSTILE_ERROR'},'*')}</script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'self' https://challenges.cloudflare.com; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; connect-src https://challenges.cloudflare.com", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, service: "CSY APK Builder Worker", protected: true });
    if (request.method === "GET" && url.pathname === "/challenge") return challengePage();
    if (request.method !== "POST" || url.pathname !== "/build") return json({ ok: false, message: "Use POST /build after completing the security check." }, 404);
    if (!env.GITHUB_TOKEN) return json({ ok: false, message: "Cloudflare GITHUB_TOKEN Secret is missing." }, 500);
    if (!env.TURNSTILE_SECRET_KEY) return json({ ok: false, message: "Cloudflare TURNSTILE_SECRET_KEY Secret is missing." }, 500);
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, message: "Request body must be valid JSON." }, 400); }
    if (body.action !== "build" || body.buildType !== "apk") return json({ ok: false, message: "Only APK build requests are enabled right now." }, 400);
    if (typeof body.turnstileToken !== "string" || !body.turnstileToken) return json({ ok: false, message: "Security verification is required." }, 403);

    const verifyForm = new FormData();
    verifyForm.append("secret", env.TURNSTILE_SECRET_KEY);
    verifyForm.append("response", body.turnstileToken);
    const remoteIp = request.headers.get("CF-Connecting-IP");
    if (remoteIp) verifyForm.append("remoteip", remoteIp);
    let verification;
    try {
      const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: verifyForm });
      verification = await verifyResponse.json();
    } catch { return json({ ok: false, message: "Security verification service is unavailable. Please retry." }, 502); }
    if (!verification.success || verification.hostname !== ALLOWED_HOSTNAME) return json({ ok: false, message: "Security verification failed. Please retry the check." }, 403);

    const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`;
    const ghResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { "Accept": "application/vnd.github+json", "Authorization": `Bearer ${env.GITHUB_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "CSY-APK-Builder-Worker", "Content-Type": "application/json" },
      body: JSON.stringify({ ref: BRANCH })
    });
    if (ghResponse.status !== 204) {
      const details = await ghResponse.text();
      return json({ ok: false, message: `GitHub workflow dispatch failed (${ghResponse.status}).`, details: details.slice(0, 500) }, 502);
    }
    return json({ ok: true, message: "APK build request sent to GitHub Actions.", actionsUrl: `https://github.com/${OWNER}/${REPO}/actions` }, 202);
  }
};
