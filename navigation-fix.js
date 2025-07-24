/**
 * Navigation Fix - Direct event handlers for navigation buttons
 * This is a temporary fix to ensure navigation works while debugging the modular system
 */

console.log('🚀 Navigation Fix loading...');

// Wait for DOM to be ready
function initNavigationFix() {
    console.log('🔧 Initializing navigation fix...');
    
    // Get all navigation buttons
    const navButtons = document.querySelectorAll('.nav-item[data-section]');
    console.log(`📍 Found ${navButtons.length} navigation buttons`);
    
    if (navButtons.length === 0) {
        console.warn('⚠️ No navigation buttons found with data-section attribute');
        return;
    }
    
    // Set up click handlers for each button
    navButtons.forEach((button, index) => {
        const section = button.getAttribute('data-section');
        console.log(`🔗 Setting up handler for button ${index + 1}: ${section}`);
        
        // Remove any existing listeners by cloning the button
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Add new click handler
        newButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log(`🎯 Navigation button clicked: ${section}`);
            
            try {
                // Update active state
                updateActiveNavButton(newButton);
                
                // Handle navigation
                handleNavigationSection(section);
                
            } catch (error) {
                console.error('❌ Error handling navigation:', error);
            }
        });
    });
    
    console.log('✅ Navigation fix initialized successfully');
}

function updateActiveNavButton(activeButton) {
    // Remove active class from all nav buttons
    const navButtons = document.querySelectorAll('.nav-item');
    navButtons.forEach(button => button.classList.remove('active'));
    
    // Add active class to clicked button
    activeButton.classList.add('active');
    
    console.log(`🎨 Updated active state for: ${activeButton.getAttribute('data-section')}`);
}

function handleNavigationSection(section) {
    console.log(`🧭 Handling navigation to: ${section}`);
    
    // Hide all overlays first
    hideAllOverlays();
    
    // Handle each section
    switch (section) {
        case 'connect':
            showMainInterface();
            break;
        case 'preferences':
            showPreferencesDrawer();
            break;
        case 'history':
            showHistorySection();
            break;
        case 'info':
            showInfoSection();
            break;
        default:
            console.warn(`⚠️ Unknown navigation section: ${section}`);
    }
}

function hideAllOverlays() {
    const overlays = [
        'preferencesDrawer',
        'historySection',
        'infoSection'
    ];
    
    overlays.forEach(overlayId => {
        const overlay = document.getElementById(overlayId);
        if (overlay) {
            overlay.style.display = 'none';
            overlay.setAttribute('aria-hidden', 'true');
            overlay.classList.remove('open');
        }
    });
    
    console.log('🙈 All overlays hidden');
}

function showMainInterface() {
    console.log('🏠 Showing main interface');
    // Main interface is always visible, just ensure overlays are hidden
    // The main content should already be visible
}

function showPreferencesDrawer() {
    console.log('⚙️ Showing preferences drawer');
    
    const preferencesDrawer = document.getElementById('preferencesDrawer');
    if (preferencesDrawer) {
        preferencesDrawer.style.display = 'block';
        preferencesDrawer.removeAttribute('aria-hidden');
        preferencesDrawer.classList.add('open');
        
        // Set up close button
        setupCloseHandler('closeDrawer', () => {
            preferencesDrawer.classList.remove('open');
            preferencesDrawer.style.display = 'none';
            preferencesDrawer.setAttribute('aria-hidden', 'true');
            
            // Reset active state to connect
            updateActiveStateToConnect();
        });
        
        console.log('✅ Preferences drawer shown');
    } else {
        console.error('❌ Preferences drawer not found');
    }
}

function showHistorySection() {
    console.log('🕐 Showing history section');
    
    // Check if user is verified (basic check)
    const userType = localStorage.getItem('hence_user_type');
    const displayName = localStorage.getItem('hence_display_name');
    const isVerified = userType === 'profile' && displayName;
    
    if (!isVerified) {
        console.log('ℹ️ History requires profile user, showing info message');
        showToast('History is only available for profile users', 'info');
        // Reset to connect
        updateActiveStateToConnect();
        return;
    }
    
    const historySection = document.getElementById('historySection');
    if (historySection) {
        historySection.style.display = 'block';
        historySection.removeAttribute('aria-hidden');
        
        // Set up close button
        setupCloseHandler('closeHistory', () => {
            historySection.style.display = 'none';
            historySection.setAttribute('aria-hidden', 'true');
            
            // Reset active state to connect
            updateActiveStateToConnect();
        });
        
        console.log('✅ History section shown');
    } else {
        console.error('❌ History section not found');
    }
}

function showInfoSection() {
    console.log('ℹ️ Showing info section');
    
    const infoSection = document.getElementById('infoSection');
    if (infoSection) {
        infoSection.style.display = 'block';
        infoSection.removeAttribute('aria-hidden');
        
        // Set up close button
        setupCloseHandler('closeInfo', () => {
            infoSection.style.display = 'none';
            infoSection.setAttribute('aria-hidden', 'true');
            
            // Reset active state to connect
            updateActiveStateToConnect();
        });
        
        console.log('✅ Info section shown');
    } else {
        console.error('❌ Info section not found');
    }
}

function setupCloseHandler(buttonId, callback) {
    const closeButton = document.getElementById(buttonId);
    if (closeButton) {
        // Remove existing listeners by cloning
        const newButton = closeButton.cloneNode(true);
        closeButton.parentNode.replaceChild(newButton, closeButton);
        
        // Add new listener
        newButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log(`🔧 Close button clicked: ${buttonId}`);
            callback();
        });
        
        console.log(`🔗 Close handler set up for: ${buttonId}`);
    } else {
        console.warn(`⚠️ Close button not found: ${buttonId}`);
    }
}

function updateActiveStateToConnect() {
    const connectButton = document.querySelector('.nav-item[data-section="connect"]');
    if (connectButton) {
        updateActiveNavButton(connectButton);
    }
}

function showToast(message, type = 'info') {
    console.log(`📢 Toast: ${message} (${type})`);
    
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'info' ? '#17a2b8' : '#28a745'};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        font-size: 14px;
        max-width: 300px;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigationFix);
} else {
    initNavigationFix();
}

// Also expose globally for debugging
window.navigationFix = {
    reinitialize: initNavigationFix,
    showPreferences: showPreferencesDrawer,
    showHistory: showHistorySection,
    showInfo: showInfoSection,
    hideAll: hideAllOverlays
};

console.log('🔧 Navigation fix script loaded'); 