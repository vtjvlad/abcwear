const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Products',
        required: true
    }
}, { _id: false });

const wishlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Products'
    }]
}, { 
    timestamps: true,
    collection: 'wishlists'
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist; 