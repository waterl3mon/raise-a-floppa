const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let state = {
    coins: 1000000,
    happiness: 100,
    hunger: 100,
    baseLevel: 1,
    clickPower: 1,
    autoIncome: 0,
    floppaState: 'idle',
    lastTick: Date.now(),
    location: 'home',
    boxCooldown: 0,
    items: {
        goldenFloppa: false,
        megaClicker: false,
        happinessBooster: false,
        maid: false,
        poorClicker: false
    },
    // New properties for the key/boss/artifact system
    hasKey: false,
    strangeLocationUnlocked: false,
    bossDefeated: false,
    artifacts: []
};

const sprites = {
    floppa: {
        idle: new Image(),
        happy: new Image(),
        sad: new Image()
    },
    backgrounds: {
        home: new Image(),
        park: new Image(),
        shop: new Image(),
        artifact: new Image()
    },
    base: [
        new Image(),
        new Image(),
        new Image(),
        new Image(),
        new Image()
    ],
    player: new Image(),
    boss: new Image()
};

document.getElementById('location').textContent =
    state.location === 'home' ? 'Дом' :
    state.location === 'park' ? 'Парк' :
    state.location === 'shop' ? 'Магазин' :
    state.location === 'strange' ? 'Странная Локация' : 'Неизвестная локация';

// Загрузка спрайтов
sprites.floppa.idle.src = 'https://cdn.comic.studio/images/raiseafloppacomics/characters/b9baa8a6236f0537ebd59fd41ef0a624.png?filename=Pet_floppa_1.png';
sprites.floppa.happy.src = sprites.floppa.idle.src;
sprites.floppa.sad.src = sprites.floppa.idle.src;
sprites.backgrounds.home.src = 'https://cdn.comic.studio/images/raiseafloppacomics/backgrounds/8a63ed99b058549be44e2c950ce40d61.png?filename=Interior.png';
sprites.backgrounds.park.src = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR-YklwnKnnUAA9HvORD5CazphLSIus-rUAvA&s';
sprites.backgrounds.shop.src = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTepmNfB1WWwmiIOBYjVCpmA0KB_-AKA2O86Q&s';
sprites.backgrounds.artifact.src = 'cheese burger.webp';
sprites.player.src = 'Pet_floppa.webp';
sprites.boss.src = 'Stupid_Bingus.webp';

function playSound(soundId) {
    document.getElementById(soundId).play();
}

function draw() {
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sprites.backgrounds[state.location], 0, 0, canvas.width, canvas.height);
    
    if (state.location === 'home') {
        const baseImg = sprites.base[Math.min(state.baseLevel - 1, 4)];
        ctx.drawImage(baseImg, canvas.width/2 - 150, canvas.height - 200, 300, 150);
    }

    if (state.location === 'artifact') {
        ctx.font = '32px Comic Sans MS';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('Алтарь Артефактов', canvas.width/2, 100);
        // Три таблички с артефактами
        const artifactsPool = ["Сила клика", "Автоматический доход", "Максимальное счастье"];
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = '#222';
            ctx.fillRect(canvas.width/2 - 250 + i*200, 200, 150, 150);
            ctx.fillStyle = '#ffd700';
            ctx.font = '20px Comic Sans MS';
            ctx.fillText(artifactsPool[i], canvas.width/2 - 175 + i*200, 280);
        }
        // Табличка домой
        ctx.fillStyle = '#444';
        ctx.fillRect(canvas.width/2 - 75, 400, 150, 80);
        ctx.fillStyle = '#fff';
        ctx.font = '24px Comic Sans MS';
        ctx.fillText('Домой', canvas.width/2, 450);
    }

    const floppaSprite = sprites.floppa[state.floppaState] || sprites.floppa.idle;
    ctx.drawImage(floppaSprite, canvas.width/2 - 75, canvas.height/2 - 75, 150, 150);
}

