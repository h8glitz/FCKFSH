// news.js

// ----------------------------------------------------------------------------------
// Константы API
// ----------------------------------------------------------------------------------
const API_ENDPOINTS = {
    APPROVED_NEWS: '/api/news/approved',
    UNAPPROVED_NEWS: '/api/news/moderation',
    APPROVE_NEWS: (id) => `/api/news/approve/${id}`,
    DELETE_NEWS: (id) => `/api/news/delete/${id}`,
    // ВАЖНО: роуты для лайка поправлены: /api/news/1/like
    LIKE_NEWS: (id) => `/api/news/${id}/like`,
    CURRENT_USER: '/api/user/current',

    // Новый эндпоинт для комментариев:
    COMMENTS_NEWS: (id) => `/api/news/${id}/comments`
};

// ----------------------------------------------------------------------------------
// Утилиты
// ----------------------------------------------------------------------------------
const DOMUtils = {
    waitForElement(selector) {
        return new Promise(resolve => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }
            const observer = new MutationObserver((mutations, obs) => {
                const foundElement = document.querySelector(selector);
                if (foundElement) {
                    obs.disconnect();
                    resolve(foundElement);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        });
    },

    createMediaCollage(mediaUrls) {
        const collageDiv = document.createElement("div");
        collageDiv.classList.add("collage");

        const layoutClasses = {
            1: "one",
            2: "two",
            3: "three",
            4: "four",
            5: "five"
        };

        collageDiv.classList.add(layoutClasses[Math.min(mediaUrls.length, 5)]);

        mediaUrls.forEach((url, index) => {
            let fixedUrl = url;
            if (url.includes('fckfsh.ru/')) {
                fixedUrl = '/' + url.split('fckfsh.ru/')[1];
            } else if (!url.startsWith('/')) {
                fixedUrl = '/' + url;
            }
            const imgElem = document.createElement("img");
            imgElem.src = fixedUrl;
            imgElem.alt = "News Image";
            if (index >= 4) imgElem.style.display = "none";
            collageDiv.appendChild(imgElem);
        });

        if (mediaUrls.length > 4) {
            const showMore = document.createElement("div");
            showMore.classList.add("show-more");
            showMore.textContent = `+${mediaUrls.length - 4}`;
            showMore.addEventListener("click", () => {
                collageDiv.querySelectorAll("img").forEach(img => img.style.display = "block");
                showMore.remove();
            });
            collageDiv.appendChild(showMore);
        }

        return collageDiv;
    }
};

// ----------------------------------------------------------------------------------
// Класс для управления состоянием (пользователь, лайки и т.д.)
// ----------------------------------------------------------------------------------
class NewsState {
    constructor() {
        this.userId = null;
        this.userData = null;
    }

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user_id');

        if (!userId) {
            console.error("[NewsState] user_id не найден в URL");
            return false;
        }

        try {
            const response = await fetch(`${API_ENDPOINTS.CURRENT_USER}?user_id=${userId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            this.userId = userId;
            this.userData = data.user;

            console.log("[NewsState] Пользователь успешно инициализирован:", this.userData);
            return true;
        } catch (error) {
            console.error("[NewsState] Ошибка получения пользователя:", error);
            return false;
        }
    }

    async toggleLike(newsId, isLiked, likeImg, likeCount) {
        if (!this.userId) {
            console.error("[NewsState] Неизвестен user_id!");
            return isLiked;
        }

        try {
            const method = isLiked ? "DELETE" : "POST";
            const res = await fetch(API_ENDPOINTS.LIKE_NEWS(newsId), {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: this.userId })
            });

            if (!res.ok) {
                throw new Error(`Ошибка ${res.status}`);
            }

            const data = await res.json();
            likeImg.src = !isLiked ? "/static/icons/likeadd.png" : "/static/icons/like-icon.png";
            likeCount.textContent = data.likes_count?.toString() ?? "0";
            return !isLiked;
        } catch (err) {
            console.error("[NewsState] Ошибка лайка:", err);
            return isLiked;
        }
    }
}

// ----------------------------------------------------------------------------------
// Класс для управления UI (карточки, рендер, и т.д.)
// ----------------------------------------------------------------------------------
class NewsUI {
    constructor(newsState) {
        this.newsState = newsState;
    }

    createNewsCard(newsItem, { showModerationButtons }) {
        const {
            id,
            title,
            text,
            image_url,
            likes_count = 0,
            is_liked_by_user = false,
            comment_count = 0,
            viewers_count = 0
        } = newsItem;

        const containerDiv = document.createElement("div");
        containerDiv.classList.add("news-card");

        if (image_url) {
            let mediaUrls = [];
            try {
                const parsed = JSON.parse(image_url);
                mediaUrls = Array.isArray(parsed) ? parsed : [image_url];
            } catch (e) {
                if (image_url.includes(',')) {
                    mediaUrls = image_url.split(',').map(url => url.trim());
                } else {
                    mediaUrls = [image_url];
                }
            }
            containerDiv.appendChild(DOMUtils.createMediaCollage(mediaUrls));
        }

        const titleDiv = document.createElement("div");
        titleDiv.classList.add("title");
        titleDiv.textContent = title || "Без заголовка";
        containerDiv.appendChild(titleDiv);

        const descDiv = document.createElement("div");
        descDiv.classList.add("description");
        descDiv.textContent = text || "";
        containerDiv.appendChild(descDiv);

        const actionsDiv = this.createActionsDiv(
            id,
            likes_count,
            is_liked_by_user,
            comment_count,
            viewers_count
        );
        containerDiv.appendChild(actionsDiv);

        if (showModerationButtons && this.newsState.userData?.role === 'moderator') {
            const moderationButtonsDiv = this.createModerationButtons(id, containerDiv);
            containerDiv.appendChild(moderationButtonsDiv);
        }

        // При клике по карточке открываем детальный просмотр
        containerDiv.addEventListener("click", () => {
            showNewsDetails(newsItem);
        });

        return containerDiv;
    }

    createActionsDiv(newsId, likesCount, isLikedByUser, commentCount, viewersCount = 0) {
        const actionsDiv = document.createElement("div");
        actionsDiv.classList.add("actions");

        const leftActions = document.createElement("div");
        leftActions.classList.add("left-actions");

        // Лайк
        const likeAction = document.createElement("div");
        likeAction.classList.add("like-action");

        const likeImg = document.createElement("img");
        likeImg.alt = "Лайк";
        likeImg.src = isLikedByUser ? "/static/icons/likeadd.png" : "/static/icons/like-icon.png";

        const likeCountSpan = document.createElement("span");
        likeCountSpan.classList.add("like-count");
        likeCountSpan.textContent = likesCount.toString();

        let isLiked = !!isLikedByUser;
        likeAction.appendChild(likeImg);
        likeAction.appendChild(likeCountSpan);

        likeAction.addEventListener("click", async (event) => {
            event.stopPropagation();
            isLiked = await this.newsState.toggleLike(
                newsId,
                isLiked,
                likeImg,
                likeCountSpan
            );
        });
        leftActions.appendChild(likeAction);

        // Комментарии
        const commentAction = document.createElement("div");
        commentAction.classList.add("comment-action");

        const commentImg = document.createElement("img");
        commentImg.src = "/static/icons/comment-icon.png";
        commentImg.alt = "Комментарии";

        const commentCountSpan = document.createElement("span");
        commentCountSpan.classList.add("comment-count");
        commentCountSpan.textContent = commentCount.toString();

        commentAction.appendChild(commentImg);
        commentAction.appendChild(commentCountSpan);

        commentAction.addEventListener("click", (event) => {
            event.stopPropagation();
            showNewsDetailsById(newsId);
        });
        leftActions.appendChild(commentAction);

        // Правая часть (просмотры)
        const rightActions = document.createElement("div");
        rightActions.classList.add("right-actions");

        const viewersAction = document.createElement("div");
        viewersAction.classList.add("viewers-action");

        // Отключаем реакцию на клик по просмотрам
        viewersAction.addEventListener("click", (event) => {
            event.stopPropagation();
        });

        const viewersImg = document.createElement("img");
        viewersImg.src = "/static/icons/viewersicon.png";
        viewersImg.alt = "Просмотры";

        const viewersCountSpan = document.createElement("span");
        viewersCountSpan.classList.add("viewers-count");
        viewersCountSpan.textContent = viewersCount.toString();

        viewersAction.appendChild(viewersImg);
        viewersAction.appendChild(viewersCountSpan);
        rightActions.appendChild(viewersAction);

        actionsDiv.appendChild(leftActions);
        actionsDiv.appendChild(rightActions);

        return actionsDiv;
    }

    createModerationButtons(newsId, cardElement) {
        const moderationButtonsDiv = document.createElement("div");
        moderationButtonsDiv.classList.add("moderation-buttons");

        const approveButton = document.createElement("button");
        approveButton.classList.add("approve-button");
        approveButton.textContent = "Одобрить";
        approveButton.addEventListener("click", () => this.approveNews(newsId, cardElement));

        const deleteButton = document.createElement("button");
        deleteButton.classList.add("delete-button");
        deleteButton.textContent = "Удалить";
        deleteButton.addEventListener("click", () => this.deleteNews(newsId, cardElement));

        moderationButtonsDiv.appendChild(approveButton);
        moderationButtonsDiv.appendChild(deleteButton);

        return moderationButtonsDiv;
    }

    async approveNews(newsId, cardElement) {
        try {
            const response = await fetch(API_ENDPOINTS.APPROVE_NEWS(newsId), { method: "POST" });
            if (!response.ok) {
                throw new Error(`Ошибка при одобрении новости: ${response.status}`);
            }
            cardElement.remove();
            console.log(`[news.js] Новость ID=${newsId} одобрена`);
        } catch (error) {
            console.error(`[news.js] Ошибка при одобрении новости:`, error);
        }
    }

    async deleteNews(newsId, cardElement) {
        try {
            const response = await fetch(API_ENDPOINTS.DELETE_NEWS(newsId), { method: "DELETE" });
            if (!response.ok) {
                throw new Error(`Ошибка при удалении новости: ${response.status}`);
            }
            cardElement.remove();
            console.log(`[news.js] Новость ID=${newsId} удалена`);
        } catch (error) {
            console.error(`[news.js] Ошибка при удалении новости:`, error);
        }
    }
}

// ----------------------------------------------------------------------------------
// Класс для управления страницей новостей
// ----------------------------------------------------------------------------------
class NewsPage {
    constructor() {
        this.newsState = null;
        this.newsUI = null;
        this.currentNewsItem = null;

        this.approvedSection = null;
        this.moderationSection = null;
        this.unapprovedNewsList = null;
    }

    async init() {
        this.newsState = new NewsState();
        const initialized = await this.newsState.init();
        if (!initialized) {
            console.error("[news.js] Не удалось инициализировать пользователя");
            return;
        }

        this.newsUI = new NewsUI(this.newsState);

        this.approvedSection = document.querySelector("#approved-news-section");
        this.moderationSection = document.querySelector("#moderation-section");
        this.unapprovedNewsList = document.querySelector("#unapproved-news-list");

        const addButton = document.querySelector(".add-button");

        this.moderationSection.classList.add("hidden");
        this.approvedSection.classList.remove("hidden");

        if (addButton) {
            if (this.newsState.userData?.role === "moderator") {
                addButton.classList.remove("hidden");
                addButton.addEventListener("click", () => this.toggleModerationView());
            } else {
                addButton.classList.add("hidden");
            }
        }

        const detailsBackButton = document.getElementById("details-back-button");
        detailsBackButton.addEventListener("click", () => {
            document.getElementById("news-details-section").classList.add("hidden");
            document.querySelector(".news-container").classList.remove("hidden");
        });

        const commentSubmit = document.getElementById("comment-submit");
        commentSubmit.addEventListener("click", () => this.postComment());

        await this.fetchApprovedNews();
    }

    toggleModerationView() {
        const isModerationHidden = this.moderationSection.classList.contains("hidden");
        if (!isModerationHidden) {
            this.moderationSection.classList.add("hidden");
            this.approvedSection.classList.remove("hidden");
        } else {
            this.moderationSection.classList.remove("hidden");
            this.approvedSection.classList.add("hidden");
            this.fetchUnapprovedNews();
        }
    }

    // ==============================
    // Загрузка одобренных новостей
    // ==============================
    async fetchApprovedNews() {
        let url = API_ENDPOINTS.APPROVED_NEWS;
        if (this.newsState.userId) {
            url += `?user_id=${this.newsState.userId}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }
            const newsList = await response.json();
            this.renderApprovedNews(newsList);
        } catch (error) {
            console.error("[news.js] Ошибка загрузки одобренных новостей:", error);
        }
    }

    renderApprovedNews(newsList) {
        this.approvedSection.innerHTML = "";
        newsList.forEach(newsItem => {
            const card = this.newsUI.createNewsCard(newsItem, { showModerationButtons: false });
            this.approvedSection.appendChild(card);
            // Если пользователь видит новость в ленте, фиксируем просмотр
            this.observeNewsCard(card, newsItem.id);
        });
    }

    // Новый метод для отслеживания появления карточки на экране
    observeNewsCard(card, newsId) {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Фиксируем просмотр, если карточка видна (устанавливаем data, чтобы не отправлять повторно)
                    if (!card.dataset.viewed) {
                        card.dataset.viewed = "true";
                        this.markNewsAsViewed(newsId, this.newsState.userId);
                    }
                    // Если требуется, можно отключить наблюдение после первого срабатывания:
                    // observer.unobserve(card);
                }
            });
        }, { threshold: 0.5 }); // Когда 50% карточки видно
        observer.observe(card);
    }

    // ==============================
    // Загрузка НЕодобренных новостей (модерация)
    // ==============================
    async fetchUnapprovedNews() {
        try {
            const response = await fetch(API_ENDPOINTS.UNAPPROVED_NEWS);
            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }
            const newsList = await response.json();
            this.renderUnapprovedNews(newsList);
        } catch (error) {
            console.error("[news.js] Ошибка загрузки новостей на модерации:", error);
        }
    }

    renderUnapprovedNews(newsList) {
        this.unapprovedNewsList.innerHTML = "";
        newsList.forEach(newsItem => {
            const card = this.newsUI.createNewsCard(newsItem, { showModerationButtons: true });
            this.unapprovedNewsList.appendChild(card);
        });
    }

    // ==============================
    // Детальный просмотр (если понадобится)
    // ==============================
    async showNewsDetails(newsItem) {
        console.log('Вызван метод showNewsDetails');
        this.currentNewsItem = newsItem;

        document.querySelector(".news-container").classList.add("hidden");
        const detailsSection = document.getElementById("news-details-section");
        detailsSection.classList.remove("hidden");

        const cardContainer = document.getElementById("selected-news-card");
        cardContainer.innerHTML = "";

        if (newsItem.image_url) {
            let mediaUrls = [];
            try {
                const parsed = JSON.parse(newsItem.image_url);
                mediaUrls = Array.isArray(parsed) ? parsed : [newsItem.image_url];
            } catch (e) {
                if (newsItem.image_url.includes(',')) {
                    mediaUrls = newsItem.image_url.split(',').map(url => url.trim());
                } else {
                    mediaUrls = [newsItem.image_url];
                }
            }
            cardContainer.appendChild(DOMUtils.createMediaCollage(mediaUrls));
        }

        const titleDiv = document.createElement("div");
        titleDiv.classList.add("title");
        titleDiv.textContent = newsItem.title || "Без заголовка";
        cardContainer.appendChild(titleDiv);

        const descDiv = document.createElement("div");
        descDiv.classList.add("description");
        descDiv.textContent = newsItem.text || "";
        cardContainer.appendChild(descDiv);

        await this.loadComments(newsItem.id);

        // Фиксируем просмотр (если нужно для детального просмотра)
        await this.markNewsAsViewed(newsItem.id, this.newsState.userId);
    }

    async loadComments(newsId) {
        const commentsSection = document.getElementById("comments-section");
        commentsSection.innerHTML = "<p>Загрузка комментариев...</p>";

        try {
            const res = await fetch(API_ENDPOINTS.COMMENTS_NEWS(newsId));
            if (!res.ok) {
                throw new Error("Не удалось загрузить комментарии");
            }
            const comments = await res.json();
            if (comments.length === 0) {
                commentsSection.innerHTML = "<p>Пока нет комментариев</p>";
            } else {
                commentsSection.innerHTML = "";
                comments.forEach(comment => {
                    const commentEl = this.renderCommentItem(comment);
                    commentsSection.appendChild(commentEl);
                });
            }
        } catch (error) {
            console.error("[loadComments]", error);
            commentsSection.innerHTML = "<p>Ошибка загрузки</p>";
        }
    }

    renderCommentItem(comment) {
        const container = document.createElement("div");
        container.classList.add("comment-item");

        const avatar = document.createElement("img");
        avatar.classList.add("avatar");
        avatar.src = comment.user?.photo_url || "/static/icons/default-avatar.png";

        const username = document.createElement("span");
        username.classList.add("username");
        username.textContent = comment.user?.username || "unknown";

        const textP = document.createElement("p");
        textP.textContent = comment.text;

        container.appendChild(avatar);
        container.appendChild(username);
        container.appendChild(textP);

        return container;
    }

    /**
     * Метод, вызываемый при клике "Отправить" комментарий
     */
    async postComment() {
        if (!this.currentNewsItem) return;

        const textArea = document.getElementById("comment-input");
        const text = textArea.value.trim();
        if (!text) return;

        if (!this.newsState.userId) {
            alert("Пользователь не инициализирован");
            return;
        }

        const newsId = this.currentNewsItem.id;
        const bodyData = {
            user_id: this.newsState.userId,
            text: text
        };

        try {
            const res = await fetch(API_ENDPOINTS.COMMENTS_NEWS(newsId), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData)
            });
            if (!res.ok) {
                console.error("Ошибка при добавлении комментария:", res.status);
                return;
            }
            const newComment = await res.json();

            const commentsSection = document.getElementById("comments-section");
            if (commentsSection.querySelector("p")?.textContent === "Пока нет комментариев") {
                commentsSection.innerHTML = "";
            }
            const commentEl = this.renderCommentItem(newComment);
            commentsSection.appendChild(commentEl);

            textArea.value = "";
        } catch (err) {
            console.error("[postComment]", err);
        }
    }

    // ==============================
    // УЧЁТ УНИКАЛЬНЫХ ПРОСМОТРОВ
    // ==============================
    async markNewsAsViewed(newsId, userId) {
        console.log(`[markNewsAsViewed] Попытка отправки запроса: newsId=${newsId}, userId=${userId}`);
        if (!userId) return;

        try {
            const res = await fetch(`/api/news/${newsId}/view`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId })
            });
            if (!res.ok) {
                throw new Error(`[markNewsAsViewed] Ошибка запроса, статус: ${res.status}`);
            }
            const data = await res.json();
            console.log(`[markNewsAsViewed] Сервер ответил:`, data);
        } catch (error) {
            console.error("[markNewsAsViewed] Ошибка запроса:", error);
        }
    }

    cleanup() {
        console.log("[news.js] cleanup() called");
    }
}

// ----------------------------------------------------------------------------------
// Глобальные функции, если хотим напрямую дергать
// ----------------------------------------------------------------------------------
async function showNewsDetails(newsItem) {
    await newsPage.showNewsDetails(newsItem);
}

async function showNewsDetailsById(newsId) {
    try {
        const userId = newsPage?.newsState?.userId || "";
        const url = `/api/news/${newsId}?user_id=${userId}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Ошибка загрузки новости по ID: ${response.status}`);
        }

        const newsItem = await response.json();
        await newsPage.showNewsDetails(newsItem);
    } catch (error) {
        console.error("[showNewsDetailsById] Ошибка:", error);
    }
}

// ----------------------------------------------------------------------------------
// Инициализация на старте
// ----------------------------------------------------------------------------------
const newsPage = new NewsPage();
window.NewsPage = NewsPage;

export default NewsPage;
