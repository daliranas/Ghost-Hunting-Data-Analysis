# Détecteur Paranormal Web (PWA)

Application web progressive (PWA) pour l'analyse environnementale en temps réel, conçue pour la recherche paranormale ("Ghost Hunting").
Cette application utilise les capteurs modernes des smartphones via les API Web standards.

## Fonctionnalités

1.  **Magnétomètre (EMF)** : Affiche le champ magnétique en microteslas (µT).
    *   **Alerte Entité** : L'écran clignote en rouge si le champ magnétique varie de plus de 20% par rapport à la calibration.
2.  **Sismographe** : Détecte les micro-vibrations via l'accéléromètre (filtrage de la gravité).
3.  **Spectre Audio (EVP)** : Visualisation FFT des fréquences sonores captées par le micro.

## Pré-requis

*   **Smartphone** : Android recommandé (Chrome). iOS (Safari) a des restrictions sur l'accès aux capteurs magnétiques bruts via le web.
*   **Connexion** : HTTPS obligatoire (les navigateurs bloquent l'accès aux capteurs sur HTTP standard, sauf localhost).

## Installation sur Plesk

Cette application est une "Single Page Application" statique. Elle ne nécessite pas de base de données ni de langage serveur (PHP/Node.js).

1.  **Préparation** :
    *   Téléchargez les fichiers du projet (`index.html`, `style.css`, `app.js`).
    *   Assurez-vous que votre domaine/sous-domaine sur Plesk dispose d'un **certificat SSL actif (HTTPS)**. C'est impératif pour l'accès aux capteurs.

2.  **Upload** :
    *   Connectez-vous à votre panneau Plesk.
    *   Allez dans le **Gestionnaire de fichiers** de votre domaine.
    *   Uploadez les 3 fichiers dans le dossier racine (généralement `httpdocs`).

3.  **Configuration** :
    *   Aucune configuration serveur n'est nécessaire.
    *   Accédez simplement à votre site via `https://votre-domaine.com`.

## Utilisation

1.  **Lancement** : Ouvrez la page sur votre mobile.
2.  **Permissions** : Acceptez l'accès au micro et aux capteurs si demandé.
3.  **Calibration** : Posez le téléphone sur une surface stable et appuyez sur **CALIBRER CAPTEURS**. Cela définit le "bruit de fond" électromagnétique.
4.  **Audio** : Appuyez sur **ACTIVER AUDIO** pour lancer l'analyse spectrale.
5.  **Enquête** : Déplacez-vous. Si l'EMF augmente de 20%, l'écran clignotera en rouge.

## Notes Techniques

*   Utilise `Generic Sensor API` (Magnetometer, LinearAccelerationSensor).
*   Utilise `Web Audio API` pour le spectre.
*   Utilise `Chart.js` pour les graphiques.
