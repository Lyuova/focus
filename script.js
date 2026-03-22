let timerInterval;
let timeLeft;
let isRunning = false;
let currentMode = 'work'; // work, shortBreak, longBreak
let currentCycle = 1;
let currentProfileIndex = 0;

let stats = { sessionsCompleted: 0, totalWorkMinutes: 0 };

let profiles = [
    { name: "Помодоро", color: "#ff6b6b", work: 25, shortBreak: 5, longBreak: 20, cycles: 4, workUrl: "", breakUrl: "" },
    { name: "YourSession1", color: "#74b9ff", work: 45, shortBreak: 10, longBreak: 25, cycles: 3, workUrl: "", breakUrl: "" },
    { name: "YourSession2", color: "#a29bfe", work: 60, shortBreak: 15, longBreak: 30, cycles: 2, workUrl: "", breakUrl: "" },
    { name: "YourSession3", color: "#fdcb6e", work: 90, shortBreak: 20, longBreak: 40, cycles: 2, workUrl: "", breakUrl: "" },
    { name: "YourSession4", color: "#00b894", work: 20, shortBreak: 5, longBreak: 15, cycles: 5, workUrl: "", breakUrl: "" }
];

// Базовые пресеты музыки (будут сохранены в localStorage)
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
    loadProfileIntoUI();
    renderPresets();
    resetTimer();
    updateStatsDisplay();
};

// --- YOUTUBE API ---
function onYouTubeIframeAPIReady() {
    playerWork = new YT.Player('yt-player-work', {
        height: '0', width: '0',
        playerVars: { 'autoplay': 0, 'controls': 0 },
        events: { 'onStateChange': onPlayerStateChange }
    });
    playerBreak = new YT.Player('yt-player-break', {
        height: '0', width: '0',
        playerVars: { 'autoplay': 0, 'controls': 0 },
        events: { 'onStateChange': onPlayerStateChange }
    });
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        event.target.playVideo(); 
    }
}

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
                if (activeVideoIdWork !== vidId) {
                    playerWork.loadVideoById(vidId);
                    activeVideoIdWork = vidId;
                } else {
                    playerWork.playVideo();
                }
            }
        }
    } else {
        playerWork.pauseVideo();
        if (profile.breakUrl) {
            let vidId = extractVideoID(profile.breakUrl);
            if (vidId) {
                if (activeVideoIdBreak !== vidId) {
                    playerBreak.loadVideoById(vidId);
                    activeVideoIdBreak = vidId;
                } else {
                    playerBreak.playVideo();
                }
            }
        }
    }
}

// --- ПРЕСЕТЫ МУЗЫКИ ---
function renderPresets() {
    const workContainer = document.getElementById('work-presets');
    const breakContainer = document.getElementById('break-presets');
    
    workContainer.innerHTML = '';
    breakContainer.innerHTML = '';

    musicPresets.work.forEach((p, index) => {
        workContainer.appendChild(createPresetChip(p, 'work', index));
    });
    musicPresets.break.forEach((p, index) => {
        breakContainer.appendChild(createPresetChip(p, 'break', index));
    });
}

function createPresetChip(preset, type, index) {
    const chip = document.createElement('div');
    chip.className = 'preset-chip';
    
    const textSpan = document.createElement('span');
    textSpan.className = 'preset-name';
    textSpan.textContent = preset.name;
    // При клике на текст ссылка подставляется в соответствующий инпут
    textSpan.onclick = () => {
        document.getElementById(type + '-music').value = preset.url;
    };

    const delSpan = document.createElement('span');
    delSpan.className = 'delete-btn';
    delSpan.innerHTML = '&times;';
    delSpan.title = "Удалить";
    // При клике на крестик удаляем пресет
    delSpan.onclick = (e) => {
        e.stopPropagation(); // Чтобы не сработал клик на подстановку ссылки
        if(confirm(`Удалить "${preset.name}" из закладок?`)) {
            musicPresets[type].splice(index, 1);
            localStorage.setItem('pomoMusicPresets', JSON.stringify(musicPresets));
            renderPresets();
        }
    };

    chip.appendChild(textSpan);
    chip.appendChild(delSpan);
    return chip;
}

