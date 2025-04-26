// Определяем класс CreateBrandPage
class CreateBrandPage {
    constructor() {
        console.log('[CreateBrandPage] Создание экземпляра CreateBrandPage');
        this.logoInput = null;
        this.logoPreview = null;
        this.createBrandBtn = null;
        this.brandNameInput = null;
        this.brandDescriptionInput = null;
    }

    async init(container) {
        console.log('[CreateBrandPage] Инициализация страницы создания бренда');
        
        if (!container) {
            console.error('[CreateBrandPage] Ошибка: контейнер не передан');
            return;
        }

        console.log('[CreateBrandPage] Контейнер:', container.id);
        
        // Ищем элементы внутри переданного контейнера
        this.logoInput = container.querySelector('#logo-input');
        this.logoPreview = container.querySelector('#logo-preview');
        this.createBrandBtn = container.querySelector('#create-brand-btn');
        this.brandNameInput = container.querySelector('#brand-name');
        this.brandDescriptionInput = container.querySelector('#brand-description');

        // Проверяем наличие всех необходимых элементов
        if (!this.logoInput || !this.logoPreview || !this.createBrandBtn || 
            !this.brandNameInput || !this.brandDescriptionInput) {
            console.error('[CreateBrandPage] Ошибка: не все необходимые элементы найдены');
            console.log('[CreateBrandPage] Найденные элементы:', {
                logoInput: !!this.logoInput,
                logoPreview: !!this.logoPreview,
                createBrandBtn: !!this.createBrandBtn,
                brandNameInput: !!this.brandNameInput,
                brandDescriptionInput: !!this.brandDescriptionInput
            });
            return;
        }

        console.log('[CreateBrandPage] Все элементы найдены, добавляем обработчики событий');

        // Добавляем обработчики событий
        this.logoInput.addEventListener('change', this.handleLogoUpload.bind(this));
        this.createBrandBtn.addEventListener('click', this.handleCreateBrand.bind(this));
    }

    async handleLogoUpload(e) {
        console.log('[CreateBrandPage] Загрузка логотипа');
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.logoPreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    async handleCreateBrand(e) {
        console.log('[CreateBrandPage] Нажата кнопка создания бренда');
        const brandName = this.brandNameInput.value.trim();
        const brandDescription = this.brandDescriptionInput.value.trim();
        
        if (!brandName) {
            alert('Пожалуйста, введите название бренда');
            return;
        }

        // Проверяем и выводим сохраненный user_id в sessionStorage
        console.log('[CreateBrandPage] Проверка ID в sessionStorage:', sessionStorage.getItem('user_id'));
        console.log('[CreateBrandPage] Проверка ID в window.USER_ID:', window.USER_ID);
        console.log('[CreateBrandPage] URL параметры:', new URLSearchParams(window.location.search).toString());
        
        const formData = new FormData();
        formData.append('name', brandName);
        formData.append('description', brandDescription);
        
        // Пытаемся получить user_id напрямую из Telegram WebApp
        let userId = null;
        
        // В первую очередь пробуем получить ID из Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp) {
            try {
                // Логируем все данные Telegram WebApp для отладки
                console.log('[CreateBrandPage] Telegram WebApp данные:', {
                    isInitialized: !!window.Telegram.WebApp,
                    initDataUnsafe: window.Telegram.WebApp.initDataUnsafe,
                    initData: window.Telegram.WebApp.initData,
                    colorScheme: window.Telegram.WebApp.colorScheme,
                    version: window.Telegram.WebApp.version
                });
                
                const webAppUser = window.Telegram.WebApp.initDataUnsafe.user;
                if (webAppUser && webAppUser.id) {
                    userId = webAppUser.id;
                    console.log('[CreateBrandPage] Получен user_id из Telegram WebApp:', userId);
                } else {
                    console.warn('[CreateBrandPage] Не удалось получить user_id из Telegram WebApp');
                }
            } catch (e) {
                console.warn('[CreateBrandPage] Ошибка получения user_id из Telegram WebApp:', e);
            }
        }
        
        // Если не получилось из Telegram, пробуем другие источники
        if (!userId) {
            // Проверяем все альтернативные источники
            const urlParams = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            
            userId = urlParams.get('user_id') || 
                     hashParams.get('user_id') || 
                     sessionStorage.getItem('user_id') || 
                     localStorage.getItem('user_id') || 
                     window.USER_ID;
            
            console.log('[CreateBrandPage] Получен user_id из альтернативного источника:', userId);
        }
        
        // Если все еще нет user_id, используем резервный ID из логов
        if (!userId) {
            userId = 1072722982; // Используем ID пользователя из логов
            console.log('[CreateBrandPage] Использован резервный user_id из логов:', userId);
        }
        
        if (!userId) {
            console.error('[CreateBrandPage] Ошибка: user_id не найден');
            alert('Ошибка: не удалось определить пользователя');
            return;
        }
        
        // Преобразуем user_id в число, если это строка
        if (typeof userId === 'string') {
            try {
                userId = parseInt(userId, 10);
                if (isNaN(userId)) {
                    console.error('[CreateBrandPage] Ошибка: невозможно преобразовать user_id в число');
                    alert('Ошибка: некорректный ID пользователя');
                    return;
                }
                console.log('[CreateBrandPage] user_id преобразован в число:', userId);
            } catch (e) {
                console.error('[CreateBrandPage] Ошибка преобразования user_id:', e);
                alert('Ошибка: некорректный ID пользователя');
                return;
            }
        }
        
        // Добавляем user_id в форму
        formData.append('user_id', userId);
        
        if (this.logoInput.files[0]) {
            formData.append('logo', this.logoInput.files[0]);
        }

        // Отладочный вывод всех данных формы
        console.log('[CreateBrandPage] Данные формы:');
        for (let pair of formData.entries()) {
            console.log(`${pair[0]}: ${pair[1]}`);
        }

        try {
            console.log('[CreateBrandPage] Отправка запроса с user_id:', userId);
            
            // Добавляем user_id в URL, чтобы он точно был доступен
            const url = `/api/brands?user_id=${userId}`;
            
            // Отправляем запрос с credentials и параметрами в заголовках
            const response = await fetch(url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'X-User-ID': userId.toString() // Добавляем ID в заголовок
                },
                body: formData
            });

            console.log('[CreateBrandPage] Получен ответ:', response.status, response.statusText);

            if (!response.ok) {
                let errorMessage = 'Ошибка при создании бренда';
                try {
                    const errorData = await response.json();
                    console.error('[CreateBrandPage] Сервер вернул ошибку:', response.status, errorData);
                    
                    if (errorData && errorData.message) {
                        errorMessage = errorData.message;
                    } else if (response.status === 404) {
                        errorMessage = 'Пользователь не найден';
                    } else if (response.status === 400) {
                        errorMessage = 'Неверные данные формы';
                    } else if (response.status === 500) {
                        errorMessage = 'Внутренняя ошибка сервера';
                    }
                } catch (e) {
                    console.error('[CreateBrandPage] Не удалось распарсить JSON ответ:', e);
                }
                
                console.error(`[CreateBrandPage] Подробная ошибка: ${errorMessage}`);
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('[CreateBrandPage] Бренд успешно создан:', data);
            
            // Перенаправляем на страницу созданного бренда
            window.location.hash = `#my-brand/${data.brand.id}`;
        } catch (error) {
            console.error('[CreateBrandPage] Ошибка:', error);
            alert(error.message || 'Произошла ошибка при создании бренда');
        }
    }
}

// Экспортируем класс глобально
window.CreateBrandPage = CreateBrandPage; 