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
        this.brandId = null;
        this.roles = [
            { title: 'iamwhoq', subtitle: 'Руководитель', avatar: '/static/icons/player.png' },
            { title: 'iamwhoq', subtitle: 'Креативный директор', avatar: '/static/icons/player.png', canChange: true },
            { title: 'iamwhoq', subtitle: 'Дизайнер', avatar: '/static/icons/player.png', canChange: true },
            { title: 'iamwhoq', subtitle: 'Менеджер', avatar: '/static/icons/player.png', canChange: true }
        ];
    }

    /**
     * Инициализирует страницу брендов
     * 
     * @param {HTMLElement} container - Контейнер страницы
     * @returns {Promise<void>}
     */
    async init(container) {
        console.log('[BrandPage] Инициализация страницы бренда');
        this.container = container;
        
        // Показываем индикатор загрузки и скрываем контент
        this.showLoadingState();
        
        // Получаем ID бренда из URL
        const hash = window.location.hash;
        const match = hash.match(/#my-brand\/(\d+)/);
        
        if (match) {
            this.brandId = match[1];
            console.log(`[BrandPage] Получен ID бренда из URL: ${this.brandId}`);
            
            // Загружаем данные бренда
            await this.loadBrandData();
            
            // Настраиваем обработчики событий
            this.setupEventListeners();
            
            // Рендерим роли
            this.renderRoles();
            
            // Скрываем индикатор загрузки и показываем контент
            this.hideLoadingState();
        } else {
            // Если нет ID бренда в URL, проверяем бренды пользователя
            console.log('[BrandPage] Проверяем бренды пользователя');
            
            try {
                // Получаем ID пользователя
                const userId = sessionStorage.getItem('user_id') || 
                              localStorage.getItem('user_id') || 
                              window.USER_ID;
                
                if (!userId) {
                    console.error('[BrandPage] Не удалось получить ID пользователя');
                    window.location.hash = '#list-brand';
                    return;
                }
                
                console.log(`[BrandPage] Проверяем бренды для пользователя: ${userId}`);
                
                // Получаем список брендов пользователя
                const response = await fetch(`/api/user/${userId}/brands`);
                const data = await response.json();
                console.log('[BrandPage] Ответ API:', data);
                
                // Извлекаем массив брендов из разных возможных структур
                let userBrands = [];
                
                if (data.status === 'success') {
                    if (Array.isArray(data.brands)) userBrands = data.brands;
                    else if (data.data && Array.isArray(data.data.brands)) userBrands = data.data.brands;
                    else if (Array.isArray(data)) userBrands = data;
                    else if (data.result && Array.isArray(data.result)) userBrands = data.result;
                    else if (data.results && Array.isArray(data.results)) userBrands = data.results;
                    else if (data.brand && typeof data.brand === 'object') userBrands = [data.brand];
                }
                
                console.log('[BrandPage] Найдено брендов:', userBrands.length);
                
                if (userBrands.length > 0) {
                    // Берем первый бренд пользователя
                    const firstBrand = userBrands[0];
                    console.log(`[BrandPage] Найден бренд пользователя:`, firstBrand);
                    
                    // Ищем ID бренда в разных возможных полях
                    let brandId = firstBrand.id || firstBrand.brand_id || firstBrand._id;
                    
                    // Если не нашли, ищем в любых полях, содержащих "id"
                    if (!brandId) {
                        for (const key of Object.keys(firstBrand)) {
                            if (key.toLowerCase().includes('id')) {
                                brandId = firstBrand[key];
                                break;
                            }
                        }
                    }
                    
                    // Если всё ещё нет ID, используем индекс 0
                    if (!brandId) brandId = 0;
                    
                    // Перенаправляем на страницу этого бренда
                    console.log(`[BrandPage] Перенаправляем на страницу бренда: ${brandId}`);
                    window.location.hash = `#my-brand/${brandId}`;
                } else {
                    // Если у пользователя нет брендов, перенаправляем на список
                    console.log('[BrandPage] У пользователя нет брендов, перенаправляем на список доступных брендов');
                    window.location.hash = '#list-brand';
                }
            } catch (error) {
                console.error('[BrandPage] Ошибка при проверке брендов пользователя:', error);
                window.location.hash = '#list-brand';
            } finally {
                this.hideLoadingState();
            }
        }
    }

    showBrandPage(brand) {
        // TODO: Заменить на реальный контент страницы бренда
        this.container.innerHTML = `
            <div class="header">
                <div class="subheader">
                    <div class="back-button" onclick="window.location.hash = '#list-brand'">
                        <img src="/static/images/back.svg" alt="Назад">
                    </div>
                    <h1>${brand.name}</h1>
                </div>
            </div>
            <div class="content">
                <div class="brand-info">
                    <img src="${brand.logo || '/static/images/default-brand.png'}" alt="Логотип бренда" class="brand-logo">
                    <p class="brand-description">${brand.description || 'Описание отсутствует'}</p>
                </div>
                <div class="brand-stats">
                    <div class="stat-item">
                        <span class="stat-label">Участники</span>
                        <span class="stat-value">${brand.members || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Уровень</span>
                        <span class="stat-value">${brand.level || 1}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Очки</span>
                        <span class="stat-value">${brand.points || 0}</span>
                    </div>
                </div>
            </div>
        `;
    }

    async loadBrandData() {
        console.log(`[BrandPage] Загрузка данных бренда с ID: ${this.brandId}`);
        
        try {
            // Сначала получаем данные с сервера перед обновлением DOM
            const response = await fetch(`/api/brands/${this.brandId}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка HTTP: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('[BrandPage] Ответ API с данными бренда:', data);
            
            // Теперь загружаем HTML шаблон, если у нас скелетон
            if (this.container && this.container.classList.contains('loading')) {
                this.container.innerHTML = this.originalContent || `
                    <div class="exit-icon">
                      <a href="#main">
                        <img src="/static/icons/back.jpg" alt="exit-icon">
                      </a>
                    </div>
                    <div class="profile-container">
                      <div class="profile-circle"></div>
                      <div class="profile-edit">Изм.</div>
                    </div>
                    <div class="brand-header">
                      <span id="brand-name">Название бренда</span><span class="edit">Изм.</span>
                    </div>
                    <div class="description">
                      <span id="brand-description">Описание</span><span class="edit">Изм.</span>
                    </div>
                    <div class="progress-container">
                      <div class="progress-circle">
                        <span class="two-text">1</span>
                      </div>
                      <div class="progress-track">
                        <div class="progress-fill"></div>
                      </div>
                    </div>
                    <div class="stats-wrapper">
                      <div class="text-container">
                        <span><div class="color-dot green-dot"></div> Репутация - <span id="reputation-value"></span></span>
                        <span><div class="color-dot purple-dot"></div> Рентабельность - <span id="profitability-value"></span></span>
                        <span><div class="color-dot yellow-dot"></div> Инновативность - <span id="innovation-value"></span></span>
                      </div>
                      <div class="progress-bars">
                        <div class="stat-bar">
                          <div class="fill green-fill"></div>
                        </div>
                        <div class="stat-bar">
                          <div class="fill purple-fill"></div>
                        </div>
                        <div class="stat-bar">
                          <div class="fill yellow-fill"></div>
                        </div>
                      </div>
                    </div>
                    <div class="roles" id="roles-container">
                    </div>
                `;
            }
            
            if (data.status === 'success' && data.brand) {
                console.log('[BrandPage] Данные бренда успешно загружены:', data.brand);
                this.brand = data.brand; // сохраняем данные бренда
                
                // Обновляем интерфейс (только после загрузки данных)
                await this.updateBrandInfo(data.brand);
                
                // Если есть члены бренда, обновляем список
                if (data.brand.members && data.brand.members.length > 0) {
                    console.log('[BrandPage] Загружено участников бренда:', data.brand.members.length);
                    
                    this.roles = data.brand.members.map(member => ({
                        title: member.username || 'Участник',
                        subtitle: member.role || 'Участник',
                        avatar: member.photo_url || '/static/icons/default-avatar.png',
                        user_id: member.user_id,
                        canChange: member.role !== 'owner' // нельзя менять владельца
                    }));
                    
                    this.renderRoles();
                } else {
                    console.log('[BrandPage] У бренда нет участников');
                    this.roles = [];
                    this.renderRoles();
                }
            } else if (data.brand) {
                console.log('[BrandPage] Данные бренда в нестандартном формате:', data.brand);
                this.brand = data.brand;
                await this.updateBrandInfo(data.brand);
                
                // Пытаемся найти участников в разных возможных местах объекта
                let members = [];
                if (data.brand.members) members = data.brand.members;
                else if (data.members) members = data.members;
                else if (data.users) members = data.users;
                else if (Array.isArray(data.result)) members = data.result;
                else if (data.data && data.data.members) members = data.data.members;
                
                if (members.length > 0) {
                    console.log('[BrandPage] Найдены участники бренда в альтернативном поле:', members.length);
                    this.roles = members.map(member => ({
                        title: member.username || member.name || 'Участник',
                        subtitle: member.role || 'Участник',
                        avatar: member.photo_url || member.avatar || '/static/icons/default-avatar.png',
                        user_id: member.user_id || member.id,
                        canChange: (member.role !== 'owner' && member.role !== 'владелец')
                    }));
                } else {
                    console.log('[BrandPage] Участники бренда не найдены');
                    this.roles = [];
                }
                this.renderRoles();
            } else {
                console.error('[BrandPage] Ошибка в структуре данных от API:', data);
                window.location.hash = '#list-brand';
            }
        } catch (error) {
            console.error('[BrandPage] Ошибка при загрузке данных бренда:', error);
            
            // Выводим более детальную информацию в консоль
            console.error('Состояние на момент ошибки:', {
                brandId: this.brandId,
                roles: this.roles,
                container: this.container ? 'DOM элемент существует' : 'DOM элемент не найден'
            });
            
            // При ошибке возвращаемся на страницу брендов
            setTimeout(() => {
                window.location.hash = '#list-brand';
            }, 3000);
        }
    }

    async updateBrandInfo(brand) {
        console.log('[BrandPage] Обновление информации о бренде:', brand);
        
        try {
            // Устанавливаем основную информацию о бренде
            const nameElement = document.getElementById('brand-name');
            const descriptionElement = document.getElementById('brand-description');
            
            if (nameElement) nameElement.textContent = brand.name || 'Название бренда';
            if (descriptionElement) descriptionElement.textContent = brand.description || 'Описание бренда';
            
            // Устанавливаем изображение профиля, если есть
            const profileCircle = document.querySelector('.profile-circle');
            if (profileCircle) {
                // Проверяем различные поля, где может быть URL логотипа
                const logoUrl = brand.logo_url || brand.logo || brand.image_url || brand.avatar;
                
                if (logoUrl) {
                    profileCircle.style.backgroundImage = `url(${logoUrl})`;
                    profileCircle.style.backgroundSize = 'cover';
                    profileCircle.style.backgroundPosition = 'center';
                } else {
                    // Если логотипа нет, устанавливаем стандартный
                    profileCircle.style.backgroundImage = `url(/static/icons/default-brand.png)`;
                    profileCircle.style.backgroundSize = 'cover';
                }
            }
            
            // Устанавливаем уровень бренда
            const levelElement = document.querySelector('.two-text');
            if (levelElement) {
                levelElement.textContent = brand.level || '1';
            }
            
            // Рассчитываем проценты для статистики
            // Используем поля из API или не показываем значения
            const reputation = brand.reputation || brand.relevance || null;
            const profitability = brand.profitability || brand.popularity || null;
            const innovation = brand.innovation || brand.innovativeness || null;
            
            // Обновляем текстовые значения
            const reputationElement = document.getElementById('reputation-value');
            const profitabilityElement = document.getElementById('profitability-value');
            const innovationElement = document.getElementById('innovation-value');
            
            if (reputationElement) reputationElement.textContent = reputation ? `${reputation}%` : '';
            if (profitabilityElement) profitabilityElement.textContent = profitability ? `${profitability}%` : '';
            if (innovationElement) innovationElement.textContent = innovation ? `${innovation}%` : '';
            
            // Обновляем прогресс-бары (высота в процентах)
            const greenFill = document.querySelector('.green-fill');
            const purpleFill = document.querySelector('.purple-fill');
            const yellowFill = document.querySelector('.yellow-fill');
            
            if (greenFill) greenFill.style.height = reputation ? `${reputation}%` : '0%';
            if (purpleFill) purpleFill.style.height = profitability ? `${profitability}%` : '0%';
            if (yellowFill) yellowFill.style.height = innovation ? `${innovation}%` : '0%';
            
            // Обновляем прогресс заполнения общего прогресс-бара
            const progressFill = document.querySelector('.progress-fill');
            if (progressFill) {
                // Рассчитываем средний процент, но только если есть все значения
                if (reputation && profitability && innovation) {
                    const averageProgress = Math.floor((reputation + profitability + innovation) / 3);
                    progressFill.style.width = `${averageProgress}%`;
                } else {
                    progressFill.style.width = '0%';
                }
            }
            
            console.log('[BrandPage] Информация о бренде успешно обновлена');
        } catch (error) {
            console.error('[BrandPage] Ошибка при обновлении информации о бренде:', error);
        }
    }

    setupEventListeners() {
        // Кнопка "Назад"
        document.querySelector('.exit-icon').addEventListener('click', () => {
            window.location.hash = '#list-brand';
        });

        // Кнопки редактирования
        document.querySelectorAll('.edit').forEach(button => {
            button.addEventListener('click', (e) => {
                const element = e.target.previousElementSibling;
                if (element) {
                    this.startEditing(element);
                }
            });
        });

        // Кнопка редактирования профиля
        document.querySelector('.profile-edit').addEventListener('click', () => {
            // Здесь будет логика редактирования профиля
            console.log('Редактирование профиля');
        });
    }

    startEditing(element) {
        const currentValue = element.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = 'edit-input';
        
        element.textContent = '';
        element.appendChild(input);
        input.focus();
        
        input.addEventListener('blur', () => {
            const newValue = input.value.trim();
            if (newValue) {
                element.textContent = newValue;
                this.saveBrandData();
            } else {
                element.textContent = currentValue;
            }
        });
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });
    }

    async saveBrandData() {
        try {
            const response = await fetch(`/api/brands/${this.brandId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: document.getElementById('brand-name').textContent,
                    description: document.getElementById('brand-description').textContent
                })
            });
            
            const data = await response.json();
            if (data.status !== 'success') {
                console.error('Ошибка сохранения данных:', data.message);
            }
        } catch (error) {
            console.error('Ошибка при сохранении данных:', error);
        }
    }

    renderRoles() {
        console.log('[BrandPage] Рендеринг ролей участников бренда:', this.roles);
        const rolesContainer = document.getElementById('roles-container');
        if (!rolesContainer) {
            console.error('[BrandPage] Не найден контейнер для ролей #roles-container');
            return;
        }
        
        // Очищаем контейнер
        rolesContainer.innerHTML = '';
        
        // Добавляем заголовок
        const header = document.createElement('h2');
        header.textContent = 'Участники бренда';
        header.className = 'roles-header';
        rolesContainer.appendChild(header);
        
        // Если нет ролей, выводим сообщение
        if (!this.roles || this.roles.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-roles-message';
            emptyMessage.textContent = 'В бренде пока нет участников';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '20px';
            emptyMessage.style.color = '#777';
            rolesContainer.appendChild(emptyMessage);
            return;
        }
        
        // Создаем список ролей
        const rolesList = document.createElement('div');
        rolesList.className = 'roles-list';
        
        // Рендерим каждую роль
        this.roles.forEach(role => {
            try {
                const roleElement = document.createElement('div');
                roleElement.className = 'role';
                
                // Создаем блок с иконкой
                const roleIcon = document.createElement('div');
                roleIcon.className = 'role-icon';
                
                // Добавляем аватар
                const avatar = document.createElement('img');
                avatar.src = role.avatar || role.photo_url || '/static/icons/default-avatar.png';
                avatar.alt = 'Аватар участника';
                avatar.onerror = function() {
                    this.src = '/static/icons/default-avatar.png';
                };
                roleIcon.appendChild(avatar);
                
                // Создаем блок с текстом
                const roleText = document.createElement('div');
                roleText.className = 'role-text';
                
                const title = document.createElement('p');
                title.className = 'role-title';
                title.textContent = role.title || role.username || 'Участник';
                
                const subtitle = document.createElement('p');
                subtitle.className = 'role-subtitle';
                subtitle.textContent = role.subtitle || role.role || 'Участник';
                
                roleText.appendChild(title);
                roleText.appendChild(subtitle);
                
                // Добавляем всё в элемент роли
                roleElement.appendChild(roleIcon);
                roleElement.appendChild(roleText);
                
                // Если роль можно изменить, добавляем кнопку
                if (role.canChange) {
                    const changeBtn = document.createElement('div');
                    changeBtn.className = 'change-role-btn';
                    changeBtn.textContent = 'Изменить';
                    changeBtn.style.padding = '5px 10px';
                    changeBtn.style.backgroundColor = '#f0f0f0';
                    changeBtn.style.borderRadius = '15px';
                    changeBtn.style.fontSize = '12px';
                    changeBtn.style.cursor = 'pointer';
                    
                    if (role.user_id) {
                        changeBtn.setAttribute('data-user-id', role.user_id);
                    }
                    
                    changeBtn.addEventListener('click', (e) => {
                        const userId = e.target.getAttribute('data-user-id');
                        this.showRoleChangeDialog(userId);
                    });
                    
                    roleElement.appendChild(changeBtn);
                }
                
                rolesList.appendChild(roleElement);
            } catch (error) {
                console.error('[BrandPage] Ошибка при рендеринге роли:', error);
            }
        });
        
        rolesContainer.appendChild(rolesList);
        console.log('[BrandPage] Роли успешно отрендерены');
    }
    
    showRoleChangeDialog(userId) {
        // Здесь будет реализация диалога изменения роли
        console.log(`[BrandPage] Показать диалог изменения роли для пользователя ${userId}`);
        alert(`Изменение роли для пользователя ${userId} будет доступно позже`);
    }

    /**
     * Показывает индикатор загрузки и скрывает контент бренда
     */
    showLoadingState() {
        // Добавляем класс loading к контейнеру
        if (this.container) {
            this.container.classList.add('loading');
            
            // Сохраняем оригинальное содержимое
            this.originalContent = this.container.innerHTML;
            
            // Заменяем содержимое на скелетон-анимацию
            this.container.innerHTML = `
                <div class="brand-loading-overlay">
                    <div class="brand-loading-spinner"></div>
                    <div class="brand-loading-text">Загрузка данных бренда...</div>
                </div>
                <div class="brand-skeleton">
                    <div class="profile-skeleton-container">
                        <div class="profile-circle-skeleton"></div>
                    </div>
                    <div class="brand-header-skeleton"></div>
                    <div class="description-skeleton"></div>
                    <div class="progress-container-skeleton">
                        <div class="progress-circle-skeleton"></div>
                        <div class="progress-track-skeleton"></div>
                    </div>
                    <div class="stats-wrapper-skeleton">
                        <div class="text-container-skeleton">
                            <div class="text-line-skeleton"></div>
                            <div class="text-line-skeleton"></div>
                            <div class="text-line-skeleton"></div>
                        </div>
                        <div class="progress-bars-skeleton">
                            <div class="stat-bar-skeleton"></div>
                            <div class="stat-bar-skeleton"></div>
                            <div class="stat-bar-skeleton"></div>
                        </div>
                    </div>
                    <div class="roles-skeleton">
                        <div class="roles-header-skeleton"></div>
                        <div class="role-skeleton"></div>
                        <div class="role-skeleton"></div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Скрывает индикатор загрузки и показывает контент бренда
     */
    hideLoadingState() {
        if (this.container) {
            // Удаляем скелетон и показываем реальный контент
            this.container.classList.remove('loading');
            
            // Удаляем элементы загрузки
            const loadingOverlay = this.container.querySelector('.brand-loading-overlay');
            const skeletonContent = this.container.querySelector('.brand-skeleton');
            
            if (loadingOverlay) {
                loadingOverlay.style.opacity = '0';
                setTimeout(() => {
                    if (loadingOverlay.parentNode) {
                        loadingOverlay.parentNode.removeChild(loadingOverlay);
                    }
                }, 300);
            }
            
            if (skeletonContent) {
                skeletonContent.style.opacity = '0';
                setTimeout(() => {
                    if (skeletonContent.parentNode) {
                        skeletonContent.parentNode.removeChild(skeletonContent);
                    }
                }, 300);
            }
        }
    }
}

// Экспортируем класс глобально
window.BrandPage = BrandPage;

// Инициализация страницы
document.addEventListener('DOMContentLoaded', () => {
    const brandPage = new BrandPage();
    brandPage.init();
});
