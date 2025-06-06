const Product = require('../models/Product');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Cart = require('../models/Cart');
const User = require('../models/User');
const { validationResult } = require('express-validator');
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

const rec = async (req, res) => {
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
};

const statusApi = async (req, res) => {
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
};

const productsApi = async (req, res) => {
    try {
        console.log('Received request with query:', req.query);
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter = {};
        
        // Search by multiple fields
        if (req.query.search) {
            const searchFields = req.query.searchFields ? req.query.searchFields.split(',') : ['info.name'];
            const searchConditions = searchFields.map(field => {
                const fieldPath = field.includes('.') ? field : `info.${field}`;
                return { [fieldPath]: { $regex: req.query.search, $options: 'i' } };
            });
            filter.$or = searchConditions;
        }

        // Filter by color
        if (req.query.color) {
            filter['info.color.labelColor'] = req.query.color;
        }

        // Filter by product type (category)
        if (req.query.productType) {
            const productTypes = Array.isArray(req.query.productType) 
                ? req.query.productType 
                : [req.query.productType];
            filter['data.productType'] = { $in: productTypes };
        }

        // Filter by price range
        if (req.query.minPrice || req.query.maxPrice) {
            filter['price.self.UAH.currentPrice'] = {};
            if (req.query.minPrice) {
                filter['price.self.UAH.currentPrice'].$gte = parseFloat(req.query.minPrice);
            }
            if (req.query.maxPrice) {
                filter['price.self.UAH.currentPrice'].$lte = parseFloat(req.query.maxPrice);
            }
        }

        // Filter by keywords
        if (req.query.keywords) {
            // Преобразуем строку ключевых слов в массив
            const keywords = Array.isArray(req.query.keywords) 
                ? req.query.keywords 
                : [req.query.keywords];
            
            console.log('Processing keywords:', keywords);
            
            // Создаем массив условий для поиска по ключевым словам в subtitle
            const keywordConditions = keywords.map(keyword => ({
                'info.subtitle': { $regex: keyword, $options: 'i' }
            }));
            
            // Добавляем условия в фильтр
            if (keywordConditions.length > 0) {
                filter.$and = keywordConditions;
            }
        }

        console.log('Final filter:', JSON.stringify(filter, null, 2));

        // Set up sort options
        let sortOptions = {};
        
        // Handle sort parameter
        if (req.query.sort) {
            switch (req.query.sort) {
                case 'price_asc':
                    sortOptions = { 'price.self.selfUAH.current20': 1 };
                    break;
                case 'price_desc':
                    sortOptions = { 'price.self.selfUAH.current20': -1 };
                    break;
                case 'newest':
                    // Условно считаем, что id с большим значением - это более новые товары
                    sortOptions = { 'id': -1 };
                    break;
                case 'discount':
                    // Сортируем по размеру скидки (разница между исходной и текущей ценой)
                    // Для товаров без скидки разница будет 0, поэтому они будут в конце
                    sortOptions = { 
                        $expr: { 
                            $subtract: [
                                { $ifNull: ['$price.self.selfUAH.initial20', 0] }, 
                                { $ifNull: ['$price.self.selfUAH.current20', 0] }
                            ] 
                        }
                    };
                    break;
                default:
                    // По умолчанию сортируем по id в обратном порядке (новые первыми)
                    sortOptions = { 'id': -1 };
            }
        } else {
            // Если сортировка не указана, сортируем по id в обратном порядке
            sortOptions = { 'id': -1 };
        }
        
        console.log('Using sort options:', sortOptions);

        // Get products with pagination and sorting
        console.log('Fetching products with skip:', skip, 'limit:', limit);
        
        // First get the group keys with pagination
        const groupKeysResult = await Product.aggregate([
            { $match: filter },
            { $group: { _id: '$pid.groupKey' } },
            { $sort: sortOptions },
            { $skip: skip },
            { $limit: limit }
        ]);

        const groupKeys = groupKeysResult.map(result => result._id);

        if (!groupKeys.length) {
            return res.json({
                products: [],
                pagination: {
                    currentPage: page,
                    totalPages: 0,
                    totalProducts: 0,
                    productsPerPage: limit
                },
                filters: {
                    colors: [],
                    priceRange: {
                        min: 0,
                        max: 10000
                    }
                }
            });
        }

        // Then get all products for these group keys
        const products = await Product.find({
            'pid.groupKey': { $in: groupKeys }
        }).select('+*');

        // Group products by groupKey
        const groupedProducts = groupKeys.map(groupKey => {
            return products.filter(p => p.pid && p.pid.groupKey === groupKey);
        });

        // Get total count of groups for pagination
        const totalGroups = await Product.aggregate([
            { $match: filter },
            { $group: { _id: '$pid.groupKey' } },
            { $count: 'total' }
        ]);

        const totalCount = totalGroups[0]?.total || 0;

        // Get all unique colors from database
        const colors = await Product.distinct('info.color.labelColor');
        console.log('Available colors:', colors);

        // Get min and max prices from database
        const priceStats = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    minPrice: { $min: "$price.self.selfUAH.current20" },
                    maxPrice: { $max: "$price.self.selfUAH.current20" }
                }
            }
        ]);
        
        const priceRange = priceStats[0] || { minPrice: 0, maxPrice: 10000 };
        console.log('Price range:', priceRange);

        console.log(`Found ${groupedProducts.length} product groups on page ${page} of ${Math.ceil(totalCount / limit)}`);

        res.json({
            products: groupedProducts,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                totalProducts: totalCount,
                productsPerPage: limit
            },
            filters: {
                colors: colors.filter(Boolean),
                priceRange: {
                    min: priceRange.minPrice,
                    max: priceRange.maxPrice
                }
            }
        });
    } catch (error) {
        console.error('Error in /api/products:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Ошибка при загрузке товаров',
            error: error.message 
        });
    }

}

