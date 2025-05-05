const mongoose = require('mongoose');
const productSchema = require('../model');

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

module.exports = Product; 