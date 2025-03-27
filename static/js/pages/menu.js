class MenuPage {
    constructor() {
        console.log('[Menu] Создание экземпляра MenuPage');
    }

    async init() {
        console.log('[Menu] Инициализация страницы меню');

        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', this.handleMenuClick);
            item.style.cursor = 'pointer';
            item.style.opacity = 1;
        });
    }

    handleMenuClick(e) {
        const title = e.currentTarget.querySelector('.title').textContent;
        console.log(`[Menu] Clicked menu item: ${title}`);

        e.currentTarget.classList.add('clicked');

        let route = '';
        switch (title) {
            case 'Магазин': route = 'shop'; break;
            case 'Мини-игры': route = 'games'; break;
            case 'Обмен': route = 'trade'; break;
            case 'Показ': route = 'display'; break;
            default: route = 'menu'; break;
        }

        console.log(`[Menu] Меняем хэш: #${route}`);

        setTimeout(() => {
            window.location.hash = `#${route}`;
            console.log(`[Menu] Новый хэш:`, window.location.hash);
        }, 300);
    }

    cleanup() {
        console.log('[Menu] Очистка страницы меню');
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.removeEventListener('click', this.handleMenuClick);
        });
    }
}

// Делаем доступным глобально
window.MenuPage = MenuPage;

// Экспортируем корректно
export default MenuPage;