const productApiById = async (req, res) => {
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

}


// Cart routes with validation

// Получение корзины пользователя
const getCartApi = async (req, res, next) => {
    try {
        const userId = req.user.id;
        let cart = await Cart.findOne({ userId }).populate('items.productId');
        
        if (!cart) {
            cart = new Cart({ userId, items: [] });
            await cart.save();
        }
        
        res.json(cart);
    } catch (error) {
        next(error);
    }
};

// Добавление товара в корзину
const addToCartApi = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { productId, quantity, selectedSize } = req.body;
        const userId = req.user.id;

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
};

// Обновление количества товара в корзине
const updateCartItemApi = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { productId, quantity, selectedSize } = req.body;
        const userId = req.user.id;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Корзина не найдена' });
        }

        const itemIndex = cart.items.findIndex(item => 
            item.productId.toString() === productId && 
            item.selectedSize === selectedSize
        );

        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Товар не найден в корзине' });
        }

        if (quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex].quantity = quantity;
        }

        await cart.save();
        await cart.populate('items.productId');
        res.json(cart);
    } catch (error) {
        next(error);
    }
};

// Удаление товара из корзины
const removeFromCartApi = async (req, res, next) => {
    try {
        const { productId, selectedSize } = req.body;
        const userId = req.user.id;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Корзина не найдена' });
        }

        cart.items = cart.items.filter(item => 
            !(item.productId.toString() === productId && item.selectedSize === selectedSize)
        );

        await cart.save();
        res.json(cart);
    } catch (error) {
        next(error);
    }
};

// Очистка корзины
const clearCartApi = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cart = await Cart.findOne({ userId });
        
        if (!cart) {
            return res.status(404).json({ message: 'Корзина не найдена' });
        }

        cart.items = [];
        await cart.save();
        res.json(cart);
    } catch (error) {
        next(error);
    }
};

// Authentication routes
const registerApi = async (req, res) => {
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
            JWT_SECRET,
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
};

const loginApi = async (req, res) => {
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
            JWT_SECRET,
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
};

// auth, 
const profileApi = async (req, res) => {
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
};

// auth, 
const updateProfileApi = async (req, res) => {
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
};

// auth, 
const changePasswordApi = async (req, res) => {
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
};

// Удаление аккаунта пользователя

// auth, 
const deleteAccountApi = async (req, res) => {
    try {
        await req.user.deleteOne();
        res.json({ message: 'Аккаунт успешно удалён' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при удалении аккаунта' });
    }
};


module.exports = {
    rec,
    statusApi,
    productsApi,
    productApiById,
    getCartApi,
    addToCartApi,
    updateCartItemApi,
    removeFromCartApi,
    clearCartApi,
    registerApi,
    loginApi,
    profileApi,
    updateProfileApi,
    changePasswordApi,
    deleteAccountApi
};