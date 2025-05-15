const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import models
const productSchema = require('./model.js');
const Product = mongoose.model('Products', productSchema);
const Cart = require('./models/Cart');
const User = require('./models/User');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { productValidators, cartValidators } = require('./middleware/validators');
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Check for products and create test product if none exist
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

// API Routes with validation
app.get('/api/filters/colors', async (req, res, next) => {
    try {
        const colors = await Product.distinct('info.color.labelColor');
        res.json(colors.filter(color => color));
    } catch (error) {
        next(error);
    }
});

app.get('/api/filters/categories', async (req, res, next) => {
    try {
        const categories = await Product.distinct('data.productType');
        res.json(categories.filter(category => category));
    } catch (error) {
        next(error);
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

app.get('/api/products/price-range', async (req, res) => {
    try {
        const result = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    min: { $min: "$price.self.UAH.currentPrice" },
                    max: { $max: "$price.self.UAH.currentPrice" }
                }
            }
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

app.get('/api/products/filter-counts', async (req, res) => {
    try {
        const [colors, categories, names] = await Promise.all([
            Product.distinct('info.color.labelColor'),
            Product.distinct('data.productType'),
            Product.distinct('info.name')
        ]);

        res.json({
            colors: colors.length,
            categories: categories.length,
            names: names.length
        });
    } catch (error) {
        console.error('Error fetching filter counts:', error);
        res.status(500).json({ error: 'Ошибка при получении количества фильтров' });
    }
});

app.get('/api/products', productValidators.getProducts, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = {
            'pid.groupKey': { $exists: true }
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
                { 'info.discription': { $regex: req.query.search, $options: 'i' } }
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

        const products = await Product.find({
            'pid.groupKey': { $in: groupKeys }
        }).select('info.name info.subtitle info.color price.self.UAH.currentPrice price.self.UAH.initialPrice imageData.imgMain imageData.images links.url sizes pid.groupKey');

        const groupedProducts = groupKeys.map(groupKey => {
            return products.filter(p => p.pid && p.pid.groupKey === groupKey);
        });

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
        next(error);
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Получаем все варианты цветов для этого продукта
        const variants = await Product.find({
            'pid.groupKey': product.pid.groupKey,
            _id: { $ne: product._id }  // исключаем текущий продукт
        }).select('_id info.color links.url imageData.squarishURL');

        // Добавляем варианты к продукту
        const productWithVariants = {
            ...product.toObject(),
            variants: [
                // Добавляем текущий продукт как один из вариантов
                {
                    _id: product._id,
                    info: {
                        color: product.info.color
                    },
                    links: {
                        url: `/product/${product._id}`
                    },
                    imageData: {
                        squarishURL: product.imageData.squarishURL
                    }
                },
                // Добавляем остальные варианты
                ...variants.map(v => ({
                    _id: v._id,
                    info: {
                        color: v.info.color
                    },
                    links: {
                        url: `/product/${v._id}`
                    },
                    imageData: {
                        squarishURL: v.imageData.squarishURL
                    }
                }))
            ]
        };

        res.json(productWithVariants);
    } catch (error) {
        res.status(500).json({ message: error.message });
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

// Cart routes with validation
app.post('/api/cart', cartValidators.addToCart, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { productId, quantity, selectedSize } = req.body;
        const userId = req.user?.id; // Assuming user is authenticated

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        const existingItem = cart.items.find(item => 
            item.productId.toString() === productId && 
            item.selectedSize === selectedSize
        );

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({ productId, quantity, selectedSize });
        }

        await cart.save();
        res.json(cart);
    } catch (error) {
        next(error);
    }
});

// Эндпоинт для получения 7 случайных товаров для рекомендаций
app.get('/api/recommendations', async (req, res) => {
    try {
        // Получаем случайные товары
        const recommendations = await Product.aggregate([
            { $match: { 'pid.groupKey': { $exists: true } } },
            { $sample: { size: 13 } }
        ]);
        res.json(recommendations);
    } catch (error) {
        console.error('Ошибка при получении рекомендаций:', error);
        res.status(500).json({ error: 'Ошибка при получении рекомендаций' });
    }
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user/email already exists
        const existingUser = await User.findOne({ $or: [ { email }, { username } ] });
        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
            }
            if (existingUser.username === username) {
                return res.status(400).json({ error: 'Пользователь с таким username уже существует' });
            }
        }

        // Create new user
        const user = new User({
            username,
            email,
            password,
            name: '' // Use username as name initially
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при регистрации', details: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { login, password } = req.body; // login can be either email or username

        // Find user by username or email
        const user = await User.findOne({
            $or: [
                { email: login },
                { username: login }
            ]
        });

        if (!user) {
            return res.status(401).json({ error: 'Неверный email/имя пользователя или пароль' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Неверный email/имя пользователя или пароль' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при входе', details: error.message });
    }
});

app.get('/api/auth/me', auth, async (req, res) => {
    try {
        res.json({
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                name: req.user.name,
                avatar: req.user.avatar,
                phone: req.user.phone,
                address: req.user.address,
                city: req.user.city,
                createdAt: req.user.createdAt,
                role: req.user.role,
                gender: req.user.gender
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при получении данных пользователя' });
    }
});

app.post('/api/auth/update-profile', auth, async (req, res) => {
    try {
        const { name, email, avatar, phone, address, city, username, gender } = req.body;

        if (email && email !== req.user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ error: 'Этот email уже используется' });
            }
        }
        if (username) req.user.username = username;
        if (name) req.user.name = name;
        if (email) req.user.email = email;
        if (avatar) req.user.avatar = avatar;
        if (phone !== undefined) req.user.phone = phone;
        if (address !== undefined) req.user.address = address;
        if (city !== undefined) req.user.city = city;
        if (gender !== undefined) req.user.gender = gender;

        await req.user.save();

        res.json({
            user: {
                id: req.user._id,
                email: req.user.email,
                name: req.user.name,
                avatar: req.user.avatar,
                phone: req.user.phone,
                address: req.user.address,
                city: req.user.city,
                username: req.user.username,
                gender: req.user.gender,
                role: req.user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при обновлении профиля' });
    }
});

app.post('/api/auth/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Verify current password
        const isMatch = await req.user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ error: 'Неверный текущий пароль' });
        }

        // Update password
        req.user.password = newPassword;
        await req.user.save();

        res.json({ message: 'Пароль успешно изменен' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при изменении пароля' });
    }
});

// Serve profile page
app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Error handling middleware
app.use(errorHandler);

// Serve product.html for product routes
app.get('/product/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'product.html'));
});

// Serve auth.html for authentication routes
app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

// Serve home.html for all non-API routes first
// app.get('*', (req, res, next) => {
//     if (req.url.startsWith('/api/')) {
//         return next();
//     }
//     if (req.url === '/w') {
//         return next();
//     }
//     if (req.url === '/auth') {
//         return next();
//     }
//     console.log(`Serving home.html for route: ${req.url}`);
//     res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
//     res.setHeader('Pragma', 'no-cache');
//     res.setHeader('Expires', '0');
//     res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// Serve index.html for the catalog route
app.get('/w', (req, res) => {
    console.log('Serving index.html for /w route');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'w.html'));
});

    // Указываем папку для хранения загруженных файлов
    const storage = multer.diskStorage({
        destination: 'uploads/',
        filename: (req, file, cb) => {
            cb(null, Date.now() + path.extname(file.originalname)); // Уникальное имя файла
        }
    });

    const upload = multer({ storage });

        // Разрешаем отдавать статические файлы из папки "uploads"
        app.use('/uploads', express.static('uploads'));

        // Маршрут для загрузки файла
        app.post('/upload', upload.single('image'), (req, res) => {
            console.log("Попытка загрузки файлов");
            if (!req.file) {
                return res.status(400).json({
                    error: 'Файл не был загружен'
                });
            }
            res.json({
                url: `https://${req.get('host')}/uploads/${req.file.filename}`
            });
            console.log(`Фото успешго загруженно:
                https://vtjvlad.ddns.net/uploads/${req.file.filename}`);
        });

