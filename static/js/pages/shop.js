class ShopPage {
    constructor() {
        console.log('[Shop] Создание экземпляра ShopPage');
        // Привязываем контекст к методам
        this.handleBuyClick = this.handleBuyClick.bind(this);
    }

    async init() {
        console.log('[Shop] Инициализация страницы магазина');

        const buyButtons = document.querySelectorAll('.shop-get-button');
        buyButtons.forEach(button => {
            button.addEventListener('click', this.handleBuyClick);
            button.style.cursor = 'pointer';
        });
    }

    handleBuyClick(e) {
        const itemTitle = e.currentTarget.closest('.shop-item').querySelector('.shop-item-title').textContent;
        console.log(`[Shop] Нажата кнопка "Получить" для: ${itemTitle}`);

        alert(`Вы приобрели: ${itemTitle}`);
    }

    cleanup() {
        console.log('[Shop] Очистка страницы магазина');
        const buyButtons = document.querySelectorAll('.shop-get-button');
        buyButtons.forEach(button => {
            button.removeEventListener('click', this.handleBuyClick);
        });
    }
}

// Делаем доступным глобально
window.ShopPage = ShopPage;

// Экспортируем корректно
export default ShopPage;
