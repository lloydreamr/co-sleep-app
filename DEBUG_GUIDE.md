# Debugging Guide - Hence Connection Issues

## 🔍 **Current Status**

The server is now running with the fixed role assignment logic. Here's how to test and debug:

## 📱 **Testing Steps**

### 1. Open Both Devices
- **Computer**: `https://localhost:3000`
- **Mobile**: `https://10.0.0.31:3000`

### 2. Open Browser Console
- **Computer**: Press F12 → Console tab
- **Mobile**: Use browser dev tools or check server logs

### 3. Join Queue
- Click "Connect me to someone" on both devices
- Watch the console logs

## 🎯 **Expected Console Output**

### Initiator Device:
```
Match found with: [ID] Initiator: true
🎯 Creating offer as initiator...
Connection state: connecting
Connection state: connected
✅ WebRTC connection established successfully!
```

### Responder Device:
```
Match found with: [ID] Initiator: false
⏳ Waiting for offer as responder...
Received remote stream
Connection state: connecting
Connection state: connected
✅ WebRTC connection established successfully!
```

## 🔧 **Server Logs to Watch**

You should see:
```
Matching [ID1] (initiator) with [ID2] (responder)
Offer from [initiator] to [responder]
Answer from [responder] to [initiator]
```

## ⚠️ **Common Issues & Solutions**

### Issue 1: Both devices show "Creating connection..."
**Cause**: Role assignment not working
**Solution**: Check server logs for "initiator/responder" messages

### Issue 2: One device shows "Waiting for connection..." forever
**Cause**: Offer not being sent or received
**Solution**: Check console for "Creating offer as initiator" message

### Issue 3: Connection state stuck on "connecting"
**Cause**: ICE candidates not being exchanged
**Solution**: Check network/firewall settings

### Issue 4: No audio after connection
**Cause**: Microphone permissions or audio constraints
**Solution**: Check browser permissions and console for errors

## 🚨 **If Still Not Working**

1. **Clear browser cache** on both devices
2. **Check the terminal** for server logs
3. **Look for error messages** in browser console
4. **Try different browsers** (Safari on iPhone, Chrome on Android)
5. **Check if both devices** are on the same WiFi network

## 📊 **What to Report**

If you're still having issues, please share:
1. **Console logs** from both devices
2. **Server logs** from the terminal
3. **What you see** on the screen (status messages)
4. **Browser type** and version

---

*The role assignment should now prevent the race condition!* 🎯✨ 