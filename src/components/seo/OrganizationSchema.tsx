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
  url = "https://artistrysynk.app",
  logo = "https://artistrysynk.app/logo.png",
  description = "Global creative collaboration platform connecting musicians, producers, designers, photographers, filmmakers, dancers, actors and writers.",
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
    
    "url": url,
    "logo": logo,
    "description": description,
    "foundingDate": "2024",
    "sameAs": sameAs,
    "legalName": "Lomodogs Dot Nigeria Limited",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "email": "ourownconcepts@gmail.com",
      "telephone": "+2349069312437",
      "availableLanguage": ["English"]
    },
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "6 Oluyoro Street, off Awolowo Avenue, Bodija",
      "addressLocality": "Ibadan",
      "addressRegion": "Oyo State",
      "addressCountry": "NG"
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
