import seoTree from '../seo_keywords_tree2.json';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/\-+/g, '-')
    .replace(/^\-+|\-+$/g, '');
}

export async function getServerSideProps({ res }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';
  let urls = '';
  for (const category of seoTree) {
    const catSlug = slugify(category.category);
    for (const subcat of category.subcategories) {
      const subcatSlug = slugify(subcat.name);
      for (const keyword of subcat.keywords) {
        const keywordSlug = slugify(keyword.keyword);
        urls += `<url><loc>${baseUrl}/${catSlug}/${subcatSlug}/${keywordSlug}/</loc></url>`;
      }
    }
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.write(sitemap);
  res.end();

  return { props: {} };
}

export default function SiteMap() {
  // getServerSideProps віддає sitemap напряму
  return null;
} 