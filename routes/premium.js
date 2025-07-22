const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateUser } = require('../lib/auth');
const prisma = new PrismaClient();

// Stripe configuration
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

// Premium plan configurations
const PREMIUM_PLANS = {
    premium: {
        name: 'Premium',
        price: 999, // $9.99 in cents
        currency: 'usd',
        interval: 'month',
        features: [
            'Priority matching',
            'Extended session times',
            'Advanced sleep analytics',
            'Background sounds',
            'Custom preferences'
        ]
    },
    pro: {
        name: 'Pro',
        price: 1999, // $19.99 in cents
        currency: 'usd',
        interval: 'month',
        features: [
            'All Premium features',
            'Unlimited session length',
            'Advanced matching algorithms',
            'Priority support',
            'Early access to features'
        ]
    }
};

// GET /api/premium/plans - Get available subscription plans
router.get('/plans', (req, res) => {
    try {
        res.json({
            plans: PREMIUM_PLANS,
            success: true
        });
    } catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
});

// POST /api/premium/create-checkout-session - Create Stripe checkout session
router.post('/create-checkout-session', authenticateUser, async (req, res) => {
    if (!stripe) {
        return res.status(500).json({ error: 'Stripe not configured' });
    }

    try {
        const { plan } = req.body;
        const userId = req.user.id;

        if (!PREMIUM_PLANS[plan]) {
            return res.status(400).json({ error: 'Invalid plan selected' });
        }

        const planConfig = PREMIUM_PLANS[plan];

        // Create or retrieve Stripe customer
        let customer;
        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, stripeCustomerId: true }
        });

        if (existingUser.stripeCustomerId) {
            customer = await stripe.customers.retrieve(existingUser.stripeCustomerId);
        } else {
            customer = await stripe.customers.create({
                email: existingUser.email,
                metadata: {
                    userId: userId
                }
            });

            // Save Stripe customer ID
            await prisma.user.update({
                where: { id: userId },
                data: { stripeCustomerId: customer.id }
            });
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: planConfig.currency,
                        product_data: {
                            name: `Hence ${planConfig.name}`,
                            description: `Monthly subscription to Hence ${planConfig.name}`,
                        },
                        unit_amount: planConfig.price,
                        recurring: {
                            interval: planConfig.interval,
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${req.headers.origin}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/premium/cancel`,
            metadata: {
                userId: userId,
                plan: plan
            }
        });

        res.json({
            sessionId: session.id,
            url: session.url,
            success: true
        });

    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// POST /api/premium/webhook - Stripe webhook handler
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    if (!stripe) {
        return res.status(500).json({ error: 'Stripe not configured' });
    }

    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;
            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionCanceled(event.data.object);
                break;
            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;
            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({received: true});
    } catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).json({ error: 'Webhook handler failed' });
    }
});

// Handle successful checkout
async function handleCheckoutCompleted(session) {
    const userId = session.metadata.userId;
    const plan = session.metadata.plan;

    console.log(`Checkout completed for user ${userId}, plan ${plan}`);

    // Update user premium status
    const premiumUntil = new Date();
    premiumUntil.setMonth(premiumUntil.getMonth() + 1); // Add one month

    await prisma.user.update({
        where: { id: userId },
        data: {
            isPremium: true,
            premiumUntil: premiumUntil,
            stripeSubscriptionId: session.subscription
        }
    });
}

// Handle subscription creation
async function handleSubscriptionCreated(subscription) {
    const customerId = subscription.customer;
    
    // Find user by Stripe customer ID
    const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId }
    });

    if (user) {
        const premiumUntil = new Date(subscription.current_period_end * 1000);
        
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isPremium: true,
                premiumUntil: premiumUntil,
                stripeSubscriptionId: subscription.id
            }
        });
        
        console.log(`Subscription created for user ${user.id}`);
    }
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription) {
    const user = await prisma.user.findFirst({
        where: { stripeSubscriptionId: subscription.id }
    });

    if (user) {
        const premiumUntil = new Date(subscription.current_period_end * 1000);
        const isActive = subscription.status === 'active';
        
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isPremium: isActive,
                premiumUntil: premiumUntil
            }
        });
        
        console.log(`Subscription updated for user ${user.id}, active: ${isActive}`);
    }
}

// Handle subscription cancellation
async function handleSubscriptionCanceled(subscription) {
    const user = await prisma.user.findFirst({
        where: { stripeSubscriptionId: subscription.id }
    });

    if (user) {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isPremium: false,
                premiumUntil: null,
                stripeSubscriptionId: null
            }
        });
        
        console.log(`Subscription canceled for user ${user.id}`);
    }
}

// Handle successful payment
async function handlePaymentSucceeded(invoice) {
    const subscriptionId = invoice.subscription;
    
    if (subscriptionId) {
        const user = await prisma.user.findFirst({
            where: { stripeSubscriptionId: subscriptionId }
        });

        if (user) {
            // Extend premium until next billing period
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const premiumUntil = new Date(subscription.current_period_end * 1000);
            
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    isPremium: true,
                    premiumUntil: premiumUntil
                }
            });
            
            console.log(`Payment succeeded for user ${user.id}`);
        }
    }
}

// Handle failed payment
async function handlePaymentFailed(invoice) {
    const subscriptionId = invoice.subscription;
    
    if (subscriptionId) {
        const user = await prisma.user.findFirst({
            where: { stripeSubscriptionId: subscriptionId }
        });

        if (user) {
            console.log(`Payment failed for user ${user.id}`);
            // Optionally send notification or grace period logic
        }
    }
}

// GET /api/premium/status - Get user's premium status
router.get('/status', authenticateUser, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                isPremium: true,
                premiumUntil: true,
                stripeSubscriptionId: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let subscriptionStatus = null;
        if (user.stripeSubscriptionId && stripe) {
            try {
                const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
                subscriptionStatus = {
                    status: subscription.status,
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    cancelAtPeriodEnd: subscription.cancel_at_period_end
                };
            } catch (error) {
                console.error('Error retrieving subscription:', error);
            }
        }

        res.json({
            isPremium: user.isPremium,
            premiumUntil: user.premiumUntil,
            subscription: subscriptionStatus,
            success: true
        });

    } catch (error) {
        console.error('Error fetching premium status:', error);
        res.status(500).json({ error: 'Failed to fetch premium status' });
    }
});

// POST /api/premium/cancel - Cancel subscription
router.post('/cancel', authenticateUser, async (req, res) => {
    if (!stripe) {
        return res.status(500).json({ error: 'Stripe not configured' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { stripeSubscriptionId: true }
        });

        if (!user || !user.stripeSubscriptionId) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        // Cancel the subscription at the end of the current period
        await stripe.subscriptions.update(user.stripeSubscriptionId, {
            cancel_at_period_end: true
        });

        res.json({
            message: 'Subscription will be canceled at the end of the current period',
            success: true
        });

    } catch (error) {
        console.error('Error canceling subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

module.exports = router; 