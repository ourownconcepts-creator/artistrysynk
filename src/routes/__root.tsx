import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { RouteSEO } from "@/components/seo/RouteSEO";
import { PageTransition } from "@/components/layout/PageTransition";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { UpdateBanner } from "@/components/pwa/UpdateBanner";
import { DeepLinkHandler } from "@/components/native/DeepLinkHandler";
import { NativeShell } from "@/components/native/NativeShell";
import { CookieConsentBanner } from "@/components/legal/CookieConsentBanner";
import NotFound from "@/pages/NotFound";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import appCss from "../styles.css?url";

const ORGANIZATION_JSONLD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ArtistrySynk",
  alternateName: "ArtistrySynk Africa",
  url: "https://artistrysynk.app",
  logo: "https://artistrysynk.app/logo.png",
  description:
    "The ultimate platform connecting musicians, producers, dancers, actors, and creative professionals across Africa.",
  foundingDate: "2024",
  sameAs: [
    "https://instagram.com/artistrysynk",
    "https://twitter.com/artistrysynk",
    "https://facebook.com/artistrysynk",
    "https://linkedin.com/company/artistrysynk",
    "https://youtube.com/@artistrysynk",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "hello@artistrysynk.app",
    availableLanguage: ["English"],
  },
  address: { "@type": "PostalAddress", addressCountry: "NG", addressLocality: "Lagos" },
});

const WEBSITE_JSONLD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ArtistrySynk",
  url: "https://artistrysynk.app",
  description:
    "Connect with musicians, producers, dancers, actors, and creative professionals across Africa.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://artistrysynk.app/discover?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
  inLanguage: "en-NG",
});

const WEBAPP_JSONLD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ArtistrySynk",
  url: "https://artistrysynk.app",
  applicationCategory: "SocialNetworkingApplication",
  operatingSystem: "Web, iOS, Android",
  description:
    "Match, connect and collaborate with musicians, producers, dancers, actors and creative professionals worldwide.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
});

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "UTF-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0, viewport-fit=cover" },
      { title: "ArtistrySynk – Create, Connect, Collaborate" },
      { name: "google-site-verification", content: "IuDeVb7joBT7XZNXH-Yuc0DiNJFZrHArys1MDg2muME" },
      { name: "google-site-verification", content: "WUikOzpEFOSPov35R0rjdjCFelzukG3PB_FDIUa6YJY" },
      { name: "title", content: "ArtistrySynk – Create, Connect, Collaborate" },
      {
        name: "description",
        content:
          "Connect with musicians, producers, dancers and actors worldwide. Match, collaborate, and bring your creative vision to life on ArtistrySynk.",
      },
      {
        name: "keywords",
        content:
          "creative collaboration, African artists, musicians, producers, dancers, actors, Afrobeats, Nigerian music, creative professionals, talent network, music collaboration, Africa",
      },
      { name: "author", content: "ArtistrySynk" },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { name: "geo.region", content: "NG" },
      { name: "geo.placename", content: "Nigeria" },
      { name: "language", content: "English" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://artistrysynk.app/" },
      { property: "og:title", content: "ArtistrySynk – Create, Connect, Collaborate" },
      {
        property: "og:description",
        content:
          "Match with musicians, producers, dancers and actors. Collaborate and bring your creative vision to life.",
      },
      { property: "og:image", content: "https://artistrysynk.app/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:site_name", content: "ArtistrySynk" },
      { property: "og:locale", content: "en_NG" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:url", content: "https://artistrysynk.app/" },
      { name: "twitter:site", content: "@artistrysynk" },
      { name: "twitter:creator", content: "@artistrysynk" },
      { name: "twitter:title", content: "ArtistrySynk - Create • Connect • Collaborate" },
      {
        name: "twitter:description",
        content:
          "Connect with musicians, producers, dancers, actors, and creative professionals across Africa.",
      },
      { name: "twitter:image", content: "https://artistrysynk.app/og-image.jpg" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "ArtistrySynk" },
      { name: "application-name", content: "ArtistrySynk" },
      { name: "theme-color", content: "#8B5CF6" },
      { name: "msapplication-TileColor", content: "#8B5CF6" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon.png" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "apple-touch-startup-image", href: "/icons/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "//artistrysynk.app" },
    ],
    scripts: [
      { type: "application/ld+json", children: ORGANIZATION_JSONLD },
      { type: "application/ld+json", children: WEBSITE_JSONLD },
      { type: "application/ld+json", children: WEBAPP_JSONLD },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <PageTransition>
      <NotFound />
    </PageTransition>
  ),
  errorComponent: RootErrorComponent,
  component: RootComponent,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AnalyticsProvider>
              <RouteSEO />
              <Outlet />
              <DeepLinkHandler />
              <NativeShell />
              <InstallPrompt />
              <UpdateBanner />
              <CookieConsentBanner />
            </AnalyticsProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ThemeProvider>
  );
}

function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
        <p className="text-muted-foreground">
          An unexpected error occurred. You can try again or head back home.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => {
              reset();
              router.invalidate();
            }}
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}