/**
 * Quick test script to verify navigation buttons are working
 */

console.log('🧪 Testing navigation buttons...');

function testNavigationButtons() {
    const sections = ['connect', 'preferences', 'history', 'info'];
    
    console.log('🔍 Looking for navigation buttons...');
    
    sections.forEach(section => {
        const button = document.querySelector(`[data-section="${section}"]`);
        if (button) {
            console.log(`✅ Found button for: ${section}`);
            
            // Test if button has click handler
            const hasClickEvents = button.onclick !== null;
            console.log(`   Click handler: ${hasClickEvents ? 'Yes' : 'No'}`);
            
        } else {
            console.log(`❌ Button not found for: ${section}`);
        }
    });
    
    console.log('🎯 Testing programmatic clicks...');
    
    // Test each button with a delay
    sections.forEach((section, index) => {
        setTimeout(() => {
            const button = document.querySelector(`[data-section="${section}"]`);
            if (button) {
                console.log(`🖱️ Clicking ${section} button...`);
                button.click();
            }
        }, (index + 1) * 1500);
    });
}

// Run test when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(testNavigationButtons, 1000);
    });
} else {
    setTimeout(testNavigationButtons, 1000);
}

// Expose test function globally
window.testNavButtons = testNavigationButtons; 