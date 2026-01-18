// Configuration globale
const CONFIG = {
    updateInterval: 100, // ms
    chartHistory: 50,    // Nombre de points affichés
    alertThreshold: 1.20 // +20%
};

// État de l'application
const state = {
    isCalibrating: false,
    calibrationData: {
        emf: 10.0, // Valeur arbitraire de base (stabilité)
    },
    audioContext: null,
    analyser: null,
    dataArray: null,
    lastAlpha: null,
    lastUpdate: 0,
    currentEmf: 0,
    currentAcc: 0,
    calibrationBuffer: []
};

// Éléments DOM
const dom = {
    emfValue: document.getElementById('emf-value'),
    accValue: document.getElementById('acc-value'),
    alertOverlay: document.getElementById('alert-overlay'),
    statusText: document.getElementById('status-text'),
    btnCalibrate: document.getElementById('btn-calibrate'),
    btnStart: document.getElementById('btn-start')
};

// Initialisation des graphiques
let emfChart, accChart, audioChart;

function initCharts() {
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        elements: { point: { radius: 0 } },
        scales: {
            x: { display: false },
            y: { grid: { color: '#333' }, ticks: { color: '#00ff41' } }
        },
        plugins: { legend: { display: false } }
    };

    // Options graphiques ajustées pour mobile
    const chartOptions = {
        ...commonOptions,
        layout: { padding: 5 },
        scales: {
            x: { display: false },
            y: {
                display: false, // On cache les axes Y pour gagner de la place
                grid: { display: false }
            }
        }
    };

    // Magnétomètre
    const ctxEmf = document.getElementById('emfChart').getContext('2d');
    emfChart = new Chart(ctxEmf, {
        type: 'line',
        data: {
            labels: Array(CONFIG.chartHistory).fill(''),
            datasets: [{
                label: 'EMF',
                data: Array(CONFIG.chartHistory).fill(0),
                borderColor: '#00ff41',
                backgroundColor: 'rgba(0, 255, 65, 0.1)',
                fill: true,
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 0
            }]
        },
        options: chartOptions
    });

    // Accéléromètre
    const ctxAcc = document.getElementById('accChart').getContext('2d');
    accChart = new Chart(ctxAcc, {
        type: 'line',
        data: {
            labels: Array(CONFIG.chartHistory).fill(''),
            datasets: [{
                label: 'Vibration',
                data: Array(CONFIG.chartHistory).fill(0),
                borderColor: '#ffff00',
                backgroundColor: 'rgba(255, 255, 0, 0.1)',
                fill: true,
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 0
            }]
        },
        options: chartOptions
    });

    // Audio
    const ctxAudio = document.getElementById('audioChart').getContext('2d');
    audioChart = new Chart(ctxAudio, {
        type: 'bar',
        data: {
            labels: Array(16).fill(''), // Réduit à 16 pour meilleure lisibilité mobile
            datasets: [{
                label: 'Fréquence',
                data: Array(16).fill(0),
                backgroundColor: '#ff00ff',
                borderRadius: 2
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                x: { display: false },
                y: { min: 0, max: 255, display: false }
            }
        }
    });
}

// Fonction utilitaire pour mettre à jour un graphique linéaire
function updateLineChart(chart, newValue) {
    const data = chart.data.datasets[0].data;
    data.shift();
    data.push(newValue);
    chart.update();
}

// Initialisation
window.addEventListener('load', () => {
    initCharts();
    dom.statusText.textContent = "Prêt. Appuyez sur CALIBRER pour activer les capteurs.";

    // Listeners
    dom.btnCalibrate.addEventListener('click', requestPermissionsAndStart);
    dom.btnStart.addEventListener('click', startAudio);
});

// Gestion des permissions iOS 13+ et démarrage
function requestPermissionsAndStart() {
    // iOS 13+ requiert une demande explicite pour DeviceOrientation/Motion
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    startSensors();
                    calibrate();
                } else {
                    dom.statusText.textContent = "Permission capteurs refusée.";
                }
            })
            .catch(console.error);
    } else {
        // Android / Non-iOS 13+
        startSensors();
        calibrate();
    }
}

