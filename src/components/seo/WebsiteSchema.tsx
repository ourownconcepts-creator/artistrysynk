import { Helmet } from 'react-helmet-async';

interface WebsiteSchemaProps {
  name?: string;
  url?: string;
  description?: string;
}

export const WebsiteSchema = ({
  name = "ArtistrySynk",
  url = "https://artistrysynk.app",
  description = "Connect with creatives worldwide — musicians, designers, photographers, filmmakers, dancers and writers. Match, collaborate and bring your vision to life."
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
