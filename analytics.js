// Sleep Analytics System for Co-Sleep App
class AnalyticsManager {
    constructor() {
        this.sessions = [];
        this.currentSession = null;
        this.analyticsData = {
            totalSessions: 0,
            totalDuration: 0,
            averageDuration: 0,
            averageQuality: 0,
            weeklyStats: {},
            monthlyStats: {},
            sleepPatterns: {}
        };
        
        this.loadAnalytics();
    }

    // Initialize analytics
    init() {
        this.loadFromStorage();
        this.updateAnalyticsDisplay();
        console.log('📊 Analytics Manager initialized');
    }

    // Start tracking a new session
    startSession(partnerId = null) {
        this.currentSession = {
            id: this.generateSessionId(),
            startTime: new Date(),
            endTime: null,
            duration: 0,
            quality: null,
            partnerId: partnerId,
            notes: '',
            connectionQuality: null,
            backgroundSound: window.soundManager?.currentSound || null
        };
        
        console.log('📊 Session started:', this.currentSession.id);
    }

    // End current session
    endSession(quality = null, notes = '') {
        if (!this.currentSession) return;

        this.currentSession.endTime = new Date();
        this.currentSession.duration = Math.round(
            (this.currentSession.endTime - this.currentSession.startTime) / 1000 / 60
        ); // Duration in minutes
        this.currentSession.quality = quality;
        this.currentSession.notes = notes;

        // Add to sessions array
        this.sessions.push({ ...this.currentSession });
        
        // Update analytics
        this.updateAnalytics();
        this.saveToStorage();
        
        console.log('📊 Session ended:', {
            duration: this.currentSession.duration + ' minutes',
            quality: quality
        });

        this.currentSession = null;
    }

    // Rate session quality
    rateSession(quality) {
        if (this.currentSession) {
            this.currentSession.quality = quality;
        }
    }

    // Add notes to current session
    addNotes(notes) {
        if (this.currentSession) {
            this.currentSession.notes = notes;
        }
    }

    // Update connection quality
    updateConnectionQuality(quality) {
        if (this.currentSession) {
            this.currentSession.connectionQuality = quality;
        }
    }

    // Generate unique session ID
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Update analytics calculations
    updateAnalytics() {
        const completedSessions = this.sessions.filter(s => s.endTime && s.duration > 0);
        
        this.analyticsData = {
            totalSessions: completedSessions.length,
            totalDuration: completedSessions.reduce((sum, s) => sum + s.duration, 0),
            averageDuration: completedSessions.length > 0 ? 
                Math.round(completedSessions.reduce((sum, s) => sum + s.duration, 0) / completedSessions.length) : 0,
            averageQuality: completedSessions.filter(s => s.quality).length > 0 ?
                Math.round(completedSessions.filter(s => s.quality).reduce((sum, s) => sum + s.quality, 0) / completedSessions.filter(s => s.quality).length * 10) / 10 : 0,
            weeklyStats: this.calculateWeeklyStats(),
            monthlyStats: this.calculateMonthlyStats(),
            sleepPatterns: this.analyzeSleepPatterns()
        };
    }

    // Calculate weekly statistics
    calculateWeeklyStats() {
        const now = new Date();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const weekSessions = this.sessions.filter(s => 
            s.endTime && s.endTime >= weekStart && s.endTime < weekEnd
        );

        return {
            sessions: weekSessions.length,
            totalDuration: weekSessions.reduce((sum, s) => sum + s.duration, 0),
            averageDuration: weekSessions.length > 0 ? 
                Math.round(weekSessions.reduce((sum, s) => sum + s.duration, 0) / weekSessions.length) : 0,
            averageQuality: weekSessions.filter(s => s.quality).length > 0 ?
                Math.round(weekSessions.filter(s => s.quality).reduce((sum, s) => sum + s.quality, 0) / weekSessions.filter(s => s.quality).length * 10) / 10 : 0
        };
    }

    // Calculate monthly statistics
    calculateMonthlyStats() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const monthSessions = this.sessions.filter(s => 
            s.endTime && s.endTime >= monthStart && s.endTime <= monthEnd
        );

