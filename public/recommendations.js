document.addEventListener('DOMContentLoaded', async () => {
    const slider = document.getElementById('recommendations-slider');
    try {
        const res = await fetch('/api/recommendations');
        const products = await res.json();
        if (!Array.isArray(products) || products.length === 0) return;

        products.forEach(product => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            // Собираем массив изображений
            const images = [];
            if (product.imageData?.imgMain) images.push(product.imageData.imgMain);
            if (Array.isArray(product.imageData?.images)) {
                product.imageData.images.forEach(img => {
                    if (img && !images.includes(img)) images.push(img);
                });
            }
            if (images.length === 0) images.push('placeholder.jpg');

            // Генерируем HTML с data-атрибутами для изображений
            slide.innerHTML = `
                <div class="recommendation-card">
                    <div class="product-image-container">
                        <img class="product-image fade-img" src="${images[0]}" data-images='${JSON.stringify(images)}' data-index="0" alt="${product.info?.name || ''}">
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

        // 3D-tilt эффект для карточек
        document.querySelectorAll('.recommendation-card').forEach(card => {
            card.style.transition = 'transform 0.25s cubic-bezier(.03,.98,.52,.99), box-shadow 0.25s';
            card.style.perspective = '800px';
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * 10;
                const rotateY = ((x - centerX) / centerX) * 12;
                card.style.transform = `rotateX(${-rotateX}deg) rotateY(${rotateY}deg) scale(1.04)`;
                card.style.boxShadow = '0 8px 32px rgba(33,150,243,0.18), 0 4px 16px rgba(0,0,0,0.10)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
                card.style.boxShadow = '';
            });
        });

        new Swiper('.recommendations-swiper', {
            effect: 'coverflow',
            grabCursor: true,
            centeredSlides: true,
            slidesPerView: 5,
            loop: true,
            autoplay: {
                delay: 2500,
                disableOnInteraction: false,
            },
            coverflowEffect: {
                rotate: 32,
                stretch: 0,
                depth: 220,
                modifier: 1.2,
                slideShadows: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            initialSlide: 2,
            breakpoints: {
                // Мобильные устройства
                320: { 
                    slidesPerView: 2,
                    coverflowEffect: {
                        rotate: 25,
                        depth: 100,
                        modifier: 1
                    }
                },
                // Планшеты
                600: { 
                    slidesPerView: 3,
                    coverflowEffect: {
                        rotate: 28,
                        depth: 150,
                        modifier: 1.1
                    }
                },
                // Десктопы
                900: { slidesPerView: 5 },
                1200: { slidesPerView: 5 }
            }
        });
    } catch (e) {
        slider.innerHTML = '<div style="padding:30px;text-align:center;color:#e53935;">Не удалось загрузить рекомендации</div>';
    }
}); 