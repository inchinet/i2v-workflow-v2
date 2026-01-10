# FFmpeg Video Merging - Setup Instructions

## What Changed

The video stitching has been upgraded from canvas-based MediaRecorder to **FFmpeg concatenation** to fix:
- ✅ Black screens in final output
- ✅ Lag/stuttering during playback  
- ✅ Missing or corrupted audio
- ✅ Quality degradation

## How to Use

### 1. Start the Server (First Time)

Double-click `start-server.bat` or run in terminal:
```bash
start-server.bat
```

This will:
- Install required Node.js dependencies (express, cors, multer)
- Start the server on http://localhost:3000

**Keep the server running** while using the application.

### 2. Open the Application

Open `index.html` in your browser as usual.

### 3. Generate Videos

Use the application normally:
1. Upload protagonist photos
2. Enter scene description
3. Enable "Veo 3.1 Video Generation"
4. Click "Generate Final Video"

The new FFmpeg-based merging will:
- Upload each scene video to the server
- Use FFmpeg to concatenate them losslessly
- Preserve original quality, frame rate, and Cantonese audio

### 4. Download the Final Video

The merged video will be available for download as before, but now with perfect quality!

## Server Configuration

If you're using your own server (not localhost:3000), update the `SERVER_URL` in `app.js` line 1127:

```javascript
const SERVER_URL = 'http://your-server-url:port';
```

## Troubleshooting

**Server won't start:**
- Make sure Node.js is installed
- Run `npm install` manually in the project directory

**Connection refused:**
- Verify the server is running (check terminal)
- Check if `SERVER_URL` in app.js matches your server

**FFmpeg errors:**
- FFmpeg is already installed on your system (verified)
- Check server console for detailed error messages

## File Structure

```
i2v-workflow/
├── index.html          # Main application
├── app.js             # Updated with FFmpeg stitching
├── style.css
├── server.js          # NEW: Backend server
├── package.json       # NEW: Dependencies
├── start-server.bat   # NEW: Easy startup script
├── uploads/           # Created automatically for scene videos
└── output/            # Created automatically for merged videos
```
