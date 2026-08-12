---
name: Safe Browsing hardening
description: Rules that keep artistrysynk.app from serving foreign or unsafe bytes (Safe Browsing "harmful content" warnings)
type: constraint
---
- `/api/public/og-image` must never re-serve arbitrary remote bytes. Upstream `src` is allowlisted to artistrysynk.app, *.lovable.app and our Supabase storage host; anything else falls back to the branded banner.
- Proxied images must be raster (jpeg/png/webp/gif/avif) with parseable magic bytes. SVG is forbidden — it is active same-origin content.
- Proxy responses always send `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox`, and `Content-Disposition: inline`.
- Every user-supplied URL rendered anywhere (public pages, project rooms, hub panels, admin moderation evidence) must go through `sanitizeExternalUrl` + `UGC_LINK_REL`; blocked links render as plain text.
**Why:** Google flagged the site for harmful content; an open image proxy and unsanitized UGC links are the vectors.
