const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Import Product model from the existing schema
    const Product = mongoose.model('Product', require('./model.js'));
    
    // Create a test product with correct structure
    const testProduct = new Product({
      info: {
        name: 'Nike Sportswear Club Fleece',
        subtitle: 'Мужские брюки-карго',
        discription: `Брюки Nike Sportswear Club Fleece из мягкого флиса с эластичными манжетами и карманами карго обеспечивают комфорт и функциональность. 

• Материал: 80% хлопок, 20% полиэстер для мягкости и тепла
• Эластичный пояс с шнурком для регулируемой посадки
• Боковые карманы карго для удобного хранения мелочей
• Стильный силуэт для повседневной носки
• Эластичные манжеты для плотной посадки`,
        color: {
          labelColor: 'Черный',
          hex: '#000000',
          colorDescription: 'Черный/Черный/Белый'
        }
      },
      price: {
        self: {
          UAH: {
            initialPrice: 2499,
            currentPrice: 1999
          }
        }
      },
      imageData: {
        imgMain: 'https://static.nike.com/a/images/t_default/wpn6dase8p5svsq68tdj/M+NSW+CLUB+PANT+CARGO+BB.png',
        images: [
          'https://static.nike.com/a/images/t_default/wpn6dase8p5svsq68tdj/M+NSW+CLUB+PANT+CARGO+BB.png',
          'https://static.nike.com/a/images/t_default/kvzzrhde1wfub26xxaiq/M+NSW+CLUB+PANT+CARGO+BB.png'
        ]
      },
      pid: {
        groupKey: 'NhXSTS',
        productCode: 'CD3129-010'
      },
      sizes: 'S,M,L,XL,XXL',
      links: {
        url: 'https://www.nike.com/t/sportswear-club-fleece-mens-cargo-pants-NhXSTS/CD3129-010'
      },
      data: {
        productType: 'APPAREL',
        productSubType: 'STANDARD'
      }
    });
    
    // Create variants with correct structure
    const variants = [
      {
        info: {
          name: 'Nike Sportswear Club Fleece',
          subtitle: 'Мужские брюки-карго',
          discription: `Брюки Nike Sportswear Club Fleece из мягкого флиса с эластичными манжетами и карманами карго обеспечивают комфорт и функциональность. 

• Материал: 80% хлопок, 20% полиэстер для мягкости и тепла
• Эластичный пояс с шнурком для регулируемой посадки
• Боковые карманы карго для удобного хранения мелочей
• Стильный силуэт для повседневной носки
• Эластичные манжеты для плотной посадки`,
          color: {
            labelColor: 'Синий',
            hex: '#0000FF',
            colorDescription: 'Синий/Черный/Белый'
          }
        },
        price: {
          self: {
            UAH: {
              initialPrice: 2499,
              currentPrice: 1999
            }
          }
        },
        imageData: {
          imgMain: 'https://static.nike.com/a/images/t_default/dc5fa41a-dca7-4064-b02c-8aab848de4c0/M+NSW+CLUB+HOODIE+PO+BB.png',
          images: [
            'https://static.nike.com/a/images/t_default/dc5fa41a-dca7-4064-b02c-8aab848de4c0/M+NSW+CLUB+HOODIE+PO+BB.png',
            'https://static.nike.com/a/images/t_default/43ebed01-5bc8-4341-a8a5-3cd58705e902/M+NSW+CLUB+HOODIE+PO+BB.png'
          ]
        },
        pid: {
          groupKey: 'NhXSTS',
          productCode: 'CD3129-070'
        },
        sizes: 'S,M,L,XL',
        links: {
          url: 'https://www.nike.com/t/sportswear-club-fleece-mens-cargo-pants-NhXSTS/CD3129-070'
        },
        data: {
          productType: 'APPAREL',
          productSubType: 'STANDARD'
        }
      },
      {
        info: {
          name: 'Nike Sportswear Club Fleece',
          subtitle: 'Мужские брюки-карго',
          discription: `Брюки Nike Sportswear Club Fleece из мягкого флиса с эластичными манжетами и карманами карго обеспечивают комфорт и функциональность. 

• Материал: 80% хлопок, 20% полиэстер для мягкости и тепла
• Эластичный пояс с шнурком для регулируемой посадки
• Боковые карманы карго для удобного хранения мелочей
• Стильный силуэт для повседневной носки
• Эластичные манжеты для плотной посадки`,
          color: {
            labelColor: 'Красный',
            hex: '#FF0000',
            colorDescription: 'Красный/Белый'
          }
        },
        price: {
          self: {
            UAH: {
              initialPrice: 2599,
              currentPrice: 2099
            }
          }
        },
        imageData: {
          imgMain: 'https://static.nike.com/a/images/t_default/b66ae597-1944-4502-867c-808ad1af534f/M+NSW+CLUB+HOODIE+PO+BB+GX.png',
          images: [
            'https://static.nike.com/a/images/t_default/b66ae597-1944-4502-867c-808ad1af534f/M+NSW+CLUB+HOODIE+PO+BB+GX.png',
            'https://static.nike.com/a/images/t_default/80374113-5ecd-4879-bce1-d95dd6278437/M+NSW+CLUB+HOODIE+PO+BB+GX.png'
          ]
        },
        pid: {
          groupKey: 'NhXSTS',
          productCode: 'CD3129-650'
        },
        sizes: 'S,M,L',
        links: {
          url: 'https://www.nike.com/t/sportswear-club-fleece-mens-cargo-pants-NhXSTS/CD3129-650'
        },
        data: {
          productType: 'APPAREL',
          productSubType: 'STANDARD'
        }
      }
    ];
    
    // Save the main product and variants
    try {
      const savedProduct = await testProduct.save();
      console.log('Test product created with ID:', savedProduct._id);
      console.log(`Use this link to view the product: http://localhost:3000/product/${savedProduct._id}`);
      
      // Save variants
      for (const variant of variants) {
        const variantProduct = new Product(variant);
        const savedVariant = await variantProduct.save();
        console.log(`Variant created with ID: ${savedVariant._id} (Color: ${variant.info.color.labelColor})`);
      }
      
    } catch (error) {
      console.error('Error saving products:', error);
    }
    
    // Close the connection
    mongoose.connection.close();
  })
  .catch(err => console.error('MongoDB connection error:', err)); 