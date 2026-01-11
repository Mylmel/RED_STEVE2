(function loadCustomBackground() {
  const bgImage = new Image();
  bgImage.src = '/src/Background.png';
  
  bgImage.onload = function() {
    const overlay = document.getElementById('custom-background-overlay');
    if (overlay) {
      overlay.style.cssText = `
        display: block;
        background-image: url('${bgImage.src}');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        opacity: 0.25;
        filter: sepia(1) hue-rotate(-30deg) saturate(3) contrast(1.2);
        mix-blend-mode: multiply;
      `;
      console.log('Custom background loaded successfully');
    }
  };
  
  bgImage.onerror = function() {
    console.log('Custom background not found, using default');
    const overlay = document.getElementById('custom-background-overlay');
    if (overlay) {
      overlay.style.cssText = `
        display: block;
        background: linear-gradient(45deg, #110000 25%, #220000 25%, #220000 50%, #110000 50%, #110000 75%, #220000 75%);
        background-size: 100px 100px;
        opacity: 0.3;
      `;
    }
  };
})();

// afk-system.js - ULTIMATE TERROR SYSTEM
(function() {
    'use strict';
    
    console.log('%c███████╗██╗  ██╗████████╗███████╗██████╗ ██╗   ██╗', 'color: #ff0000; font-weight: bold');
    console.log('%c██╔════╝╚██╗██╔╝╚══██╔══╝██╔════╝██╔══██╗╚██╗ ██╔╝', 'color: #ff0000; font-weight: bold');
    console.log('%c█████╗   ╚███╔╝    ██║   █████╗  ██████╔╝ ╚████╔╝ ', 'color: #ff0000; font-weight: bold');
    console.log('%c██╔══╝   ██╔██╗    ██║   ██╔══╝  ██╔══██╗  ╚██╔╝  ', 'color: #ff0000; font-weight: bold');
    console.log('%c███████╗██╔╝ ██╗   ██║   ███████╗██║  ██║   ██║   ', 'color: #ff0000; font-weight: bold');
    console.log('%c╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝   ╚═╝   ', 'color: #ff0000; font-weight: bold');
    console.log('%c                                                   ', 'color: #ff0000; font-weight: bold');
    console.log('%c      EXTREME TERROR SYSTEM v2.0 - LOADING...      ', 'color: #ff0000; font-size: 18px; font-weight: bold');
    
    class ExtremeTerrorSystem {
        constructor() {
            // НАСТРОЙКИ УЖАСА
            this.config = {
                baseAFKTime: 30 * 60 * 1000, // 30 минут
                minAFKTime: 10 * 60 * 1000,  // 10 минут минимум
                maxAFKTime: 60 * 60 * 1000,  // 60 минут максимум
                monsterVisibleTime: 2500,    // 2.5 секунды
                warningDuration: 8000,       // 8 секунд предупреждения
                bloodChance: 0.7,            // 70% шанс крови
                chaseChance: 0.4,            // 40% шанс преследования
                soundVolume: 0.15,           // Громкость звуков
                enableConsoleTerror: true,   // Террор в консоли
                enableScreenEffects: true,   // Эффекты на экране
                enableRandomEvents: true     // Случайные события
            };
            
            // СТАТУСЫ
            this.status = {
                isActive: true,
                isMonsterVisible: false,
                isWarningActive: false,
                isPaused: false,
                isPlayerWarned: false,
                monsterAppearances: 0,
                lastActivity: Date.now(),
                currentPhase: 0,
                terrorLevel: 1
            };
            
            // ТАЙМЕРЫ
            this.timers = {
                afk: null,
                warning: null,
                monster: null,
                randomEvents: null,
                heartbeat: null
            };
            
            // ДАННЫЕ
            this.pattern64x64 = this.cleanPattern([
                "0000000000000000000000000000000000000000000000000000000000000000",
                "0000000000000000000000000111111111000000000000000000000000000000",
                "0000000000000000000000001111111111111000000000000000000000000000",
                "0000000000000000000000011111111111111110000000000000000000000000",
                "0000000000000000000000011111111111111111000000000000000000000000",
                "0000000000000000000000011222222111111111110000000000000000000000",
                "0000000000000000000000111222222111222111110000000000000000000000",
                "0000000000000000000000111222222111222111111000000000000000000000",
                "0000000000000000000001111222222111222111111000000000000000000000",
                "0000000000000000000001111222222111222111111000000000000000000000",
                "0000000000000000000001111222222111222111111000000000000000000000",
                "0000000000000000000001111222222111222111111000000000000000000000",
                "0000000000000000000001111222211111221111111000000000000000000000",
                "0000000000000000000001111222111111221111111000000000000000000000",
                "0000000000000000000000111221111111211111111000000000000000000000",
                "0000000000000000000000112211111111111211110000000000000000000000",
                "0000000000000000000000112111111111111211110000000000000000000000",
                "0000000000000000000000121111111111111111110000000000000000000000",
                "0000000000000000000000011111111111111111100000000000000000000000",
                "0000000000000000000000001111111111111121100000000000000000000000",
                "0000000000000000000000000111111111111121200000000000000000000000",
                "0000000000000000000000000000111111111110000000000000000000000000",
                "0000000000000000000020000000111111111000000000000000000000000000",
                "0000000000000000000000000000111111111110000020000000000000000000",
                "0000000000000000000000000001111111111111000000000000000000000000",
                "0000000000000000000000000011111111111111000000000000000000000000",
                "0000000000000000000000000011111111111111100000000000000000000000",
                "0000000000000000002200000111111111111111100000000000000000000000",
                "0000000000000000000000000111111111111111100000000000000000000000",
                "0000000000000000000000000111111111111111100000000000000000000000",
                "0000000000000000000000000111111111111111100000200000000000000000",
                "0000000000000000000000001111111111111111100000000000000000000000",
                "0000000000000000000000001111111111111111100000000000000000000000",
                "0000000000000000000000011111111111111111110000000000000000000000",
                "0000000000000000000000011111111111111111110000000000000000000000",
                "0000000000000000000000111111111111111111110000000000000000000000",
                "0000000000000000000000111111111111111111110000000000000000000000",
                "0000000000000000000001111111111111111111111000000000000000000000",
                "0000000000000000000001111111111111111111111000000000000000000000",
                "0000000000000000000011111111111111111111111000000000000000000000",
                "0000000000000000000011111111111111111111111000000000000000000000",
                "0000000000000000000011111111111111111111111000000000000000000000",
                "0000000000000000000111111111111111111111111000000000000000000000",
                "0000000000000000000111111111111111111111111000000000000000000000",
                "0000000000000000000111111111111111111111111000000000000000000000",
                "0000000000000000000111111111111111111111111000000000000000000000",
                "0000000000000000001111111111111111111111111000000000000000000000",
                "0000000000000000001111111111111111111111111100000000000000000000",
                "0000000000000000001111111111111111111111111100000000000000000000",
                "0000000000000000011111111111111111111111111100000000000000000000",
                "0000000000000000011111111111111111111111111100000000000000000000",
                "0000000000000000111111111111111111111111111100000000000000000000",
                "0000000000000000111111111111111111111111111100000000000000000000",
                "0000000000000001111111111111111111111111111110000000000000000000",
                "0000000000000001111111111111111111111111111110000000000000000000",
                "0000000000000001111111111111111111111111111110000000000000000000",
                "0000000000000001111111111111111111111111111110000000000000000000",
                "0000000000000011111111111111111111111111111110000000000000000000",
                "0000000000000011111111111111111111111111111110000000000000000000",
                "0000000000000111111111111111111111111111111110000000000000000000",
                "0000000000000111111111111111111111111111111110000000000000000000",
                "0000000000000111111111111111111111111111111110000000000000000000",
                "0000000000000111111111111111111111111111111110000000000000000000",
                "0000000000000111111111111111111111111111111110000000000000000000"
            ]);
            
            // ЦВЕТА
            this.colors = {
                '0': 'transparent',
                '1': '#000000',
                '2': '#8B0000'
            };
            
            // УЖАСНЫЕ ФРАЗЫ
            this.phrases = {
                warning: [
                    "IT'S WATCHING YOU",
                    "DON'T LOOK AWAY",
                    "HE SEES EVERYTHING",
                    "THE SHADOWS MOVE",
                    "IT'S GETTING CLOSER",
                    "YOUR SOUL IS MINE",
                    "NO ESCAPE",
                    "FOREVER TRAPPED",
                    "THE VOID CALLS",
                    "DARKNESS CONSUMES"
                ],
                appearance: [
                    "BEHIND YOU",
                    "LOOK UP",
                    "IN THE MIRROR",
                    "UNDER THE BED",
                    "IN THE CORNER",
                    "RIGHT BEHIND",
                    "TOO CLOSE",
                    "ALREADY HERE",
                    "CAN'T HIDE",
                    "FOUND YOU"
                ],
                whisper: [
                    "join us",
                    "let go",
                    "sleep now",
                    "forever",
                    "no escape",
                    "too late",
                    "watching",
                    "waiting",
                    "coming",
                    "found you"
                ]
            };
            
            this.init();
        }
        
        cleanPattern(pattern) {
            return pattern.map(row => row.replace(/\s/g, '').replace(/"/g, ''));
        }
        
        async init() {
            console.log('%c[TERROR] Initializing Extreme Terror System...', 'color: #ff4444');
            
            // Ждем загрузки
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Добавляем стили
            this.injectTerrorStyles();
            
            // Создаем элементы
            this.createTerrorElements();
            
            // Настраиваем отслеживание
            this.setupTracking();
            
            // Запускаем систему
            this.startSystem();
            
            console.log('%c[TERROR] System Active. Terror Level: ' + this.status.terrorLevel, 'color: #ff0000; font-weight: bold');
        }
        
        injectTerrorStyles() {
            const styleId = 'extreme-terror-styles';
            if (document.getElementById(styleId)) return;
            
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                /* ОСНОВНЫЕ СТИЛИ */
                #terror-container {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    pointer-events: none !important;
                    z-index: 2147483647 !important;
                    display: none;
                    overflow: hidden !important;
                }
                
                /* СУЩЕСТВО */
                #terror-entity {
                    position: absolute !important;
                    width: 384px !important;
                    height: 384px !important;
                    image-rendering: pixelated !important;
                    z-index: 2147483646 !important;
                    will-change: transform, opacity;
                }
                
                /* СЕТКА */
                #terror-grid {
                    display: grid !important;
                    grid-template-columns: repeat(64, 6px) !important;
                    grid-template-rows: repeat(64, 6px) !important;
                    width: 384px !important;
                    height: 384px !important;
                    position: relative !important;
                }
                
                /* ПИКСЕЛИ */
                .terror-pixel {
                    width: 6px !important;
                    height: 6px !important;
                    transition: all 0.3s ease !important;
                }
                
                .pixel-black {
                    background: #000000 !important;
                    box-shadow: 
                        inset 0 0 2px rgba(255, 0, 0, 0.5),
                        0 0 3px rgba(0, 0, 0, 0.8) !important;
                }
                
                .pixel-red {
                    background: #8B0000 !important;
                    box-shadow: 
                        0 0 4px rgba(255, 0, 0, 0.7),
                        inset 0 0 2px rgba(255, 255, 255, 0.2) !important;
                }
                
                /* ЭФФЕКТЫ ПИКСЕЛЕЙ */
                .pixel-flicker {
                    animation: pixelFlicker 0.5s infinite !important;
                }
                
                .pixel-pulse {
                    animation: pixelPulse 1.5s infinite !important;
                }
                
                .pixel-bleed {
                    position: relative !important;
                }
                
                .pixel-bleed::after {
                    content: '' !important;
                    position: absolute !important;
                    bottom: -8px !important;
                    left: 50% !important;
                    width: 1px !important;
                    height: 10px !important;
                    background: linear-gradient(to bottom, #ff0000, transparent) !important;
                    transform: translateX(-50%) !important;
                    animation: bloodDrip 2s infinite !important;
                }
                
                /* ПРЕДУПРЕЖДЕНИЕ */
                #terror-warning {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    background: rgba(139, 0, 0, 0.05) !important;
                    display: none !important;
                    z-index: 2147483645 !important;
                    pointer-events: none !important;
                }
                
                /* СООБЩЕНИЯ */
                .terror-msg {
                    position: fixed !important;
                    color: #ff0000 !important;
                    font-family: 'Courier New', monospace !important;
                    font-size: 18px !important;
                    font-weight: bold !important;
                    text-shadow: 
                        0 0 5px #000,
                        0 0 10px #ff0000,
                        0 0 15px #ff0000 !important;
                    z-index: 2147483647 !important;
                    opacity: 0;
                    pointer-events: none !important;
                    white-space: nowrap !important;
                }
                
                /* КРОВЬ НА ЭКРАНЕ */
                #blood-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    background-image: 
                        radial-gradient(circle at 20% 30%, rgba(255, 0, 0, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 80% 70%, rgba(255, 0, 0, 0.08) 0%, transparent 50%) !important;
                    display: none !important;
                    z-index: 2147483644 !important;
                    pointer-events: none !important;
                    mix-blend-mode: multiply !important;
                }
                
                /* ЭФФЕКТ ДРОЖАНИЯ */
                .screen-shake {
                    animation: screenShake 0.5s linear !important;
                }
                
                /* АНИМАЦИИ */
                @keyframes pixelFlicker {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                
                @keyframes pixelPulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                }
                
                @keyframes bloodDrip {
                    0% { height: 0px; opacity: 0; }
                    50% { height: 12px; opacity: 1; }
                    100% { height: 0px; opacity: 0; }
                }
                
                @keyframes screenShake {
                    0%, 100% { transform: translate(0, 0) rotate(0); }
                    10% { transform: translate(-3px, -3px) rotate(-0.5deg); }
                    20% { transform: translate(3px, 2px) rotate(0.5deg); }
                    30% { transform: translate(-2px, 3px) rotate(-0.3deg); }
                    40% { transform: translate(2px, -2px) rotate(0.3deg); }
                    50% { transform: translate(-1px, 2px) rotate(-0.2deg); }
                    60% { transform: translate(1px, -1px) rotate(0.2deg); }
                    70% { transform: translate(-1px, 1px) rotate(-0.1deg); }
                    80% { transform: translate(1px, -1px) rotate(0.1deg); }
                    90% { transform: translate(0, 1px) rotate(0); }
                }
                
                @keyframes entityAppear {
                    0% { 
                        opacity: 0;
                        transform: scale(0.1) rotate(0deg) translateY(100px);
                        filter: blur(20px) brightness(0) hue-rotate(0deg);
                    }
                    25% {
                        opacity: 0.8;
                        transform: scale(1.2) rotate(180deg) translateY(-20px);
                        filter: blur(10px) brightness(2) hue-rotate(180deg);
                    }
                    50% {
                        opacity: 0.6;
                        transform: scale(0.9) rotate(360deg) translateY(10px);
                        filter: blur(5px) brightness(1.5) hue-rotate(360deg);
                    }
                    75% {
                        opacity: 0.9;
                        transform: scale(1.1) rotate(540deg) translateY(-5px);
                        filter: blur(2px) brightness(1.8) hue-rotate(540deg);
                    }
                    100% { 
                        opacity: 1;
                        transform: scale(1) rotate(720deg) translateY(0);
                        filter: blur(0) brightness(1) hue-rotate(720deg);
                    }
                }
                
                @keyframes entityFloat {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    25% { transform: translateY(-10px) rotate(-1deg); }
                    50% { transform: translateY(5px) rotate(0.5deg); }
                    75% { transform: translateY(-5px) rotate(1deg); }
                }
                
                @keyframes entityPulse {
                    0%, 100% { filter: drop-shadow(0 0 10px rgba(255, 0, 0, 0.7)); }
                    50% { filter: drop-shadow(0 0 20px rgba(255, 0, 0, 0.9)); }
                }
                
                @keyframes warningFlash {
                    0%, 100% { opacity: 0.05; }
                    50% { opacity: 0.15; }
                }
                
                @keyframes msgAppear {
                    0% { opacity: 0; transform: translateY(-20px) scale(0.8); }
                    20% { opacity: 1; transform: translateY(0) scale(1); }
                    80% { opacity: 1; transform: translateY(0) scale(1); }
                    100% { opacity: 0; transform: translateY(20px) scale(1.2); }
                }
                
                @keyframes bloodExpand {
                    0% { opacity: 0; transform: scale(0.5); }
                    100% { opacity: 0.3; transform: scale(1); }
                }
            `;
            
            document.head.appendChild(style);
        }
        
        createTerrorElements() {
            // Удаляем старые элементы если есть
            this.removeTerrorElements();
            
            // СОЗДАЕМ КОНТЕЙНЕР
            const container = document.createElement('div');
            container.id = 'terror-container';
            
            // СОЗДАЕМ СУЩЕСТВО
            const entity = document.createElement('div');
            entity.id = 'terror-entity';
            
            // СОЗДАЕМ СЕТКУ
            const grid = document.createElement('div');
            grid.id = 'terror-grid';
            
            // ЗАПОЛНЯЕМ СЕТКУ
            for (let y = 0; y < this.pattern64x64.length; y++) {
                const row = this.pattern64x64[y];
                for (let x = 0; x < row.length; x++) {
                    const pixel = document.createElement('div');
                    const value = row[x];
                    
                    pixel.className = 'terror-pixel';
                    
                    if (value === '1') {
                        pixel.classList.add('pixel-black');
                        if (Math.random() > 0.5) pixel.classList.add('pixel-flicker');
                    } 
                    else if (value === '2') {
                        pixel.classList.add('pixel-red');
                        pixel.classList.add('pixel-pulse');
                        if (Math.random() > 0.7) pixel.classList.add('pixel-bleed');
                    }
                    
                    grid.appendChild(pixel);
                }
            }
            
            // ПРЕДУПРЕЖДЕНИЕ
            const warning = document.createElement('div');
            warning.id = 'terror-warning';
            
            // КРОВЬ
            const blood = document.createElement('div');
            blood.id = 'blood-overlay';
            
            // СОБИРАЕМ
            entity.appendChild(grid);
            container.appendChild(entity);
            container.appendChild(warning);
            container.appendChild(blood);
            document.body.appendChild(container);
            
            console.log('%c[TERROR] Elements created successfully', 'color: #ff4444');
        }
        
        removeTerrorElements() {
            const ids = ['terror-container', 'terror-old-container', 'ancient-terror-container'];
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.remove();
            });
        }
        
        setupTracking() {
            // СОБЫТИЯ АКТИВНОСТИ
            const events = [
                'mousedown', 'mousemove', 'click', 'dblclick',
                'keydown', 'keyup', 'keypress',
                'touchstart', 'touchend', 'touchmove',
                'wheel', 'scroll'
            ];
            
            const resetActivity = () => {
                this.status.lastActivity = Date.now();
                
                if (this.timers.afk) {
                    clearTimeout(this.timers.afk);
                }
                
                if (this.status.isWarningActive) {
                    this.hideWarning();
                }
                
                if (this.status.isMonsterVisible) {
                    this.hideMonster(true);
                }
                
                this.status.isPlayerWarned = false;
                this.startAFKTimer();
            };
            
            events.forEach(event => {
                window.addEventListener(event, resetActivity, { 
                    passive: true,
                    capture: true 
                });
            });
            
            // ОТСЛЕЖИВАНИЕ ПАУЗЫ
            this.setupPauseDetection();
            
            // СЛУЧАЙНЫЕ СОБЫТИЯ
            if (this.config.enableRandomEvents) {
                this.startRandomEvents();
            }
            
            console.log('%c[TERROR] Activity tracking enabled', 'color: #ff4444');
        }
        
        setupPauseDetection() {
            const checkPause = () => {
                const menus = ['pause-menu', 'settings-menu', 'main-menu'];
                let isAnyMenuVisible = false;
                
                menus.forEach(menuId => {
                    const menu = document.getElementById(menuId);
                    if (menu && menu.style.display !== 'none') {
                        isAnyMenuVisible = true;
                    }
                });
                
                const wasPaused = this.status.isPaused;
                this.status.isPaused = isAnyMenuVisible;
                
                if (!wasPaused && this.status.isPaused) {
                    this.stopAllTimers();
                } else if (wasPaused && !this.status.isPaused) {
                    this.startSystem();
                }
            };
            
            setInterval(checkPause, 1000);
        }
        
        startSystem() {
            if (!this.status.isActive || this.status.isPaused) return;
            
            this.stopAllTimers();
            this.startAFKTimer();
            this.startHeartbeat();
            
            console.log('%c[TERROR] System started', 'color: #00ff00');
        }
        
        startAFKTimer() {
            if (this.status.isPaused) return;
            
            // РАСЧЕТ ВРЕМЕНИ С УЧЕТОМ УРОВНЯ УЖАСА
            const timeMultiplier = Math.max(0.3, 1 / Math.sqrt(this.status.terrorLevel));
            const randomTime = this.config.minAFKTime + 
                Math.random() * (this.config.maxAFKTime - this.config.minAFKTime);
            
            const finalTime = randomTime * timeMultiplier;
            
            console.log(`%c[TERROR] Next appearance in ${Math.round(finalTime/1000)} seconds`, 'color: #ff8800');
            
            this.timers.afk = setTimeout(() => {
                this.startWarningSequence();
            }, finalTime);
        }
        
        startWarningSequence() {
            if (this.status.isPaused || this.status.isWarningActive) return;
            
            console.log('%c[TERROR] WARNING SEQUENCE STARTED', 'color: #ff0000; font-weight: bold');
            
            this.status.isWarningActive = true;
            this.status.isPlayerWarned = true;
            
            // ПОКАЗЫВАЕМ ПРЕДУПРЕЖДЕНИЕ
            const warning = document.getElementById('terror-warning');
            if (warning) {
                warning.style.display = 'block';
                warning.style.animation = 'warningFlash 1s infinite';
            }
            
            // СЛУЧАЙНЫЕ СООБЩЕНИЯ
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    this.showMessage(
                        this.getRandomPhrase('warning'),
                        Math.random() * window.innerWidth,
                        Math.random() * window.innerHeight
                    );
                    this.playSound('whisper');
                }, i * 1500);
            }
            
            // ЭФФЕКТЫ ЭКРАНА
            this.startScreenEffects();
            
            // ЗВУК СЕРДЦЕБИЕНИЯ
            this.playSound('heartbeat');
            
            // ЗАПУСКАЕМ ТАЙМЕР ПОЯВЛЕНИЯ
            this.timers.warning = setTimeout(() => {
                this.hideWarning();
                this.showMonster();
            }, this.config.warningDuration);
        }
        
        hideWarning() {
            this.status.isWarningActive = false;
            
            const warning = document.getElementById('terror-warning');
            if (warning) {
                warning.style.display = 'none';
                warning.style.animation = '';
            }
            
            if (this.timers.warning) {
                clearTimeout(this.timers.warning);
                this.timers.warning = null;
            }
        }
        
        showMonster() {
            if (this.status.isPaused || this.status.isMonsterVisible) return;
            
            console.log('%c[TERROR] MONSTER APPEARING!', 'color: #ff0000; font-size: 16px; font-weight: bold');
            
            this.status.isMonsterVisible = true;
            this.status.monsterAppearances++;
            this.status.terrorLevel++;
            
            const container = document.getElementById('terror-container');
            const entity = document.getElementById('terror-entity');
            
            if (!container || !entity) {
                console.error('%c[TERROR] Elements not found!', 'color: #ff0000');
                return;
            }
            
            // ПОЗИЦИЯ
            const isSurprise = Math.random() > 0.7;
            let posX, posY;
            
            if (isSurprise) {
                // ПРЯМО В ЦЕНТРЕ
                posX = window.innerWidth / 2 - 192;
                posY = window.innerHeight / 2 - 192;
            } else {
                // СЛУЧАЙНАЯ ПОЗИЦИЯ
                posX = Math.random() * (window.innerWidth - 384);
                posY = Math.random() * (window.innerHeight - 384);
            }
            
            entity.style.left = `${posX}px`;
            entity.style.top = `${posY}px`;
            
            // АНИМАЦИИ
            entity.style.animation = `
                entityAppear 1s ease-out,
                entityFloat 4s ease-in-out infinite,
                entityPulse 2s infinite
            `;
            
            // ПОКАЗЫВАЕМ
            container.style.display = 'block';
            
            // ЭФФЕКТЫ
            this.shakeScreen();
            this.showMessage(
                this.getRandomPhrase('appearance'),
                posX + 192,
                posY - 30
            );
            
            // КРОВЬ
            if (Math.random() < this.config.bloodChance) {
                this.showBlood();
            }
            
            // ЗВУКИ
            this.playSound('appear');
            setTimeout(() => this.playSound('roar'), 300);
            
            // ПРЕСЛЕДОВАНИЕ
            if (Math.random() < this.config.chaseChance) {
                this.startChasing();
            }
            
            // ТАЙМЕР ИСЧЕЗНОВЕНИЯ
            this.timers.monster = setTimeout(() => {
                this.hideMonster();
            }, this.config.monsterVisibleTime);
        }
        
        hideMonster(instant = false) {
            if (!this.status.isMonsterVisible) return;
            
            console.log('%c[TERROR] Monster hiding...', 'color: #ff4444');
            
            this.status.isMonsterVisible = false;
            
            const container = document.getElementById('terror-container');
            const entity = document.getElementById('terror-entity');
            const blood = document.getElementById('blood-overlay');
            
            if (!container || !entity) return;
            
            if (instant) {
                container.style.display = 'none';
                if (blood) blood.style.display = 'none';
            } else {
                entity.style.animation = 'entityAppear 0.5s ease-out reverse forwards';
                
                setTimeout(() => {
                    container.style.display = 'none';
                    entity.style.animation = '';
                    if (blood) blood.style.display = 'none';
                    
                    this.playSound('disappear');
                    this.startAFKTimer();
                    
                }, 500);
            }
            
            // ОЧИСТКА ТАЙМЕРОВ
            if (this.timers.monster) {
                clearTimeout(this.timers.monster);
                this.timers.monster = null;
            }
        }
        
        startChasing() {
            const entity = document.getElementById('terror-entity');
            if (!entity) return;
            
            const chaseDuration = 1500;
            const startTime = Date.now();
            
            const chase = () => {
                if (!this.status.isMonsterVisible || Date.now() - startTime > chaseDuration) {
                    return;
                }
                
                const mouseX = this.lastMouseX || window.innerWidth / 2;
                const mouseY = this.lastMouseY || window.innerHeight / 2;
                
                const targetX = mouseX - 192;
                const targetY = mouseY - 192;
                
                const currentX = parseFloat(entity.style.left) || 0;
                const currentY = parseFloat(entity.style.top) || 0;
                
                const newX = currentX + (targetX - currentX) * 0.3;
                const newY = currentY + (targetY - currentY) * 0.3;
                
                entity.style.left = `${newX}px`;
                entity.style.top = `${newY}px`;
                
                requestAnimationFrame(chase);
            };
            
            // ОТСЛЕЖИВАНИЕ МЫШИ
            const trackMouse = (e) => {
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            };
            
            window.addEventListener('mousemove', trackMouse);
            
            // ЗАПУСК ПРЕСЛЕДОВАНИЯ
            chase();
            
            // ОСТАНОВКА
            setTimeout(() => {
                window.removeEventListener('mousemove', trackMouse);
            }, chaseDuration);
        }
        
        showMessage(text, x, y) {
            const msg = document.createElement('div');
            msg.className = 'terror-msg';
            msg.textContent = text;
            msg.style.left = `${x}px`;
            msg.style.top = `${y}px`;
            msg.style.animation = 'msgAppear 3s ease-out forwards';
            
            document.body.appendChild(msg);
            
            setTimeout(() => {
                if (msg.parentNode) {
                    msg.parentNode.removeChild(msg);
                }
            }, 3000);
        }
        
        showBlood() {
            const blood = document.getElementById('blood-overlay');
            if (blood) {
                blood.style.display = 'block';
                blood.style.animation = 'bloodExpand 0.5s ease-out forwards';
                
                setTimeout(() => {
                    blood.style.animation = '';
                }, 500);
            }
        }
        
        shakeScreen() {
            document.body.classList.add('screen-shake');
            
            setTimeout(() => {
                document.body.classList.remove('screen-shake');
            }, 500);
        }
        
        startScreenEffects() {
            if (!this.config.enableScreenEffects) return;
            
            const effects = ['hue-rotate', 'contrast', 'brightness', 'invert'];
            let effectCount = 0;
            
            const applyEffect = () => {
                if (!this.status.isWarningActive || effectCount > 15) return;
                
                const effect = effects[Math.floor(Math.random() * effects.length)];
                let value = '';
                
                switch(effect) {
                    case 'hue-rotate': value = `${Math.random() * 360}deg`; break;
                    case 'contrast': value = `${0.5 + Math.random()}`; break;
                    case 'brightness': value = `${0.7 + Math.random() * 0.6}`; break;
                    case 'invert': value = Math.random() > 0.5 ? '1' : '0'; break;
                }
                
                document.body.style.filter = `${effect}(${value})`;
                effectCount++;
                
                setTimeout(() => {
                    document.body.style.filter = '';
                    setTimeout(applyEffect, 100 + Math.random() * 400);
                }, 50);
            };
            
            applyEffect();
        }
        
        startRandomEvents() {
            if (!this.config.enableRandomEvents) return;
            
            this.timers.randomEvents = setInterval(() => {
                if (this.status.isPaused || this.status.isMonsterVisible || this.status.isWarningActive) {
                    return;
                }
                
                // МАЛЕНЬКИЙ ШАНС НА СЛУЧАЙНОЕ СОБЫТИЕ
                if (Math.random() > 0.997) {
                    this.showMessage(this.getRandomPhrase('whisper'), 
                        Math.random() * window.innerWidth,
                        Math.random() * window.innerHeight
                    );
                    this.playSound('whisper');
                }
                
                // ШАНС НА ТИХИЙ ЗВУК
                if (Math.random() > 0.998) {
                    this.playSound('quiet');
                }
                
            }, 3000);
        }
        
        startHeartbeat() {
            if (this.timers.heartbeat) {
                clearInterval(this.timers.heartbeat);
            }
            
            this.timers.heartbeat = setInterval(() => {
                if (this.status.isWarningActive && !this.status.isMonsterVisible) {
                    this.playSound('heartbeat');
                }
            }, 2000);
        }
        
        playSound(type) {
            try {
                if (!window.AudioContext && !window.webkitAudioContext) {
                    return;
                }
                
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const volume = this.config.soundVolume;
                
                switch(type) {
                    case 'whisper':
                        this.createWhisperSound(audioContext, volume * 0.5);
                        break;
                    case 'heartbeat':
                        this.createHeartbeatSound(audioContext, volume * 0.3);
                        break;
                    case 'appear':
                        this.createAppearSound(audioContext, volume);
                        break;
                    case 'roar':
                        this.createRoarSound(audioContext, volume * 0.8);
                        break;
                    case 'disappear':
                        this.createDisappearSound(audioContext, volume * 0.6);
                        break;
                    case 'quiet':
                        this.createQuietSound(audioContext, volume * 0.2);
                        break;
                }
            } catch (error) {
                // Игнорируем ошибки аудио
            }
        }
        
        createWhisperSound(ctx, volume) {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 1.5);
            
            gainNode.gain.setValueAtTime(volume, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
            
            oscillator.start();
            oscillator.stop(ctx.currentTime + 1.5);
        }
        
        createHeartbeatSound(ctx, volume) {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.type = 'sine';
            
            // ДВА УДАРА СЕРДЦА
            oscillator.frequency.setValueAtTime(100, ctx.currentTime);
            setTimeout(() => {
                oscillator.frequency.setValueAtTime(80, ctx.currentTime + 0.1);
            }, 100);
            
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
            
            setTimeout(() => {
                gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.3);
                gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.35);
                gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
            }, 300);
            
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.5);
        }
        
        createAppearSound(ctx, volume) {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(60, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 2);
            
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.5);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
            
            oscillator.start();
            oscillator.stop(ctx.currentTime + 2);
        }
        
        createRoarSound(ctx, volume) {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(150, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 1);
            
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
            
            oscillator.start();
            oscillator.stop(ctx.currentTime + 1);
        }
        
        createDisappearSound(ctx, volume) {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(500, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 1);
            
            gainNode.gain.setValueAtTime(volume, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
            
            oscillator.start();
            oscillator.stop(ctx.currentTime + 1);
        }
        
        createQuietSound(ctx, volume) {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);
            
            gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.5);
        }
        
        getRandomPhrase(type) {
            const phrases = this.phrases[type] || this.phrases.warning;
            return phrases[Math.floor(Math.random() * phrases.length)];
        }
        
        stopAllTimers() {
            Object.values(this.timers).forEach(timer => {
                if (timer) {
                    if (typeof timer === 'number') {
                        clearTimeout(timer);
                    } else if (typeof timer === 'object' && timer.clear) {
                        timer.clear();
                    }
                }
            });
            
            this.timers = {
                afk: null,
                warning: null,
                monster: null,
                randomEvents: null,
                heartbeat: null
            };
        }
        
        // ПУБЛИЧНЫЕ МЕТОДЫ ДЛЯ ОТЛАДКИ
        forceAppearance() {
            console.log('%c[TERROR] FORCING MONSTER APPEARANCE', 'color: #ff0000; font-weight: bold');
            this.showMonster();
        }
        
        resetSystem() {
            console.log('%c[TERROR] Resetting system...', 'color: #ff4444');
            this.hideMonster(true);
            this.hideWarning();
            this.stopAllTimers();
            this.status.monsterAppearances = 0;
            this.status.terrorLevel = 1;
            this.startSystem();
        }
        
        setTerrorLevel(level) {
            this.status.terrorLevel = Math.max(1, Math.min(10, level));
            console.log(`%c[TERROR] Terror level set to: ${this.status.terrorLevel}`, 'color: #ff4444');
        }
    }
    
    // ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ
    let terrorSystem = null;
    
    window.addEventListener('load', () => {
        console.log('%c[TERROR] Page loaded, starting terror system...', 'color: #ff4444');
        
        // ЖДЕМ 3 СЕКУНДЫ ПЕРЕД ЗАПУСКОМ
        setTimeout(() => {
            terrorSystem = new ExtremeTerrorSystem();
            window.TerrorSystem = terrorSystem; // ДЛЯ ОТЛАДКИ
            
            // ASCII АРТ
            console.log('%c', 'color: #ff0000');
            console.log('%c╔══════════════════════════════════════════════════════════════╗', 'color: #ff0000');
            console.log('%c║                                                              ║', 'color: #ff0000');
            console.log('%c║   ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄        ║', 'color: #ff0000');
            console.log('%c║  ▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌       ║', 'color: #ff0000');
            console.log('%c║  ▐░█▀▀▀▀▀▀▀▀▀ ▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀▀▀ ▐░█▀▀▀▀▀▀▀█░▌       ║', 'color: #ff0000');
            console.log('%c║  ▐░▌          ▐░▌       ▐░▌▐░▌          ▐░▌       ▐░▌       ║', 'color: #ff0000');
            console.log('%c║  ▐░▌ ▄▄▄▄▄▄▄▄ ▐░█▄▄▄▄▄▄▄█░▌▐░▌ ▄▄▄▄▄▄▄▄ ▐░█▄▄▄▄▄▄▄█░▌       ║', 'color: #ff0000');
            console.log('%c║  ▐░▌▐░░░░░░░░▌▐░░░░░░░░░░░▌▐░▌▐░░░░░░░░▌▐░░░░░░░░░░░▌       ║', 'color: #ff0000');
            console.log('%c║  ▐░▌ ▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀█░▌▐░▌ ▀▀▀▀▀▀█░▌▐░█▀▀▀▀█░█▀▀        ║', 'color: #ff0000');
            console.log('%c║  ▐░▌       ▐░▌▐░▌       ▐░▌▐░▌       ▐░▌▐░▌     ▐░▌         ║', 'color: #ff0000');
            console.log('%c║  ▐░█▄▄▄▄▄▄▄█░▌▐░▌       ▐░▌▐░█▄▄▄▄▄▄▄█░▌▐░▌      ▐░▌        ║', 'color: #ff0000');
            console.log('%c║  ▐░░░░░░░░░░░▌▐░▌       ▐░▌▐░░░░░░░░░░░▌▐░▌       ▐░▌       ║', 'color: #ff0000');
            console.log('%c║   ▀▀▀▀▀▀▀▀▀▀▀  ▀         ▀  ▀▀▀▀▀▀▀▀▀▀▀  ▀         ▀        ║', 'color: #ff0000');
            console.log('%c║                                                              ║', 'color: #ff0000');
            console.log('%c║                    EXTREME TERROR v2.0                       ║', 'color: #ff0000');
            console.log('%c║                   64x64 PATTERN ACTIVE                       ║', 'color: #ff0000');
            console.log('%c╚══════════════════════════════════════════════════════════════╝', 'color: #ff0000');
            console.log('%c', 'color: #ff0000');
            console.log('%c[DEBUG] Commands available:', 'color: #00ff00');
            console.log('%c  TerrorSystem.forceAppearance() - Force monster to appear', 'color: #00ff00');
            console.log('%c  TerrorSystem.resetSystem() - Reset terror system', 'color: #00ff00');
            console.log('%c  TerrorSystem.setTerrorLevel(n) - Set terror level (1-10)', 'color: #00ff00');
            
        }, 3000);
    });
    
    // ОБРАБОТЧИК ОШИБОК
    window.addEventListener('error', (e) => {
        if (e.message && e.message.includes('terror')) {
            console.error('%c[TERROR ERROR]', 'color: #ff0000', e.message);
            e.preventDefault();
        }
    });
    
})();