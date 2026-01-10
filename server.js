const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.static(__dirname));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'scene-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Endpoint to save video blobs as files
app.post('/api/save-video', upload.single('video'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file provided' });
        }

        const filePath = req.file.path;
        console.log(`Video saved: ${filePath}`);

        res.json({
            success: true,
            filePath: filePath,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Error saving video:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to concatenate videos using FFmpeg
app.post('/api/concat-videos', async (req, res) => {
    try {
        const { videoPaths } = req.body;

        if (!videoPaths || !Array.isArray(videoPaths) || videoPaths.length === 0) {
            return res.status(400).json({ error: 'Invalid video paths array' });
        }

        console.log(`Concatenating ${videoPaths.length} videos...`);

        // If only one video, return it directly
        if (videoPaths.length === 1) {
            console.log('Single video detected, returning raw clip directly');
            return res.json({
                success: true,
                outputPath: videoPaths[0],
                message: 'Single scene - raw clip returned'
            });
        }

        // Create output directory
        const outputDir = path.join(__dirname, 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Generate unique output filename
        const timestamp = Date.now();
        const outputFilename = `final-video-${timestamp}.mp4`;
        const outputPath = path.join(outputDir, outputFilename);

        // Create concat file list for FFmpeg
        const concatListPath = path.join(outputDir, `concat-list-${timestamp}.txt`);
        const concatContent = videoPaths.map(p => `file '${path.resolve(p).replace(/\\/g, '/')}'`).join('\n');

        fs.writeFileSync(concatListPath, concatContent, 'utf8');
        console.log('Concat list created:', concatListPath);
        console.log('Content:', concatContent);

        // FFmpeg command: concat demuxer with copy codec (lossless)
        const ffmpegCmd = `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy "${outputPath}"`;

        console.log('Executing FFmpeg command:', ffmpegCmd);

        exec(ffmpegCmd, (error, stdout, stderr) => {
            // Clean up concat list file
            try {
                fs.unlinkSync(concatListPath);
            } catch (e) {
                console.warn('Could not delete concat list:', e.message);
            }

            if (error) {
                console.error('FFmpeg error:', error);
                console.error('FFmpeg stderr:', stderr);
                return res.status(500).json({
                    error: 'FFmpeg concatenation failed',
                    details: stderr
                });
            }

            console.log('FFmpeg stdout:', stdout);
            console.log('Video concatenation successful:', outputPath);

            res.json({
                success: true,
                outputPath: outputPath,
                filename: outputFilename,
                message: `Successfully merged ${videoPaths.length} scenes`
            });
        });

    } catch (error) {
        console.error('Concatenation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to download the final video
app.get('/api/download/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, 'output', filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(filePath, filename, (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).json({ error: 'Download failed' });
            }
        });
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve uploaded and output files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/output', express.static(path.join(__dirname, 'output')));

app.listen(PORT, () => {
    console.log(`🎬 I2V Workflow Server running on http://localhost:${PORT}`);
    console.log(`📁 Upload directory: ${path.join(__dirname, 'uploads')}`);
    console.log(`📁 Output directory: ${path.join(__dirname, 'output')}`);
});
