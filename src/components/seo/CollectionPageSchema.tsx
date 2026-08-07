import { Helmet } from 'react-helmet-async';

interface CollectionItem {
  name: string;
  url: string;
}

interface CollectionPageSchemaProps {
  name: string;
  description?: string;
  url: string;
  items?: CollectionItem[];
}

export const CollectionPageSchema = ({ name, description, url, items = [] }: CollectionPageSchemaProps) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: item.url,
      })),
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(JSON.parse(JSON.stringify(schema)))}</script>
    </Helmet>
  );
};
