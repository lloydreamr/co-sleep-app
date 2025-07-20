# Mobile Testing Guide for Hence

## 🚀 Quick Setup

### 1. Start the Server
```bash
npm start
```

### 2. Get Mobile Access URL
```bash
npm run qr
```

## 📱 Testing Instructions

### Step 1: Computer Setup
1. **Open your computer browser** and go to: `http://localhost:3000`
2. **Allow microphone access** when prompted
3. **Click "Connect me to someone"** to join the queue

### Step 2: Mobile Setup
1. **Make sure your phone is on the same WiFi** as your computer
2. **Open your mobile browser** (Safari, Chrome, Firefox)
3. **Go to**: `http://10.0.0.31:3000`
4. **Allow microphone access** when prompted
5. **Click "Connect me to someone"** to join the queue

### Step 3: Test the Connection
- **Watch for instant matching** - users should connect within seconds
- **Test voice communication** - speak into both devices
- **Test mute functionality** - try muting on both devices
- **Test call ending** - end call on one device and watch reconnection

## 🔧 Troubleshooting

### Mobile Can't Access the URL
- **Check WiFi**: Ensure both devices are on the same network
- **Try different browsers**: Safari, Chrome, Firefox
- **Check firewall**: Your computer's firewall might be blocking the connection

### Microphone Issues
- **Check permissions**: Make sure both devices allow microphone access
- **Try refreshing**: Refresh the page and allow permissions again
- **Check browser settings**: Some browsers require HTTPS for microphone

### Connection Problems
- **Check server logs**: Look at the terminal for connection messages
- **Restart server**: Stop with Ctrl+C and run `npm start` again
- **Clear browser cache**: Clear cache and cookies

## 📊 What to Test

### Core Functionality
- [ ] Mobile can access the website
- [ ] Microphone permissions work on both devices
- [ ] Users get matched between mobile and desktop
- [ ] Voice communication works in both directions
- [ ] Mute button works on both devices
- [ ] End call button works on both devices
- [ ] Users return to queue after call ends

### User Experience
- [ ] Interface looks good on mobile
- [ ] Buttons are easy to tap on mobile
- [ ] Animations are smooth on mobile
- [ ] Loading states work properly
- [ ] Error messages are clear

### Performance
- [ ] Connection establishes quickly
- [ ] Voice quality is good
- [ ] No lag or delays
- [ ] App works with different mobile browsers

## 🎯 Expected Behavior

### Queue System
- Both users should see "Finding someone..." immediately
- Connection should happen within 1-5 seconds
- Status should change to "Connected" on both devices

### Voice Call
- Both users should hear each other clearly
- Mute button should work independently on each device
- End call should disconnect both users and return them to queue

### Reconnection
- When one user ends the call, both should return to main screen
- Users should be able to reconnect immediately

## 📱 Mobile-Specific Notes

### iOS (iPhone/iPad)
- **Safari**: Works best, supports all features
- **Chrome**: May have limited WebRTC support
- **Firefox**: Limited support, not recommended

### Android
- **Chrome**: Works best, full WebRTC support
- **Firefox**: Good support
- **Samsung Internet**: May have issues

### General Mobile Tips
- **Landscape mode**: Test both portrait and landscape
- **Different screen sizes**: Test on phones and tablets
- **Network conditions**: Test on different WiFi networks
- **Battery optimization**: Some phones may kill background processes

## 🚨 Important Notes

1. **HTTPS Required for Production**: Mobile browsers require HTTPS for microphone access in production
2. **Network Restrictions**: Some corporate/school networks may block WebRTC
3. **Browser Compatibility**: Not all mobile browsers support WebRTC equally
4. **Performance**: Mobile devices may have different performance characteristics

---

*Test thoroughly and enjoy the quiet space for sleep presence!* 🎧✨ 