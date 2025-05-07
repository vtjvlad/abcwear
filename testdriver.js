const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Конфигурация
const config = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/shop',
  minKeywordFrequency: 5,
  stopWords: ['nike', 'the', 'and', 'with', 'men', 'women', 'for'],
  outputFile: 'seo_keywords_tree2.json'
};

// Улучшенное подключение к MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('Successfully connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

const productSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model('Product', productSchema);

// Кэш для токенизации
const tokenCache = new Map();

function tokenize(text) {
  if (!text) return [];
  
  // Проверяем кэш
  if (tokenCache.has(text)) {
    return tokenCache.get(text);
  }

  const tokens = text
    .toLowerCase()
    .split(/[\s\-–/.,():;]+/)
    .map(word => word.trim())
    .filter(word => 
      word && 
      word.length > 1 && // Игнорируем однобуквенные слова
      !config.stopWords.includes(word)
    );

  // Сохраняем в кэш
  tokenCache.set(text, tokens);
  return tokens;
}

async function buildSEOTree() {
  console.log('Starting SEO tree building...');
  
  // Получаем общее количество продуктов
  const totalProducts = await Product.countDocuments();
  console.log(`Found ${totalProducts} products to process`);

  const tree = {};
  const batchSize = 1000;
  let processed = 0;

  // Обработка пакетами
  for (let skip = 0; skip < totalProducts; skip += batchSize) {
    const products = await Product.find({}, {
      'data.productType': 1,
      'info.name': 1,
      'info.subtitle': 1,
      'info.color.labelColor': 1,
    })
    .skip(skip)
    .limit(batchSize)
    .lean();

    for (const product of products) {
      const category = product?.data?.productType || 'UNKNOWN';
      const text = [
        product?.info?.name || '',
        product?.info?.subtitle || '',
        product?.info?.color?.labelColor || '',
      ].join(' ');

      const tokens = tokenize(text);

      if (!tree[category]) tree[category] = {};

      for (const token of tokens) {
        tree[category][token] = (tree[category][token] || 0) + 1;
      }
    }

    processed += products.length;
    const progress = Math.round((processed / totalProducts) * 100);
    console.log(`Progress: ${progress}% (${processed}/${totalProducts})`);
  }

  // Построение финальной структуры
  const result = Object.entries(tree).map(([category, keywords]) => ({
    category,
    children: Object.entries(keywords)
      .filter(([_, count]) => count >= config.minKeywordFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([keyword, count]) => ({ keyword, count }))
  }));

  // Сохраняем в файл
  const outPath = path.join(__dirname, config.outputFile);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`SEO tree saved to ${outPath}`);

  // Очищаем кэш
  tokenCache.clear();
  
  await mongoose.disconnect();
  console.log('Database connection closed');
}

connectToDatabase().then(() => buildSEOTree().catch(err => {
  console.error('Ошибка при построении дерева:', err);
  mongoose.disconnect();
}));

