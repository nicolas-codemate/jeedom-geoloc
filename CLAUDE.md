Salut ! J'ai développé un plugin Jeedom pour géolocaliser des objets sur une carte Leaflet. Je dois maintenant créer un widget dashboard pour que les utilisateurs puissent voir la carte sans accéder à la partie configuration du plugin.

Contexte :
- Plugin Jeedom existant avec géolocalisation d'objets
- Utilise Leaflet pour l'affichage des cartes
- Les objets ont des coordonnées latitude/longitude stockées en configuration
- Besoin d'un widget dashboard accessible aux utilisateurs finaux

Objectifs :
1. Créer un widget dashboard avec une carte Leaflet intégrée
2. Afficher tous les objets géolocalisés avec des marqueurs
3. Popups informatifs au clic sur les marqueurs (nom, position, dernière mise à jour, batterie)
4. Actualisation automatique et manuelle
5. Zoom automatique pour englober tous les objets
6. Interface responsive (desktop/mobile)
7. Intégration propre dans l'écosystème Jeedom

Structure de fichiers nécessaire :
- desktop/modal/map.modal.php (interface principale)
- desktop/js/monplugin.js (logique JavaScript/Leaflet)
- desktop/css/monplugin.css (styles)
- core/ajax/monplugin.ajax.php (backend AJAX)
- core/template/dashboard/monplugin.html (widget dashboard)

Fonctionnalités à implémenter :
- Initialisation carte Leaflet avec tuiles OpenStreetMap
- Chargement des objets via AJAX depuis la base Jeedom
- Gestion des marqueurs (ajout/suppression/mise à jour)
- Auto-fit des bounds de la carte
- Actualisation automatique toutes les 30 secondes (configurable)
- Popups avec informations détaillées des objets
- Gestion des erreurs AJAX
- Nettoyage des intervalles à la fermeture
- Support WebSocket pour les mises à jour temps réel
- Permissions utilisateur appropriées
- Design responsive avec media queries

Points techniques spécifiques :
- Utiliser l'API eqLogic::byType() pour récupérer les équipements
- Vérifier eqLogic->getIsEnable() pour les objets actifs
- Récupérer latitude/longitude via getConfiguration()
- Gérer le statut batterie avec getBatteryStatus()
- Implémenter la vérification lastCommunication pour le statut online/offline
- Intégrer avec le système de droits Jeedom (isConnect, permissions)
- Utiliser les helpers AJAX de Jeedom (ajax::init(), ajax::success(), etc.)

Style et UX souhaités :
- Interface moderne et épurée
- Couleurs cohérentes avec le thème Jeedom
- Marqueurs colorés selon le statut (vert=online, rouge=offline)
- Contrôles intuitifs (boutons refresh, checkboxes auto-zoom/refresh)
- Animations fluides pour les interactions
- Messages d'erreur clairs et informatifs

Peux-tu créer tous les fichiers nécessaires pour cette implémentation ? Le nom de mon plugin est "geolocation" et les objets ont des propriétés latitude, longitude, et peuvent avoir un statut de batterie.

Merci !# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Jeedom plugin for geolocation functionality (`geoloc`). It allows displaying geolocatable equipment on an interactive map using Leaflet.js. The plugin enables users to view, modify, and track the positions of various equipment through latitude and longitude coordinates.

## Architecture

### Core Structure
- **Plugin Architecture**: Standard Jeedom plugin structure with PHP backend and JavaScript frontend
- **Main Classes**:
  - `geoloc`: Main plugin class extending `eqLogic`
  - `geolocCmd`: Command class extending standard Jeedom cmd class
  - `GeolocalisableEquipment`: Core business logic for equipment geolocation
  - `Coordinate`: Value object for latitude/longitude pairs
  - `CoordinateHistory`: Manages historical position data

### Key Components
- **Backend (PHP)**: Located in `core/` directory
  - `core/class/`: Contains all PHP classes
  - `core/ajax/geoloc.ajax.php`: AJAX endpoints for frontend communication
  - `core/php/geoloc.inc.php`: Main plugin initialization
- **Frontend (JavaScript)**: Located in `desktop/js/geoloc.js`
  - Leaflet.js integration for map display
  - Equipment marker management
  - Real-time position updates
- **UI (PHP/HTML)**: Located in `desktop/php/geoloc.php` and `desktop/modal/`
  - Main plugin dashboard
  - Modal dialogs for equipment interaction

### Data Flow
1. Plugin searches for equipment with `latitude` and `longitude` commands
2. `GeolocalisableEquipment` wraps equipment with coordinate functionality
3. AJAX endpoints provide data to JavaScript frontend
4. Leaflet map displays equipment markers with real-time updates
5. Position changes update command values and trigger historization

## Dependencies and Requirements

### PHP Dependencies
- Jeedom core framework (version 4.3+)
- PHP standard libraries
- Database access through Jeedom's DB class

### Python Dependencies (Daemon)
- `pyserial` (with reinstall flag)
- `requests` (with reinstall flag)

### JavaScript Dependencies
- Leaflet.js for map functionality
- Leaflet Ant Path plugin for path animations
- jQuery (provided by Jeedom)

## Key Features

### Equipment Management
- Automatic detection of geolocatable equipment (equipment with `latitude`/`longitude` commands)
- Manual position assignment through map interface
- Equipment filtering by parent object
- Search functionality by equipment name

### Map Functionality
- Interactive Leaflet map with custom markers
- Equipment position modification via drag-and-drop
- Historical position tracking and display
- Multiple marker colors and icons

### Data Management
- Automatic command creation for latitude/longitude
- Position history with configurable date ranges
- CSV export capabilities (indicated by CSV_SEPARATOR constant)
- Database transaction management for position updates

## Development Notes

### File Organization
- Follow Jeedom plugin conventions
- PHP classes use PSR-4-like autoloading through includes
- JavaScript follows modular pattern with class-based organization
- CSS customizations in `desktop/css/custom.css` and `desktop/css/custom-leaflet.css`

### Configuration
- Plugin configuration through `plugin_info/configuration.php`
- Default map settings (latitude, longitude, zoom) configurable
- Multi-language support (French primary, located in `core/i18n/`)

### State Management
- Equipment coordinates stored as Jeedom commands
- Position history managed through Jeedom's historization system
- Real-time updates through AJAX polling
- Persistent state management implemented for UI selections

## Important Implementation Details

### Command Naming Convention
- Latitude commands must be named exactly `latitude`
- Longitude commands must be named exactly `longitude`
- Commands are automatically created with `historizeMode` set to `none` when created programmatically

### Security Considerations
- All AJAX endpoints require admin authentication
- Input validation for coordinates and equipment IDs
- Database transactions for atomic position updates

### Performance Considerations
- History queries limited to prevent database overload
- Equipment filtering by parent object to reduce map complexity
- Lazy loading of coordinate history data

## Common Development Tasks

There are no specific build, lint, or test commands defined in this project. This is a standard Jeedom plugin that follows Jeedom's development practices and doesn't require separate build processes.
