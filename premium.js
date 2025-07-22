// Premium subscription management
class PremiumManager {
    constructor() {
        this.stripe = null;
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.currentStatus = document.getElementById('current-status');
        this.statusContent = document.getElementById('status-content');
        
        this.init();
    }
    
    async init() {
        // Initialize Stripe
        if (window.Stripe) {
            this.stripe = Stripe(STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');
        }
        
        // Load current subscription status
        await this.loadSubscriptionStatus();
        
        // Bind event listeners
        this.bindEvents();
    }
    
    bindEvents() {
        // Plan upgrade buttons
        document.querySelectorAll('[data-plan]').forEach(button => {
            button.addEventListener('click', async (e) => {
                const plan = e.target.getAttribute('data-plan');
                await this.upgradeToPlan(plan);
            });
        });
    }
    
    async loadSubscriptionStatus() {
        try {
            const token = localStorage.getItem('hence_auth_token');
            if (!token) {
                // User not logged in - redirect to auth
                window.location.href = '/auth.html';
                return;
            }
            
            const response = await fetch('/api/premium/status', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateStatusDisplay(data);
                this.updatePlanButtons(data.isPremium);
            } else if (response.status === 401) {
                // Token expired - redirect to auth
                localStorage.removeItem('hence_auth_token');
                window.location.href = '/auth.html';
            }
        } catch (error) {
            console.error('Error loading subscription status:', error);
        }
    }
    
    updateStatusDisplay(statusData) {
        if (!statusData.isPremium) {
            this.currentStatus.style.display = 'none';
            return;
        }
        
        this.currentStatus.style.display = 'block';
        
        const subscription = statusData.subscription;
        const premiumUntil = new Date(statusData.premiumUntil);
        
        let statusHTML = `
            <div class="status-info">
                <div class="status-badge premium">Premium Active</div>
                <p>Your premium subscription is active until ${premiumUntil.toLocaleDateString()}</p>
        `;
        
        if (subscription) {
            statusHTML += `
                <div class="subscription-details">
                    <p><strong>Status:</strong> ${subscription.status}</p>
                    <p><strong>Next billing:</strong> ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                    ${subscription.cancelAtPeriodEnd ? '<p class="cancel-notice">⚠️ Subscription will be canceled at the end of the current period</p>' : ''}
                </div>
            `;
            
            if (!subscription.cancelAtPeriodEnd) {
                statusHTML += `
                    <button class="cancel-btn" onclick="premiumManager.cancelSubscription()">
                        Cancel Subscription
                    </button>
                `;
            }
        }
        
        statusHTML += '</div>';
        this.statusContent.innerHTML = statusHTML;
    }
    
    updatePlanButtons(isPremium) {
        const freeButton = document.querySelector('.free-plan .plan-btn');
        const premiumButton = document.querySelector('.premium-plan .plan-btn');
        const proButton = document.querySelector('.pro-plan .plan-btn');
        
        if (isPremium) {
            freeButton.textContent = 'Downgrade to Free';
            freeButton.disabled = false;
            freeButton.classList.remove('current-plan');
            
            premiumButton.textContent = 'Current Plan';
            premiumButton.disabled = true;
            premiumButton.classList.add('current-plan');
            
            proButton.textContent = 'Upgrade to Pro';
        } else {
            freeButton.textContent = 'Current Plan';
            freeButton.disabled = true;
            freeButton.classList.add('current-plan');
            
            premiumButton.textContent = 'Upgrade to Premium';
            premiumButton.disabled = false;
            premiumButton.classList.remove('current-plan');
        }
    }
    
    async upgradeToPlan(plan) {
        if (!this.stripe) {
            this.showError('Payment system not available. Please try again later.');
            return;
        }
        
        try {
            this.showLoading(true);
            
            const token = localStorage.getItem('hence_auth_token');
            if (!token) {
                window.location.href = '/auth.html';
                return;
            }
            
            // Create checkout session
            const response = await fetch('/api/premium/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ plan })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create checkout session');
            }
            
            const { sessionId } = await response.json();
            
            // Redirect to Stripe Checkout
            const { error } = await this.stripe.redirectToCheckout({
                sessionId: sessionId
            });
            
            if (error) {
                throw error;
            }
            
        } catch (error) {
            console.error('Error creating checkout session:', error);
            this.showError('Failed to start checkout process. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }
    
    async cancelSubscription() {
        if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.')) {
            return;
        }
        
        try {
            this.showLoading(true);
            
            const token = localStorage.getItem('hence_auth_token');
            const response = await fetch('/api/premium/cancel', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                this.showSuccess('Subscription canceled successfully. You will retain access until the end of your billing period.');
                await this.loadSubscriptionStatus(); // Refresh status
            } else {
                throw new Error('Failed to cancel subscription');
            }
            
        } catch (error) {
            console.error('Error canceling subscription:', error);
            this.showError('Failed to cancel subscription. Please try again or contact support.');
        } finally {
            this.showLoading(false);
        }
    }
    
    showLoading(show) {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }
    
    showError(message) {
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">⚠️</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    showSuccess(message) {
        // Create success notification
        const successDiv = document.createElement('div');
        successDiv.className = 'success-notification';
        successDiv.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">✅</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(successDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (successDiv.parentElement) {
                successDiv.remove();
            }
        }, 5000);
    }
}

// Utility functions
function goBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = '/';
    }
}

// Handle URL parameters for success/cancel pages
function handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
        // Show success message
        premiumManager.showSuccess('Subscription activated successfully! Welcome to Premium!');
        // Remove session_id from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Reload status
        setTimeout(() => {
            premiumManager.loadSubscriptionStatus();
        }, 1000);
    }
    
    if (window.location.pathname.includes('cancel')) {
        premiumManager.showError('Subscription upgrade was canceled. You can try again anytime.');
    }
}

// Initialize when page loads
let premiumManager;

document.addEventListener('DOMContentLoaded', () => {
    premiumManager = new PremiumManager();
    handleUrlParams();
});

// Add some configuration - this would normally be loaded from environment
const STRIPE_PUBLISHABLE_KEY = 'pk_test_placeholder'; // Replace with actual publishable key 