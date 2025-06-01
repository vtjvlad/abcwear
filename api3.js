 require('dotenv').config();
 
 
 
 
 // API для получения корзины пользователя
//  authenticateToken,
const cartApi = async (req, res) => {
    try {
        const userId = req.user.userId; // Получаем ID пользователя из JWT токена
        let cart = await Cart.findOne({
            userId: userId
        }).populate('items.productId'); // Ищем корзину пользователя

        if (!cart) {
            // Если корзина не найдена, создаем новую
            cart = new Cart({
                userId: userId, items: []
            });
            await cart.save();
        }

        res.json(cart);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Ошибка сервера при получении корзины', error: err.message
        });
    }
};

// API для добавления товара в корзину
// app.post('/api/cart/add/:productId', authenticateToken, async (req, res) => {
const addToCartApi = async (req, res) => {
    const productId = req.params.productId;
    const userId = req.user.userId;
    const quantity = parseInt(req.body.quantity) || 1;

    try {
        console.log("Попытка добавить в корзину");
        let cart = await Cart.findOne({
            userId: userId
        });
        console.log('Existing cart match');
        if (!cart) {
            cart = new Cart({
                userId: userId, items: []
            });
            console.log('New cart compleet');
        }

        const product = await Products.findById(productId);
        if (!product) {
            return res.status(404).json({
                message: 'Товар не найден'
            });
        }

        // Проверяем, есть ли уже товар в корзине
        const existingItem = cart.items.find(item => item.productId.equals(productId));

        if (existingItem) {
            existingItem.quantity += quantity; // Если товар уже есть, увеличиваем количество
        } else {
            cart.items.push({
                productId: productId, quantity: quantity
            }); // Иначе добавляем новый элемент
        }

        await cart.save();
        await cart.populate('items.productId'); // Заполняем информацию о продукте
        res.status(201).json(cart);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Ошибка сервера при добавлении в корзину', error: err.message
        });
    }
};

// API для удаления товара из корзины
// app.delete('/api/cart/remove/:productId', authenticateToken, async (req, res) => {
const removeFromCartApi = async (req, res) => {
    const productId = req.params.productId;
    const userId = req.user.userId;

    try {
        let cart = await Cart.findOne({
            userId: userId
        });

        if (!cart) {
            return res.status(404).json({
                message: 'Корзина не найдена'
            });
        }

        // Фильтруем элементы корзины, удаляя указанный товар
        cart.items = cart.items.filter(item => !item.productId.equals(productId));
        await cart.save();
        await cart.populate('items.productId'); // Заполняем информацию о продукте
        res.json(cart);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Ошибка сервера при удалении из корзины', error: err.message
            });
    }
};

// API для обновления количества товара в корзине
// app.put('/api/cart/update/:productId', authenticateToken, async (req, res) => {
const updateCartApi = async (req, res) => {
    const productId = req.params.productId;
    const userId = req.user.userId;
    const quantity = parseInt(req.body.quantity);

    if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({
            message: 'Неверное количество'
        });
    }

    try {
        let cart = await Cart.findOne({
            userId: userId
        });

        if (!cart) {
            return res.status(404).json({
                message: 'Корзина не найдена'
            });
        }

        // Находим элемент корзины для обновления
        const existingItem = cart.items.find(item => item.productId.equals(productId));

        if (!existingItem) {
            return res.status(404).json({
                message: 'Товар не найден в корзине'
            });
        }

        existingItem.quantity = quantity; // Обновляем количество
        await cart.save();
        await cart.populate('items.productId'); // Заполняем информацию о продукте
        res.json(cart);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Ошибка сервера при обновлении корзины', error: err.message
        });
    }
};

module.exports = {
    cartApi,
    addToCartApi,
    removeFromCartApi,
    updateCartApi
};  