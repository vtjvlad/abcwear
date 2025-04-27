const { body, query, param } = require('express-validator');

const productValidators = {
    createProduct: [
        body('info.name').notEmpty().withMessage('Product name is required'),
        body('info.color.labelColor').notEmpty().withMessage('Color is required'),
        body('price.self.UAH.currentPrice').isNumeric().withMessage('Price must be a number'),
        body('imageData.imgMain').isURL().withMessage('Main image must be a valid URL')
    ],
    
    updateProduct: [
        param('id').isMongoId().withMessage('Invalid product ID'),
        body('price.self.UAH.currentPrice').optional().isNumeric().withMessage('Price must be a number'),
        body('imageData.imgMain').optional().isURL().withMessage('Main image must be a valid URL')
    ],
    
    getProducts: [
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('color').optional().isString().withMessage('Color must be a string'),
        query('category').optional().isString().withMessage('Category must be a string'),
        query('minPrice').optional().isNumeric().withMessage('Min price must be a number'),
        query('maxPrice').optional().isNumeric().withMessage('Max price must be a number')
    ]
};

const cartValidators = {
    addToCart: [
        body('productId').isMongoId().withMessage('Invalid product ID'),
        body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        body('selectedSize').notEmpty().withMessage('Size is required')
    ],
    
    updateCartItem: [
        body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
    ]
};

module.exports = {
    productValidators,
    cartValidators
}; 