document.getElementById('add-preset-btn').addEventListener('click', () => {
    const nameInput = document.getElementById('new-preset-name');
    const urlInput = document.getElementById('new-preset-url');
    const type = document.getElementById('new-preset-type').value;

    const name = nameInput.value.trim();
    const url = urlInput.value.trim();

    if (name && url) {
        musicPresets[type].push({ name, url });
        localStorage.setItem('pomoMusicPresets', JSON.stringify(musicPresets));
        renderPresets();
        nameInput.value = '';
        urlInput.value = '';
    } else {
        alert("Пожалуйста, введите название и ссылку на YouTube.");
    }
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
    if (isRunning) {
        if(!confirm("Таймер запущен. Сменить профиль и сбросить прогресс?")) return;
    }
    currentProfileIndex = index;
    renderTabs();
    loadProfileIntoUI();
    resetTimer();
    saveData();
}

function loadProfileIntoUI() {
    let p = profiles[currentProfileIndex];
    document.documentElement.style.setProperty('--theme-color', p.color);
    
    document.getElementById('profile-name').value = p.name;
    document.getElementById('profile-color').value = p.color;
    document.getElementById('work-time').value = p.work;
    document.getElementById('short-break').value = p.shortBreak;
    document.getElementById('long-break').value = p.longBreak;
    document.getElementById('cycles-input').value = p.cycles;
    document.getElementById('work-music').value = p.workUrl;
    document.getElementById('break-music').value = p.breakUrl;
}

// --- ЛОГИКА ТАЙМЕРА ---
function updateDisplay() {
    let minutes = Math.floor(timeLeft / 60);
    let seconds = timeLeft % 60;
    document.getElementById('time-left').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    let p = profiles[currentProfileIndex];
    document.getElementById('cycle-text').textContent = `Цикл: ${currentCycle} / ${p.cycles}`;
    
    let modeText = currentMode === 'work' ? 'Работа' : (currentMode === 'shortBreak' ? 'Перерыв' : 'Большой отдых');
    document.getElementById('mode-text').textContent = modeText;
}

function switchMode() {
    let p = profiles[currentProfileIndex];
    
    if (currentMode === 'work') {
        stats.totalWorkMinutes += p.work;
        saveData();
        updateStatsDisplay();

        if (currentCycle >= p.cycles) {
            currentMode = 'longBreak';
            timeLeft = p.longBreak * 60;
            stats.sessionsCompleted++;
        } else {
            currentMode = 'shortBreak';
            timeLeft = p.shortBreak * 60;
        }
    } else {
        if (currentMode === 'longBreak') {
            currentCycle = 1;
            pauseTimer();
            alert("Поздравляю, сессия завершена! Готов к новой?");
            currentMode = 'work';
            timeLeft = p.work * 60;
            updateDisplay();
            return;
        } else {
            currentCycle++;
        }
        currentMode = 'work';
        timeLeft = p.work * 60;
    }
    
    playMusic(currentMode);
    updateDisplay();
    saveData();
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    playMusic(currentMode);

    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft < 0) switchMode();
        else updateDisplay();
    }, 1000);
}

function pauseTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    if(playerWork && typeof playerWork.pauseVideo === 'function') playerWork.pauseVideo();
    if(playerBreak && typeof playerBreak.pauseVideo === 'function') playerBreak.pauseVideo();
}

function resetTimer() {
    pauseTimer();
    currentMode = 'work';
    currentCycle = 1;
    let p = profiles[currentProfileIndex];
    timeLeft = p.work * 60;
    updateDisplay();
}

