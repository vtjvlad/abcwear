const express = require('express');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const { productValidators } = require('./middleware/validators');

// Import models
const productSchema = require('./model.js');
const Product = mongoose.model('Products', productSchema);

// API Routes with validation


        