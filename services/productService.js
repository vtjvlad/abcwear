const Product = require('../models/Product');

// Отримання кольорів
exports.getColors = async () => {
  const colors = await Product.distinct('info.color.labelColor');
  return colors.filter((color) => color);
};

// Отримання категорій
exports.getCategories = async () => {
  const categories = await Product.distinct('data.productType');
  return categories.filter((category) => category);
};

// Отримання назв
exports.getNames = async () => {
  const names = await Product.distinct('name');
  return names;
};

// Отримання діапазону цін
exports.getPriceRange = async () => {
  const result = await Product.aggregate([
    {
      $group: {
        _id: null,
        min: { $min: '$price.self.UAH.currentPrice' },
        max: { $max: '$price.self.UAH.currentPrice' },
      },
    },
  ]);
  if (result.length > 0 && result[0].min != null && result[0].max != null) {
    return { min: result[0].min, max: result[0].max };
  }
  return { min: 0, max: 10000 };
};

// Отримання кількості фільтрів
exports.getFilterCounts = async () => {
  const [colors, categories, names] = await Promise.all([
    Product.distinct('info.color.labelColor'),
    Product.distinct('data.productType'),
    Product.distinct('info.name'),
  ]);

  return {
    colors: colors.length,
    categories: categories.length,
    names: names.length,
  };
};

// Отримання продуктів
exports.getProducts = async (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {
    'pid.groupKey': { $exists: true },
  };

  if (query.color) {
    filter['info.color.labelColor'] = query.color;
  }

  if (query.category) {
    filter['data.productType'] = query.category;
  }

  if (query.search) {
    filter.$or = [
      { 'info.name': { $regex: query.search, $options: 'i' } },
      { 'info.discription': { $regex: query.search, $options: 'i' } },
    ];
  }

  if (query.minPrice || query.maxPrice) {
    filter['price.self.UAH.currentPrice'] = {};
    if (query.minPrice) {
      filter['price.self.UAH.currentPrice'].$gte = parseFloat(query.minPrice);
    }
    if (query.maxPrice) {
      filter['price.self.UAH.currentPrice'].$lte = parseFloat(query.maxPrice);
    }
  }

  const sort = {};
  if (query.sortField) {
    if (query.sortField === 'price') {
      sort['price.self.UAH.currentPrice'] = query.sortOrder === 'asc' ? 1 : -1;
    } else if (query.sortField === 'name') {
      sort['info.name'] = query.sortOrder === 'asc' ? 1 : -1;
    } else {
      sort[query.sortField] = query.sortOrder === 'asc' ? 1 : -1;
    }
  } else {
    sort.createdAt = -1;
  }

  const groupKeysResult = await Product.aggregate([
    { $match: filter },
    { $group: { _id: '$pid.groupKey' } },
  ]);

  const total = groupKeysResult.length;
  const groupKeys = groupKeysResult.slice(skip, skip + limit).map((item) => item._id);

  const products = await Product.find({ 'pid.groupKey': { $in: groupKeys } }).sort(sort);

  return {
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}; 