function updateUI() {
    document.getElementById('coins').textContent = Math.floor(state.coins).toLocaleString();
    document.getElementById('happiness').textContent = Math.floor(state.happiness);
    document.getElementById('hunger').textContent = Math.floor(state.hunger);
    document.getElementById('baseLevel').textContent = state.baseLevel;
    document.getElementById('autoIncome').textContent = (state.autoIncome * (state.happiness / 100)).toFixed(1);
    document.getElementById('location').textContent =
        state.location === 'home' ? 'Дом' :
        state.location === 'park' ? 'Парк' :
        state.location === 'shop' ? 'Магазин' : 'Странная Локация';

    document.getElementById('itemsStatus').innerHTML = `
        Золотая Флоппа: ${state.items.goldenFloppa ? '✅' : '❌'}<br>
        Мега-Кликер: ${state.items.megaClicker ? '✅' : '❌'}<br>
        Усилитель Счастья: ${state.items.happinessBooster ? '✅' : '❌'}<br>
        Горничная: ${state.items.maid ? '✅' : '❌'}
        бедный-Кликер: ${state.items.poorClicker ? '✅' : '❌'}<br>
        Ключ: ${state.hasKey ? '🔑' : '❌'}<br>
        Артефакты: ${state.artifacts.join(", ") || "Нет"}
    `;
}

function getBaseUpgradeCost() {
    return 100 * Math.pow(2, state.baseLevel - 1);
}

function upgradeBase() {
    const cost = getBaseUpgradeCost();
    if (state.coins >= cost && state.baseLevel < 5) {
        state.coins -= cost;
        state.baseLevel += 1;
        state.autoIncome = state.baseLevel * 0.2;
        playSound('buySound');
    } else {
        playSound('errorSound');
        alert("Недостаточно монет!");
    }
}

function enterStrangeLocation() {
    state.hasKey = false;
    startBossFight();
}

