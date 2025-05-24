const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { rec, productsApi, productApiById, pageP, pageE, handlerError, error404, error502 } = require("./api");


// Import models
// const productSchema = require('./model.js');
// const Product = mongoose.model('Products', productSchema);
const Cart = require('./models/Cart');
const User = require('./models/User');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { productValidators, cartValidators } = require('./middleware/validators');
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

const MONGO_URI = process.env.MONGO_URI;
// const PORT = 1137;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Подключение к MongoDB
mongoose.connect(MONGO_URI)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));



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



// Serve auth.html for authentication routes
app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

// Serve index.html for the catalog route
app.get('/ww', (req, res) => {
    console.log('Serving index.html for /w route');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'w.html'));
});

// Обработка ЧПУ для каталога
app.get('/catalog/*', (req, res) => {
    console.log('Serving catalog page with slug');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'w.html'));
});

// Обработка базового URL каталога
app.get('/catalog', (req, res) => {
    console.log('Serving catalog page');
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
            canonicalUrl: `/catalog/${category ? category.toLowerCase() : ''}${color ? '/' + color.toLowerCase() : ''}${search ? '/' + search.toLowerCase() : ''}${minPrice || maxPrice ? '/from-' + (minPrice || '0') + '-to-' + (maxPrice || '999999') : ''}`,
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

app.get("/api/recommendations", rec);
app.get("/api/products", productsApi);
app.get("/api/products/:id", productApiById);
app.get("/w", pageP);
app.get("/e", pageE);

app.use(handlerError);
app.use(error404);
app.use(error502);



// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
