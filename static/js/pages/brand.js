/**
 * Класс BrandPage управляет страницей брендов
 * 
 * Основные функции:
 * - Отображение списка всех брендов
 * - Переход на страницу создания бренда
 * - Переход на страницу конкретного бренда
 * 
 * @class BrandPage
 */
class BrandPage {
    /**
     * Создает новый экземпляр BrandPage
     * 
     * @constructor
     */
    constructor() {
        console.log('[BrandPage] Создание экземпляра BrandPage');
        this.container = null;
        this.brandsContainer = null;
        this.template = null;
    }

    /**
     * Инициализирует страницу брендов
     * 
     * @param {HTMLElement} container - Контейнер страницы
     * @returns {Promise<void>}
     */
    async init(container) {
        console.log('[BrandPage] Начало инициализации страницы');
        
        if (!container) {
            console.error('[BrandPage] Ошибка: контейнер не передан в init');
            return;
        }

        this.container = container;
        console.log('[BrandPage] Контейнер установлен:', container.id);

        // Поиск контейнера для брендов
        this.brandsContainer = container.querySelector('#brands-container');
        if (!this.brandsContainer) {
            console.error('[BrandPage] Ошибка: контейнер брендов не найден');
            return;
        }
        console.log('[BrandPage] Контейнер брендов найден');

        // Поиск шаблона бренда
        this.template = container.querySelector('#brand-template');
        if (!this.template) {
            console.error('[BrandPage] Ошибка: шаблон бренда не найден');
            return;
        }
        console.log('[BrandPage] Шаблон бренда найден');
        
        // Загружаем бренды при инициализации
        console.log('[BrandPage] Начало загрузки брендов');
        await this.loadBrands();
        
        // Добавляем обработчик для кнопки создания бренда
        const addButton = container.querySelector('.add-button');
        if (addButton) {
            console.log('[BrandPage] Кнопка создания бренда найдена');
            addButton.onclick = () => {
                console.log('[BrandPage] Переход на страницу создания бренда');
                window.location.hash = '#create-brand';
            };
        } else {
            console.warn('[BrandPage] Кнопка создания бренда не найдена');
        }

        console.log('[BrandPage] Инициализация страницы завершена');
    }

    /**
     * Загружает список брендов с сервера и отображает их
     * 
     * @returns {Promise<void>}
     */
    async loadBrands() {
        console.log('[BrandPage] Начало загрузки брендов с сервера');
        try {
            const response = await fetch('/api/brands');
            console.log('[BrandPage] Получен ответ от сервера:', response.status);
            
            const data = await response.json();
            console.log('[BrandPage] Данные получены:', data);
            
            if (data.status === 'success') {
                console.log(`[BrandPage] Найдено брендов: ${data.brands.length}`);
                this.brandsContainer.innerHTML = ''; // Очищаем контейнер
                
                data.brands.forEach((brand, index) => {
                    console.log(`[BrandPage] Обработка бренда ${index + 1}:`, brand.name);
                    const brandElement = this.template.content.cloneNode(true);
                    const brandDiv = brandElement.querySelector('.brand');
                    
                    brandDiv.onclick = () => {
                        console.log(`[BrandPage] Переход на страницу бренда: ${brand.name}`);
                        window.location.hash = `#brand/${brand.id}`;
                    };
                    
                    // Заполняем данные бренда
                    const avatar = brandElement.querySelector('.avatar img');
                    avatar.src = brand.creator_photo_url || '/static/images/default-avatar.png';
                    avatar.alt = brand.name;
                    console.log(`[BrandPage] Установлен аватар для бренда ${brand.name}`);
                    
                    const title = brandElement.querySelector('.brand-title');
                    title.textContent = brand.name;
                    console.log(`[BrandPage] Установлено название бренда: ${brand.name}`);
                    
                    const level = brandElement.querySelector('.level');
                    level.textContent = `${brand.level} ур.`;
                    console.log(`[BrandPage] Установлен уровень бренда: ${brand.level}`);
                    
                    const participants = brandElement.querySelector('.participants');
                    participants.textContent = `Участники: ${brand.members_count}/10`;
                    console.log(`[BrandPage] Установлено количество участников: ${brand.members_count}`);
                    
                    this.brandsContainer.appendChild(brandElement);
                    console.log(`[BrandPage] Бренд ${brand.name} добавлен в контейнер`);
                });
                
                console.log('[BrandPage] Все бренды успешно отображены');
            } else {
                console.error('[BrandPage] Ошибка при загрузке брендов:', data.message);
            }
        } catch (error) {
            console.error('[BrandPage] Ошибка при загрузке брендов:', error);
        }
    }
}

// Экспортируем класс глобально
window.BrandPage = BrandPage;