// --- СОХРАНЕНИЕ ---
document.getElementById('save-settings-btn').addEventListener('click', () => {
    let p = profiles[currentProfileIndex];
    
    let workInput = parseInt(document.getElementById('work-time').value);
    workInput = Math.max(20, Math.min(120, workInput)); 
    workInput = Math.round(workInput / 5) * 5; 

    p.name = document.getElementById('profile-name').value || "Без имени";
    p.color = document.getElementById('profile-color').value;
    p.work = workInput;
    p.shortBreak = parseInt(document.getElementById('short-break').value);
    p.longBreak = parseInt(document.getElementById('long-break').value);
    p.cycles = Math.max(1, Math.min(5, parseInt(document.getElementById('cycles-input').value)));
    p.workUrl = document.getElementById('work-music').value;
    p.breakUrl = document.getElementById('break-music').value;
    
    activeVideoIdWork = "";
    activeVideoIdBreak = "";

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

document.getElementById('start-btn').addEventListener('click', startTimer);
document.getElementById('pause-btn').addEventListener('click', pauseTimer);
document.getElementById('reset-btn').addEventListener('click', resetTimer); 
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
    if (isRunning) {
        if(!confirm("Таймер запущен. Сменить профиль и сбросить прогресс?")) return;
    }
    currentProfileIndex = index;
    renderTabs();
    loadProfileIntoUI();
    resetTimer();
    saveData();
}

function loadProfileIntoUI() {
    let p = profiles[currentProfileIndex];
    document.documentElement.style.setProperty('--theme-color', p.color);
    
    document.getElementById('profile-name').value = p.name;
    document.getElementById('profile-color').value = p.color;
    document.getElementById('work-time').value = p.work;
    document.getElementById('short-break').value = p.shortBreak;
    document.getElementById('long-break').value = p.longBreak;
    document.getElementById('cycles-input').value = p.cycles;
    document.getElementById('work-music').value = p.workUrl;
    document.getElementById('break-music').value = p.breakUrl;
}

// --- ЛОГИКА ТАЙМЕРА ---
function updateDisplay() {
    let minutes = Math.floor(timeLeft / 60);
    let seconds = timeLeft % 60;
    document.getElementById('time-left').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    let p = profiles[currentProfileIndex];
    document.getElementById('cycle-text').textContent = `Цикл: ${currentCycle} / ${p.cycles}`;
    
    let modeText = currentMode === 'work' ? 'Работа' : (currentMode === 'shortBreak' ? 'Перерыв' : 'Большой отдых');
    document.getElementById('mode-text').textContent = modeText;
}

function switchMode() {
    let p = profiles[currentProfileIndex];
    
    if (currentMode === 'work') {
        stats.totalWorkMinutes += p.work;
        saveData();
        updateStatsDisplay();

        if (currentCycle >= p.cycles) {
            currentMode = 'longBreak';
            timeLeft = p.longBreak * 60;
            stats.sessionsCompleted++;
        } else {
            currentMode = 'shortBreak';
            timeLeft = p.shortBreak * 60;
        }
    } else {
        if (currentMode === 'longBreak') {
            currentCycle = 1;
            pauseTimer();
            alert("Поздравляю, сессия завершена! Готов к новой?");
            currentMode = 'work';
            timeLeft = p.work * 60;
            updateDisplay();
            return; // Ожидаем ручного запуска после длинного перерыва
        } else {
            currentCycle++;
        }
        currentMode = 'work';
        timeLeft = p.work * 60;
    }
    
    playMusic(currentMode);
    updateDisplay();
    saveData();
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    playMusic(currentMode);

    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft < 0) switchMode();
        else updateDisplay();
    }, 1000);
}

function pauseTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    if(playerWork && typeof playerWork.pauseVideo === 'function') playerWork.pauseVideo();
    if(playerBreak && typeof playerBreak.pauseVideo === 'function') playerBreak.pauseVideo();
}

function resetTimer() {
    pauseTimer();
    currentMode = 'work';
    currentCycle = 1;
    let p = profiles[currentProfileIndex];
    timeLeft = p.work * 60;
    updateDisplay();
}

// --- СОХРАНЕНИЕ ---
document.getElementById('save-settings-btn').addEventListener('click', () => {
    let p = profiles[currentProfileIndex];
    
    // Валидация времени работы (кратно 5)
    let workInput = parseInt(document.getElementById('work-time').value);
    workInput = Math.max(20, Math.min(120, workInput)); // Ограничиваем
    workInput = Math.round(workInput / 5) * 5; // Округляем до ближайшего числа, кратного 5

    p.name = document.getElementById('profile-name').value || "Без имени";
    p.color = document.getElementById('profile-color').value;
    p.work = workInput;
    p.shortBreak = parseInt(document.getElementById('short-break').value);
    p.longBreak = parseInt(document.getElementById('long-break').value);
    p.cycles = Math.max(1, Math.min(5, parseInt(document.getElementById('cycles-input').value)));
    p.workUrl = document.getElementById('work-music').value;
    p.breakUrl = document.getElementById('break-music').value;
    
    // Сбрасываем кэш видео, чтобы при изменении ссылки загрузилось новое
    activeVideoIdWork = "";
    activeVideoIdBreak = "";

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

document.getElementById('start-btn').addEventListener('click', startTimer);
document.getElementById('pause-btn').addEventListener('click', pauseTimer);
document.getElementById('reset-btn').addEventListener('click', resetTimer);

