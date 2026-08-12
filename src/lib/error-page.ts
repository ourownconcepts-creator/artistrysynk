export function renderErrorPage(correlationId?: string): string {
  const reference = correlationId
    ? `<p style="font-size:12px;color:#6b7280">Reference: <code>${correlationId.replace(/[^A-Za-z0-9._:-]/g, "")}</code></p>`
    : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
      .note { font-size: 12px; color: #6b7280; margin: 1rem 0 0; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
      ${reference}
      <p class="note" id="auto-retry-note"></p>
    </div>
    <script>
      (function () {
        // Most 500s here are transient (a server restart or deploy caught mid-request).
        // Retry the exact URL once automatically, then stop so we never loop.
        try {
          var key = "as:error-retry:" + location.pathname + location.search;
          var last = Number(sessionStorage.getItem(key) || 0);
          if (!last || Date.now() - last > 30000) {
            sessionStorage.setItem(key, String(Date.now()));
            var note = document.getElementById("auto-retry-note");
            if (note) note.textContent = "Retrying automatically…";
            setTimeout(function () { location.reload(); }, 1200);
          } else {
            sessionStorage.removeItem(key);
          }
        } catch (e) {}
      })();
    </script>
  </body>
</html>`;
}