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

// Обновленная структура категорий
const categoryMap = {
  NEW: {
    categories: {
      APPAREL: {
        subcategories: {
          TOPS: ['shirt', 'hoodie', 'jacket', 'sweater', 'tank', 'jersey', 'pullover', 'sweatshirt'],
          BOTTOMS: ['shorts', 'pants', 'leggings', 'skirt', 'joggers', 'tights'],
          OUTERWEAR: ['jacket', 'coat', 'vest', 'windbreaker', 'parka'],
          ATHLETIC_WEAR: ['jersey', 'uniform', 'training', 'performance']
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
          PROTECTION: ['guard', 'pad', 'helmet', 'protection']
        }
      },
      ACCESSORIES: {
        subcategories: {
          HATS: ['hat', 'cap', 'beanie'],
          GLOVES: ['gloves', 'mittens'],
          SOCKS: ['socks', 'stockings'],
          OTHER: ['scarf', 'bandana', 'headband']
        }
      }
    }
  },
  MEN: {
    categories: {
      APPAREL: {
        subcategories: {
          TOPS: ['shirt', 'hoodie', 'jacket', 'sweater', 'tank', 'jersey', 'pullover', 'sweatshirt'],
          BOTTOMS: ['shorts', 'pants', 'leggings', 'joggers'],
          OUTERWEAR: ['jacket', 'coat', 'vest', 'windbreaker', 'parka'],
          ATHLETIC_WEAR: ['jersey', 'uniform', 'training', 'performance']
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
          PROTECTION: ['guard', 'pad', 'helmet', 'protection']
        }
      },
      ACCESSORIES: {
        subcategories: {
          HATS: ['hat', 'cap', 'beanie'],
          GLOVES: ['gloves', 'mittens'],
          SOCKS: ['socks', 'stockings'],
          OTHER: ['scarf', 'bandana', 'headband']
        }
      }
    }
  },
  WOMEN: {
    categories: {
      APPAREL: {
        subcategories: {
          TOPS: ['shirt', 'hoodie', 'jacket', 'sweater', 'tank', 'jersey', 'pullover', 'sweatshirt'],
          BOTTOMS: ['shorts', 'pants', 'leggings', 'skirt', 'joggers', 'tights'],
          OUTERWEAR: ['jacket', 'coat', 'vest', 'windbreaker', 'parka'],
          ATHLETIC_WEAR: ['jersey', 'uniform', 'training', 'performance']
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
          PROTECTION: ['guard', 'pad', 'helmet', 'protection']
        }
      },
      ACCESSORIES: {
        subcategories: {
          HATS: ['hat', 'cap', 'beanie'],
          GLOVES: ['gloves', 'mittens'],
          SOCKS: ['socks', 'stockings'],
          OTHER: ['scarf', 'bandana', 'headband']
        }
      }
    }
  },
  KIDS: {
    categories: {
      APPAREL: {
        subcategories: {
          TOPS: ['shirt', 'hoodie', 'jacket', 'sweater', 'tank', 'jersey', 'pullover', 'sweatshirt'],
          BOTTOMS: ['shorts', 'pants', 'leggings', 'skirt', 'joggers', 'tights'],
          OUTERWEAR: ['jacket', 'coat', 'vest', 'windbreaker', 'parka'],
          ATHLETIC_WEAR: ['jersey', 'uniform', 'training', 'performance']
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
          PROTECTION: ['guard', 'pad', 'helmet', 'protection']
        }
      },
      ACCESSORIES: {
        subcategories: {
          HATS: ['hat', 'cap', 'beanie'],
          GLOVES: ['gloves', 'mittens'],
          SOCKS: ['socks', 'stockings'],
          OTHER: ['scarf', 'bandana', 'headband']
        }
      }
    }
  },
  BRANDS: {
    categories: {
      APPAREL: {
        subcategories: {
          NIKE: ['nike'],
          ADIDAS: ['adidas'],
          PUMA: ['puma'],
          UNDER_ARMOUR: ['under armour', 'underarmour'],
          OTHER: []
        }
      },
      FOOTWEAR: {
        subcategories: {
          NIKE: ['nike'],
          ADIDAS: ['adidas'],
          PUMA: ['puma'],
          UNDER_ARMOUR: ['under armour', 'underarmour'],
          OTHER: []
        }
      },
      EQUIPMENT: {
        subcategories: {
          NIKE: ['nike'],
          ADIDAS: ['adidas'],
          PUMA: ['puma'],
          UNDER_ARMOUR: ['under armour', 'underarmour'],
          OTHER: []
        }
      },
      ACCESSORIES: {
        subcategories: {
          NIKE: ['nike'],
          ADIDAS: ['adidas'],
          PUMA: ['puma'],
          UNDER_ARMOUR: ['under armour', 'underarmour'],
          OTHER: []
        }
      }
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

function categorizeKeyword(keyword, productData) {
  const isNew = !!productData?.someAdditionalData?.isNewUntil;
  const gender = productData?.info?.gender || '';
  const brand = productData?.info?.brand || '';
  const color = productData?.info?.color?.labelColor || '';

  // Определяем основную секцию
  let mainSection;
  if (isNew) {
    mainSection = 'NEW';
  } else if (brand) {
    mainSection = 'BRANDS';
  } else if (gender) {
    mainSection = gender.toUpperCase();
  } else {
    mainSection = 'UNCATEGORIZED';
  }

  // Определяем категорию и подкатегорию
  for (const [category, categoryData] of Object.entries(categoryMap[mainSection]?.categories || {})) {
    for (const [subCategory, keywords] of Object.entries(categoryData.subcategories)) {
      if (keywords.some(k => keyword.toLowerCase().includes(k.toLowerCase()))) {
        return {
          mainSection,
          category,
          subCategory,
          color
        };
      }
    }
  }

  return {
    mainSection,
    category: 'UNCATEGORIZED',
    subCategory: 'OTHER',
    color
  };
}

async function buildSEOTree() {
  console.log('Starting SEO tree building...');
  
  const totalProducts = await Product.countDocuments();
  console.log(`Found ${totalProducts} products to process`);

  const tree = {};
  const batchSize = 1000;
  let processed = 0;

  for (let skip = 0; skip < totalProducts; skip += batchSize) {
    const products = await Product.find({}, {
      'data.productType': 1,
      'info.name': 1,
      'info.subtitle': 1,
      'info.color.labelColor': 1,
      'info.gender': 1,
      'info.brand': 1,
      'someAdditionalData.isNewUntil': 1
    })
    .skip(skip)
    .limit(batchSize)
    .lean();

    for (const product of products) {
      const text = [
        product?.info?.name || '',
        product?.info?.subtitle || '',
        product?.info?.color?.labelColor || '',
      ].join(' ');

      const tokens = tokenize(text);

      for (const token of tokens) {
        const { mainSection, category, subCategory, color } = categorizeKeyword(token, product);
        
        if (!tree[mainSection]) {
          tree[mainSection] = { categories: {} };
        }
        if (!tree[mainSection].categories[category]) {
          tree[mainSection].categories[category] = { subcategories: {} };
        }
        if (!tree[mainSection].categories[category].subcategories[subCategory]) {
          tree[mainSection].categories[category].subcategories[subCategory] = { keywords: {}, colors: {} };
        }
        
        // Добавляем ключевое слово
        tree[mainSection].categories[category].subcategories[subCategory].keywords[token] = 
          (tree[mainSection].categories[category].subcategories[subCategory].keywords[token] || 0) + 1;
        
        // Добавляем цвет
        if (color) {
          tree[mainSection].categories[category].subcategories[subCategory].colors[color] = 
            (tree[mainSection].categories[category].subcategories[subCategory].colors[color] || 0) + 1;
        }
      }
    }

    processed += products.length;
    const progress = Math.round((processed / totalProducts) * 100);
    console.log(`Progress: ${progress}% (${processed}/${totalProducts})`);
  }

  // Построение финальной структуры
  const result = Object.entries(tree).map(([mainSection, sectionData]) => ({
    section: mainSection,
    categories: Object.entries(sectionData.categories).map(([category, categoryData]) => ({
      name: category,
      subcategories: Object.entries(categoryData.subcategories).map(([subCategory, data]) => ({
        name: subCategory,
        keywords: Object.entries(data.keywords)
          .filter(([_, count]) => count >= config.minKeywordFrequency)
          .sort((a, b) => b[1] - a[1])
          .map(([keyword, count]) => ({ keyword, count })),
        colors: Object.entries(data.colors)
          .sort((a, b) => b[1] - a[1])
          .map(([color, count]) => ({ color, count }))
      }))
    }))
  }));

  // Сохраняем в файл
  const outPath = path.join(__dirname, config.outputFile);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`SEO tree saved to ${outPath}`);

  await mongoose.disconnect();
  console.log('Database connection closed');
}

connectToDatabase().then(() => buildSEOTree().catch(err => {
  console.error('Error building SEO tree:', err);
  mongoose.disconnect();
}));
