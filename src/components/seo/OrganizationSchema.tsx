import { Helmet } from 'react-helmet-async';

interface OrganizationSchemaProps {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
}

export const OrganizationSchema = ({
  name = "ArtistrySynk",
  url = "https://artistrysynk.com",
  logo = "https://artistrysynk.com/logo.png",
  description = "The ultimate platform connecting musicians, producers, dancers, actors, and creative professionals across Africa. Create, connect, and collaborate with talented creatives.",
  sameAs = [
    "https://instagram.com/artistrysynk",
    "https://twitter.com/artistrysynk",
    "https://facebook.com/artistrysynk",
    "https://linkedin.com/company/artistrysynk",
    "https://youtube.com/@artistrysynk"
  ]
}: OrganizationSchemaProps) => {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": name,
    "alternateName": "ArtistrySynk Africa",
    "url": url,
    "logo": logo,
    "description": description,
    "foundingDate": "2024",
    "sameAs": sameAs,
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "email": "hello@artistrysynk.com",
      "availableLanguage": ["English"]
    },
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "NG",
      "addressLocality": "Lagos"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
    </Helmet>
  );
};
