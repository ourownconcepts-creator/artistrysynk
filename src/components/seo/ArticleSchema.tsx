import { Helmet } from 'react-helmet-async';

interface ArticleSchemaProps {
  headline: string;
  description?: string;
  image?: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
  keywords?: string[];
}

export const ArticleSchema = ({
  headline,
  description,
  image,
  url,
  datePublished,
  dateModified,
  authorName = 'ArtistrySynk',
  keywords,
}: ArticleSchemaProps) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    image,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: { '@type': 'Organization', name: authorName },
    publisher: {
      '@type': 'Organization',
      name: 'ArtistrySynk',
      logo: { '@type': 'ImageObject', url: 'https://artistrysynk.app/logo.png' },
    },
    keywords: keywords?.join(', '),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(JSON.parse(JSON.stringify(schema)))}</script>
    </Helmet>
  );
};
