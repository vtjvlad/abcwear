document.addEventListener('DOMContentLoaded', async () => {
    const slider = document.getElementById('recommendations-slider');
    try {
        const res = await fetch('/api/recommendations');
        const products = await res.json();
        if (!Array.isArray(products) || products.length === 0) return;

        products.forEach(product => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            slide.innerHTML = `
                <div class="recommendation-card">
                    <div class="product-image-container">
                        <img class="product-image" src="${product.imageData?.imgMain || product.imageData?.images?.[0] || 'placeholder.jpg'}" alt="${product.info?.name || ''}">
                    </div>
                    <div class="product-info">
                        <div class="product-name">${product.info?.name || ''}</div>
                        <div class="product-subtitle">${product.info?.subtitle || ''}</div>
                        <div class="price-container">
                            <span class="current-price">${product.price?.self?.UAH?.currentPrice || 0} ₴</span>
                            ${product.price?.self?.UAH?.initialPrice && product.price.self.UAH.initialPrice > product.price.self.UAH.currentPrice ? `<span class="initial-price">${product.price.self.UAH.initialPrice} ₴</span>` : ''}
                        </div>
                        <button class="btn" onclick="window.location.href='/w#${product._id}'">Подробнее</button>
                    </div>
                </div>
            `;
            slider.appendChild(slide);
        });

        new Swiper('.recommendations-swiper', {
            slidesPerView: 1,
            spaceBetween: 20,
            loop: true,
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            breakpoints: {
                600: { slidesPerView: 2 },
                900: { slidesPerView: 3 },
                1200: { slidesPerView: 4 }
            }
        });
    } catch (e) {
        slider.innerHTML = '<div style="padding:30px;text-align:center;color:#e53935;">Не удалось загрузить рекомендации</div>';
    }
}); 