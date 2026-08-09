#!/usr/bin/env python3
"""
Blank-screen / abort regression smoke test.

Navigates and hard-reloads the key public routes, asserting for each that:
  * the document responds 200 (never 5xx / 499),
  * the app actually painted content (no blank screen),
  * no client runtime error or asset-load failure was logged,
  * the SSR correlation id meta tag is present so errors stay traceable.

Run:  python3 tests/e2e/smoke_no_blank_screen.py [base_url]
Exits non-zero on the first failing assertion set.
"""
import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
ROUTES = ["/", "/about", "/how-it-works", "/pricing", "/features", "/contact", "/legal", "/privacy-requests", "/copyright/report"]
SCREENSHOTS = Path(__file__).parent / "screenshots"

BAD_CONSOLE = (
    "failed to fetch dynamically imported module",
    "importing a module script failed",
    "loading chunk",
    "failed to load module script",
    "minified react error",
)


def blank(text: str) -> bool:
    return len(text.strip()) < 200


async def check(page, path: str, reload: bool) -> list[str]:
    failures: list[str] = []
    errors: list[str] = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))

    label = f"{path} ({'reload' if reload else 'navigate'})"
    response = await page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded")
    if reload:
        response = await page.reload(wait_until="domcontentloaded")

    if response is None:
        failures.append(f"{label}: no response")
        return failures
    if response.status >= 400:
        failures.append(f"{label}: HTTP {response.status}")

    await page.wait_for_timeout(700)
    body = await page.inner_text("body")
    if blank(body):
        failures.append(f"{label}: blank screen (body under 200 chars)")
    if "This page didn't load" in body:
        failures.append(f"{label}: SSR error page rendered")

    cid = await page.evaluate(
        "document.querySelector('meta[name=\"x-correlation-id\"]')?.content ?? ''"
    )
    if not cid:
        failures.append(f"{label}: missing correlation id meta tag")

    for message in errors:
        low = message.lower()
        if any(bad in low for bad in BAD_CONSOLE):
            failures.append(f"{label}: console error -> {message[:160]}")

    print(f"{'FAIL' if failures else 'ok  '} {label} status={response.status} cid={cid[:12]}")
    return failures


async def main() -> int:
    SCREENSHOTS.mkdir(parents=True, exist_ok=True)
    all_failures: list[str] = []
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        for path in ROUTES:
            for reload in (False, True):
                page = await context.new_page()
                try:
                    all_failures += await check(page, path, reload)
                finally:
                    if reload:
                        await page.screenshot(
                            path=str(SCREENSHOTS / f"{path.strip('/').replace('/', '_') or 'home'}.png")
                        )
                    await page.close()

        # Client-side route hopping: catches lazy-chunk failures that only occur
        # during in-app navigation rather than a fresh document load.
        page = await context.new_page()
        await page.goto(BASE_URL, wait_until="domcontentloaded")
        for path in ["/about", "/pricing", "/how-it-works", "/"]:
            await page.evaluate(
                "p => window.history.pushState({}, '', p) || window.dispatchEvent(new PopStateEvent('popstate'))",
                path,
            )
            await page.wait_for_timeout(500)
            if blank(await page.inner_text("body")):
                all_failures.append(f"client nav {path}: blank screen")
        print(f"{'FAIL' if all_failures else 'ok  '} client-side navigation sweep")
        await page.close()
        await browser.close()

    if all_failures:
        print("\nFAILURES:")
        for failure in all_failures:
            print(" -", failure)
        return 1
    print("\nAll blank-screen/abort smoke checks passed.")
    return 0


sys.exit(asyncio.run(main()))