function startSensors() {
    // Sismographe (Accéléromètre)
    window.addEventListener('devicemotion', (event) => {
        const acc = event.acceleration || event.accelerationIncludingGravity;
        if (acc) {
            const x = acc.x || 0;
            const y = acc.y || 0;
            const z = acc.z || 0;
            state.currentAcc = Math.sqrt(x*x + y*y + z*z);
        }
        processSensorData();
    });

    // Magnétomètre (Via Orientation)
    window.addEventListener('deviceorientation', (event) => {
        const alpha = event.alpha;
        if (alpha !== null) {
            if (state.lastAlpha !== null) {
                let delta = Math.abs(alpha - state.lastAlpha);
                if (delta > 180) delta = 360 - delta;

                // Instabilité boussole * facteur arbitraire
                let pseudoEmf = delta * 50;
                state.currentEmf = Math.min(pseudoEmf, 200);
            }
            state.lastAlpha = alpha;
        }
        processSensorData();
    });

    dom.statusText.textContent = "Capteurs actifs (Mode Universel).";
}

function processSensorData() {
    // Throttling pour éviter de surcharger le thread UI (60fps vs updateInterval)
    const now = Date.now();
    if (now - state.lastUpdate < CONFIG.updateInterval) return;

    state.lastUpdate = now;

    if (state.isCalibrating) {
        // Collecte des données pour calibration
        state.calibrationBuffer.push(state.currentEmf);
    } else {
        // Mise à jour normale
        updateEmf(state.currentEmf);
        updateAcc(state.currentAcc);
    }
}

function updateEmf(value) {
    // Lissage visuel
    const displayValue = Math.max(0, value).toFixed(2);
    dom.emfValue.textContent = displayValue;

    updateLineChart(emfChart, value);
    checkAlert(value);
}

function updateAcc(value) {
    dom.accValue.textContent = value.toFixed(2);
    updateLineChart(accChart, value);
}

function checkAlert(currentVal) {
    if (!state.isCalibrating && state.calibrationData.emf > 0) {
        const threshold = state.calibrationData.emf * CONFIG.alertThreshold;

        // On évite les déclenchements trop faciles (bruit de fond)
        // Seuil minimum de 5 "µT" pour éviter le bruit pur
        if (currentVal > threshold && currentVal > 5) {
            dom.alertOverlay.classList.add('alert-active');
        } else {
            dom.alertOverlay.classList.remove('alert-active');
        }
    }
}

function calibrate() {
    console.log("Calibration demandée...");
    dom.statusText.textContent = "Calibration (ne bougez pas)...";
    state.isCalibrating = true;
    state.calibrationBuffer = [];

    setTimeout(() => {
        state.isCalibrating = false;

        // Calcul de la moyenne du bruit ambiant
        if (state.calibrationBuffer.length > 0) {
            const sum = state.calibrationBuffer.reduce((a, b) => a + b, 0);
            let avg = sum / state.calibrationBuffer.length;

            // On s'assure d'avoir un minimum (pas 0) pour que le % fonctionne
            avg = Math.max(avg, 2.0);

            state.calibrationData.emf = avg;
            dom.statusText.textContent = `Calibré (Base: ${avg.toFixed(1)}). Détection active.`;
        } else {
            // Fallback si aucun event reçu
            state.calibrationData.emf = 10.0;
            dom.statusText.textContent = "Calibré (Défaut). Détection active.";
        }
    }, 2000);
}

function startAudio() {
    console.log("Démarrage audio...");
    if (state.audioContext) return;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
            state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            state.analyser = state.audioContext.createAnalyser();

            const source = state.audioContext.createMediaStreamSource(stream);
            source.connect(state.analyser);

            state.analyser.fftSize = 64; // Donne 32 bins
            // On ne gardera que les 16 premiers pour le chart (basses/mediums plus pertinents)
            const bufferLength = state.analyser.frequencyBinCount;
            state.dataArray = new Uint8Array(bufferLength);

            dom.btnStart.textContent = "AUDIO ACTIF";
            dom.btnStart.disabled = true;

            updateAudioChart();
        })
        .catch(err => {
            console.error("Erreur accès micro:", err);
            dom.statusText.textContent = "Erreur micro (HTTPS/Mobile ?).";
        });
}

function updateAudioChart() {
    if (!state.analyser) return;

    requestAnimationFrame(updateAudioChart);

    state.analyser.getByteFrequencyData(state.dataArray);

    const data = audioChart.data.datasets[0].data;
    for (let i = 0; i < state.dataArray.length; i++) {
        data[i] = state.dataArray[i];
    }

    audioChart.update('none');
}
