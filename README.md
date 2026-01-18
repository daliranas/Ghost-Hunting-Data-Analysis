# Détecteur Paranormal Web (PWA)

Application web progressive (PWA) pour l'analyse environnementale en temps réel, conçue pour la recherche paranormale ("Ghost Hunting").
Cette application utilise les API web universelles pour une compatibilité maximale (iOS, Android, Chrome, Firefox).

## Fonctionnalités

1.  **Magnétomètre (EMF)** : Affiche les perturbations magnétiques.
    *   *Note Technique* : Sur le web mobile (iOS/Android), l'accès direct aux microteslas (µT) est restreint. Cette application analyse la **stabilité de la boussole électronique**. Une variation rapide (aiguille qui s'affole) est interprétée comme une anomalie EMF.
    *   **Alerte Entité** : L'écran clignote en rouge si le niveau de perturbation dépasse le seuil calibré de 20%.
2.  **Sismographe** : Détecte les micro-vibrations via l'accéléromètre.
3.  **Spectre Audio (EVP)** : Visualisation FFT des fréquences sonores captées par le micro.

## Pré-requis

*   **Smartphone** : Compatible iOS (Safari) et Android (Chrome/Firefox).
*   **Connexion** : HTTPS obligatoire (les navigateurs bloquent l'accès aux capteurs sur HTTP standard, sauf localhost).

## Installation sur Plesk

Cette application est une "Single Page Application" statique. Elle ne nécessite pas de base de données ni de langage serveur.

1.  **Préparation** :
    *   Téléchargez les fichiers du projet (`index.html`, `style.css`, `app.js`).
    *   Assurez-vous que votre domaine/sous-domaine sur Plesk dispose d'un **certificat SSL actif (HTTPS)**. C'est impératif.

2.  **Upload** :
    *   Connectez-vous à votre panneau Plesk.
    *   Allez dans le **Gestionnaire de fichiers** de votre domaine.
    *   Uploadez les 3 fichiers dans le dossier racine (généralement `httpdocs`).

3.  **Configuration** :
    *   Aucune configuration serveur n'est nécessaire.
    *   Accédez simplement à votre site via `https://votre-domaine.com`.

## Utilisation

1.  **Lancement** : Ouvrez la page sur votre mobile.
2.  **Permissions** :
    *   Appuyez sur **CALIBRER CAPTEURS**.
    *   Sur iOS, une fenêtre vous demandera d'autoriser l'accès aux capteurs de mouvement. **Acceptez**.
3.  **Calibration** : Posez le téléphone sur une surface stable pendant 2 secondes après avoir cliqué.
4.  **Audio** : Appuyez sur **ACTIVER AUDIO** et autorisez le micro.
5.  **Enquête** : Déplacez-vous. Si des perturbations magnétiques sont détectées (variation boussole), l'indicateur EMF montera.

## Notes Techniques

*   Utilise `DeviceMotionEvent` (Accéléromètre) et `DeviceOrientationEvent` (Magnétomètre/Boussole).
*   Utilise `Web Audio API` pour le spectre.
*   Utilise `Chart.js` pour les graphiques.
