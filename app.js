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

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
