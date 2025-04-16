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
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import Product model
const Product = mongoose.model('Product', require('./model.js'));

// API Routes
app.get('/api/filters/colors', async (req, res) => {
    try {
        const colors = await Product.distinct('color');
        res.json(colors);
    } catch (error) {
        console.error('Error fetching colors:', error);
        res.status(500).json({ error: 'Ошибка при получении списка цветов' });
    }
});

app.get('/api/filters/categories', async (req, res) => {
    try {
        const categories = await Product.distinct('category');
        res.json(categories);
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

        // Создаем объект фильтра
        const filter = {};

        // Фильтр по цвету
        if (req.query.color) {
            filter.color = req.query.color;
        }

        // Фильтр по категории
        if (req.query.category) {
            filter.category = req.query.category;
        }

        // Фильтр по названию
        if (req.query.name) {
            filter.name = req.query.name;
        }

        // Фильтр по поисковому запросу
        if (req.query.search) {
            filter.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        // Фильтр по цене
        if (req.query.minPrice || req.query.maxPrice) {
            filter.price = {};
            if (req.query.minPrice) {
                filter.price.$gte = parseFloat(req.query.minPrice);
            }
            if (req.query.maxPrice) {
                filter.price.$lte = parseFloat(req.query.maxPrice);
            }
        }

        // Создаем объект сортировки
        const sort = {};
        if (req.query.sortField) {
            sort[req.query.sortField] = req.query.sortOrder === 'asc' ? 1 : -1;
        } else {
            sort.createdAt = -1; // Сортировка по умолчанию
        }

        // Получаем общее количество продуктов
        const totalProducts = await Product.countDocuments(filter);

        // Получаем продукты с пагинацией
        const products = await Product.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();

        res.json({
            products,
            currentPage: page,
            totalPages: Math.ceil(totalProducts / limit),
            totalProducts
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Ошибка при получении списка продуктов' });
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

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});