const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(MONGO_URI)
.then(() => console.log('Подключено к MongoDB'))
.catch(err => console.error('Ошибка подключения к MongoDB:', err));

const productSchema = require('./model.js')

// // Product Schema
// const productSchema = new mongoose.Schema({
//     info: {
//         name: String,
//         subtitle: String,
//         color: { 
//             labelColor: String
//         }
//     },
//     price: {
//         self: {
//             selfUAH: {
//                 current20: Number
//             }
//         }
//     },
//     data: {
//         productType: String,
//         isNew: Boolean
//     },
//     imageData: {
//         portraitURL: String
//     }
// });

const Product = mongoose.model('Product', productSchema);

// API Routes
app.get('/api/products', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 12,
            search,
            minPrice,
            maxPrice,
            productType,
            color,
            isNew,
            sortBy
        } = req.query;

        // Build query
        const query = {};

        if (search) {
            query['info.name'] = { $regex: search, $options: 'i' };
        }

        if (minPrice || maxPrice) {
            query['price.self.selfUAH.current20'] = {};
            if (minPrice) query['price.self.selfUAH.current20'].$gte = Number(minPrice);
            if (maxPrice) query['price.self.selfUAH.current20'].$lte = Number(maxPrice);
        }

        if (productType) {
            query['data.productType'] = productType;
        }

        if (color) {
            query['info.color.labelColor'] = color;
        }

        if (isNew === 'true') {
            query['data.isNew'] = true;
        }

        // Build sort
        let sort = {};
        switch (sortBy) {
            case 'price_asc':
                sort = { 'price.self.selfUAH.current20': 1 };
                break;
            case 'price_desc':
                sort = { 'price.self.selfUAH.current20': -1 };
                break;
            case 'name_asc':
                sort = { 'info.name': 1 };
                break;
            case 'name_desc':
                sort = { 'info.name': -1 };
                break;
            case 'newest':
                sort = { 'data.isNew': -1 };
                break;
            default:
                sort = { 'data.isNew': -1 }; // Default sort by newest
        }

        // Get total count for pagination
        const total = await Product.countDocuments(query);

        // Get products with pagination
        const products = await Product.find(query)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({
            products,
            totalPages: Math.ceil(total / limit),
            currentPage: Number(page),
            total
        });
    } catch (error) {
        console.error('Ошибка при получении товаров:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        res.json(product);
    } catch (error) {
        console.error('Ошибка при получении товара:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Serve the product page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Что-то пошло не так!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
}); 
