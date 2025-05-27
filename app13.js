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
const { 
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
 } = require('./api2');


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



app.get('/api/status', statusApi);

// Cart routes with validation
app.post('/api/cart', addToCartApi);

// Authentication routes
app.post('/api/auth/register', registerApi);

app.post('/api/auth/login', loginApi);

app.get('/api/auth/me', auth, profileApi);

app.post('/api/auth/update-profile', auth, updateProfileApi);

app.post('/api/auth/change-password', auth, changePasswordApi);

app.delete('/api/auth/delete-account', auth, deleteAccountApi);

app.get('/profile', profileRoutes);


// Serve auth.html for authentication routes
app.get('/auth', authRoutes);



// Обработка ЧПУ для каталога
app.get('/catalog/*', ctgRoutes);

// Обработка базового URL каталога
app.get('/catalog', catalogRoutes);
// Serve index.html for the catalog route
app.get('/ww', ctgPageRoutes);
app.get("/w", pageP);
app.get("/e", pageE);

    // Указываем папку для хранения загруженных файлов
const storage = multer.diskStorage({
        destination: 'uploads/',
        filename: (req, file, cb) => {
            cb(null, Date.now() + path.extname(file.originalname)); // Уникальное имя файла
        }
    });

    const upload = multer({ storage });

        // Разрешаем отдавать статические файлы из папки "uploads"
    
        app.use('/uploads', express.static('./uploads'));

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




// Serve product.html for product routes


app.get('/product/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'product.html'));
    });
app.get("/api/products", productsApi);
app.get("/api/products/:id", productApiById);
app.get("/api/recommendations", rec);



// Error handling middleware
app.use(errorHandler);
app.use(handlerError);
app.use(error404);
app.use(error502);



// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
