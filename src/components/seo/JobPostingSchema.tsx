import { Helmet } from 'react-helmet-async';

interface JobPostingSchemaProps {
  title: string;
  description: string;
  datePosted: string;
  validThrough?: string;
  employmentType?: string;
  hiringOrganization?: string;
  location?: string;
  currency?: string;
  salaryMin?: number;
  salaryMax?: number;
  url?: string;
}

export const JobPostingSchema = ({
  title,
  description,
  datePosted,
  validThrough,
  employmentType,
  hiringOrganization = 'ArtistrySynk',
  location,
  currency,
  salaryMin,
  salaryMax,
  url,
}: JobPostingSchemaProps) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title,
    description,
    datePosted,
    validThrough,
    employmentType,
    url,
    hiringOrganization: {
      '@type': 'Organization',
      name: hiringOrganization,
      sameAs: 'https://artistrysynk.app',
    },
    jobLocation: location
      ? { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: location } }
      : undefined,
    baseSalary:
      salaryMin || salaryMax
        ? {
            '@type': 'MonetaryAmount',
            currency: currency ?? 'USD',
            value: { '@type': 'QuantitativeValue', minValue: salaryMin, maxValue: salaryMax, unitText: 'MONTH' },
          }
        : undefined,
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(JSON.parse(JSON.stringify(schema)))}</script>
    </Helmet>
  );
};