        return {
            sessions: monthSessions.length,
            totalDuration: monthSessions.reduce((sum, s) => sum + s.duration, 0),
            averageDuration: monthSessions.length > 0 ? 
                Math.round(monthSessions.reduce((sum, s) => sum + s.duration, 0) / monthSessions.length) : 0,
            averageQuality: monthSessions.filter(s => s.quality).length > 0 ?
                Math.round(monthSessions.filter(s => s.quality).reduce((sum, s) => sum + s.quality, 0) / monthSessions.filter(s => s.quality).length * 10) / 10 : 0
        };
    }

    // Analyze sleep patterns
    analyzeSleepPatterns() {
        const completedSessions = this.sessions.filter(s => s.endTime && s.duration > 0);
        
        // Group by hour of day
        const hourlyStats = {};
        for (let i = 0; i < 24; i++) {
            hourlyStats[i] = { sessions: 0, totalDuration: 0 };
        }
        
        completedSessions.forEach(session => {
            const hour = session.startTime.getHours();
            hourlyStats[hour].sessions++;
            hourlyStats[hour].totalDuration += session.duration;
        });

        // Find peak sleep hours
        const peakHours = Object.entries(hourlyStats)
            .filter(([hour, stats]) => stats.sessions > 0)
            .sort((a, b) => b[1].sessions - a[1].sessions)
            .slice(0, 3)
            .map(([hour, stats]) => ({
                hour: parseInt(hour),
                sessions: stats.sessions,
                averageDuration: Math.round(stats.totalDuration / stats.sessions)
            }));

        return {
            totalSessions: completedSessions.length,
            averageSessionDuration: completedSessions.length > 0 ? 
                Math.round(completedSessions.reduce((sum, s) => sum + s.duration, 0) / completedSessions.length) : 0,
            peakHours: peakHours,
            hourlyStats: hourlyStats
        };
    }

    // Get analytics data
    getAnalytics() {
        return this.analyticsData;
    }

    // Get recent sessions
    getRecentSessions(limit = 10) {
        return this.sessions
            .filter(s => s.endTime)
            .sort((a, b) => b.endTime - a.endTime)
            .slice(0, limit);
    }

    // Update analytics display
    updateAnalyticsDisplay() {
        const analytics = this.getAnalytics();
        
        // Update summary cards
        this.updateSummaryCard('total-sessions', analytics.totalSessions);
        this.updateSummaryCard('total-duration', this.formatDuration(analytics.totalDuration));
        this.updateSummaryCard('avg-duration', this.formatDuration(analytics.averageDuration));
        this.updateSummaryCard('avg-quality', analytics.averageQuality.toFixed(1) + ' ⭐');

        // Update weekly stats
        this.updateWeeklyStats(analytics.weeklyStats);
        
        // Update recent sessions
        this.updateRecentSessions();
        
        // Update sleep patterns
        this.updateSleepPatterns(analytics.sleepPatterns);
    }

    // Update summary card
    updateSummaryCard(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // Update weekly stats
    updateWeeklyStats(weeklyStats) {
        const weeklyElement = document.getElementById('weekly-stats');
        if (weeklyElement) {
            weeklyElement.innerHTML = `
                <div class="stat-item">
                    <span class="stat-label">Sessions</span>
                    <span class="stat-value">${weeklyStats.sessions}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Duration</span>
                    <span class="stat-value">${this.formatDuration(weeklyStats.totalDuration)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Avg Duration</span>
                    <span class="stat-value">${this.formatDuration(weeklyStats.averageDuration)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Avg Quality</span>
                    <span class="stat-value">${weeklyStats.averageQuality.toFixed(1)} ⭐</span>
                </div>
            `;
        }
    }

    // Update recent sessions
    updateRecentSessions() {
        const recentSessions = this.getRecentSessions(5);
        const container = document.getElementById('recent-sessions');
        
        if (container) {
            if (recentSessions.length === 0) {
                container.innerHTML = '<p class="no-data">No sessions yet. Start your first co-sleep session!</p>';
                return;
            }

            container.innerHTML = recentSessions.map(session => `
                <div class="session-item">
                    <div class="session-header">
                        <span class="session-date">${this.formatDate(session.endTime)}</span>
                        <span class="session-duration">${this.formatDuration(session.duration)}</span>
                    </div>
                    <div class="session-details">
                        ${session.quality ? `<span class="session-quality">${'⭐'.repeat(session.quality)}</span>` : ''}
                        ${session.notes ? `<span class="session-notes">"${session.notes}"</span>` : ''}
                    </div>
                </div>
            `).join('');
        }
    }

    // Update sleep patterns
    updateSleepPatterns(patterns) {
        const container = document.getElementById('sleep-patterns');
        if (container) {
            if (patterns.totalSessions === 0) {
                container.innerHTML = '<p class="no-data">No sleep patterns yet. Complete some sessions to see insights!</p>';
                return;
            }

            const peakHoursText = patterns.peakHours.map(peak => 
                `${peak.hour}:00 (${peak.sessions} sessions)`
            ).join(', ');

            container.innerHTML = `
                <div class="pattern-item">
                    <span class="pattern-label">Peak Sleep Hours</span>
                    <span class="pattern-value">${peakHoursText}</span>
                </div>
                <div class="pattern-item">
                    <span class="pattern-label">Average Session</span>
                    <span class="pattern-value">${this.formatDuration(patterns.averageSessionDuration)}</span>
                </div>
                <div class="pattern-item">
                    <span class="pattern-label">Total Sessions</span>
                    <span class="pattern-value">${patterns.totalSessions}</span>
                </div>
            `;
        }
    }

    // Format duration for display
    formatDuration(minutes) {
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    // Format date for display
    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }).format(date);
    }

    // Save to localStorage
    saveToStorage() {
        try {
            localStorage.setItem('coSleepAnalytics', JSON.stringify({
                sessions: this.sessions,
                analyticsData: this.analyticsData
            }));
        } catch (error) {
            console.error('Error saving analytics:', error);
        }
    }

    // Load from localStorage
    loadFromStorage() {
        try {
            const data = localStorage.getItem('coSleepAnalytics');
            if (data) {
                const parsed = JSON.parse(data);
                this.sessions = parsed.sessions || [];
                this.analyticsData = parsed.analyticsData || this.analyticsData;
                
                // Convert date strings back to Date objects
                this.sessions.forEach(session => {
                    if (session.startTime) session.startTime = new Date(session.startTime);
                    if (session.endTime) session.endTime = new Date(session.endTime);
                });
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    // Load analytics (for compatibility)
    loadAnalytics() {
        this.loadFromStorage();
    }

    // Export analytics data
    exportAnalytics() {
        return {
            sessions: this.sessions,
            analytics: this.analyticsData,
            exportDate: new Date().toISOString()
        };
    }

    // Clear all analytics data
    clearAnalytics() {
        this.sessions = [];
        this.currentSession = null;
        this.analyticsData = {
            totalSessions: 0,
            totalDuration: 0,
            averageDuration: 0,
            averageQuality: 0,
            weeklyStats: {},
            monthlyStats: {},
            sleepPatterns: {}
        };
        localStorage.removeItem('coSleepAnalytics');
        this.updateAnalyticsDisplay();
    }
}

// Global analytics manager instance
window.analyticsManager = new AnalyticsManager(); 