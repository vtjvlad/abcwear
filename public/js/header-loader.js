// Функция для загрузки и вставки шапки
async function loadHeader() {
    try {
        // Загружаем содержимое header.html
        const response = await fetch('/header.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const headerHtml = await response.text();

        // Создаем временный div для парсинга HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = headerHtml;

        // Извлекаем нужные элементы
        const header = tempDiv.querySelector('.main-header');
        const mobileCategories = tempDiv.querySelector('.mobile-main-categories');
        const mobileBottomNav = tempDiv.querySelector('.mobile-bottom-nav');
        const mobileOffcanvas = tempDiv.querySelector('#mobile-offcanvas');
        const scripts = tempDiv.querySelectorAll('script');

        // Вставляем элементы в начало body
        if (header) document.body.insertBefore(header, document.body.firstChild);
        if (mobileCategories) document.body.insertBefore(mobileCategories, document.body.firstChild);
        if (mobileBottomNav) document.body.appendChild(mobileBottomNav);
        if (mobileOffcanvas) document.body.appendChild(mobileOffcanvas);

        // Добавляем стили
        const styles = tempDiv.querySelectorAll('style');
        styles.forEach(style => {
            document.head.appendChild(style);
        });

        // Добавляем скрипты
        scripts.forEach(script => {
            const newScript = document.createElement('script');
            if (script.src) {
                newScript.src = script.src;
            } else {
                newScript.textContent = script.textContent;
            }
            document.body.appendChild(newScript);
        });

        // Добавляем шрифты
        const fonts = tempDiv.querySelectorAll('link[rel="preconnect"], link[rel="stylesheet"]');
        fonts.forEach(font => {
            document.head.appendChild(font);
        });

        console.log('Header loaded successfully');
    } catch (error) {
        console.error('Error loading header:', error);
    }
}

// Загружаем шапку при загрузке страницы
document.addEventListener('DOMContentLoaded', loadHeader); 