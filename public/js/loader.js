// Page loader logic
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        window.addEventListener('load', function() {
            const loader = document.querySelector('.page-loader');
            if (loader) {
                loader.classList.add('fade-out');
                setTimeout(() => {
                    loader.remove();
                }, 500);
            }
        });
    });
})(); 