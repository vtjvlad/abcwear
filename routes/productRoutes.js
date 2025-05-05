const express = require('express');
const { validationResult } = require('express-validator');
const { productValidators } = require('../middleware/validators');
const Product = require('../models/Product');

const router = express.Router();

// GET /api/filters/colors
router.get('/filters/colors', async (req, res, next) => {
  try {
    const colors = await Product.distinct('info.color.labelColor');
    res.json(colors.filter((color) => color));
  } catch (error) {
    next(error);
  }
});

// GET /api/filters/categories
router.get('/filters/categories', async (req, res, next) => {
  try {
    const categories = await Product.distinct('data.productType');
    res.json(categories.filter((category) => category));
  } catch (error) {
    next(error);
  }
});

// GET /api/filters/names
router.get('/filters/names', async (req, res) => {
  try {
    const names = await Product.distinct('name');
    res.json(names);
  } catch (error) {
    console.error('Error fetching names:', error);
    res.status(500).json({ error: 'Ошибка при получении списка названий' });
  }
});

// GET /api/products/price-range
router.get('/products/price-range', async (req, res) => {
  try {
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
      res.json({ min: result[0].min, max: result[0].max });
    } else {
      res.json({ min: 0, max: 10000 });
    }
  } catch (error) {
    console.error('Ошибка в /api/products/price-range:', error);
    res.json({ min: 0, max: 10000 }); // Возвращаем дефолтные значения даже при ошибке
  }
});

// GET /api/products/filter-counts
router.get('/products/filter-counts', async (req, res) => {
  try {
    const [colors, categories, names] = await Promise.all([
      Product.distinct('info.color.labelColor'),
      Product.distinct('data.productType'),
      Product.distinct('info.name'),
    ]);

    res.json({
      colors: colors.length,
      categories: categories.length,
      names: names.length,
    });
  } catch (error) {
    console.error('Error fetching filter counts:', error);
    res.status(500).json({ error: 'Ошибка при получении количества фильтров' });
  }
});

// GET /api/products
router.get('/products', productValidators.getProducts, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {
      'pid.groupKey': { $exists: true },
    };

    if (req.query.color) {
      filter['info.color.labelColor'] = req.query.color;
    }

    if (req.query.category) {
      filter['data.productType'] = req.query.category;
    }

    if (req.query.search) {
      filter.$or = [
        { 'info.name': { $regex: req.query.search, $options: 'i' } },
        { 'info.discription': { $regex: req.query.search, $options: 'i' } },
      ];
    }

    if (req.query.minPrice || req.query.maxPrice) {
      filter['price.self.UAH.currentPrice'] = {};
      if (req.query.minPrice) {
        filter['price.self.UAH.currentPrice'].$gte = parseFloat(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        filter['price.self.UAH.currentPrice'].$lte = parseFloat(req.query.maxPrice);
      }
    }

    const sort = {};
    if (req.query.sortField) {
      if (req.query.sortField === 'price') {
        sort['price.self.UAH.currentPrice'] = req.query.sortOrder === 'asc' ? 1 : -1;
      } else if (req.query.sortField === 'name') {
        sort['info.name'] = req.query.sortOrder === 'asc' ? 1 : -1;
      } else {
        sort[req.query.sortField] = req.query.sortOrder === 'asc' ? 1 : -1;
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

    res.json({
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 