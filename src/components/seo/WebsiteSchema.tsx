import { Helmet } from 'react-helmet-async';

interface WebsiteSchemaProps {
  name?: string;
  url?: string;
  description?: string;
}

export const WebsiteSchema = ({
  name = "Artistry",
  url = "https://artistry.com",
  description = "Connect with musicians, producers, dancers, actors, and creative professionals across Africa. Match, collaborate, and bring your creative vision to life."
}: WebsiteSchemaProps) => {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": name,
    "url": url,
    "description": description,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${url}/discover?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    },
    "inLanguage": "en-NG"
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
    </Helmet>
  );
};
