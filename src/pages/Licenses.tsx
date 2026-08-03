import { Scale, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { PageSEO } from "@/components/seo";

interface Attribution {
  name: string;
  license: string;
  url: string;
  notice?: string;
}

const attributions: Attribution[] = [
  { name: "React", license: "MIT", url: "https://github.com/facebook/react" },
  { name: "React DOM", license: "MIT", url: "https://github.com/facebook/react" },
  { name: "React Router", license: "MIT", url: "https://github.com/remix-run/react-router" },
  { name: "Vite", license: "MIT", url: "https://github.com/vitejs/vite" },
  { name: "TypeScript", license: "Apache-2.0", url: "https://github.com/microsoft/TypeScript" },
  { name: "Tailwind CSS", license: "MIT", url: "https://github.com/tailwindlabs/tailwindcss" },
  { name: "tailwindcss-animate", license: "MIT", url: "https://github.com/jamiebuilds/tailwindcss-animate" },
  { name: "Radix UI Primitives", license: "MIT", url: "https://github.com/radix-ui/primitives" },
  { name: "shadcn/ui", license: "MIT", url: "https://github.com/shadcn-ui/ui" },
  { name: "Lucide Icons", license: "ISC", url: "https://github.com/lucide-icons/lucide" },
  { name: "Framer Motion", license: "MIT", url: "https://github.com/framer/motion" },
  { name: "TanStack Query", license: "MIT", url: "https://github.com/TanStack/query" },
  { name: "Supabase JS", license: "MIT", url: "https://github.com/supabase/supabase-js" },
  { name: "Capacitor", license: "MIT", url: "https://github.com/ionic-team/capacitor" },
  { name: "Sonner", license: "MIT", url: "https://github.com/emilkowalski/sonner" },
  { name: "React Hook Form", license: "MIT", url: "https://github.com/react-hook-form/react-hook-form" },
  { name: "Zod", license: "MIT", url: "https://github.com/colinhacks/zod" },
  { name: "date-fns", license: "MIT", url: "https://github.com/date-fns/date-fns" },
  { name: "Recharts", license: "MIT", url: "https://github.com/recharts/recharts" },
  { name: "Embla Carousel", license: "MIT", url: "https://github.com/davidjerleke/embla-carousel" },
  { name: "cmdk", license: "MIT", url: "https://github.com/pacocoursey/cmdk" },
  { name: "next-themes", license: "MIT", url: "https://github.com/pacocoursey/next-themes" },
  { name: "react-helmet-async", license: "Apache-2.0", url: "https://github.com/staylor/react-helmet-async" },
  { name: "clsx", license: "MIT", url: "https://github.com/lukeed/clsx" },
  { name: "tailwind-merge", license: "MIT", url: "https://github.com/dcastil/tailwind-merge" },
  { name: "class-variance-authority", license: "Apache-2.0", url: "https://github.com/joe-bell/cva" },
  { name: "React Email Components", license: "MIT", url: "https://github.com/resend/react-email" },
  { name: "Deno standard library", license: "MIT", url: "https://github.com/denoland/deno_std" },
];

const Licenses = () => (
  <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
    <PageSEO
      title="Open Source Licenses & Attributions | ArtistrySynk"
      description="Open-source software licenses and third-party attributions used to build the ArtistrySynk web and mobile apps."
      canonicalUrl="https://artistrysynk.app/licenses"
      breadcrumbs={[
        { name: "Home", url: "https://artistrysynk.app" },
        { name: "Licenses", url: "https://artistrysynk.app/licenses" },
      ]}
    />

    <section className="py-16 px-4">
      <div className="container mx-auto max-w-4xl text-center">
        <Scale className="w-12 h-12 text-primary mx-auto mb-4" aria-hidden="true" />
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          Open Source Licenses
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          ArtistrySynk is built with the help of open-source software. We are grateful to the
          maintainers and communities behind these projects.
        </p>
      </div>
    </section>

    <section className="pb-20 px-4">
      <div className="container mx-auto max-w-4xl space-y-8">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-xl">Third-Party Attributions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {attributions.map((item) => (
                <li key={item.name} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="flex items-center gap-2 font-medium">
                    <Package className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    {item.name}
                  </span>
                  <span className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="rounded-md bg-muted px-2 py-0.5">{item.license}</span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                      aria-label={`View the ${item.name} project and license`}
                    >
                      Source
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-xl">MIT License Notice</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              Permission is hereby granted, free of charge, to any person obtaining a copy of this
              software and associated documentation files (the "Software"), to deal in the Software
              without restriction, including without limitation the rights to use, copy, modify,
              merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
              permit persons to whom the Software is furnished to do so, subject to the following
              conditions: the above copyright notice and this permission notice shall be included in
              all copies or substantial portions of the Software.
            </p>
            <p>
              THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
              INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
              PARTICULAR PURPOSE AND NONINFRINGEMENT.
            </p>
            <p>
              Apache-2.0 and ISC licensed components are used under the terms of their respective
              licenses, available at the source links above. For license questions, contact{" "}
              <a href="mailto:legal@artistrysynk.app" className="text-primary hover:underline">
                legal@artistrysynk.app
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </section>

    <Footer />
  </div>
);

export default Licenses;
