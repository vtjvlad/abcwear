require('dotenv').config();
const jwt = require('jsonwebtoken');
const path = require('path');
const { validationResult } = require('express-validator');
const Product = require('./model2');
const Cart = require('./models/Cart');
const User = require('./models/User');
const mongoose = require('mongoose');


const JWT_SECRET = process.env.JWT_SECRET;




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

// Cart routes with validation

// cartValidators.addToCart, 
const addToCartApi = async (req, res, next) => {
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


// Serve profile page
// 
const profileRoutes = (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
}

// Serve auth.html for authentication routes
// 
const authRoutes = (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auth.html'));
}

// Serve index.html for the catalog route
// 
const ctgPageRoutes = (req, res) => {
    console.log('Serving index.html for /w route');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'w.html'));
}

// Обработка ЧПУ для каталога
// 
const ctgRoutes = (req, res) => {
    console.log('Serving catalog page with slug');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'w.html'));
}

// Обработка базового URL каталога
// 
const catalogRoutes = (req, res) => {
    console.log('Serving catalog page');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'w.html'));
}



    module.exports = {
        statusApi,
        addToCartApi,
        registerApi,
        loginApi,
        profileApi,
        updateProfileApi,
        changePasswordApi,
        deleteAccountApi,
        profileRoutes,
        authRoutes,
        ctgPageRoutes,
        ctgRoutes,
        catalogRoutes
        }   