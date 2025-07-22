class OnboardingFlow {
    constructor() {
        this.currentScreen = 'welcome';
        this.userData = {};
        this.userId = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.showScreen('welcome');
    }

    bindEvents() {
        // Welcome screen
        document.getElementById('get-started-btn').addEventListener('click', () => {
            this.showScreen('path');
        });

        // Path selection
        document.querySelectorAll('.path-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const path = e.currentTarget.dataset.path;
                this.selectPath(path);
            });
        });

        // Back buttons
        document.getElementById('back-to-welcome').addEventListener('click', () => {
            this.showScreen('welcome');
        });

        document.getElementById('back-to-path').addEventListener('click', () => {
            this.showScreen('path');
        });

        document.getElementById('back-to-profile').addEventListener('click', () => {
            this.showScreen('profile');
        });

        // Profile form
        document.getElementById('profile-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProfileSubmit();
        });

        // Consent checkbox
        document.getElementById('consent-checkbox').addEventListener('change', (e) => {
            document.getElementById('start-hence-btn').disabled = !e.target.checked;
        });

        // Start Hence button
        document.getElementById('start-hence-btn').addEventListener('click', () => {
            this.handleConsentSubmit();
        });
    }

    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active', 'prev');
        });

        // Show target screen
        const targetScreen = document.getElementById(`${screenName}-screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }

        this.currentScreen = screenName;
    }

    selectPath(path) {
        // Remove previous selection
        document.querySelectorAll('.path-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Select current option
        event.currentTarget.classList.add('selected');

        // Store user path
        this.userData.path = path;

        // Show appropriate next screen
        if (path === 'anonymous') {
            this.userData.userType = 'anonymous';
            this.showScreen('consent');
        } else {
            this.userData.userType = 'profile';
            this.showScreen('profile');
        }
    }

    async handleProfileSubmit() {
        const form = document.getElementById('profile-form');
        const formData = new FormData(form);

        // Validate form
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Collect form data
        this.userData.displayName = formData.get('display-name') || document.getElementById('display-name').value;
        this.userData.genderIdentity = formData.get('gender-identity') || document.getElementById('gender-identity').value;
        this.userData.matchPreference = formData.get('match-preference') || document.getElementById('match-preference').value;

        // Validate required fields
        if (!this.userData.displayName || !this.userData.genderIdentity || !this.userData.matchPreference) {
            this.showError('Please fill in all required fields.');
            return;
        }

        this.showScreen('consent');
    }

    async handleConsentSubmit() {
        if (!document.getElementById('consent-checkbox').checked) {
            this.showError('Please agree to the terms before continuing.');
            return;
        }

        this.showScreen('loading');

        try {
            // Start onboarding process
            const startResponse = await this.startOnboarding();
            
            if (startResponse.userType === 'profile') {
                // Update profile
                await this.updateProfile();
            }

            // Give consent
            await this.giveConsent();

            // Redirect to main app
            this.redirectToMainApp();

        } catch (error) {
            console.error('Onboarding error:', error);
            this.showError('There was an error setting up your account. Please try again.');
            this.showScreen('welcome');
        }
    }

    async startOnboarding() {
        const response = await fetch('/api/onboarding/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                path: this.userData.userType
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to start onboarding');
        }

        const data = await response.json();
        this.userId = data.userId;
        return data;
    }

    async updateProfile() {
        const response = await fetch('/api/onboarding/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: this.userId,
                displayName: this.userData.displayName,
                genderIdentity: this.userData.genderIdentity,
                matchPreference: this.userData.matchPreference
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to update profile');
        }

        return await response.json();
    }

    async giveConsent() {
        const response = await fetch('/api/onboarding/consent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: this.userId
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to record consent');
        }

        return await response.json();
    }

    redirectToMainApp() {
        // Store user data in localStorage for the main app
        localStorage.setItem('hence_user_id', this.userId);
        localStorage.setItem('hence_user_type', this.userData.userType);
        localStorage.setItem('hence_onboarding_complete', 'true');
        
        if (this.userData.displayName) {
            localStorage.setItem('hence_display_name', this.userData.displayName);
        }

        console.log('✅ Onboarding complete! User data stored:', {
            userId: this.userId,
            userType: this.userData.userType,
            displayName: this.userData.displayName
        });

        // Ensure localStorage is persisted before redirect
        setTimeout(() => {
            console.log('🔄 Redirecting to main app...');
            window.location.href = '/';
        }, 1500);
    }

    // Utility method to show error messages
    showError(message) {
        // Remove existing error messages
        const existingErrors = document.querySelectorAll('.error-notification');
        existingErrors.forEach(error => error.remove());

        // Create a simple error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4757;
            color: white;
            padding: 1rem;
            border-radius: 8px;
            z-index: 1000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        // Add slide-in animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        setTimeout(() => {
            errorDiv.remove();
            style.remove();
        }, 5000);
    }
}

// Initialize onboarding when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OnboardingFlow();
});

// Handle form validation for profile screen
document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profile-form');
    const inputs = profileForm.querySelectorAll('input, select');
    
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            if (input.checkValidity()) {
                input.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            } else {
                input.style.borderColor = '#ff4757';
            }
        });
    });
}); 