/**
 * Modular Script Loader - Temporary replacement for script.js
 * Loads and initializes the new modular component system
 */

// Check if ES6 modules are supported
function supportsModules() {
    const script = document.createElement('script');
    return 'noModule' in script;
}

// Fallback for browsers without module support
if (!supportsModules()) {
    console.warn('⚠️ ES6 modules not supported, falling back to original script');
    // Load original script as fallback
    const script = document.createElement('script');
    script.src = 'script.js';
    document.head.appendChild(script);
} else {
    // Load modular components
    console.log('🚀 Loading modular Hence app...');
    
    // Dynamic import with error handling
    async function loadModularApp() {
        try {
            // Import the main App class
            const { App } = await import('./components/core/App.js');
            
            // Check onboarding completion
            const onboardingComplete = localStorage.getItem('hence_onboarding_complete');
            const userId = localStorage.getItem('hence_user_id');
            const userType = localStorage.getItem('hence_user_type');
            
            // TEMPORARILY DISABLED FOR TESTING - Set default values if missing
            if (!onboardingComplete || !userId || !userType) {
                console.log('⚠️ Onboarding data missing, setting defaults for testing...');
                localStorage.setItem('hence_onboarding_complete', 'true');
                localStorage.setItem('hence_user_id', 'test-user-' + Date.now());
                localStorage.setItem('hence_user_type', 'anonymous');
                localStorage.setItem('hence_display_name', 'Test User');
                console.log('✅ Default onboarding data set');
            }
            
            // Initialize the app
            console.log('✅ Onboarding complete, initializing modular app');
            window.henceApp = new App();
            
            // Performance monitoring
            if (performance.memory) {
                console.log('📊 Initial memory usage:', {
                    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
                    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
                });
            }
            
            // Add global debugging helpers
            window.henceDebug = {
                getMemoryStats: () => window.henceApp.memoryManager.getMemoryStats(),
                getEventStats: () => window.henceApp.eventManager.getEventStats(),
                getRenderStats: () => window.henceApp.interfaceManager.getRenderStats(),
                getSocketStats: () => window.henceApp.socketManager.getConnectionStats(),
                getState: () => window.henceApp.stateManager.getState(),
                getStateHistory: () => window.henceApp.stateManager.getStateHistory(),
                performCleanup: () => window.henceApp.memoryManager.performCleanup(),
                logCurrentState: () => window.henceApp.stateManager.logCurrentState()
            };
            
            console.log('🎯 Modular app initialized successfully');
            console.log('💡 Debug helpers available at window.henceDebug');
            
        } catch (error) {
            console.error('❌ Failed to load modular app:', error);
            console.log('🔄 Falling back to original script...');
            
            // Fallback to original script
            const script = document.createElement('script');
            script.src = 'script.js';
            document.head.appendChild(script);
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadModularApp);
    } else {
        loadModularApp();
    }
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.henceApp && typeof window.henceApp.cleanup === 'function') {
        console.log('🧹 Performing app cleanup on page unload...');
        window.henceApp.cleanup();
    }
});

// Performance monitoring
window.addEventListener('load', () => {
    setTimeout(() => {
        if (performance.memory) {
            console.log('📊 Post-load memory usage:', {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
            });
        }
        
        // Log performance metrics
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
            console.log('⚡ Page performance:', {
                domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart) + 'ms',
                loadComplete: Math.round(navigation.loadEventEnd - navigation.loadEventStart) + 'ms'
            });
        }
    }, 1000);
}); 