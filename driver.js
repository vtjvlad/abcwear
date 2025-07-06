const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Конфигурация
const config = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/shop',
  minKeywordFrequency: 5,
  stopWords: ['nike', 'the', 'and', 'with', 'men', 'women', 'for', 'in', 'of', 'to', 'by', 'on'],
  outputFile: 'seo_keywords_tree3.json'
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

// Категории и подкатегории для классификации
const categoryMap = {
  APPAREL: {
    subcategories: {
      TOPS: ['shirt', 'hoodie', 'jacket', 'sweater', 'tank', 'jersey', 'pullover', 'sweatshirt'],
      BOTTOMS: ['shorts', 'pants', 'leggings', 'skirt', 'joggers', 'tights'],
      OUTERWEAR: ['jacket', 'coat', 'vest', 'windbreaker', 'parka'],
      ATHLETIC_WEAR: ['jersey', 'uniform', 'training', 'performance'],
      ACCESSORIES: ['hat', 'cap', 'beanie', 'scarf', 'gloves', 'socks']
    }
  },
  FOOTWEAR: {
    subcategories: {
      RUNNING: ['running', 'trail', 'race', 'marathon'],
      BASKETBALL: ['basketball', 'court', 'hoops'],
      SOCCER: ['soccer', 'cleats', 'football'],
      LIFESTYLE: ['casual', 'retro', 'classic', 'heritage'],
      TRAINING: ['training', 'gym', 'workout', 'fitness']
    }
  },
  EQUIPMENT: {
    subcategories: {
      BAGS: ['bag', 'backpack', 'duffel', 'tote'],
      BALLS: ['ball', 'basketball', 'soccer', 'football'],
      PROTECTION: ['guard', 'pad', 'helmet', 'protection'],
      ACCESSORIES: ['bottle', 'band', 'tape', 'equipment']
    }
  }
};

function tokenize(text) {
  if (!text) return [];
  
  const tokens = text
    .toLowerCase()
    .split(/[\s\-–/.,():;]+/)
    .map(word => word.trim())
    .filter(word => 
      word && 
      word.length > 1 && 
      !config.stopWords.includes(word)
    );

  return tokens;
}

function categorizeKeyword(keyword, count) {
  for (const [mainCategory, data] of Object.entries(categoryMap)) {
    for (const [subCategory, keywords] of Object.entries(data.subcategories)) {
      if (keywords.some(k => keyword.includes(k))) {
        return { mainCategory, subCategory };
      }
    }
  }
  return { mainCategory: 'UNCATEGORIZED', subCategory: 'OTHER' };
}

async function buildSEOTree() {
  console.log('Starting SEO tree building...');
  
  const totalProducts = await Product.countDocuments();
  console.log(`Found ${totalProducts} products to process`);

  const tree = {};
  const batchSize = 1000;
  let processed = 0;
  let newProductsCount = 0;

  // Обработка пакетами
  for (let skip = 0; skip < totalProducts; skip += batchSize) {
    const products = await Product.find({}, {
      'data.productType': 1,
      'info.name': 1,
      'info.subtitle': 1,
      'info.color.labelColor': 1,
      'someAdditionalData.isNewUntil': 1
    })
    .skip(skip)
    .limit(batchSize)
    .lean();

    for (const product of products) {
      const isNew = product?.someAdditionalData?.isNewUntil ? true : false;
      if (isNew) {
        newProductsCount++;
      }

      const text = [
        product?.info?.name || '',
        product?.info?.subtitle || '',
        product?.info?.color?.labelColor || '',
      ].join(' ');

      const tokens = tokenize(text);

      for (const token of tokens) {
        const { mainCategory, subCategory } = categorizeKeyword(token);
        
        if (!tree[mainCategory]) {
          tree[mainCategory] = { subcategories: {} };
        }
        if (!tree[mainCategory].subcategories[subCategory]) {
          tree[mainCategory].subcategories[subCategory] = {};
        }
        
        if (!tree[mainCategory].subcategories[subCategory][token]) {
          tree[mainCategory].subcategories[subCategory][token] = {
            count: 0,
            newCount: 0
          };
        }
        
        tree[mainCategory].subcategories[subCategory][token].count++;
        if (isNew) {
          tree[mainCategory].subcategories[subCategory][token].newCount++;
        }
      }
    }

    processed += products.length;
    const progress = Math.round((processed / totalProducts) * 100);
    console.log(`Progress: ${progress}% (${processed}/${totalProducts})`);
  }

  // Построение финальной структуры
  const result = Object.entries(tree).map(([category, categoryData]) => ({
    category,
    subcategories: Object.entries(categoryData.subcategories).map(([subCategory, keywords]) => ({
      name: subCategory,
      keywords: Object.entries(keywords)
        .filter(([_, data]) => data.count >= config.minKeywordFrequency)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([keyword, data]) => ({ 
          keyword, 
          count: data.count,
          newCount: data.newCount
        }))
    }))
  }));

  // Добавляем общую статистику
  result.unshift({
    category: 'STATISTICS',
    totalProducts,
    newProducts: newProductsCount,
    newProductsPercentage: ((newProductsCount / totalProducts) * 100).toFixed(2) + '%'
  });

  // Сохраняем в файл
  const outPath = path.join(__dirname, config.outputFile);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`SEO tree saved to ${outPath}`);
  console.log(`Total new products: ${newProductsCount} (${((newProductsCount / totalProducts) * 100).toFixed(2)}%)`);

  await mongoose.disconnect();
  console.log('Database connection closed');
}

connectToDatabase().then(() => buildSEOTree().catch(err => {
  console.error('Error building SEO tree:', err);
  mongoose.disconnect();
}));
