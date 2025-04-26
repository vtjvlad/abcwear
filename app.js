const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Проверяем, есть ли товары в базе
    const count = await Product.countDocuments({});
    if (count === 0) {
      console.log('No products found, creating a test product...');
      const testProduct = new Product({
        info: {
          name: 'Тестовый товар',
          subtitle: 'Описание тестового товара',
          discription: 'Подробное описание тестового товара',
          color: {
            labelColor: 'Красный',
            hex: '#FF0000',
            colorDescription: 'Яркий красный'
          }
        },
        price: {
          self: {
            UAH: {
              initialPrice: 1000,
              currentPrice: 800
            }
          }
        },
        imageData: {
          imgMain: 'https://via.placeholder.com/300',
          images: ['https://via.placeholder.com/300']
        }
      });
      
      await testProduct.save();
      console.log('Test product created');
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Import Product model
const Product = mongoose.model('Product', require('./model.js'));

// API Routes
app.get('/api/filters/colors', async (req, res) => {
    try {
        const colors = await Product.distinct('info.color.labelColor');
        res.json(colors.filter(color => color)); // Фильтруем пустые значения
    } catch (error) {
        console.error('Error fetching colors:', error);
        res.status(500).json({ error: 'Ошибка при получении списка цветов' });
    }
});

app.get('/api/filters/categories', async (req, res) => {
    try {
        const categories = await Product.distinct('data.productType');
        res.json(categories.filter(category => category)); // Фильтруем пустые значения
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Ошибка при получении списка категорий' });
    }
});

app.get('/api/filters/names', async (req, res) => {
    try {
        const names = await Product.distinct('name');
        res.json(names);
    } catch (error) {
        console.error('Error fetching names:', error);
        res.status(500).json({ error: 'Ошибка при получении списка названий' });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Формируем объект фильтра
        const filter = {
            'pid.groupKey': { $exists: true }
        };

        // Фильтр по цвету
        if (req.query.color) {
            filter['info.color.labelColor'] = req.query.color;
        }

        // Фильтр по категории
        if (req.query.category) {
            filter['data.productType'] = req.query.category;
        }

        // Фильтр по названию
        if (req.query.name) {
            filter['info.name'] = req.query.name;
        }

        // Фильтр по поисковому запросу
        if (req.query.search) {
            filter.$or = [
                { 'info.name': { $regex: req.query.search, $options: 'i' } },
                { 'info.discription': { $regex: req.query.search, $options: 'i' } }
            ];
        }

        // Фильтр по цене
        if (req.query.minPrice || req.query.maxPrice) {
            filter['price.self.UAH.currentPrice'] = {};
            if (req.query.minPrice) {
                filter['price.self.UAH.currentPrice'].$gte = parseFloat(req.query.minPrice);
            }
            if (req.query.maxPrice) {
                filter['price.self.UAH.currentPrice'].$lte = parseFloat(req.query.maxPrice);
            }
        }

        // Создаем объект сортировки
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

        // Шаг 1: Получаем уникальные groupKey с учетом фильтров и пагинации
        const groupKeysResult = await Product.aggregate([
            { $match: filter },
            { $group: { _id: '$pid.groupKey' } },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit }
        ]);

        const groupKeys = groupKeysResult.map(result => result._id);

        if (!groupKeys.length) {
            return res.json({
                products: [],
                total: 0,
                currentPage: page,
                totalPages: 0
            });
        }

        // Шаг 2: Получаем продукты для этих groupKey
        const products = await Product.find({
            'pid.groupKey': { $in: groupKeys }
        }).select('info.name info.subtitle info.color price.self.UAH.currentPrice price.self.UAH.initialPrice imageData.imgMain imageData.images links.url sizes pid.groupKey');

        // Шаг 3: Группируем продукты по groupKey
        const groupedProducts = groupKeys.map(groupKey => {
            return products.filter(p => p.pid && p.pid.groupKey === groupKey);
        });

        // Шаг 4: Подсчитываем общее количество уникальных groupKey
        const totalGroupsResult = await Product.aggregate([
            { $match: filter },
            { $group: { _id: '$pid.groupKey' } }
        ]);
        const totalGroups = totalGroupsResult.length;

        res.json({
            products: groupedProducts,
            total: totalGroups,
            currentPage: page,
            totalPages: Math.ceil(totalGroups / limit)
        });
    } catch (error) {
        console.error('Error in /api/products:', error);
        res.status(500).json({ 
            error: 'Ошибка при получении списка продуктов',
            details: error.message 
        });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/products/filter-counts', async (req, res) => {
    try {
        const [colors, categories, names] = await Promise.all([
            Product.distinct('color').count(),
            Product.distinct('category').count(),
            Product.distinct('name').count()
        ]);

        res.json({
            colors,
            categories,
            names
        });
    } catch (error) {
        console.error('Error fetching filter counts:', error);
        res.status(500).json({ error: 'Ошибка при получении количества фильтров' });
    }
});

app.get('/api/status', async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments({});
        const sampleProduct = await Product.findOne({});
        
        res.json({
            databaseConnected: mongoose.connection.readyState === 1,
            totalProducts,
            sampleProduct: sampleProduct ? {
                _id: sampleProduct._id,
                name: sampleProduct.name,
                price: sampleProduct.price
            } : null
        });
    } catch (error) {
        console.error('Error checking database status:', error);
        res.status(500).json({ 
            error: 'Ошибка при проверке статуса базы данных',
            details: error.message
        });
    }
});

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});