import { Helmet } from 'react-helmet-async';

interface OrganizationSchemaProps {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
}

export const OrganizationSchema = ({
  name = "Artistry.ng",
  url = "https://artistry.ng",
  logo = "https://artistry.ng/logo.png",
  description = "The ultimate platform connecting musicians, producers, dancers, actors, and creative professionals across Africa. Create, connect, and collaborate with talented creatives.",
  sameAs = [
    "https://instagram.com/artistry.ng",
    "https://twitter.com/artistryng",
    "https://facebook.com/artistryng",
    "https://linkedin.com/company/artistryng",
    "https://youtube.com/@artistryng"
  ]
}: OrganizationSchemaProps) => {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": name,
    "alternateName": "Artistry Nigeria",
    "url": url,
    "logo": logo,
    "description": description,
    "foundingDate": "2024",
    "sameAs": sameAs,
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "email": "hello@artistry.ng",
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
