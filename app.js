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
        emf: 40.0 // Valeur par défaut (Terrestre ~25-65 µT)
    },
    audioContext: null,
    analyser: null,
    dataArray: null
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

    // Magnétomètre
    const ctxEmf = document.getElementById('emfChart').getContext('2d');
    emfChart = new Chart(ctxEmf, {
        type: 'line',
        data: {
            labels: Array(CONFIG.chartHistory).fill(''),
            datasets: [{
                label: 'EMF (µT)',
                data: Array(CONFIG.chartHistory).fill(0),
                borderColor: '#00ff41',
                borderWidth: 2,
                tension: 0.4
            }]
        },
        options: commonOptions
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
                borderWidth: 2
            }]
        },
        options: commonOptions
    });

    // Audio
    const ctxAudio = document.getElementById('audioChart').getContext('2d');
    audioChart = new Chart(ctxAudio, {
        type: 'bar',
        data: {
            labels: Array(32).fill(''), // 32 bandes de fréquence
            datasets: [{
                label: 'Fréquence',
                data: Array(32).fill(0),
                backgroundColor: '#ff00ff'
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

// Variables pour les capteurs
let magSensor = null;
let accSensor = null;

// Initialisation
window.addEventListener('load', () => {
    initCharts();
    dom.statusText.textContent = "Prêt. En attente d'activation.";

    // Listeners
    dom.btnCalibrate.addEventListener('click', calibrate);
    dom.btnStart.addEventListener('click', startAudio);

    initMagnetometer();
    initAccelerometer();
});

function initAccelerometer() {
    // On privilégie LinearAccelerationSensor pour ignorer la gravité
    if ('LinearAccelerationSensor' in window) {
        try {
            accSensor = new LinearAccelerationSensor({ frequency: 60 });
            accSensor.addEventListener('reading', () => {
                const x = accSensor.x;
                const y = accSensor.y;
                const z = accSensor.z;
                // Magnitude du vecteur accélération (vibration)
                const magnitude = Math.sqrt(x*x + y*y + z*z);
                updateAcc(magnitude);
            });
            accSensor.addEventListener('error', event => {
                console.error("Erreur accéléromètre:", event.error);
                // Fallback possible vers devicemotion ici si besoin
            });
            accSensor.start();
        } catch (error) {
            console.error("Erreur init LinearAccelerationSensor:", error);
        }
    } else if ('Accelerometer' in window) {
         // Fallback sur Accelerometer standard (inclut gravité ~9.81)
         try {
            accSensor = new Accelerometer({ frequency: 60 });
            accSensor.addEventListener('reading', () => {
                const x = accSensor.x;
                const y = accSensor.y;
                const z = accSensor.z;
                // On essaie de retirer approximativement la gravité pour voir les vibrations
                // C'est une approx très simple.
                const total = Math.sqrt(x*x + y*y + z*z);
                const vibration = Math.abs(total - 9.81);
                updateAcc(vibration);
            });
            accSensor.start();
         } catch (e) {
             console.error("Erreur init Accelerometer:", e);
         }
    } else {
        console.log("Accéléromètre non supporté via Generic Sensor API.");
    }
}

function updateAcc(value) {
    dom.accValue.textContent = value.toFixed(2);
    updateLineChart(accChart, value);
}

function initMagnetometer() {
    if ('Magnetometer' in window) {
        try {
            magSensor = new Magnetometer({ frequency: 10 }); // 10 Hz
            magSensor.addEventListener('reading', () => {
                // Calcul de la magnitude (Total Microteslas)
                // Certains navigateurs renvoient x, y, z. La magnitude est sqrt(x² + y² + z²)
                const x = magSensor.x;
                const y = magSensor.y;
                const z = magSensor.z;
                const totalField = Math.sqrt(x*x + y*y + z*z);

                updateEmf(totalField);
            });

            magSensor.addEventListener('error', event => {
                console.error(event.error.name, event.error.message);
                if (event.error.name === 'NotAllowedError') {
                    dom.statusText.textContent = "Erreur: Permission refusée pour le magnétomètre.";
                } else if (event.error.name === 'NotReadableError') {
                    dom.statusText.textContent = "Erreur: Magnétomètre inaccessible.";
                }
            });

            magSensor.start();
            dom.statusText.textContent = "Magnétomètre actif.";

        } catch (error) {
            console.error("Erreur init magnétomètre:", error);
            dom.statusText.textContent = "Erreur magnétomètre (voir console).";
        }
    } else {
        dom.statusText.textContent = "API Magnetometer non supportée par ce navigateur.";
        // Fallback possible: DeviceOrientationEvent (moins précis, pas de µT)
        // Pour cet exercice, on reste sur Magnetometer comme demandé pour les µT.
    }
}

function updateEmf(value) {
    // Mise à jour de l'affichage numérique
    dom.emfValue.textContent = value.toFixed(2);

    // Mise à jour du graphique
    updateLineChart(emfChart, value);

    // Vérification alerte (si calibration faite)
    checkAlert(value);
}

function checkAlert(currentVal) {
    if (!state.calibrationData.emf) return;

    const baseline = state.calibrationData.emf;
    const threshold = baseline * CONFIG.alertThreshold;

    if (currentVal > threshold) {
        dom.alertOverlay.classList.add('alert-active');
    } else {
        dom.alertOverlay.classList.remove('alert-active');
    }
}

function calibrate() {
    console.log("Calibration demandée...");
    if (magSensor && magSensor.hasReading) {
        // On prend la valeur actuelle comme base
        const x = magSensor.x;
        const y = magSensor.y;
        const z = magSensor.z;
        const currentMag = Math.sqrt(x*x + y*y + z*z);

        state.calibrationData.emf = currentMag;
        dom.statusText.textContent = `Calibré à ${currentMag.toFixed(2)} µT.`;
    } else {
        dom.statusText.textContent = "Impossible de calibrer (pas de lecture capteur).";
    }
}

function startAudio() {
    console.log("Démarrage audio...");
    if (state.audioContext) return; // Déjà démarré

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
            state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            state.analyser = state.audioContext.createAnalyser();

            const source = state.audioContext.createMediaStreamSource(stream);
            source.connect(state.analyser);

            // Configuration FFT
            state.analyser.fftSize = 64; // On veut 32 barres (fftSize / 2)
            const bufferLength = state.analyser.frequencyBinCount;
            state.dataArray = new Uint8Array(bufferLength);

            dom.btnStart.textContent = "AUDIO ACTIF";
            dom.btnStart.disabled = true;

            updateAudioChart();
        })
        .catch(err => {
            console.error("Erreur accès micro:", err);
            dom.statusText.textContent = "Erreur accès micro (HTTPS requis).";
        });
}

function updateAudioChart() {
    if (!state.analyser) return;

    requestAnimationFrame(updateAudioChart);

    state.analyser.getByteFrequencyData(state.dataArray);

    // Mise à jour des données du graphique
    // On copie les données dans le dataset de Chart.js
    const data = audioChart.data.datasets[0].data;
    for (let i = 0; i < state.dataArray.length; i++) {
        data[i] = state.dataArray[i];
    }

    // Mode 'none' pour performance (pas d'animation d'interpolation)
    audioChart.update('none');
}
