// Cloudflare Pages Function — POST /api/contact
// Receives a contact-form submission and stores it in the D1 database.
// The D1 binding named `DB` is configured in the Pages dashboard
// (Settings → Functions → D1 database bindings) and/or in wrangler.toml.

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Accept JSON (from the site's fetch) or a classic form POST.
    const ct = request.headers.get("content-type") || "";
    let data;
    if (ct.includes("application/json")) {
      data = await request.json();
    } else {
      const form = await request.formData();
      data = Object.fromEntries(form);
    }

    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim();
    const company = String(data.company || "").trim();
    const message = String(data.message || "").trim();
    const honeypot = String(data.website || "").trim();

    // Honeypot: bots fill the hidden `website` field. Silently accept & drop.
    if (honeypot) {
      return json({ ok: true });
    }

    // Validation
    if (!name || !email || !message) {
      return json({ ok: false, error: "Name, email, and message are required." }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, error: "Please enter a valid email address." }, 400);
    }
    if (name.length > 200 || email.length > 200 || company.length > 200 || message.length > 5000) {
      return json({ ok: false, error: "One or more fields are too long." }, 400);
    }

    if (!env.DB) {
      // Binding missing — misconfiguration, not the visitor's fault.
      return json({ ok: false, error: "Server is not configured to receive messages yet." }, 500);
    }

    // Capture a little metadata for triage/spam review.
    const ip = request.headers.get("cf-connecting-ip") || "";
    const ua = request.headers.get("user-agent") || "";

    await env.DB.prepare(
      `INSERT INTO contacts (name, email, company, message, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(name, email, company || null, message, ip, ua)
      .run();

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: "Something went wrong. Please try again." }, 500);
  }
}

// Any non-POST method to /api/contact is answered with 405 automatically
// by Pages, since only onRequestPost is exported here.

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
