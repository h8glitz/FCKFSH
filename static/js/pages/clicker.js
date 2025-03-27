class ClickerPage {
    constructor() {
        console.log('[Clicker] Создание экземпляра ClickerPage');
        this.score = 0;
        this.timeLeft = 30;
        this.isFrozen = false;
        this.freezeDuration = 3000;
        this.fallingImages = [];
        this.gameInterval = null;
        this.bombInterval = null;
        this.freezeInterval = null;
        this.timerInterval = null;
    }

    async init() {
        console.log('[Clicker] Инициализация игры');

        const clickerContainer = document.getElementById("screen-clicker");
        if (!clickerContainer) {
            console.error("[Clicker] Не найден screen-clicker!");
            return;
        }

        this.scoreDisplay = document.getElementById("score");
        this.timerDisplay = document.getElementById("timer");

        this.startGame();
    }

    startGame() {
        this.score = 0;
        this.timeLeft = 30;
        this.isFrozen = false;
        this.updateUI();

        this.startTimer();
        this.gameInterval = setInterval(() => this.createCoin(), 700);
        this.bombInterval = setInterval(() => this.createBomb(), 3000);
        this.freezeInterval = setInterval(() => this.createFreezeItem(), 7000);
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (!this.isFrozen) {
                this.timeLeft--;
                this.updateUI();
                if (this.timeLeft <= 0) this.endGame();
            }
        }, 1000);
    }

    createCoin() {
        if (!this.isFrozen) this.createFallingItem("static/icons/tupper3.png", 1);
    }

    createBomb() {
        if (!this.isFrozen) this.createFallingItem("static/icons/tupper2.png", -20);
    }

    createFreezeItem() {
        if (!this.isFrozen) this.createFallingItem("static/icons/tupper1.png", "freeze");
    }

    createFallingItem(imageSrc, effect) {
        const img = document.createElement("img");
        img.src = imageSrc;
        img.classList.add("falling-image");
        img.style.left = Math.random() * (window.innerWidth - 50) + "px";

        img.addEventListener("pointerdown", () => {
            img.remove();
            if (effect === "freeze") this.activateFreeze();
            else {
                this.score = Math.max(0, this.score + effect);
                this.updateUI();
            }
        });

        document.getElementById("screen-clicker").appendChild(img);
        this.fallingImages.push(img);
        img.style.animationDuration = (Math.random() * 3 + 2) + "s";
        img.addEventListener("animationend", () => img.remove());
    }

    activateFreeze() {
        if (!this.isFrozen) {
            this.isFrozen = true;
            this.fallingImages.forEach(img => img.style.animationPlayState = "paused");
            setTimeout(() => {
                this.isFrozen = false;
                this.fallingImages.forEach(img => img.style.animationPlayState = "running");
            }, this.freezeDuration);
        }
    }

    updateUI() {
        this.scoreDisplay.innerText = `Очки: ${this.score}`;
        this.timerDisplay.innerText = `Время: ${this.timeLeft}`;
    }

    endGame() {
        clearInterval(this.timerInterval);
        clearInterval(this.gameInterval);
        clearInterval(this.bombInterval);
        clearInterval(this.freezeInterval);
        console.log("[Clicker] Игра окончена");
    }

    cleanup() {
        console.log('[Clicker] Очистка игры');
        this.endGame();
        this.fallingImages.forEach(img => img.remove());
    }
}

// Делаем доступным глобально
window.ClickerPage = ClickerPage;

// Экспортируем корректно
export default ClickerPage;
