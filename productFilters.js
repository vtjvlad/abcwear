const express = require('express');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Product = mongoose.model('Products', require('./model.js'));

// API Routes for filters
const getFilters = async (req, res, next) => {
    try {
        const [colors, categories, names] = await Promise.all([
            Product.distinct('info.color.labelColor'),
            Product.distinct('data.productType'),
            Product.distinct('info.name')
        ]);

        res.json({
            colors: colors.length,
            categories: categories.length,
            names: names.length
        });
    } catch (error) {
        console.error('Error fetching filter counts:', error);
        res.status(500).json({ error: 'Ошибка при получении количества фильтров' });
    }
};

// Get price range for products
const getPriceRange = async (req, res) => {
    try {
        const result = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    min: { $min: "$price.self.UAH.currentPrice" },
                    max: { $max: "$price.self.UAH.currentPrice" }
                }
            }
        ]);
        if (result.length > 0 && result[0].min != null && result[0].max != null) {
            res.json({ min: result[0].min, max: result[0].max });
        } else {
            res.json({ min: 0, max: 10000 });
        }
    } catch (error) {
        console.error('Ошибка в /api/products/price-range:', error);
        res.json({ min: 0, max: 10000 }); // Возвращаем дефолтные значения даже при ошибке
    }
};

// Get filtered products
const getFilteredProducts = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = {
            'pid.groupKey': { $exists: true }
        };

        if (req.query.color) {
            filter['info.color.labelColor'] = req.query.color;
        }

        if (req.query.category) {
            filter['data.productType'] = req.query.category;
        }

        if (req.query.search) {
            filter.$or = [
                { 'info.name': { $regex: req.query.search, $options: 'i' } },
                { 'info.discription': { $regex: req.query.search, $options: 'i' } }
            ];
        }

        if (req.query.minPrice || req.query.maxPrice) {
            filter['price.self.UAH.currentPrice'] = {};
            if (req.query.minPrice) {
                filter['price.self.UAH.currentPrice'].$gte = parseFloat(req.query.minPrice);
            }
            if (req.query.maxPrice) {
                filter['price.self.UAH.currentPrice'].$lte = parseFloat(req.query.maxPrice);
            }
        }

        const sort = {};
        if (req.query.sortField) {
            if (req.query.sortField === 'price') {
                sort['price.self.UAH.currentPrice'] = req.query.sortOrder === 'asc' ? 1 : -1;
            } else if (req.query.sortField === 'name') {
                sort['info.name'] = req.query.sortOrder === 'asc' ? 1 : -1;
            } else {
                sort[req.query.sortField] = req.query.sortOrder === 'asc' ? 1 : -1;
            }
        } else {
            sort.createdAt = -1;
        }

        const groupKeysResult = await Product.aggregate([
            { $match: filter },
            { $group: { _id: '$pid.groupKey' } },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit }
        ]);

        const groupKeys = groupKeysResult.map(result => result._id);

        if (!groupKeys.length) {
            return res.json({
                products: [],
                total: 0,
                currentPage: page,
                totalPages: 0
            });
        }

        const products = await Product.find({
            'pid.groupKey': { $in: groupKeys }
        }).select('info.name info.subtitle info.color price.self.UAH.currentPrice price.self.UAH.initialPrice imageData.imgMain imageData.images links.url sizes pid.groupKey');

        const groupedProducts = groupKeys.map(groupKey => {
            return products.filter(p => p.pid && p.pid.groupKey === groupKey);
        });

        const totalGroupsResult = await Product.aggregate([
            { $match: filter },
            { $group: { _id: '$pid.groupKey' } }
        ]);
        const totalGroups = totalGroupsResult.length;

        res.json({
            products: groupedProducts,
            total: totalGroups,
            currentPage: page,
            totalPages: Math.ceil(totalGroups / limit)
        });
    } catch (error) {
        next(error);
    }
};

