import { Helmet } from 'react-helmet-async';

interface OrganizationSchemaProps {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
}

export const OrganizationSchema = ({
  name = "Artistry",
  url = "https://artistry.com",
  logo = "https://artistry.com/logo.png",
  description = "The ultimate platform connecting musicians, producers, dancers, actors, and creative professionals across Africa. Create, connect, and collaborate with talented creatives.",
  sameAs = [
    "https://instagram.com/artistry",
    "https://twitter.com/artistry",
    "https://facebook.com/artistry",
    "https://linkedin.com/company/artistry",
    "https://youtube.com/@artistry"
  ]
}: OrganizationSchemaProps) => {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": name,
    "alternateName": "Artistry Africa",
    "url": url,
    "logo": logo,
    "description": description,
    "foundingDate": "2024",
    "sameAs": sameAs,
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "email": "hello@artistry.com",
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
