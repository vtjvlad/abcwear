require("dotenv").config();
const path = require("path");



const handlerError = async (err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        message: 'Внутренняя ошибка сервера',
        error: err.message 
    });
}

// Serve profile page
// 
const profileRoutes = (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'profile.html'));
}

// Serve auth.html for authentication routes
// 
const authRoutes = (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'auth.html'));
}

// Serve index.html for the catalog route
// 
const ctgPageRoutes = (req, res) => {
    console.log('Serving index.html for /w route');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, '../public', 'w.html'));
}

// Обработка ЧПУ для каталога
// 
const ctgRoutes = (req, res) => {
    console.log('Serving catalog page with slug');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, '../public', 'w.html'));
}

// Обработка базового URL каталога
// 
const catalogRoutes = (req, res) => {
    console.log('Serving catalog page');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, '../public', 'w.html'));
}


const error404 = async (req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../public', '404.html'));

}

const error502 = async (req, res, next) => {
    if (req.headers['x-forwarded-proto'] === 'https' && !req.secure) {
        return res.status(502).sendFile(path.join(__dirname, '../public', '502.html'));
    }
    next();
}

const pageP = async (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'catalog.html'));
}

const pageE = async (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "catalog-old.html"));

}

const mainPage = async (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "index.html"));
}

module.exports = {
    handlerError,
    error404,
    error502,
    pageP,
    pageE,
    profileRoutes,
    authRoutes,
    ctgPageRoutes,
    ctgRoutes,  
    catalogRoutes,
    mainPage
}