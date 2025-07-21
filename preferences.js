// User Preferences System for Co-Sleep App
class PreferencesManager {
    constructor() {
        this.preferences = {
            // Sleep schedule
            sleepTime: '22:00',
            wakeTime: '07:00',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            
            // Background sounds
            defaultSound: null,
            soundVolume: 0.3,
            autoPlaySound: false,
            
            // Auto-disconnect settings
            autoDisconnect: true,
            disconnectTime: 60, // minutes
            disconnectAfterSleep: true,
            
            // Privacy settings
            showOnline: true,
            allowAnalytics: true,
            allowNotifications: true,
            
            // Connection preferences
            preferredConnectionType: 'auto', // auto, direct, relay
            connectionTimeout: 30, // seconds
            
            // UI preferences
            theme: 'dark', // dark, light, auto
            language: 'en',
            compactMode: false
        };
        
        this.loadPreferences();
    }

    // Initialize preferences
    init() {
        this.loadFromStorage();
        this.applyPreferences();
        console.log('⚙️ Preferences Manager initialized');
    }

    // Load preferences from storage
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('coSleepPreferences');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.preferences = { ...this.preferences, ...parsed };
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    }

    // Save preferences to storage
    saveToStorage() {
        try {
            localStorage.setItem('coSleepPreferences', JSON.stringify(this.preferences));
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }

    // Get a preference value
    get(key) {
        return this.preferences[key];
    }

    // Set a preference value
    set(key, value) {
        this.preferences[key] = value;
        this.saveToStorage();
        this.applyPreferences();
        console.log(`⚙️ Preference updated: ${key} = ${value}`);
    }

    // Get all preferences
    getAll() {
        return { ...this.preferences };
    }

    // Apply preferences to the app
    applyPreferences() {
        // Apply theme
        this.applyTheme();
        
        // Apply sound preferences
        this.applySoundPreferences();
        
        // Apply auto-disconnect settings
        this.applyAutoDisconnectSettings();
        
        // Apply privacy settings
        this.applyPrivacySettings();
    }

    // Apply theme preference
    applyTheme() {
        const theme = this.preferences.theme;
        const root = document.documentElement;
        
        // Remove existing theme classes
        root.classList.remove('theme-dark', 'theme-light');
        
        if (theme === 'auto') {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
        } else {
            root.classList.add(`theme-${theme}`);
        }
    }

    // Apply sound preferences
    applySoundPreferences() {
        if (window.soundManager) {
            // Set volume
            window.soundManager.setVolume(this.preferences.soundVolume);
            
            // Auto-play default sound if enabled
            if (this.preferences.autoPlaySound && this.preferences.defaultSound) {
                window.soundManager.playSound(this.preferences.defaultSound, false);
            }
        }
    }

    // Apply auto-disconnect settings
    applyAutoDisconnectSettings() {
        // This will be used by the main app to set up auto-disconnect timers
        if (window.coSleepApp) {
            window.coSleepApp.autoDisconnectEnabled = this.preferences.autoDisconnect;
            window.coSleepApp.autoDisconnectTime = this.preferences.disconnectTime;
        }
    }

    // Apply privacy settings
    applyPrivacySettings() {
        // Update online status visibility
        if (window.coSleepApp && window.coSleepApp.socket) {
            window.coSleepApp.socket.emit('update-privacy', {
                showOnline: this.preferences.showOnline
            });
        }
    }

    // Update preferences from form
    updateFromForm(formData) {
        Object.keys(formData).forEach(key => {
            if (this.preferences.hasOwnProperty(key)) {
                this.set(key, formData[key]);
            }
        });
    }

    // Reset preferences to defaults
    resetToDefaults() {
        this.preferences = {
            sleepTime: '22:00',
            wakeTime: '07:00',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            defaultSound: null,
            soundVolume: 0.3,
            autoPlaySound: false,
            autoDisconnect: true,
            disconnectTime: 60,
            disconnectAfterSleep: true,
            showOnline: true,
            allowAnalytics: true,
            allowNotifications: true,
            preferredConnectionType: 'auto',
            connectionTimeout: 30,
            theme: 'dark',
            language: 'en',
            compactMode: false
        };
        
        this.saveToStorage();
        this.applyPreferences();
        console.log('⚙️ Preferences reset to defaults');
    }

    // Export preferences
    exportPreferences() {
        return {
            preferences: this.preferences,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
    }

    // Import preferences
    importPreferences(data) {
        try {
            if (data.preferences) {
                this.preferences = { ...this.preferences, ...data.preferences };
                this.saveToStorage();
                this.applyPreferences();
                console.log('⚙️ Preferences imported successfully');
                return true;
            }
        } catch (error) {
            console.error('Error importing preferences:', error);
        }
        return false;
    }

    // Get sleep schedule as formatted string
    getSleepSchedule() {
        return {
            sleepTime: this.preferences.sleepTime,
            wakeTime: this.preferences.wakeTime,
            timezone: this.preferences.timezone,
            duration: this.calculateSleepDuration()
        };
    }

    // Calculate sleep duration in hours
    calculateSleepDuration() {
        const sleepTime = new Date(`2000-01-01T${this.preferences.sleepTime}:00`);
        const wakeTime = new Date(`2000-01-01T${this.preferences.wakeTime}:00`);
        
        if (wakeTime < sleepTime) {
            wakeTime.setDate(wakeTime.getDate() + 1);
        }
        
        const durationMs = wakeTime - sleepTime;
        return Math.round(durationMs / (1000 * 60 * 60) * 10) / 10; // Hours with 1 decimal
    }

    // Check if it's within sleep hours
    isWithinSleepHours() {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const sleepTime = this.preferences.sleepTime;
        const wakeTime = this.preferences.wakeTime;
        
        if (sleepTime < wakeTime) {
            // Same day sleep schedule
            return currentTime >= sleepTime && currentTime <= wakeTime;
        } else {
            // Overnight sleep schedule
            return currentTime >= sleepTime || currentTime <= wakeTime;
        }
    }

    // Get time until sleep
    getTimeUntilSleep() {
        const now = new Date();
        const sleepTime = new Date(`2000-01-01T${this.preferences.sleepTime}:00`);
        const currentTime = new Date(`2000-01-01T${now.toTimeString().slice(0, 5)}:00`);
        
        let timeUntil = sleepTime - currentTime;
        
        if (timeUntil <= 0) {
            // Sleep time has passed, add 24 hours
            timeUntil += 24 * 60 * 60 * 1000;
        }
        
        const hours = Math.floor(timeUntil / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
        
        return { hours, minutes };
    }

    // Get formatted time until sleep
    getFormattedTimeUntilSleep() {
        const { hours, minutes } = this.getTimeUntilSleep();
        if (hours > 0) {
            return `${hours}h ${minutes}m until sleep`;
        } else {
            return `${minutes}m until sleep`;
        }
    }

    // Check if analytics are allowed
    isAnalyticsAllowed() {
        return this.preferences.allowAnalytics;
    }

    // Check if notifications are allowed
    isNotificationsAllowed() {
        return this.preferences.allowNotifications;
    }

    // Check if user is online visible
    isOnlineVisible() {
        return this.preferences.showOnline;
    }

    // Get auto-disconnect settings
    getAutoDisconnectSettings() {
        return {
            enabled: this.preferences.autoDisconnect,
            time: this.preferences.disconnectTime,
            afterSleep: this.preferences.disconnectAfterSleep
        };
    }

    // Get sound preferences
    getSoundPreferences() {
        return {
            defaultSound: this.preferences.defaultSound,
            volume: this.preferences.soundVolume,
            autoPlay: this.preferences.autoPlaySound
        };
    }

    // Update sleep schedule
    updateSleepSchedule(sleepTime, wakeTime) {
        this.set('sleepTime', sleepTime);
        this.set('wakeTime', wakeTime);
        console.log(`🌙 Sleep schedule updated: ${sleepTime} - ${wakeTime}`);
    }

    // Update sound preferences
    updateSoundPreferences(defaultSound, volume, autoPlay) {
        this.set('defaultSound', defaultSound);
        this.set('soundVolume', volume);
        this.set('autoPlaySound', autoPlay);
        console.log(`🎵 Sound preferences updated`);
    }

    // Update privacy settings
    updatePrivacySettings(showOnline, allowAnalytics, allowNotifications) {
        this.set('showOnline', showOnline);
        this.set('allowAnalytics', allowAnalytics);
        this.set('allowNotifications', allowNotifications);
        console.log(`🔒 Privacy settings updated`);
    }

    // Update auto-disconnect settings
    updateAutoDisconnectSettings(enabled, time, afterSleep) {
        this.set('autoDisconnect', enabled);
        this.set('disconnectTime', time);
        this.set('disconnectAfterSleep', afterSleep);
        console.log(`⏰ Auto-disconnect settings updated`);
    }

    // Get preferences for display
    getPreferencesForDisplay() {
        return {
            sleepSchedule: this.getSleepSchedule(),
            soundPreferences: this.getSoundPreferences(),
            privacySettings: {
                showOnline: this.preferences.showOnline,
                allowAnalytics: this.preferences.allowAnalytics,
                allowNotifications: this.preferences.allowNotifications
            },
            autoDisconnect: this.getAutoDisconnectSettings(),
            theme: this.preferences.theme,
            language: this.preferences.language,
            compactMode: this.preferences.compactMode
        };
    }
}

// Global preferences manager instance
window.preferencesManager = new PreferencesManager(); 