// Удаление аккаунта пользователя
app.delete('/api/auth/delete-account', auth, async (req, res) => {
    try {
        await req.user.deleteOne();
        res.json({ message: 'Аккаунт успешно удалён' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при удалении аккаунта' });
    }
});

/**
 * Эндпоинт для получения SEO ключевых слов
 * Анализирует все продукты и извлекает ключевые слова из названий, подзаголовков и цветов
 * Группирует ключевые слова по категориям и подсчитывает их частоту
 */
app.get('/api/filters/seo', async (req, res, next) => {
    try {
        // Агрегация для извлечения и анализа ключевых слов
        const seoKeywords = await Product.aggregate([
            // Проекция: объединяем название, подзаголовок и цвет в одну строку
            {
                $project: {
                    keywords: {
                        $concat: [
                            { $ifNull: ['$info.name', ''] },
                            ' ',
                            { $ifNull: ['$info.subtitle', ''] },
                            ' ',
                            { $ifNull: ['$info.color.labelColor', ''] }
                        ]
                    },
                    category: '$data.productType'
                }
            },
            // Группировка по категориям и разбиение ключевых слов на массив
            {
                $group: {
                    _id: '$category',
                    keywords: {
                        $push: {
                            $split: ['$keywords', ' ']
                        }
                    }
                }
            },
            // Преобразование вложенных массивов в один плоский массив
            {
                $project: {
                    category: '$_id',
                    keywords: {
                        $reduce: {
                            input: '$keywords',
                            initialValue: [],
                            in: { $concatArrays: ['$$value', '$$this'] }
                        }
                    }
                }
            },
            // Подсчет частоты каждого ключевого слова
            {
                $project: {
                    category: 1,
                    keywordCounts: {
                        $reduce: {
                            input: '$keywords',
                            initialValue: {},
                            in: {
                                $mergeObjects: [
                                    '$$value',
                                    {
                                        $cond: {
                                            if: { $in: ['$$this', { $objectToArray: '$$value' }.k] },
                                            then: { $add: [{ $arrayElemAt: [{ $objectToArray: '$$value' }.v, { $indexOfArray: [{ $objectToArray: '$$value' }.k, '$$this'] }] }, 1] },
                                            else: { $literal: 1 }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        ]);

        // Форматирование результатов
        const formattedResults = seoKeywords.map(category => ({
            category: category.category || 'UNCATEGORIZED',
            keywords: Object.entries(category.keywordCounts)
                .map(([keyword, count]) => ({ keyword, count }))
                .filter(item => item.keyword.length > 2) // Фильтрация коротких слов
                .sort((a, b) => b.count - a.count) // Сортировка по частоте
                .slice(0, 100) // Ограничение до 100 ключевых слов на категорию
        }));

        res.json(formattedResults);
    } catch (error) {
        next(error);
    }
});

/**
 * Эндпоинт для получения SEO метаданных продукта
 * Генерирует метаданные для отдельного продукта, включая:
 * - Заголовок и описание
 * - Ключевые слова
 * - Open Graph теги
 * - Структурированные данные
 */
app.get('/api/products/:id/seo', async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Генерация SEO метаданных
        const seoMetadata = {
            // Основные метаданные
            title: `${product.info.name} - ${product.info.subtitle}`,
            description: product.info.discription || product.info.subtitle,
            keywords: [
                product.info.name,
                product.info.subtitle,
                product.info.color.labelColor,
                product.data.productType
            ].filter(Boolean).join(', '),

            // Open Graph метаданные для соцсетей
            ogTitle: `${product.info.name} - ${product.info.subtitle}`,
            ogDescription: product.info.discription || product.info.subtitle,
            ogImage: product.imageData.imgMain,
            canonicalUrl: `/products/${product._id}`,

            // Структурированные данные для поисковых систем
            structuredData: {
                '@context': 'https://schema.org',
                '@type': 'Product',
                name: product.info.name,
                description: product.info.discription || product.info.subtitle,
                image: product.imageData.imgMain,
                sku: product.pid?.groupKey || product._id.toString(),
                brand: {
                    '@type': 'Brand',
                    name: 'ABC Wear'
                },
                offers: {
                    '@type': 'Offer',
                    price: product.price.self.UAH.currentPrice,
                    priceCurrency: 'UAH',
                    availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
                }
            }
        };

        res.json(seoMetadata);
    } catch (error) {
        next(error);
    }
});

/**
 * Эндпоинт для получения SEO метаданных категории
 * Генерирует метаданные для страницы категории, включая:
 * - Статистику по продуктам
 * - Топ ключевых слов
 * - Структурированные данные
 */
app.get('/api/categories/:category/seo', async (req, res, next) => {
    try {
        const category = req.params.category;
        
        // Получение статистики по категории
        const stats = await Product.aggregate([
            {
                $match: {
                    'data.productType': category
                }
            },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    avgPrice: { $avg: '$price.self.UAH.currentPrice' },
                    minPrice: { $min: '$price.self.UAH.currentPrice' },
                    maxPrice: { $max: '$price.self.UAH.currentPrice' }
                }
            }
        ]);

        // Получение ключевых слов для категории
        const keywords = await Product.aggregate([
            {
                $match: {
                    'data.productType': category
                }
            },
            {
                $project: {
                    keywords: {
                        $concat: [
                            { $ifNull: ['$info.name', ''] },
                            ' ',
                            { $ifNull: ['$info.subtitle', ''] },
                            ' ',
                            { $ifNull: ['$info.color.labelColor', ''] }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    allKeywords: { $push: { $split: ['$keywords', ' '] } }
                }
            },
            {
                $project: {
                    keywords: {
                        $reduce: {
                            input: '$allKeywords',
                            initialValue: [],
                            in: { $concatArrays: ['$$value', '$$this'] }
                        }
                    }
                }
            }
        ]);

        // Обработка ключевых слов
        const keywordCounts = {};
        if (keywords.length > 0 && keywords[0].keywords) {
            keywords[0].keywords.forEach(keyword => {
                if (keyword.length > 2) {
                    keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
                }
            });
        }

        // Получение топ-10 ключевых слов
        const topKeywords = Object.entries(keywordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([keyword]) => keyword);

        // Генерация SEO метаданных
        const seoMetadata = {
            title: `${category} - ABC Wear`,
            description: `Browse our collection of ${category.toLowerCase()} at ABC Wear. ${stats[0]?.totalProducts || 0} products available from ${stats[0]?.minPrice || 0} to ${stats[0]?.maxPrice || 0} UAH.`,
            keywords: topKeywords.join(', '),
            ogTitle: `${category} - ABC Wear`,
            ogDescription: `Browse our collection of ${category.toLowerCase()} at ABC Wear. ${stats[0]?.totalProducts || 0} products available.`,
            canonicalUrl: `/categories/${category}`,
            structuredData: {
                '@context': 'https://schema.org',
                '@type': 'CollectionPage',
                name: `${category} - ABC Wear`,
                description: `Browse our collection of ${category.toLowerCase()} at ABC Wear.`,
                numberOfItems: stats[0]?.totalProducts || 0,
                offers: {
                    '@type': 'AggregateOffer',
                    priceCurrency: 'UAH',
                    lowPrice: stats[0]?.minPrice || 0,
                    highPrice: stats[0]?.maxPrice || 0,
                    offerCount: stats[0]?.totalProducts || 0
                }
            }
        };

        res.json(seoMetadata);
    } catch (error) {
        next(error);
    }
});

/**
 * Эндпоинт для получения SEO метаданных страницы с фильтрами
 * Генерирует метаданные для страницы с примененными фильтрами, включая:
 * - Статистику по отфильтрованным продуктам
 * - Топ ключевых слов
 * - Хлебные крошки
 * - Структурированные данные
 */
app.get('/api/filters/seo/metadata', async (req, res, next) => {
    try {
        const { color, category, minPrice, maxPrice, search } = req.query;
        
        // Построение объекта фильтра
        const filter = {
            'pid.groupKey': { $exists: true }
        };

        if (color) {
            filter['info.color.labelColor'] = color;
        }

        if (category) {
            filter['data.productType'] = category;
        }

        if (search) {
            filter.$or = [
                { 'info.name': { $regex: search, $options: 'i' } },
                { 'info.discription': { $regex: search, $options: 'i' } }
            ];
        }

        if (minPrice || maxPrice) {
            filter['price.self.UAH.currentPrice'] = {};
            if (minPrice) {
                filter['price.self.UAH.currentPrice'].$gte = parseFloat(minPrice);
            }
            if (maxPrice) {
                filter['price.self.UAH.currentPrice'].$lte = parseFloat(maxPrice);
            }
        }

        // Получение статистики по отфильтрованным продуктам
        const stats = await Product.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    avgPrice: { $avg: '$price.self.UAH.currentPrice' },
                    minPrice: { $min: '$price.self.UAH.currentPrice' },
                    maxPrice: { $max: '$price.self.UAH.currentPrice' },
                    categories: { $addToSet: '$data.productType' },
                    colors: { $addToSet: '$info.color.labelColor' }
                }
            }
        ]);

        // Получение ключевых слов для отфильтрованных продуктов
        const keywords = await Product.aggregate([
            { $match: filter },
            {
                $project: {
                    keywords: {
                        $concat: [
                            { $ifNull: ['$info.name', ''] },
                            ' ',
                            { $ifNull: ['$info.subtitle', ''] },
                            ' ',
                            { $ifNull: ['$info.color.labelColor', ''] }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    allKeywords: { $push: { $split: ['$keywords', ' '] } }
                }
            },
            {
                $project: {
                    keywords: {
                        $reduce: {
                            input: '$allKeywords',
                            initialValue: [],
                            in: { $concatArrays: ['$$value', '$$this'] }
                        }
                    }
                }
            }
        ]);

        // Обработка ключевых слов
        const keywordCounts = {};
        if (keywords.length > 0 && keywords[0].keywords) {
            keywords[0].keywords.forEach(keyword => {
                if (keyword.length > 2) {
                    keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
                }
            });
        }

        // Получение топ-10 ключевых слов
        const topKeywords = Object.entries(keywordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([keyword]) => keyword);

        // Формирование частей заголовка и описания
        let titleParts = [];
        let descriptionParts = [];

        if (category) {
            titleParts.push(category);
            descriptionParts.push(category.toLowerCase());
        }

        if (color) {
            titleParts.push(color);
            descriptionParts.push(color.toLowerCase());
        }

        if (search) {
            titleParts.push(`"${search}"`);
            descriptionParts.push(`matching "${search}"`);
        }

        if (minPrice || maxPrice) {
            const priceRange = [];
            if (minPrice) priceRange.push(`from ${minPrice}`);
            if (maxPrice) priceRange.push(`to ${maxPrice}`);
            if (priceRange.length > 0) {
                descriptionParts.push(`priced ${priceRange.join(' ')} UAH`);
            }
        }

        // Генерация SEO метаданных
        const seoMetadata = {
            title: `${titleParts.join(' ')} - ABC Wear`,
            description: `Browse our collection of ${descriptionParts.join(' ')} at ABC Wear. ${stats[0]?.totalProducts || 0} products available.`,
            keywords: topKeywords.join(', '),
            ogTitle: `${titleParts.join(' ')} - ABC Wear`,
            ogDescription: `Browse our collection of ${descriptionParts.join(' ')} at ABC Wear. ${stats[0]?.totalProducts || 0} products available.`,
            canonicalUrl: `/filters?${new URLSearchParams(req.query).toString()}`,
            structuredData: {
                '@context': 'https://schema.org',
                '@type': 'CollectionPage',
                name: `${titleParts.join(' ')} - ABC Wear`,
                description: `Browse our collection of ${descriptionParts.join(' ')} at ABC Wear.`,
                numberOfItems: stats[0]?.totalProducts || 0,
                offers: {
                    '@type': 'AggregateOffer',
                    priceCurrency: 'UAH',
                    lowPrice: stats[0]?.minPrice || 0,
                    highPrice: stats[0]?.maxPrice || 0,
                    offerCount: stats[0]?.totalProducts || 0
                }
            },
            breadcrumbs: {
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'Home',
                        item: '/'
                    }
                ]
            }
        };

        // Добавление категории в хлебные крошки
        if (category) {
            seoMetadata.breadcrumbs.itemListElement.push({
                '@type': 'ListItem',
                position: 2,
                name: category,
                item: `/categories/${category}`
            });
        }

        // Добавление текущего фильтра в хлебные крошки
        seoMetadata.breadcrumbs.itemListElement.push({
            '@type': 'ListItem',
            position: seoMetadata.breadcrumbs.itemListElement.length + 1,
            name: titleParts.join(' '),
            item: `/filters?${new URLSearchParams(req.query).toString()}`
        });

        res.json(seoMetadata);
    } catch (error) {
        next(error);
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
