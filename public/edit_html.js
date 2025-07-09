const fs = require('fs');

// Функция для редактирования HTML файла
function editHtmlFile(inputFile, outputFile) {
    try {
        // Читаем HTML файл
        const htmlContent = fs.readFileSync(inputFile, 'utf8');
        
        // Регулярное выражение для поиска тегов <a> с символом ^
        const regex = /<a\s+href="([^"]*)"[^>]*>\s*\^\s*<\/a>/g;
        
        // Функция замены
        const replacement = (match, href) => {
            // Удаляем префикс "https://hotline.ua/ua" из ссылки
            let linkText = href.replace('https://hotline.ua/ua', '');
            
            // Если после удаления префикса ничего не осталось, используем полную ссылку
            if (linkText === '') {
                linkText = href;
            }
            
            // Заменяем символ ^ на полученный текст
            return match.replace('^', linkText);
        };
        
        // Выполняем замену
        const modifiedContent = htmlContent.replace(regex, replacement);
        
        // Записываем результат в новый файл
        fs.writeFileSync(outputFile, modifiedContent, 'utf8');
        
        console.log(`HTML файл успешно отредактирован!`);
        console.log(`Результат сохранен в файл: ${outputFile}`);
        
    } catch (error) {
        console.error('Ошибка при обработке файла:', error.message);
    }
}

// Пример использования
// Замените 'input.html' на путь к вашему HTML файлу
// Замените 'output.html' на путь для сохранения результата
editHtmlFile('categories-lts.html', 'categories.html');

// Если нужно обработать файл с другим именем, раскомментируйте и измените строку ниже:
// editHtmlFile('ваш_файл.html', 'результат.html'); 