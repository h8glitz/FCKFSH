// footer.js
const footerButtons = document.querySelectorAll('.bottom-nav a');

footerButtons.forEach(button => {
    console.log("Кнопка найдена:", button);
    button.addEventListener('click', async (e) => {
        // Получаем маршрут из data-атрибута
        const pageName = button.dataset.page;
        
        // Специальная обработка для кнопки бренда
        if (pageName === 'brand') {
            e.preventDefault(); // Предотвращаем стандартное перенаправление
            console.log('[Footer] Перехватили клик по бренду');
            
            // Удалить "active" у всех
            footerButtons.forEach(btn => btn.classList.remove('active'));
            // Дать "active" текущей
            button.classList.add('active');
            
            try {
                // Получаем ID пользователя
                const userId = sessionStorage.getItem('user_id') || 
                              localStorage.getItem('user_id') || 
                              window.USER_ID;
                              
                if (!userId) {
                    console.error('[Footer] Не удалось получить ID пользователя');
                    window.location.hash = '#list-brand';
                    return;
                }
                
                // Прямой запрос к API для получения брендов пользователя
                console.log(`[Footer] Проверяем бренды для пользователя: ${userId}`);
                const response = await fetch(`/api/user/${userId}/brands`);
                
                // Выводим текст ответа для отладки
                const responseText = await response.text();
                console.log('[Footer] Ответ API (text):', responseText);
                
                try {
                    // Пытаемся разобрать JSON
                    const data = JSON.parse(responseText);
                    console.log('[Footer] Ответ API (json):', data);
                    
                    // Извлекаем массив брендов
                    let userBrands = [];
                    
                    // Обрабатываем различные структуры ответа
                    if (Array.isArray(data.brands)) userBrands = data.brands;
                    else if (data.data && Array.isArray(data.data.brands)) userBrands = data.data.brands;
                    else if (Array.isArray(data)) userBrands = data;
                    else if (data.result && Array.isArray(data.result)) userBrands = data.result;
                    else if (data.results && Array.isArray(data.results)) userBrands = data.results;
                    else if (data.brand && typeof data.brand === 'object') userBrands = [data.brand];
                    
                    console.log(`[Footer] Найдено брендов: ${userBrands.length}`);
                    
                    if (userBrands.length > 0) {
                        console.log('[Footer] Найденные бренды:', JSON.stringify(userBrands, null, 2));
                    }
                    
                    if (userBrands.length === 1) {
                        // Если есть только один бренд, сразу переходим на его страницу
                        const brand = userBrands[0];
                        console.log('[Footer] Первый бренд:', JSON.stringify(brand, null, 2));
                        
                        let brandId = brand.id || brand.brand_id || brand._id;
                        
                        // Если ID не найден в стандартных полях
                        if (!brandId) {
                            console.log('[Footer] Не найден стандартный ID, ищем в полях объекта');
                            console.log('[Footer] Доступные поля бренда:', Object.keys(brand));
                            
                            for (const key of Object.keys(brand)) {
                                if (key.toLowerCase().includes('id')) {
                                    brandId = brand[key];
                                    console.log(`[Footer] Нашли ID в поле ${key}: ${brandId}`);
                                    break;
                                }
                            }
                        }
                        
                        // Если всё ещё нет ID, используем 0
                        if (!brandId) {
                            brandId = 0;
                            console.log('[Footer] Используем значение 0 в качестве ID бренда');
                        }
                        
                        console.log(`[Footer] Переход на страницу бренда: ${brandId}`);
                        console.log(`[Footer] URL для перехода: #my-brand/${brandId}`);
                        
                        // Используем setTimeout для перенаправления
                        setTimeout(() => {
                            console.log('[Footer] Выполняем перенаправление...');
                            window.location.hash = `#my-brand/${brandId}`;
                        }, 50);
                    } else {
                        // Если брендов нет, переходим на страницу списка брендов
                        console.log('[Footer] У пользователя нет брендов, переход на список брендов');
                        window.location.hash = '#list-brand';
                    }
                } catch (parseError) {
                    console.error('[Footer] Ошибка при разборе JSON ответа:', parseError);
                    window.location.hash = '#list-brand';
                }
            } catch (error) {
                console.error('[Footer] Ошибка при проверке брендов:', error);
                window.location.hash = '#list-brand';
            }
        } else if (pageName) {
            console.log(`[Footer] Переход на страницу: ${pageName}`);
            window.location.hash = `#${pageName}`;
        } else {
            console.error('[Footer] Маршрут не определен для кнопки:', button);
        }
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
        footerContainer.addEventListener('click', async function(event) {
            const target = event.target.closest('.footer-item');
            if (target) {
                const pageName = target.dataset.page;
                if (pageName) {
                    // Специальная обработка для бренда
                    if (pageName === 'brand') {
                        event.preventDefault(); // Предотвращаем стандартное перенаправление
                        console.log('[Footer] Перехватили клик по бренду в DOMContentLoaded');
                      
                        // Удалить "active" у всех footerButtons
                        document.querySelectorAll('.footer-item').forEach(btn => btn.classList.remove('active'));
                        // Дать "active" текущей кнопке
                        target.classList.add('active');
                        
                        try {
                            // Получаем ID пользователя
                            const userId = sessionStorage.getItem('user_id') || 
                                        localStorage.getItem('user_id') || 
                                        window.USER_ID;
                                        
                            if (!userId) {
                                console.error('[Footer] Не удалось получить ID пользователя');
                                window.location.hash = '#list-brand';
                                return;
                            }
                            
                            // Прямой запрос к API для получения брендов пользователя
                            console.log(`[Footer] Проверяем бренды для пользователя: ${userId}`);
                            const response = await fetch(`/api/user/${userId}/brands`);
                            
                            // Выводим текст ответа для отладки
                            const responseText = await response.text();
                            console.log('[Footer] Ответ API в DOMContentLoaded (text):', responseText);
                            
                            try {
                                // Пытаемся разобрать JSON
                                const data = JSON.parse(responseText);
                                console.log('[Footer] Ответ API в DOMContentLoaded (json):', data);
                                
                                // Извлекаем массив брендов
                                let userBrands = [];
                                
                                // Обрабатываем различные структуры ответа
                                if (Array.isArray(data.brands)) userBrands = data.brands;
                                else if (data.data && Array.isArray(data.data.brands)) userBrands = data.data.brands;
                                else if (Array.isArray(data)) userBrands = data;
                                else if (data.result && Array.isArray(data.result)) userBrands = data.result;
                                else if (data.results && Array.isArray(data.results)) userBrands = data.results;
                                else if (data.brand && typeof data.brand === 'object') userBrands = [data.brand];
                                
                                console.log(`[Footer] Найдено брендов в DOMContentLoaded: ${userBrands.length}`);
                                
                                if (userBrands.length > 0) {
                                    console.log('[Footer] Найденные бренды в DOMContentLoaded:', JSON.stringify(userBrands, null, 2));
                                }
                                
                                if (userBrands.length === 1) {
                                    // Если есть только один бренд, сразу переходим на его страницу
                                    const brand = userBrands[0];
                                    console.log('[Footer] Первый бренд в DOMContentLoaded:', JSON.stringify(brand, null, 2));
                                    
                                    let brandId = brand.id || brand.brand_id || brand._id;
                                    
                                    // Если ID не найден в стандартных полях
                                    if (!brandId) {
                                        console.log('[Footer] Не найден стандартный ID в DOMContentLoaded, ищем в полях объекта');
                                        console.log('[Footer] Доступные поля бренда в DOMContentLoaded:', Object.keys(brand));
                                        
                                        for (const key of Object.keys(brand)) {
                                            if (key.toLowerCase().includes('id')) {
                                                brandId = brand[key];
                                                console.log(`[Footer] Нашли ID в поле ${key} в DOMContentLoaded: ${brandId}`);
                                                break;
                                            }
                                        }
                                    }
                                    
                                    // Если всё ещё нет ID, используем 0
                                    if (!brandId) {
                                        brandId = 0;
                                        console.log('[Footer] Используем значение 0 в качестве ID бренда в DOMContentLoaded');
                                    }
                                    
                                    console.log(`[Footer] Переход на страницу бренда в DOMContentLoaded: ${brandId}`);
                                    console.log(`[Footer] URL для перехода в DOMContentLoaded: #my-brand/${brandId}`);
                                    
                                    // Используем setTimeout для перенаправления
                                    setTimeout(() => {
                                        console.log('[Footer] Выполняем перенаправление в DOMContentLoaded...');
                                        window.location.hash = `#my-brand/${brandId}`;
                                    }, 50);
                                } else {
                                    // Если брендов нет, переходим на страницу списка брендов
                                    console.log('[Footer] У пользователя нет брендов, переход на список брендов в DOMContentLoaded');
                                    window.location.hash = '#list-brand';
                                }
                            } catch (parseError) {
                                console.error('[Footer] Ошибка при разборе JSON ответа в DOMContentLoaded:', parseError);
                                window.location.hash = '#list-brand';
                            }
                        } catch (error) {
                            console.error('[Footer] Ошибка при проверке брендов в DOMContentLoaded:', error);
                            window.location.hash = '#list-brand';
                        }
                    } else {
                        console.log(`[Footer] Переход на страницу: ${pageName}`);
                        window.location.hash = `#${pageName}`;
                    }
                }
            }
        });
    } else {
        console.log('[Footer] Контейнер footer-container не найден, добавляем обработчики напрямую');
        
        // Ищем элемент в footer-area
        const footerArea = document.getElementById('footer-area');
        if (footerArea) {
            const brandButton = footerArea.querySelector('.brand');
            if (brandButton) {
                console.log('[Footer] Добавляем обработчик на кнопку бренда напрямую');
                brandButton.addEventListener('click', async function(e) {
                    e.preventDefault();
                    console.log('[Footer] Клик по кнопке бренда через прямой обработчик');
                    
                    // Удалить "active" у всех
                    document.querySelectorAll('.footer-item').forEach(btn => btn.classList.remove('active'));
                    // Дать "active" текущей
                    brandButton.classList.add('active');
                    
                    try {
                        // Получаем ID пользователя
                        const userId = sessionStorage.getItem('user_id') || 
                                      localStorage.getItem('user_id') || 
                                      window.USER_ID;
                                      
                        if (!userId) {
                            console.error('[Footer] Не удалось получить ID пользователя');
                            window.location.hash = '#list-brand';
                            return;
                        }
                        
                        // Прямой запрос к API для получения брендов пользователя
                        console.log(`[Footer] Проверяем бренды для пользователя: ${userId}`);
                        const response = await fetch(`/api/user/${userId}/brands`);
                        const data = await response.json();
                        
                        // Извлекаем массив брендов
                        let userBrands = [];
                        
                        // Обрабатываем различные структуры ответа
                        if (Array.isArray(data.brands)) userBrands = data.brands;
                        else if (data.data && Array.isArray(data.data.brands)) userBrands = data.data.brands;
                        else if (Array.isArray(data)) userBrands = data;
                        else if (data.result && Array.isArray(data.result)) userBrands = data.result;
                        else if (data.results && Array.isArray(data.results)) userBrands = data.results;
                        else if (data.brand && typeof data.brand === 'object') userBrands = [data.brand];
                        
                        if (userBrands.length === 1) {
                            // Если есть только один бренд, сразу переходим на его страницу
                            const brand = userBrands[0];
                            let brandId = brand.id || brand.brand_id || brand._id;
                            
                            // Если ID не найден в стандартных полях
                            if (!brandId) {
                                for (const key of Object.keys(brand)) {
                                    if (key.toLowerCase().includes('id')) {
                                        brandId = brand[key];
                                        break;
                                    }
                                }
                            }
                            
                            // Если всё ещё нет ID, используем 0
                            if (!brandId) brandId = 0;
                            
                            // Переходим на страницу бренда
                            window.location.hash = `#my-brand/${brandId}`;
                        } else {
                            // Если брендов нет, переходим на страницу списка брендов
                            console.log('[Footer] У пользователя нет брендов, переход на список брендов');
                            window.location.hash = '#list-brand';
                        }
                    } catch (error) {
                        console.error('[Footer] Ошибка при проверке брендов:', error);
                        window.location.hash = '#list-brand';
                    }
                });
            }
        }
    }
});