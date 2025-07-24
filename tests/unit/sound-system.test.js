// Unit Tests for Sound Management System
// Note: These tests mock the Web Audio API since we can't actually play sounds in Node.js

describe('Sound Management System', () => {
    let mockAudioContext;
    let mockGainNode;
    let mockAudioElement;
    let mockMediaElementSource;

    beforeEach(() => {
        // Mock Web Audio API
        mockGainNode = {
            connect: jest.fn(),
            disconnect: jest.fn(),
            gain: {
                setValueAtTime: jest.fn(),
                linearRampToValueAtTime: jest.fn(),
                value: 0.5
            }
        };

        mockMediaElementSource = {
            connect: jest.fn(),
            disconnect: jest.fn()
        };

        mockAudioContext = {
            createGain: jest.fn(() => mockGainNode),
            createMediaElementSource: jest.fn(() => mockMediaElementSource),
            destination: {},
            currentTime: 0,
            close: jest.fn(),
            resume: jest.fn().mockResolvedValue(undefined),
            state: 'running'
        };

        mockAudioElement = {
            play: jest.fn().mockResolvedValue(undefined),
            pause: jest.fn(),
            addEventListener: jest.fn(),
            volume: 0,
            loop: false,
            currentTime: 0
        };

        // Mock HTML Audio constructor
        global.Audio = jest.fn(() => mockAudioElement);
        global.AudioContext = jest.fn(() => mockAudioContext);
        global.webkitAudioContext = jest.fn(() => mockAudioContext);

        // Clear any previous instances
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Clean up mocks
        delete global.Audio;
        delete global.AudioContext;
        delete global.webkitAudioContext;
    });

    describe('SoundManager Initialization', () => {
        test('should initialize with default sounds', () => {
            const SoundManager = require('../../sounds');
            const soundManager = new SoundManager();

            expect(soundManager.sounds).toBeDefined();
            expect(soundManager.sounds.ocean).toBeDefined();
            expect(soundManager.sounds.whiteNoise).toBeDefined();
            expect(soundManager.sounds.rain).toBeDefined();
            
            // Check sound structure
            const oceanSound = soundManager.sounds.ocean;
            expect(oceanSound.name).toBe('Ocean Waves');
            expect(oceanSound.category).toBe('nature');
            expect(oceanSound.volume).toBe(0.3);
            expect(oceanSound.url).toBe('/public/sounds/ocean.mp3');
        });

        test('should initialize audio context', () => {
            const SoundManager = require('../../sounds');
            const soundManager = new SoundManager();

            expect(global.AudioContext).toHaveBeenCalled();
            expect(mockAudioContext.createGain).toHaveBeenCalled();
            expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
        });

        test('should set default global volume', () => {
            const SoundManager = require('../../sounds');
            const soundManager = new SoundManager();

            expect(soundManager.globalVolume).toBe(0.5);
            expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.5, 0);
        });
    });

    describe('Sound Categories', () => {
        let soundManager;

        beforeEach(() => {
            const SoundManager = require('../../sounds');
            soundManager = new SoundManager();
        });

        test('should return all categories', () => {
            const categories = soundManager.getCategories();
            
            expect(categories).toContain('nature');
            expect(categories).toContain('basic');
            expect(categories).toContain('noise');
            expect(categories).toContain('indoor');
        });

        test('should return sounds by category', () => {
            const natureSounds = soundManager.getSoundsByCategory('nature');
            const basicSounds = soundManager.getSoundsByCategory('basic');

            expect(natureSounds.length).toBeGreaterThan(0);
            expect(basicSounds.length).toBeGreaterThan(0);

            // Check that all returned sounds belong to the requested category
            natureSounds.forEach(sound => {
                expect(soundManager.sounds[sound.id].category).toBe('nature');
            });

            basicSounds.forEach(sound => {
                expect(soundManager.sounds[sound.id].category).toBe('basic');
            });
        });
    });

    describe('Sound Playback', () => {
        let soundManager;

        beforeEach(() => {
            const SoundManager = require('../../sounds');
            soundManager = new SoundManager();
        });

        test('should play a sound successfully', async () => {
            await soundManager.playSound('whiteNoise');

            expect(global.Audio).toHaveBeenCalledWith('/public/sounds/white-noise.mp3');
            expect(mockAudioElement.loop).toBe(true);
            expect(mockAudioElement.volume).toBe(0);
            expect(mockAudioContext.createMediaElementSource).toHaveBeenCalledWith(mockAudioElement);
            expect(mockMediaElementSource.connect).toHaveBeenCalledWith(mockGainNode);
            expect(mockGainNode.connect).toHaveBeenCalledWith(soundManager.masterGainNode);
            expect(mockAudioElement.play).toHaveBeenCalled();
        });

        test('should throw error for non-existent sound', async () => {
            await expect(soundManager.playSound('nonexistent')).rejects.toThrow('Sound nonexistent not found');
        });

        test('should not play sound that is already playing', async () => {
            await soundManager.playSound('whiteNoise');
            jest.clearAllMocks();

            await soundManager.playSound('whiteNoise');
            
            expect(mockAudioElement.play).not.toHaveBeenCalled();
        });

        test('should track active sounds', async () => {
            expect(soundManager.isAnySoundPlaying()).toBe(false);
            expect(soundManager.getPlayingSounds()).toHaveLength(0);

            await soundManager.playSound('whiteNoise');

            expect(soundManager.isAnySoundPlaying()).toBe(true);
            expect(soundManager.getPlayingSounds()).toContain('whiteNoise');
        });
    });

    describe('Sound Control', () => {
        let soundManager;

        beforeEach(async () => {
            const SoundManager = require('../../sounds');
            soundManager = new SoundManager();
            await soundManager.playSound('whiteNoise');
        });

        test('should stop playing sound', () => {
            soundManager.stopSound('whiteNoise');

            expect(mockAudioElement.pause).toHaveBeenCalled();
            expect(mockAudioElement.currentTime).toBe(0);
            expect(mockMediaElementSource.disconnect).toHaveBeenCalled();
            expect(mockGainNode.disconnect).toHaveBeenCalled();
            expect(soundManager.isAnySoundPlaying()).toBe(false);
        });

        test('should toggle sound on and off', async () => {
            // Sound is already playing from beforeEach
            const result1 = await soundManager.toggleSound('whiteNoise');
            expect(result1).toBe(false); // Now stopped
            expect(soundManager.isAnySoundPlaying()).toBe(false);

            jest.clearAllMocks();
            const result2 = await soundManager.toggleSound('whiteNoise');
            expect(result2).toBe(true); // Now playing
            expect(mockAudioElement.play).toHaveBeenCalled();
        });

        test('should set individual sound volume', () => {
            soundManager.setSoundVolume('whiteNoise', 0.8);

            expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.8, 0);
        });

        test('should set global volume', () => {
            soundManager.setGlobalVolume(0.3);

            expect(soundManager.globalVolume).toBe(0.3);
            expect(soundManager.masterGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.3, 0);
        });

        test('should stop all sounds', () => {
            soundManager.stopAllSounds();

            expect(mockAudioElement.pause).toHaveBeenCalled();
            expect(soundManager.isAnySoundPlaying()).toBe(false);
        });
    });

    // Note: Premium feature gating tests removed - this is now a freemium app
    // All sounds are available to all users without premium restrictions

    describe('Sound Fading', () => {
        let soundManager;

        beforeEach(() => {
            const SoundManager = require('../../sounds');
            soundManager = new SoundManager();
        });

        test('should fade in sound', async () => {
            await soundManager.fadeInSound('whiteNoise', 1000);

            expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
            expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.2, 1);
        });

        test('should fade out sound', async () => {
            await soundManager.playSound('whiteNoise');
            soundManager.fadeOutSound('whiteNoise', 1000);

            expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 1);
        });
    });

    describe('Error Handling', () => {
        let soundManager;

        beforeEach(() => {
            const SoundManager = require('../../sounds');
            soundManager = new SoundManager();
        });

        test('should handle audio play failure gracefully', async () => {
            mockAudioElement.play.mockRejectedValue(new Error('Play failed'));

            await expect(soundManager.playSound('whiteNoise')).rejects.toThrow('Play failed');
            expect(soundManager.activeSounds.has('whiteNoise')).toBe(false);
        });

        test('should handle missing sound gracefully in stop', () => {
            expect(() => soundManager.stopSound('nonexistent')).not.toThrow();
        });

        test('should handle missing sound gracefully in volume control', () => {
            expect(() => soundManager.setSoundVolume('nonexistent', 0.5)).not.toThrow();
        });
    });

    describe('Cleanup', () => {
        let soundManager;

        beforeEach(async () => {
            const SoundManager = require('../../sounds');
            soundManager = new SoundManager();
            await soundManager.playSound('whiteNoise');
        });

        test('should cleanup all resources on destroy', () => {
            soundManager.destroy();

            expect(mockAudioElement.pause).toHaveBeenCalled();
            expect(mockAudioContext.close).toHaveBeenCalled();
            expect(soundManager.activeSounds.size).toBe(0);
            expect(soundManager.audioContext).toBeNull();
            expect(soundManager.masterGainNode).toBeNull();
        });
    });
}); 