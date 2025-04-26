let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

class InventoryManager {
    constructor() {
        this.currentCategory = 'all';
        this.items = [];
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.errorMessage = document.getElementById('errorMessage');
        this.itemsContainer = document.getElementById('inventoryItems');
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Обработчики для кнопок категорий
        document.querySelectorAll('.category-button').forEach(button => {
            button.addEventListener('click', () => {
                this.setActiveCategory(button.dataset.category);
            });
        });

        // Обработчик для закрытия сообщения об ошибке
        const errorClose = document.querySelector('.error-close');
        if (errorClose) {
            errorClose.addEventListener('click', () => {
                this.hideError();
            });
        }
    }

    setActiveCategory(category) {
        this.currentCategory = category;
        
        // Обновляем активную кнопку
        document.querySelectorAll('.category-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        // Фильтруем и отображаем предметы
        this.filterItems();
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    showError(message) {
        const errorText = this.errorMessage.querySelector('.error-text');
        if (errorText) {
            errorText.textContent = message;
        }
        this.errorMessage.style.display = 'flex';

        // Автоматически скрываем ошибку через 3 секунды
        setTimeout(() => {
            this.hideError();
        }, 3000);
    }

    hideError() {
        this.errorMessage.style.display = 'none';
    }

    async loadInventory() {
        try {
            this.showLoading();

            const response = await fetch('/get_user_data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: tg.initDataUnsafe.user.id
                })
            });

            if (!response.ok) {
                throw new Error('Не удалось загрузить инвентарь');
            }

            const data = await response.json();
            this.items = data.items || [];
            this.filterItems();
        } catch (error) {
            console.error('Ошибка при загрузке инвентаря:', error);
            this.showError('Не удалось загрузить инвентарь');
        } finally {
            this.hideLoading();
        }
    }

    filterItems() {
        let filteredItems = this.items;
        if (this.currentCategory !== 'all') {
            filteredItems = this.items.filter(item => item.type === this.currentCategory);
        }
        this.displayItems(filteredItems);
    }

    displayItems(items) {
        this.itemsContainer.innerHTML = '';

        if (items.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'В этой категории нет предметов';
            this.itemsContainer.appendChild(emptyMessage);
            return;
        }

        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'item';
            itemElement.innerHTML = `
                <div class="item-image-container">
                    <img src="/static/previews/items/${item.id}.png" alt="${item.name}" class="item-image">
                </div>
                <div class="item-description">
                    <div class="item-checkbox"></div>
                    <span class="item-name rarity-${item.rarity}">${item.name}</span>
                </div>
            `;

            const checkbox = itemElement.querySelector('.item-checkbox');
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.item-checkbox').forEach(cb => {
                    cb.classList.remove('checked');
                });
                checkbox.classList.add('checked');
            });

            itemElement.addEventListener('click', () => {
                this.showItemDetails(item);
            });

            this.itemsContainer.appendChild(itemElement);
        });
    }

    showItemDetails(item) {
        // Здесь можно добавить логику для отображения детальной информации о предмете
        console.log('Показать детали предмета:', item);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const inventoryManager = new InventoryManager();
    inventoryManager.loadInventory();
}); 