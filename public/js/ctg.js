async function loadCTG() {
    try {
        const response = await fetch('./css/catalog.css');
        const css = await response.text();

        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    } catch (error) {
        console.error('Ошибка при загрузке CSS:', error);
    }
}

async function loadCTG2() {
    try {
        const response = await fetch('./css/result.css');
        const css = await response.text();

        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    } catch (error) {
        console.error('Ошибка при загрузке CSS:', error);
    }
}
addEventListener('load', loadCTG);
addEventListener('load', loadCTG2);