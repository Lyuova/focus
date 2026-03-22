let timerInterval;
let timeLeft;
let isRunning = false;
let currentMode = 'work'; // work, shortBreak, longBreak
let currentCycle = 1;
let currentProfileIndex = 0;

let stats = { sessionsCompleted: 0, totalWorkMinutes: 0 };

let profiles = [
    { name: "Помодоро", color: "#ff6b6b", work: 25, shortBreak: 5, longBreak: 20, cycles: 4, workUrl: "", breakUrl: "" },
    { name: "Название 2", color: "#74b9ff", work: 45, shortBreak: 10, longBreak: 25, cycles: 3, workUrl: "", breakUrl: "" },
    { name: "Название 3", color: "#a29bfe", work: 60, shortBreak: 15, longBreak: 30, cycles: 2, workUrl: "", breakUrl: "" },
    { name: "Название 4", color: "#fdcb6e", work: 90, shortBreak: 20, longBreak: 40, cycles: 2, workUrl: "", breakUrl: "" },
    { name: "Название 5", color: "#00b894", work: 20, shortBreak: 5, longBreak: 15, cycles: 5, workUrl: "", breakUrl: "" }
];

const defaultMusicPresets = {
    work: [
        { name: "14 Hz Waves", url: "https://youtu.be/oiQyocwHJLA" },
        { name: "18 Hz Beats", url: "https://youtu.be/7P19s9XysQ0" },
        { name: "40 Hz Waves", url: "https://youtu.be/fRcQvO1oKic" },
        { name: "Brown Noise", url: "https://youtu.be/0GDfOAuUvQ0" },
        { name: "Classical Focus", url: "https://youtu.be/LwTv8S5co5Q" }
    ],
    break: [
        { name: "Forest birdsong", url: "https://youtu.be/XxP8kxUn5bc" },
        { name: "Campfire", url: "https://youtu.be/ghvLSUXD5pU" },
        { name: "Waterfall", url: "https://youtu.be/q9x_mHZLpYI" },
        { name: "Rain", url: "https://youtu.be/WT-C3aCWyF4" },
        { name: "Café ambience", url: "https://youtu.be/oGtH8v0qVBc" }
    ]
};

let musicPresets = JSON.parse(localStorage.getItem('pomoMusicPresets')) || defaultMusicPresets;

let playerWork, playerBreak;
let activeVideoIdWork = "", activeVideoIdBreak = "";

window.onload = () => {
    loadData();
    renderTabs();
    setupSliders(); // Инициализация динамических ползунков
    loadProfileIntoUI();
    renderPresets();
    resetTimer();
    updateStatsDisplay();
};

// --- YOUTUBE API --- (без изменений)
function onYouTubeIframeAPIReady() {
    playerWork = new YT.Player('yt-player-work', {
        height: '0', width: '0', playerVars: { 'autoplay': 0, 'controls': 0 },
        events: { 'onStateChange': onPlayerStateChange }
    });
    playerBreak = new YT.Player('yt-player-break', {
        height: '0', width: '0', playerVars: { 'autoplay': 0, 'controls': 0 },
        events: { 'onStateChange': onPlayerStateChange }
    });
}
function onPlayerStateChange(event) { if (event.data === YT.PlayerState.ENDED) event.target.playVideo(); }

