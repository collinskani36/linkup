// Serves the app for shared vibe links (/vibe/<id>) with a link preview made for that vibe:
// the LinkUp logo, the vibe's name, and its date and area. WhatsApp and other apps read these
// tags without running the app, which is why this has to happen on the server.
//
// It only ever shows the title, the start time and the area (never the exact venue), using the
// get_vibe_preview() function from supabase/05_linkup_fixes.sql.
//
// Needs the same two variables the app already uses: VITE_SUPABASE_URL and
// VITE_SUPABASE_PUBLISHABLE_KEY (set them in Vercel for the Production environment).

const SITE_URL = (process.env.SITE_URL || "https://linkupsynkani.vercel.app").replace(/\/$/, "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_TITLE = "LinkUp — Good company, good plans";
const DEFAULT_DESCRIPTION =
  "Find your people and make a plan in Eldoret. Friendly, verified crews. Public places only.";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** "Sat, 28 Nov · 7:00 pm", always in Nairobi time. */
export function formatWhen(startsAt) {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "";
  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Nairobi",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Nairobi",
  }).format(date);
  return `${day} · ${time}`;
}

/** Swaps the page's title and share tags for the given ones. */
export function withPreview(html, { title, description, url }) {
  const tags = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta property="og:site_name" content="LinkUp by Synkani" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${SITE_URL}/og-image.png" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="LinkUp — good company, good plans" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${SITE_URL}/og-image.png" />`,
  ].join("\n    ");

  return html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta\s[^>]*?(?:property="og:|name="twitter:|name="description")[^>]*>\s*/gi,
      "",
    )
    .replace("</head>", `    ${tags}\n  </head>`);
}

async function fetchPreview(id) {
  const base = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return null;
  const response = await fetch(`${base}/rest/v1/rpc/get_vibe_preview`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_vibe_id: id }),
  });
  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export default async function handler(req, res) {
  const id = String(req.query?.id ?? "");
  const host = req.headers["x-forwarded-host"] || req.headers.host;

  let html;
  try {
    const shell = await fetch(`https://${host}/index.html`);
    if (!shell.ok) throw new Error(`index.html ${shell.status}`);
    html = await shell.text();
  } catch {
    res.statusCode = 502;
    res.end("LinkUp is warming up. Please refresh in a moment.");
    return;
  }

  let preview = null;
  if (UUID.test(id)) {
    try {
      preview = await fetchPreview(id);
    } catch {
      preview = null;
    }
  }

  const meta = preview
    ? {
        title: `${preview.title} · LinkUp`,
        description: [formatWhen(preview.starts_at), preview.area].filter(Boolean).join(" · "),
        url: `${SITE_URL}/vibe/${id.toLowerCase()}`,
      }
    : { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, url: `${SITE_URL}/` };

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Short cache: previews stay quick for WhatsApp's crawler but edits show up within minutes.
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.statusCode = 200;
  res.end(withPreview(html, meta));
}
