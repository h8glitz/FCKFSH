// Определяем класс CreateBrandPage
class CreateBrandPage {
    constructor() {
        this.container = null;
        this.form = null;
    }

    async init(container) {
        this.container = container;
        this.form = container.querySelector('#create-brand-form');
        
        if (!this.form) {
            console.error('[CreateBrandPage] Форма не найдена');
            return;
        }
        
        // Добавляем обработчик отправки формы
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit();
        });
    }

    async handleSubmit() {
        const brandName = this.form.querySelector('#brand-name').value.trim();
        
        if (!brandName) {
            alert('Пожалуйста, введите название бренда');
            return;
        }
        
        try {
            const response = await fetch('/api/brands', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': window.currentUser?.id // Предполагаем, что ID пользователя хранится в window.currentUser
                },
                body: JSON.stringify({
                    name: brandName
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Переходим на страницу созданного бренда
                window.location.hash = `#brand/${data.brand.id}`;
            } else {
                alert(data.message || 'Ошибка при создании бренда');
            }
        } catch (error) {
            console.error('Ошибка при создании бренда:', error);
            alert('Произошла ошибка при создании бренда');
        }
    }
}

// Экспортируем класс глобально
window.CreateBrandPage = CreateBrandPage; 