const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Products',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    selectedSize: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [cartItemSchema],
    totalAmount: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'carts',
  }
);

// Метод для пересчета общей суммы корзины
cartSchema.methods.calculateTotal = async function () {
  const Product = mongoose.model('Products');
  let total = 0;

  for (const item of this.items) {
    const product = await Product.findById(item.productId);
    if (product) {
      total += product.price.self.UAH.currentPrice * item.quantity;
    }
  }

  this.totalAmount = total;
  return total;
};

// Middleware для пересчета суммы перед сохранением
cartSchema.pre('save', async function (next) {
  await this.calculateTotal();
  next();
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