// Get filter metadata for SEO
const getFilterMetadata = async (req, res, next) => {
    try {
        const { color, category, minPrice, maxPrice, search } = req.query;
        
        const filter = {
            'pid.groupKey': { $exists: true }
        };

        if (color) {
            filter['info.color.labelColor'] = color;
        }

        if (category) {
            filter['data.productType'] = category;
        }

        if (search) {
            filter.$or = [
                { 'info.name': { $regex: search, $options: 'i' } },
                { 'info.discription': { $regex: search, $options: 'i' } }
            ];
        }

        if (minPrice || maxPrice) {
            filter['price.self.UAH.currentPrice'] = {};
            if (minPrice) {
                filter['price.self.UAH.currentPrice'].$gte = parseFloat(minPrice);
            }
            if (maxPrice) {
                filter['price.self.UAH.currentPrice'].$lte = parseFloat(maxPrice);
            }
        }

        const stats = await Product.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    avgPrice: { $avg: '$price.self.UAH.currentPrice' },
                    minPrice: { $min: '$price.self.UAH.currentPrice' },
                    maxPrice: { $max: '$price.self.UAH.currentPrice' },
                    categories: { $addToSet: '$data.productType' },
                    colors: { $addToSet: '$info.color.labelColor' }
                }
            }
        ]);

        const keywords = await Product.aggregate([
            { $match: filter },
            {
                $project: {
                    keywords: {
                        $concat: [
                            { $ifNull: ['$info.name', ''] },
                            ' ',
                            { $ifNull: ['$info.subtitle', ''] },
                            ' ',
                            { $ifNull: ['$info.color.labelColor', ''] }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    allKeywords: { $push: { $split: ['$keywords', ' '] } }
                }
            },
            {
                $project: {
                    keywords: {
                        $reduce: {
                            input: '$allKeywords',
                            initialValue: [],
                            in: { $concatArrays: ['$$value', '$$this'] }
                        }
                    }
                }
            }
        ]);

        const keywordCounts = {};
        if (keywords.length > 0 && keywords[0].keywords) {
            keywords[0].keywords.forEach(keyword => {
                if (keyword.length > 2) {
                    keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
                }
            });
        }

        const topKeywords = Object.entries(keywordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([keyword]) => keyword);

        let titleParts = [];
        let descriptionParts = [];

        if (category) {
            titleParts.push(category);
            descriptionParts.push(category.toLowerCase());
        }

        if (color) {
            titleParts.push(color);
            descriptionParts.push(color.toLowerCase());
        }

        if (search) {
            titleParts.push(`"${search}"`);
            descriptionParts.push(`matching "${search}"`);
        }

        if (minPrice || maxPrice) {
            const priceRange = [];
            if (minPrice) priceRange.push(`from ${minPrice}`);
            if (maxPrice) priceRange.push(`to ${maxPrice}`);
            if (priceRange.length > 0) {
                descriptionParts.push(`priced ${priceRange.join(' ')} UAH`);
            }
        }

        const seoMetadata = {
            title: `${titleParts.join(' ')} - ABC Wear`,
            description: `Browse our collection of ${descriptionParts.join(' ')} at ABC Wear. ${stats[0]?.totalProducts || 0} products available.`,
            keywords: topKeywords.join(', '),
            ogTitle: `${titleParts.join(' ')} - ABC Wear`,
            ogDescription: `Browse our collection of ${descriptionParts.join(' ')} at ABC Wear. ${stats[0]?.totalProducts || 0} products available.`,
            canonicalUrl: `/catalog/${category ? category.toLowerCase() : ''}${color ? '/' + color.toLowerCase() : ''}${search ? '/' + search.toLowerCase() : ''}${minPrice || maxPrice ? '/from-' + (minPrice || '0') + '-to-' + (maxPrice || '999999') : ''}`,
            structuredData: {
                '@context': 'https://schema.org',
                '@type': 'CollectionPage',
                name: `${titleParts.join(' ')} - ABC Wear`,
                description: `Browse our collection of ${descriptionParts.join(' ')} at ABC Wear.`,
                numberOfItems: stats[0]?.totalProducts || 0,
                offers: {
                    '@type': 'AggregateOffer',
                    priceCurrency: 'UAH',
                    lowPrice: stats[0]?.minPrice || 0,
                    highPrice: stats[0]?.maxPrice || 0,
                    offerCount: stats[0]?.totalProducts || 0
                }
            },
            breadcrumbs: {
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'Home',
                        item: '/'
                    }
                ]
            }
        };

        if (category) {
            seoMetadata.breadcrumbs.itemListElement.push({
                '@type': 'ListItem',
                position: 2,
                name: category,
                item: `/categories/${category}`
            });
        }

        seoMetadata.breadcrumbs.itemListElement.push({
            '@type': 'ListItem',
            position: seoMetadata.breadcrumbs.itemListElement.length + 1,
            name: titleParts.join(' '),
            item: `/filters?${new URLSearchParams(req.query).toString()}`
        });

        res.json(seoMetadata);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getFilters,
    getPriceRange,
    getFilteredProducts,
    getFilterMetadata
}; 