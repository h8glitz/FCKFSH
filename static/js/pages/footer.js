// footer.js
const footerButtons = document.querySelectorAll('.bottom-nav a');

footerButtons.forEach(button => {
    console.log("Кнопка найдена:", button);
    button.addEventListener('click', (e) => {
        e.preventDefault();

        // Удалить "active" у всех
        footerButtons.forEach(btn => btn.classList.remove('active'));

        // Дать "active" текущей
        button.classList.add('active');

        // Получаем маршрут из data-атрибута
        const route = button.dataset.route;
        console.log(`[Footer] Переход на страницу: ${route}`);
        if (route) {
            window.location.hash = route;
        } else {
            console.error('[Footer] Маршрут не определен для кнопки:', button);
        }
    });
});