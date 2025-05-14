import seoTree from '../../../../seo_keywords_tree2.json';
import Head from 'next/head';
import SeoFilters from '../../../../components/SeoFilters';
import { useRouter } from 'next/router';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/\-+/g, '-')
    .replace(/^\-+|\-+$/g, '');
}

export async function getStaticPaths() {
  const paths = [];
  for (const category of seoTree) {
    const catSlug = slugify(category.category);
    for (const subcat of category.subcategories) {
      const subcatSlug = slugify(subcat.name);
      for (const keyword of subcat.keywords) {
        const keywordSlug = slugify(keyword.keyword);
        paths.push({
          params: {
            category: catSlug,
            subcategory: subcatSlug,
            keyword: keywordSlug
          }
        });
      }
    }
  }
  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const { category, subcategory, keyword } = params;

  function findBySlug(slug, arr, field) {
    return arr.find(item => slugify(item[field]) === slug);
  }

  const catObj = findBySlug(category, seoTree, 'category');
  const subcatObj = catObj ? findBySlug(subcategory, catObj.subcategories, 'name') : null;
  const keywordObj = subcatObj ? findBySlug(keyword, subcatObj.keywords, 'keyword') : null;

  const meta = keywordObj
    ? {
        title: `${keywordObj.keyword} – Купити у категорії ${subcatObj.name} | ${catObj.category}`,
        description: `Великий вибір товарів "${keywordObj.keyword}" у підкатегорії "${subcatObj.name}" (${catObj.category}). Замовляйте онлайн з доставкою!`
      }
    : { title: '', description: '' };

  const filters = subcatObj
    ? subcatObj.keywords.map(k => ({
        label: k.keyword,
        count: k.count
      }))
    : [];

  return {
    props: {
      category: catObj ? catObj.category : '',
      subcategory: subcatObj ? subcatObj.name : '',
      keyword: keywordObj ? keywordObj.keyword : '',
      count: keywordObj ? keywordObj.count : 0,
      meta,
      filters
    }
  };
}

export default function SeoPage({ category, subcategory, keyword, count, meta, filters }) {
  const router = useRouter();

  const handleFilterClick = (filterKeyword) => {
    router.push(
      `/${slugify(category)}/${slugify(subcategory)}/${slugify(filterKeyword)}/`
    );
  };

  return (
    <>
      <Head>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
      </Head>
      <h1>{meta.title}</h1>
      <p>{meta.description}</p>
      <p>Знайдено товарів: {count}</p>
      <h2>Фільтри цієї підкатегорії:</h2>
      <SeoFilters
        category={category}
        subcategory={subcategory}
        onFilterClick={handleFilterClick}
      />
    </>
  );
} 