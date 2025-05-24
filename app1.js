const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
require("dotenv").config();
const { rec, productsApi, productApiById, pageP, pageE, handlerError, error404, error502 } = require("./api");

const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT;
// const PORT = 1137;

// Подключение к MongoDB
mongoose.connect(MONGO_URI)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get("/api/recommendations", rec);
app.get("/api/products", productsApi);
app.get("/api/products/:id", productApiById);
app.get("/ww", pageP);
app.get("/e", pageE);

app.use(handlerError);
app.use(error404);
app.use(error502);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