function extractVideoID(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function playMusic(mode) {
    if (!playerWork || !playerBreak || typeof playerWork.pauseVideo !== 'function') return;
    let profile = profiles[currentProfileIndex];
    if (mode === 'work') {
        playerBreak.pauseVideo();
        if (profile.workUrl) {
            let vidId = extractVideoID(profile.workUrl);
            if (vidId) {
                if (activeVideoIdWork !== vidId) { playerWork.loadVideoById(vidId); activeVideoIdWork = vidId; } 
                else { playerWork.playVideo(); }
            }
        }
    } else {
        playerWork.pauseVideo();
        if (profile.breakUrl) {
            let vidId = extractVideoID(profile.breakUrl);
            if (vidId) {
                if (activeVideoIdBreak !== vidId) { playerBreak.loadVideoById(vidId); activeVideoIdBreak = vidId; } 
                else { playerBreak.playVideo(); }
            }
        }
    }
}

// --- ПРЕСЕТЫ МУЗЫКИ --- (без изменений)
function renderPresets() {
    const workContainer = document.getElementById('work-presets');
    const breakContainer = document.getElementById('break-presets');
    workContainer.innerHTML = ''; breakContainer.innerHTML = '';
    musicPresets.work.forEach((p, index) => workContainer.appendChild(createPresetChip(p, 'work', index)));
    musicPresets.break.forEach((p, index) => breakContainer.appendChild(createPresetChip(p, 'break', index)));
}

function createPresetChip(preset, type, index) {
    const chip = document.createElement('div');
    chip.className = 'preset-chip';
    
    const textSpan = document.createElement('span');
    textSpan.className = 'preset-name'; textSpan.textContent = preset.name;
    textSpan.onclick = () => document.getElementById(type + '-music').value = preset.url;

    const delSpan = document.createElement('span');
    delSpan.className = 'delete-btn'; delSpan.innerHTML = '&times;'; delSpan.title = "Удалить";
    delSpan.onclick = (e) => {
        e.stopPropagation();
        if(confirm(`Удалить "${preset.name}" из закладок?`)) {
            musicPresets[type].splice(index, 1);
            localStorage.setItem('pomoMusicPresets', JSON.stringify(musicPresets));
            renderPresets();
        }
    };

    chip.appendChild(textSpan); chip.appendChild(delSpan);
    return chip;
}

document.getElementById('add-preset-btn').addEventListener('click', () => {
    const nameInput = document.getElementById('new-preset-name');
    const urlInput = document.getElementById('new-preset-url');
    const type = document.getElementById('new-preset-type').value;

    if (nameInput.value.trim() && urlInput.value.trim()) {
        musicPresets[type].push({ name: nameInput.value.trim(), url: urlInput.value.trim() });
        localStorage.setItem('pomoMusicPresets', JSON.stringify(musicPresets));
        renderPresets();
        nameInput.value = ''; urlInput.value = '';
    } else alert("Пожалуйста, введите название и ссылку на YouTube.");
});


// --- ИНТЕРФЕЙС И ПРОФИЛИ ---
function renderTabs() {
    const tabsContainer = document.getElementById('profile-tabs');
    tabsContainer.innerHTML = '';
    profiles.forEach((p, index) => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${index === currentProfileIndex ? 'active' : ''}`;
        btn.textContent = p.name;
        btn.onclick = () => selectProfile(index);
        tabsContainer.appendChild(btn);
    });
}

function selectProfile(index) {
    if (isRunning && !confirm("Таймер запущен. Сменить профиль и сбросить прогресс?")) return;
    currentProfileIndex = index;
    renderTabs();
    loadProfileIntoUI();
    resetTimer();
    saveData();
}

// Привязываем ползунки к цифрам над ними
function setupSliders() {
    const updateVal = (id) => {
        document.getElementById(id + '-val').textContent = document.getElementById(id).value;
    };
    document.getElementById('work-time').addEventListener('input', () => updateVal('work-time'));
    document.getElementById('short-break').addEventListener('input', () => updateVal('short-break'));
    document.getElementById('long-break').addEventListener('input', () => updateVal('long-break'));
}

function loadProfileIntoUI() {
    let p = profiles[currentProfileIndex];
    document.documentElement.style.setProperty('--theme-color', p.color);
    
    // --- ДОБАВИТЬ ЭТИ ДВЕ СТРОКИ ---
    let textColor = getContrastColor(p.color);
    document.documentElement.style.setProperty('--theme-text-color', textColor);
    // -------------------------------
    
    
    document.getElementById('profile-name').value = p.name;
    document.getElementById('profile-color').value = p.color;
    
    // Устанавливаем ползунки и сразу обновляем текст
    document.getElementById('work-time').value = p.work;
    document.getElementById('work-time-val').textContent = p.work;
    
    document.getElementById('short-break').value = p.shortBreak;
    document.getElementById('short-break-val').textContent = p.shortBreak;
    
    document.getElementById('long-break').value = p.longBreak;
    document.getElementById('long-break-val').textContent = p.longBreak;
    
    // Устанавливаем активную радио-кнопку для циклов
    document.querySelector(`input[name="cycles"][value="${p.cycles}"]`).checked = true;

    document.getElementById('work-music').value = p.workUrl;
    document.getElementById('break-music').value = p.breakUrl;
}

// --- ЛОГИКА ТАЙМЕРА --- (без изменений)
function updateDisplay() {
    let minutes = Math.floor(timeLeft / 60); let seconds = timeLeft % 60;
    document.getElementById('time-left').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    let p = profiles[currentProfileIndex];
    document.getElementById('cycle-text').textContent = `Цикл: ${currentCycle} / ${p.cycles}`;
    let modeText = currentMode === 'work' ? 'Работа' : (currentMode === 'shortBreak' ? 'Перерыв' : 'Большой отдых');
    document.getElementById('mode-text').textContent = modeText;
}

function switchMode() {
    let p = profiles[currentProfileIndex];
    if (currentMode === 'work') {
        stats.totalWorkMinutes += p.work;
        saveData(); updateStatsDisplay();
        if (currentCycle >= p.cycles) { currentMode = 'longBreak'; timeLeft = p.longBreak * 60; stats.sessionsCompleted++; } 
        else { currentMode = 'shortBreak'; timeLeft = p.shortBreak * 60; }
    } else {
        if (currentMode === 'longBreak') {
            currentCycle = 1; pauseTimer();
            alert("Поздравляю, сессия завершена! Готов к новой?");
            currentMode = 'work'; timeLeft = p.work * 60; updateDisplay(); return;
        } else currentCycle++;
        currentMode = 'work'; timeLeft = p.work * 60;
    }
    playMusic(currentMode); updateDisplay(); saveData();
}

function startTimer() {
    if (isRunning) return;
    isRunning = true; playMusic(currentMode);
    timerInterval = setInterval(() => { timeLeft--; if (timeLeft < 0) switchMode(); else updateDisplay(); }, 1000);
}

function pauseTimer() {
    isRunning = false; clearInterval(timerInterval);
    if(playerWork && typeof playerWork.pauseVideo === 'function') playerWork.pauseVideo();
    if(playerBreak && typeof playerBreak.pauseVideo === 'function') playerBreak.pauseVideo();
}

function resetTimer() {
    pauseTimer(); currentMode = 'work'; currentCycle = 1;
    let p = profiles[currentProfileIndex]; timeLeft = p.work * 60; updateDisplay();
}

// --- СОХРАНЕНИЕ ---
document.getElementById('save-settings-btn').addEventListener('click', () => {
    let p = profiles[currentProfileIndex];
    
    p.name = document.getElementById('profile-name').value || "Без имени";
    p.color = document.getElementById('profile-color').value;
    
    // Считываем значения с ползунков
    p.work = parseInt(document.getElementById('work-time').value);
    p.shortBreak = parseInt(document.getElementById('short-break').value);
    p.longBreak = parseInt(document.getElementById('long-break').value);
    
    // Считываем активную радио-кнопку
    const selectedCycle = document.querySelector('input[name="cycles"]:checked');
    p.cycles = selectedCycle ? parseInt(selectedCycle.value) : 4;

    p.workUrl = document.getElementById('work-music').value;
    p.breakUrl = document.getElementById('break-music').value;
    
    activeVideoIdWork = ""; activeVideoIdBreak = "";

    saveData();
    renderTabs();
    loadProfileIntoUI();
    resetTimer();
});

function saveData() {
    localStorage.setItem('pomoProfiles', JSON.stringify(profiles));
    localStorage.setItem('pomoProfileIndex', currentProfileIndex);
    localStorage.setItem('pomoStats', JSON.stringify(stats));
}

function loadData() {
    let savedProfiles = localStorage.getItem('pomoProfiles');
    if (savedProfiles) profiles = JSON.parse(savedProfiles);
    let savedIndex = localStorage.getItem('pomoProfileIndex');
    if (savedIndex) currentProfileIndex = parseInt(savedIndex);
    let savedStats = localStorage.getItem('pomoStats');
    if (savedStats) stats = JSON.parse(savedStats);
}

function updateStatsDisplay() {
    document.getElementById('sessions-count').textContent = stats.sessionsCompleted;
    document.getElementById('hours-count').textContent = (stats.totalWorkMinutes / 60).toFixed(1);
}

function getContrastColor(hexColor) {
    // Убираем решетку, если она есть
    hexColor = hexColor.replace('#', '');
    
    // Переводим цвет в RGB
    let r = parseInt(hexColor.substr(0, 2), 16);
    let g = parseInt(hexColor.substr(2, 2), 16);
    let b = parseInt(hexColor.substr(4, 2), 16);
    
    // Вычисляем яркость
    let yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    
    // Возвращаем черный для светлых фонов и белый для темных
    return (yiq >= 128) ? '#000000' : '#ffffff';
}

document.getElementById('start-btn').addEventListener('click', startTimer);
document.getElementById('pause-btn').addEventListener('click', pauseTimer);
document.getElementById('reset-btn').addEventListener('click', resetTimer);
