const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
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
            name: username // Use username as name initially
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
                email: req.user.email,
                name: req.user.name,
                role: req.user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при получении данных пользователя' });
    }
});

// Profile routes
app.post('/api/auth/update-profile', auth, async (req, res) => {
    try {
        const { name, email } = req.body;
        
        // Check if email is already taken by another user
        if (email !== req.user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ error: 'Этот email уже используется' });
            }
        }

        // Update user
        req.user.name = name;
        req.user.email = email;
        await req.user.save();

        res.json({
            user: {
                id: req.user._id,
                email: req.user.email,
                name: req.user.name,
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
app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api/')) {
        return next();
    }
    if (req.url === '/w') {
        return next();
    }
    if (req.url === '/auth') {
        return next();
    }
    console.log(`Serving home.html for route: ${req.url}`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve index.html for the catalog route
app.get('/w', (req, res) => {
    console.log('Serving index.html for /w route');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'w.html'));
});

// SEO-friendly маршруты для каталога
app.get('/catalog/:category?/color-:color?', async (req, res) => {
    try {
        const { category, color } = req.params;
        const { 
            q: search,
            min: minPrice,
            max: maxPrice,
            sort: sortField,
            order: sortOrder
        } = req.query;

        // Формируем метаданные для страницы
        const metadata = {
            title: generatePageTitle({ category, color }),
            description: generatePageDescription({ category, color }),
            canonical: generateCanonicalUrl(req),
            breadcrumbs: generateBreadcrumbs({ category, color })
        };

        // Получаем товары с учетом фильтров
        const filters = {
            ...(category && { category }),
            ...(color && { color }),
            ...(search && { search }),
            ...(minPrice && { minPrice: parseFloat(minPrice) }),
            ...(maxPrice && { maxPrice: parseFloat(maxPrice) }),
            ...(sortField && { sortField }),
            ...(sortOrder && { sortOrder })
        };

        // Рендерим страницу с метаданными
        res.render('catalog', {
            metadata,
            filters,
            preloadedState: JSON.stringify(filters)
        });
    } catch (error) {
        console.error('Error in catalog route:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Вспомогательные функции для SEO
function generatePageTitle({ category, color }) {
    let title = 'UMAMI - ';
    
    if (category) {
        title += categoryMapping[category] || category;
    }
    if (color) {
        title += ' ' + (colorMapping[color] || color);
    }
    
    return title + ' | Интернет-магазин';
}

function generatePageDescription({ category, color }) {
    let desc = 'Купить ';
    
    if (category) {
        desc += categoryMapping[category] || category;
    }
    if (color) {
        desc += ' ' + (colorMapping[color] || color) + ' цвета';
    }
    
    return desc + ' в интернет-магазине UMAMI. Доставка по всей стране.';
}

function generateCanonicalUrl(req) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return baseUrl + req.originalUrl.split('?')[0];
}

function generateBreadcrumbs({ category, color }) {
    const breadcrumbs = [
        { title: 'Главная', url: '/' },
        { title: 'Каталог', url: '/catalog' }
    ];

    if (category) {
        breadcrumbs.push({
            title: categoryMapping[category] || category,
            url: `/catalog/${category}`
        });
    }

    if (color) {
        breadcrumbs.push({
            title: colorMapping[color] || color,
            url: `/catalog/${category}/color-${color}`
        });
    }

    return breadcrumbs;
}

// Маппинги для человекопонятных названий
const categoryMapping = {
    'mens-shoes': 'Мужская обувь',
    'womens-shoes': 'Женская обувь',
    'accessories': 'Аксессуары'
    // Добавьте другие категории по мере необходимости
};

const colorMapping = {
    'black': 'Черный',
    'white': 'Белый',
    'red': 'Красный'
    // Добавьте другие цвета по мере необходимости
};

// Генерация sitemap.xml
app.get('/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        // Добавляем основные страницы
        const mainPages = ['', '/catalog', '/auth'];
        mainPages.forEach(page => {
            xml += `  <url>\n    <loc>${baseUrl}${page}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
        });

        // Добавляем категории
        const categories = await Product.distinct('data.productType');
        categories.forEach(category => {
            if (category) {
                const seoCategory = category.toLowerCase().replace(/\s+/g, '-');
                xml += `  <url>\n    <loc>${baseUrl}/catalog/${seoCategory}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
            }
        });

        // Добавляем цвета для каждой категории
        const colors = await Product.distinct('info.color.labelColor');
        categories.forEach(category => {
            if (category) {
                const seoCategory = category.toLowerCase().replace(/\s+/g, '-');
                colors.forEach(color => {
                    if (color) {
                        const seoColor = color.toLowerCase().replace(/\s+/g, '-');
                        xml += `  <url>\n    <loc>${baseUrl}/catalog/${seoCategory}/color-${seoColor}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
                    }
                });
            }
        });

        // Добавляем страницы продуктов
        const products = await Product.find({}).select('_id updatedAt');
        products.forEach(product => {
            xml += `  <url>\n    <loc>${baseUrl}/product/${product._id}</loc>\n    <lastmod>${product.updatedAt.toISOString()}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
        });

        xml += '</urlset>';

        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error('Error generating sitemap:', error);
        res.status(500).send('Error generating sitemap');
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
