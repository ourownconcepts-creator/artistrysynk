import { Helmet } from 'react-helmet-async';

interface ProfileSchemaProps {
  name: string;
  username: string;
  description?: string;
  image?: string;
  url: string;
  jobTitles?: string[];
  location?: string;
  sameAs?: string[];
}

export const ProfileSchema = ({
  name,
  username,
  description,
  image,
  url,
  jobTitles = [],
  location,
  sameAs = []
}: ProfileSchemaProps) => {
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": name,
    "alternateName": username,
    "description": description,
    "image": image,
    "url": url,
    "jobTitle": jobTitles.length > 0 ? jobTitles.join(", ") : undefined,
    "address": location ? {
      "@type": "PostalAddress",
      "addressLocality": location
    } : undefined,
    "sameAs": sameAs.length > 0 ? sameAs : undefined,
    "memberOf": {
      "@type": "Organization",
      "name": "Artistry.ng",
      "url": "https://artistry.ng"
    }
  };

  // Remove undefined values
  const cleanedSchema = JSON.parse(JSON.stringify(personSchema));

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(cleanedSchema)}
      </script>
    </Helmet>
  );
};