function startBossFight() {
    // Останавливаем музыку главного экрана и включаем музыку босса
    try {
        const homeMusic = document.getElementById('home');
        const bossMusic = document.getElementById('bossMusic');
        if (homeMusic) {
            homeMusic.pause();
            homeMusic.currentTime = 0;
        }
        if (bossMusic) {
            bossMusic.currentTime = 0;
            bossMusic.play();
        }
    } catch(e) {}
    
    // Сохраняем текущий canvas
    const mainCanvas = canvas;
    const mainCtx = ctx;
    
    // Создаем новый canvas для мини-игры
    const gameCanvas = document.createElement('canvas');
    gameCanvas.width = 800;
    gameCanvas.height = 600;
    gameCanvas.style.position = 'fixed';
    gameCanvas.style.top = '50%';
    gameCanvas.style.left = '50%';
    gameCanvas.style.transform = 'translate(-50%, -50%)';
    gameCanvas.style.border = '2px solid #333';
    gameCanvas.style.backgroundColor = '#111';
    document.body.appendChild(gameCanvas);
    
    const gameCtx = gameCanvas.getContext('2d');
    
    // Игровые переменные
    let score = 0;
    let gameOver = false;
    let cubes = [];
    let player = {
        x: gameCanvas.width / 2 - 25,
        y: gameCanvas.height - 50,
        width: 50,
        height: 50,
        speed: 5,
        sprite: sprites.player
    };

    let boss = {
        x: gameCanvas.width / 2 - 40,
        y: 50,
        width: 80,
        height: 80,
        health: 400,
        maxHealth: 400,
        color: '#ff0000',
        direction: 1,
        speed: 2,
        sprite: sprites.boss
    };

    // Управление
    let keys = {
        ArrowLeft: false,
        ArrowRight: false
    };

    function handleKeyDown(e) {
        if (keys.hasOwnProperty(e.key)) {
            keys[e.key] = true;
        }
    }

    function handleKeyUp(e) {
        if (keys.hasOwnProperty(e.key)) {
            keys[e.key] = false;
        }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    function createFallingObject() {
        // 20% шанс на пельмешку
        if (Math.random() < 0.2) {
            return {
                type: 'pelmeshka',
                x: Math.random() * (gameCanvas.width - 30),
                y: -30,
                width: 30,
                height: 30,
                speed: 3 + Math.random() * 2,
                color: '#fffbe6',
                border: '#c2a76d'
            };
        } else {
            return {
                type: 'cube',
                x: Math.random() * (gameCanvas.width - 30),
                y: -30,
                width: 30,
                height: 30,
                speed: 3 + Math.random() * 2,
                color: `hsl(${Math.random() * 360}, 50%, 50%)`
            };
        }
    }

    function checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    function endBossFight(won) {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        document.body.removeChild(gameCanvas);
        // Останавливаем музыку босса и возвращаем музыку главного экрана
        try {
            const bossMusic = document.getElementById('bossMusic');
            const homeMusic = document.getElementById('home');
            if (bossMusic) {
                bossMusic.pause();
                bossMusic.currentTime = 0;
            }
            if (homeMusic) {
                homeMusic.currentTime = 0;
                homeMusic.play();
            }
        } catch(e) {}
        
        if (won) {
            state.bossDefeated = true;
            state.location = 'artifact';
            draw();
        } else {
            alert("Босс оказался сильнее... Попробуйте снова!");
            location.reload();
        }
    }

    function bossFightLoop() {
        if (gameOver) {
            endBossFight(boss.health <= 0);
            return;
        }

        // Очистка canvas
        gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

        // Обновление позиции игрока
        if (keys.ArrowLeft && player.x > 0) {
            player.x -= player.speed;
        }
        if (keys.ArrowRight && player.x < gameCanvas.width - player.width) {
            player.x += player.speed;
        }

        // Обновление позиции босса
        boss.x += boss.speed * boss.direction;
        if (boss.x <= 0 || boss.x + boss.width >= gameCanvas.width) {
            boss.direction *= -1;
        }

        // Создание новых объектов
        if (Math.random() < 0.03) {
            cubes.push(createFallingObject());
        }

        // Обновление и отрисовка объектов
        for (let i = cubes.length - 1; i >= 0; i--) {
            let cube = cubes[i];
            cube.y += cube.speed;

            // Проверка столкновения с игроком
            if (checkCollision(cube, player)) {
                if (cube.type === 'cube') {
                    gameOver = true;
                } else if (cube.type === 'pelmeshka') {
                    boss.health -= 30;
                    cubes.splice(i, 1);
                    score += 30;
                    if (boss.health <= 0) {
                        gameOver = true;
                    }
                    continue;
                }
            }

            // Удаление объектов, вышедших за пределы экрана
            if (cube.y > gameCanvas.height) {
                cubes.splice(i, 1);
                continue;
            }

            // Отрисовка объекта
            if (cube.type === 'pelmeshka') {
                // Пельмешка: рисуем круг с обводкой
                gameCtx.beginPath();
                gameCtx.arc(cube.x + cube.width/2, cube.y + cube.height/2, cube.width/2, 0, 2 * Math.PI);
                gameCtx.fillStyle = cube.color;
                gameCtx.fill();
                gameCtx.strokeStyle = cube.border;
                gameCtx.lineWidth = 3;
                gameCtx.stroke();
            } else {
                // Кубик
                gameCtx.fillStyle = cube.color;
                gameCtx.fillRect(cube.x, cube.y, cube.width, cube.height);
            }
        }

        // Отрисовка игрока с использованием спрайта
        gameCtx.drawImage(player.sprite, player.x, player.y, player.width, player.height);

        // Отрисовка босса
        gameCtx.drawImage(boss.sprite, boss.x, boss.y, boss.width, boss.height);

        // Сайд-бар HP босса
        let barHeight = 400;
        let barWidth = 30;
        let barX = gameCanvas.width - barWidth - 20;
        let barY = 100;
        // Рамка
        gameCtx.strokeStyle = '#fff';
        gameCtx.lineWidth = 4;
        gameCtx.strokeRect(barX, barY, barWidth, barHeight);
        // Заполненная часть
        let hpPercent = boss.health / boss.maxHealth;
        let filledHeight = barHeight * hpPercent;
        gameCtx.fillStyle = '#ff5555';
        gameCtx.fillRect(barX, barY + (barHeight - filledHeight), barWidth, filledHeight);
        // Текст HP
        gameCtx.fillStyle = '#fff';
        gameCtx.font = '18px Arial';
        gameCtx.save();
        gameCtx.translate(barX + barWidth/2, barY + barHeight + 30);
        gameCtx.rotate(-Math.PI/2);
        gameCtx.textAlign = 'center';
        gameCtx.fillText(`HP БОССА`, 0, 0);
        gameCtx.restore();

        // Счёт
        gameCtx.fillStyle = '#fff';
        gameCtx.font = '20px Arial';
        gameCtx.fillText(`Счёт: ${score}`, 10, 60);

        requestAnimationFrame(bossFightLoop);
    }

    // Запуск мини-игры
    bossFightLoop();
}

function openArtifactAltar() {
    const artifactsPool = ["Сила клика", "Автоматический доход", "Максимальное счастье"];
    const randomArtifact = artifactsPool[Math.floor(Math.random() * artifactsPool.length)];

    state.artifacts.push(randomArtifact);

    alert(`Вы получили артефакт: ${randomArtifact}`);
    applyArtifactEffect(randomArtifact);
}

function applyArtifactEffect(artifact) {
    switch (artifact) {
        case "Сила клика":
            state.clickPower += 10;
            break;
        case "Автоматический доход":
            state.autoIncome += 5;
            break;
        case "Максимальное счастье":
            state.happiness = 100;
            break;
    }
}

function changeLocation(newLocation) {
    const costs = { park: 500, shop: 1000 };
    if (newLocation === 'strange') {
        if (state.hasKey) {
            state.strangeLocationUnlocked = true;
            state.location = 'strange';
            playSound('enterSound');
            alert("Вы вошли в странную локацию...");
        } else {
            playSound('errorSound');
            alert("У вас нет ключа для этой локации!");
        }
    } else if (state.location === 'home' && newLocation !== 'home') {
        if (state.coins >= costs[newLocation]) {
            state.coins -= costs[newLocation];
            state.location = newLocation;
            playSound('enterSound');
        } else {
            playSound('errorSound');
            alert("Недостаточно монет!");
        }
    } else {
        state.location = newLocation;
        playSound('enterSound');
    }
}

function showMenu() {
    const shopModal = document.getElementById('menuModal');
    shopModal.innerHTML = `
        <div>Магазин</div>
        ${state.items.goldenFloppa ? '' : `<button onclick="buyItem('goldenFloppa')">Купить Золотую Флоппу (5000 монет)</button><br>`}
        ${state.items.megaClicker ? '' : `<button onclick="buyItem('megaClicker')">Купить Мега-Кликер (10000 монет)</button><br>`}
        ${state.items.happinessBooster ? '' : `<button onclick="buyItem('happinessBooster')">Купить Усилитель Счастья (7500 монет)</button><br>`}
        ${state.items.maid ? '' : `<button onclick="buyItem('maid')">Нанять горничную (50000 монет)</button><br>`}
        ${state.items.poorClicker ? '' : `<button onclick="buyItem('poorClicker')">Купить бедный-Кликер (100 монет)</button><br>`}
        <button onclick="buyFood()">Купить еду (50 монет)</button><br>
        <button onclick="closeMenu()">Закрыть магазин</button>
    `;
    shopModal.style.display = 'block';
}

function showLocationMenu() {
    const locationModal = document.getElementById('locationModal');
    locationModal.innerHTML = `
        <div>Выберите локацию</div>
        <button onclick="changeLocation('home')">Дом</button><br>
        <button onclick="changeLocation('park')" ${state.coins < 500 ? 'disabled' : ''}>Парк (500 монет)</button><br>
        <button onclick="changeLocation('shop')" ${state.coins < 1000 ? 'disabled' : ''}>Магазин (1000 монет)</button><br>
        <button onclick="changeLocation('strange')" ${!state.hasKey ? 'disabled' : ''}>
            Странная Локация ${!state.hasKey ? '(Требуется ключ)' : ''}
        </button><br>
        <button onclick="closeLocationMenu()">Закрыть меню локаций</button>
    `;
    locationModal.style.display = 'block';
}

function closeLocationMenu() {
    document.getElementById('locationModal').style.display = 'none';
}

function changeLocation(newLocation) {
    const costs = { park: 500, shop: 1000 };
    if (newLocation === 'strange') {
        if (state.hasKey) {
            state.strangeLocationUnlocked = true;
            state.location = 'strange';
            playSound('enterSound');
            alert("Вы вошли в странную локацию...");
            enterStrangeLocation(); // Запускаем события странной локации
        } else {
            playSound('errorSound');
            alert("У вас нет ключа для этой локации!");
        }
    } else if (state.location === 'home' && newLocation !== 'home') {
        if (state.coins >= costs[newLocation]) {
            state.coins -= costs[newLocation];
            state.location = newLocation;
            playSound('enterSound');
        } else {
            playSound('errorSound');
            alert("Недостаточно монет!");
        }
    } else {
        state.location = newLocation;
        playSound('enterSound');
    }
}

function buyItem(itemName) {
    const itemCosts = {
        goldenFloppa: 5000,
        megaClicker: 10000,
        happinessBooster: 7500,
        maid: 50000,
        poorClicker: 100
    };

    if (state.coins >= itemCosts[itemName] && !state.items[itemName]) {
        state.coins -= itemCosts[itemName];
        state.items[itemName] = true;
        playSound('buySound');

        switch (itemName) {
            case 'goldenFloppa':
                state.clickPower += 5;

                break;
            case 'megaClicker':
                state.autoIncome += 5;

                break;
            case 'happinessBooster':
                state.happiness = Math.min(100, state.happiness + 20);

                break;
            case 'maid':

                break;
            case 'poorClicker':
                state.autoIncome += 2;
                break;
        }
        closeMenu();
    } else {
        playSound('errorSound');
        alert("Недостаточно монет или предмет уже куплен!");
    }
}

function buyFood() {
    if (state.coins >= 50) {
        state.coins -= 50;
        state.hunger = Math.min(100, state.hunger + 25);
        playSound('buySound');
        alert("Шлепа накормлена!");
    } else {
        playSound('errorSound');
        alert("Недостаточно монет!");
    }
}

function gameLoop() {
    draw();
    
    const now = Date.now();
    const delta = (now - state.lastTick) / 1000;
    
    state.coins += state.autoIncome * (state.happiness / 100) * delta;
    
    if (state.happiness > 0 && Math.random() < 0.005) {
        state.happiness = Math.max(0, state.happiness - 1);
    }
    
    if (!state.items.maid) {
        if (state.hunger > 0) {
            state.hunger = Math.max(0, state.hunger - 0.05 * delta);
        } else {
            alert("Шлепа умерла от голода! Игра перезапущена.");
            location.reload();
        }
    }
    playSound("home")
    state.lastTick = now;
    updateUI();
    requestAnimationFrame(gameLoop);
}

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x > canvas.width/2 - 75 && x < canvas.width/2 + 75 &&
        y > canvas.height/2 - 75 && y < canvas.height/2 + 75) {
        state.coins += state.clickPower * (state.happiness / 100);
        state.happiness = Math.min(100, state.happiness + 5);
        state.floppaState = 'happy';
        playSound("clickfloppa")

        // Key drop logic
        if (!state.hasKey && Math.random() < 50) { // 0.01% chance
            state.hasKey = true;
            alert("Вы нашли редкий ключ! Используйте его, чтобы открыть странную локацию.");
        }

        setTimeout(() => state.floppaState = 'idle', 500);
    }

    if (state.location === 'artifact') {
        // Проверка нажатия на артефакт
        for (let i = 0; i < 3; i++) {
            let bx = canvas.width/2 - 250 + i*200;
            let by = 200;
            if (x > bx && x < bx+150 && y > by && y < by+150) {
                if (Math.random() < 0.5) {
                    const artifactsPool = ["Сила клика", "Автоматический доход", "Максимальное счастье"];
                    const artifact = artifactsPool[i];
                    if (!state.artifacts.includes(artifact)) {
                        state.artifacts.push(artifact);
                        applyArtifactEffect(artifact);
                        alert(`Вы получили артефакт: ${artifact}`);
                    } else {
                        alert('Этот артефакт у вас уже есть!');
                    }
                } else {
                    alert('Не повезло! Вас отправили домой.');
                }
                state.location = 'home';
                draw();
                return;
            }
        }
        // Проверка нажатия на табличку домой
        let bx = canvas.width/2 - 75;
        let by = 400;
        if (x > bx && x < bx+150 && y > by && y < by+80) {
            state.location = 'home';
            draw();
            return;
        }
    }
});

function closeMenu() {
    const shopModal = document.getElementById('menuModal');
    if (shopModal) shopModal.style.display = 'none';
}

updateUI();
gameLoop();