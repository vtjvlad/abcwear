// Функция для загрузки футера
async function loadFooter() {
    try {
        // Загружаем содержимое footer.html
        const response = await fetch('/footer.html');
        const html = await response.text();

        // Создаем временный DOM для парсинга HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Извлекаем стили и футер
        const styles = doc.querySelector('style');
        const footer = doc.querySelector('footer');

        // Добавляем стили в head, если их еще нет
        if (styles && !document.querySelector('style[data-footer-styles]')) {
            styles.setAttribute('data-footer-styles', '');
            document.head.appendChild(styles);
        }

        // Добавляем футер в конец body
        if (footer) {
            document.body.appendChild(footer);
        }

        // Добавляем шрифты, если их еще нет
        if (!document.querySelector('link[href*="fonts.googleapis.com"]')) {
            const fontLinks = doc.querySelectorAll('link[href*="fonts.googleapis.com"]');
            fontLinks.forEach(link => document.head.appendChild(link.cloneNode(true)));
        }

        // Добавляем Font Awesome, если его еще нет
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const fontAwesome = doc.querySelector('link[href*="font-awesome"]');
            if (fontAwesome) {
                document.head.appendChild(fontAwesome.cloneNode(true));
            }
        }

        console.log('Footer loaded successfully');
    } catch (error) {
        console.error('Error loading footer:', error);
    }
}

// Загружаем футер при загрузке страницы
document.addEventListener('DOMContentLoaded', loadFooter); 