// static/js/pages/menu.js

export const init = async () => {
    console.log('[Menu] Инициализация страницы меню');

    // Добавляем обработчики событий для элементов меню
    const menuItems = document.querySelectorAll('.menu-item'); // Меняем .container на .menu-item
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const title = item.querySelector('.title').textContent;
            console.log(`[Menu] Clicked menu item: ${title}`);

            // Активируем анимацию при клике
            item.classList.add('clicked');

            // Здесь можно добавить дополнительную логику обработки клика
        });
    });

    // Добавление анимации для появления элементов при загрузке страницы
    setTimeout(() => {
        menuItems.forEach(item => {
            item.style.opacity = 1;
        });
    }, 100); // Задержка, чтобы элементы появились плавно
};

export const cleanup = () => {
    console.log('[Menu] Очистка страницы меню');
    // Здесь можно добавить логику очистки, если необходимо
};
