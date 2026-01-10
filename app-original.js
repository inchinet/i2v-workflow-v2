
document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const dropFemale = document.getElementById('drop-female');
    const inputFemale = document.getElementById('female-photo');
    const previewFemale = document.getElementById('preview-female');

    const dropMale = document.getElementById('drop-male');
    const inputMale = document.getElementById('male-photo');
    const previewMale = document.getElementById('preview-male');

    const sceneDesc = document.getElementById('scene-desc');
    const charCurrent = document.getElementById('char-current');

    const gallerySection = document.getElementById('gallery-section');
    const imageGallery = document.getElementById('image-gallery');

    const btnGenVideo = document.getElementById('btn-gen-video');
    const videoSection = document.getElementById('video-section');
    const finalVideo = document.getElementById('final-video');
    const apiKeyInput = document.getElementById('api-key');

    // --- API Key Persistence ---
    if (apiKeyInput) {
        // Load on startup
        const savedKey = localStorage.getItem('google_gemini_api_key');
        if (savedKey) {
            apiKeyInput.value = savedKey;
            console.log("Loaded API key from storage.");
        }
        // Save on change
        apiKeyInput.addEventListener('input', () => {
            localStorage.setItem('google_gemini_api_key', apiKeyInput.value.trim());
        });
    }

    // --- State ---
    const state = {
        femaleImg: null,
        maleImg: null,
        sceneText: ''
    };

    // --- Helpers ---
    const handleFileSelect = (file, previewContainer, key, dropZone = null) => {
        if (!file) return;

        console.log(`Processing file for ${key}:`, file.name);

        // Update UI Text if dropZone provided
        if (dropZone) {
            const msgSpan = dropZone.querySelector('.file-msg');
            if (msgSpan) {
                msgSpan.innerHTML = `<i class="fa-solid fa-check" style="color:#4CAF50;"></i> ${file.name}`;
                dropZone.style.borderColor = '#4CAF50';
            }
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            state[key] = e.target.result;
            // Clear previous content
            previewContainer.innerHTML = '';

            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = "Preview";
                img.style.display = 'block';
                previewContainer.appendChild(img);
            } else if (file.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.src = e.target.result;
                video.controls = true;
                video.muted = true;
                video.style.display = 'block';
                video.style.width = '100%';
                video.style.borderRadius = '8px';
                previewContainer.appendChild(video);
            }
            console.log(`Preview updated for ${key}`);
        };
        reader.onerror = (err) => console.error("File reading error:", err);
        reader.readAsDataURL(file);
    };

    const setupDragDrop = (dropZone, input, previewContainer, key) => {
        // Method 1: Click to Upload (Trigger hidden input)
        dropZone.addEventListener('click', (e) => {
            // Avoid infinite loop if clicking the input itself bubbles to div
            if (e.target !== input) {
                input.click();
            }
        });

        input.addEventListener('change', (e) => {
            console.log('File input changed', key);
            if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0], previewContainer, key, dropZone);
            }
        });

        // Method 2: Drag & Drop (Manual Handling)
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        // Highlight
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.style.borderColor = 'var(--primary-color)';
                dropZone.style.background = 'rgba(255, 255, 255, 0.15)';
            }, false);
        });

        // Un-highlight
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                dropZone.style.background = 'transparent';
            }, false);
        });

        // Handle Drop
        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            console.log('File dropped on zone', key);
            if (files && files[0]) {
                handleFileSelect(files[0], previewContainer, key, dropZone);
                // Also update input in case form submission is needed (optional)
                input.files = files;
            }
        }, false);
    };

    // --- Init Drag & Drop ---
    setupDragDrop(dropFemale, inputFemale, previewFemale, 'femaleImg');
    setupDragDrop(dropMale, inputMale, previewMale, 'maleImg');

    // --- Text Input ---
    sceneDesc.addEventListener('input', (e) => {
        state.sceneText = e.target.value;
        charCurrent.textContent = e.target.value.length;
    });

    // --- Logic: Unified Generation Workflow ---

    // 1. Google AI Engine (Simulation) - Semantic Cantonese Story Generator
    // "Deep Think" Mode: Analyzes Input-3 to generate coherent, dramatic Cantonese scripts.
    // 1. Google AI Engine (Simulation) - Dynamic Story Processor
    // Parses user's raw input (Input-3) into a cinematic storyboard.
    // NO hardcoded templates. Adjusts dynamically to user text.
    // 1. Google AI Engine (Real + Simulation)

    // Helper: Call Google Gemini API with Model Fallback
    // Helper: Call Google Gemini API with Model Fallback
    const callGeminiAPI = async (apiKey, topic, count, onStatusUpdate = null, visualDetails = "", aspectRatio = "4:3", characterMode = "dual") => {
        // Validation: Standard Google API Keys start with AIza
        if (!apiKey.startsWith("AIza")) {
            throw new Error(`Invalid API Key format. Key should start with 'AIza'. (Current length: ${apiKey.length})`);
        }

        // Defined models with their corresponding API versions
        const candidates = [
            { id: "gemini-3-pro-preview", version: "v1beta" },
            { id: "gemini-2.5-pro", version: "v1beta" },
            { id: "nano-banana-pro-preview", version: "v1beta" },
            { id: "gemini-2.5-flash", version: "v1beta" },
            { id: "gemini-2.0-flash-exp", version: "v1beta" }
        ];

        // Determine Visual Instructions based on User Input or AI Default
        let visualInstruction = "";
        if (visualDetails && visualDetails.trim().length > 0) {
            visualInstruction = `
             USER-DEFINED LOCKED APPEARANCE (STRICT):
             The user has explicitly defined the look: "${visualDetails}".
             1. You MUST use these EXACT details for the characters.
             2. DO NOT invent contradicting details.
             3. MANDATORY: You MUST include this "${visualDetails}" description in "image_prompt_en" for EVERY SINGLE SCENE.
             `;
        } else {
            visualInstruction = `
             CRITICAL VISUAL CONTINUITY (Locked Appearance & Location):
             1.  Define a specific, detailed outfit for the Female character (e.g., "white summer dress, pearl earrings, long straight hair").
             2.  Define a specific, detailed outfit for the Male character (e.g., "blue denim shirt, silver watch, short messy hair").
             3.  LOCKED DETAILS: Hairstyle, glasses, jewelry, and makeup MUST NOT CHANGE between scenes.
             4.  MANDATORY: You MUST include the EXACT outfit, hairstyle, accessories in "image_prompt_en" for EVERY SINGLE SCENE.
             `;
        }

        // Aspect Ratio Composition Instructions
        const aspectInstruction = aspectRatio === "3:4"
            ? "COMPOSITION: Frame scenes VERTICALLY (Portrait 3:4). Characters should be centered with vertical headroom. Suitable for social media/mobile viewing."
            : "COMPOSITION: Frame scenes HORIZONTALLY (Landscape 4:3). Use cinematic wide framing with characters positioned using rule of thirds.";

        const dynamicPrompt = `
        Act as an award-winning Film Director.
        User Input (Scenario): "${topic}"
        Task: Create a detailed screenplay with exactly ${count} scenes.
        Context: 
        - ${characterMode === "dual" ? "Two protagonists (Female and Male)" : "One protagonist (solo story)"}.
        - Analyze Input to determine Genre/Tone.

        ${visualInstruction}

        LOCKED LOCATION RULES:
        1.  ESTABLISH A SINGLE PRIMARY LOCATION (e.g., "Diffused lit coffee shop interior").
        2.  Unless the user's scenario EXPLICITLY changes location, YOU MUST STAY IN THIS PRIMARY LOCATION.
        3.  Do not randomly switch from Indoor to Outdoor.
        4.  Include location description in every scene prompt.

        ${aspectInstruction}

        ${characterMode === "dual" ? `DUAL CHARACTER MANDATE (CRITICAL):
        1.  Unless the camera move is "Close-up Female" or "Close-up Male", BOTH characters MUST be visible in the frame.
        2.  In "image_prompt_en", you MUST explicitly state: "BOTH the female character AND the male character are in frame together."
        3.  For "Wide Shot", "Mid Shot", "Dolly In", "Pan": Always show BOTH protagonists interacting.
        4.  Do NOT generate solo shots unless explicitly a close-up.` : `SOLO CHARACTER MODE:
        1.  This is a single-protagonist story.
        2.  All scenes feature ONE character only.
        3.  Frame the character appropriately for each camera move.`}

        Requirements:
        1. Language: Traditional Chinese (Cantonese Dialogue/Narrative) ONLY for 'description'.
        2. Format: Return ONLY a valid JSON array. No markdown.
        3. Structure: [ { "description": "Cantonese visual description", "image_prompt_en": "Detailed English visual description INCLUDING LOCKED OUTFIT for Text-to-Image generation", "cameraMove": "Move Name" }, ... ]
        
        Camera Directives: "Wide Shot", "Mid Shot", "Close-up Female", "Close-up Male", "Dolly In", "Pan".
        Final Output: JSON Array of ${count} objects.
        `;

        const body = { contents: [{ parts: [{ text: dynamicPrompt }] }] };

        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        // Recursive helper to try models
        const tryModel = async (index) => {
            if (index >= candidates.length) {
                // If we exhausted all models, throw a generic error, but likely caught earlier
                throw new Error("All models failed. Please check API Key restrictions.");
            }

            const candidate = candidates[index];
            const url = `https://generativelanguage.googleapis.com/${candidate.version}/models/${candidate.id}:generateContent?key=${apiKey}`;
            console.log(`[Google AI] Attempting ${candidate.id} (${candidate.version})...`);

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                const data = await response.json();

                // Common Error Logic Helper
                const handleApiError = async (msg, isRateLimit) => {
                    console.warn(`[Google AI] ${candidate.id} Failed: ${msg}`);

                    // RETRY LOGIC for Quota (429) - Smart Backoff
                    if (isRateLimit || msg.includes("Quota") || msg.includes("rate limit")) {
                        // Extract wait time if available (e.g., "Please retry in 29.1s")
                        const waitMatch = msg.match(/retry in ([0-9.]+)(?:s|ms)/i);
                        let waitMs = 10000; // Default 10s
                        if (waitMatch && waitMatch[1]) {
                            waitMs = Math.ceil(parseFloat(waitMatch[1]) * 1000) + 2000; // Value + buffer
                            console.warn(`[Quota] API requested wait. Sleeping for ${waitMs / 1000}s...`);
                        } else {
                            console.warn(`[Quota] Hit limit. Sleeping for 10s...`);
                        }

                        // Notify UI & Countdown
                        const totalSeconds = Math.ceil(waitMs / 1000);
                        for (let s = totalSeconds; s > 0; s--) {
                            if (onStatusUpdate) onStatusUpdate(`Quota Hit. Retrying in ${s}s...`);
                            await sleep(1000);
                        }

                        // Retry the SAME model
                        return tryModel(index);
                    }

                    if (index === candidates.length - 1) {
                        throw new Error(`API Error: ${msg}`);
                    }
                    return tryModel(index + 1);
                };

                if (!response.ok) {
                    const status = response.status;
                    const errorMsg = data.error ? data.error.message : response.statusText;

                    // Permission Check
                    if (status === 403 || status === 400) {
                        if (errorMsg.includes("do not have permission") || errorMsg.includes("API has not been used")) {
                            throw new Error(`Cloud API Permission Error: ${errorMsg}`);
                        }
                    }

                    return handleApiError(errorMsg, status === 429);
                }

                if (data.error) {
                    return handleApiError(data.error.message, false);
                }

                return data; // Success!

            } catch (e) {
                // If it's the specific Error thrown above, rethrow
                if (e.message.startsWith("Cloud API") || e.message.startsWith("All models")) throw e;

                console.warn(`[Google AI] Error with ${candidate.id}:`, e.message);
                if (index === candidates.length - 1) throw e;
                return tryModel(index + 1);
            }
        };

        try {
            const data = await tryModel(0);

            if (!data || !data.candidates || !data.candidates[0]) return null;

            const text = data.candidates[0].content.parts[0].text;
            const jsonMatch = text.match(/\[[\s\S]*\]/); // Matches the first occurrence of [...]

            if (jsonMatch && jsonMatch[0]) {
                const parsed = JSON.parse(jsonMatch[0]);
                // Ensure English prompt exists fallback
                return parsed.map(s => ({
                    ...s,
                    image_prompt_en: s.image_prompt_en || s.description // Fallback to desc if missing
                }));
            } else {
                throw new Error("No JSON array found in AI response");
            }
        } catch (e) {
            console.error("Gemini API Fatal Error:", e);
            throw e; // Propagate to caller for UI display
        }
    };

    // Helper: Dynamic Mock Parser (Fallback)
    const generateMockScreenplay = (topic, count) => {
        // ... (Keep existing simple parser logic here for fallback)
        let sourceLines = topic.split(/[\n.]+/).map(s => s.trim()).filter(s => s.length > 0);
        if (sourceLines.length === 1 && sourceLines[0].length > 20) {
            sourceLines = sourceLines[0].split(/[,，]+/).map(s => s.trim()).filter(s => s.length > 0);
        }
        if (sourceLines.length === 0) sourceLines = ["Scene start... (Waiting for input)"];

        const screenplay = [];
        const moveSet = [
            { name: "Wide Shot (大遠景 - Establish)", id: 0, keywords: ["city", "world", "wide"] },
            { name: "Mid Shot (中景 - Interaction)", id: 4, keywords: ["talk", "walk", "together"] },
            { name: "Close-up Female (女角特寫 - Emotion)", id: 2, keywords: ["she", "girl", "smile"] },
            { name: "Close-up Male (男角特寫 - Emotion)", id: 3, keywords: ["he", "boy", "angular"] },
            { name: "Dolly In (推鏡 - Intensify)", id: 1, keywords: ["sudden", "!"] },
            { name: "Pan (運鏡 - Reveal)", id: 4, keywords: ["turn", "around"] }
        ];
        const detectMove = (text) => {
            const t = text.toLowerCase();
            for (let m of moveSet) { if (m.keywords && m.keywords.some(k => t.includes(k))) return m; }
            return moveSet[Math.floor(Math.random() * moveSet.length)];
        };

        for (let i = 0; i < count; i++) {
            let beat = sourceLines[i % sourceLines.length];
            if (i >= sourceLines.length) beat += " (Mock Extension)";
            const move = detectMove(beat);
            screenplay.push({
                idx: i,
                description: beat,
                image_prompt_en: beat, // Mock fallback uses same text
                cameraMove: move.name,
                transformId: move.id
            });
        }
        return screenplay;
    };

    // Main Generator Function
    // Main Generator Function
    const generateScreenplay = async (topic, count, onStatusUpdate = null, visualDetails = "", aspectRatio = "4:3", characterMode = "dual") => {
        // Mock Mode Check
        const apiKey = document.getElementById('api-key').value.trim();

        if (!apiKey) {
            console.log("Mock Mode: Generating screenplay locally...");
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve({ source: "Mock AI (No Key)", scenes: generateMockScreenplay(topic, count) });
                }, 1500);
            });
        }

        // Real Gemini Mode
        if (apiKey) {
            try {
                const result = await callGeminiAPI(apiKey, topic, count, onStatusUpdate, visualDetails, aspectRatio, characterMode);
                if (result) {
                    const screenplay = result.map((scene, idx) => ({
                        idx: idx,
                        description: scene.description,
                        image_prompt_en: scene.image_prompt_en,
                        cameraMove: scene.cameraMove,
                        transformId: getTransformId(scene.cameraMove)
                    }));
                    return { source: "Real Gemini AI", scenes: screenplay };
                } else {
                    throw new Error("API returned empty result.");
                }
            } catch (err) {
                console.error("Gemini Screenplay Failed:", err);

                // Diagnostics Render Logic
                let modelInfo = "Checking available models...";
                let isRegionError = false;
                try {
                    const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                    const listData = await listResponse.json();
                    if (listData.models) {
                        const names = listData.models.map(m => m.name.replace('models/', ''));
                        modelInfo = `<strong style="color:#4CAF50">✅ Authorized Models:</strong><br>${names.join(', ')}`;
                    } else if (listData.error) {
                        modelInfo = `<strong style="color:#ffcc00">⚠️ List Check Failed:</strong> ${listData.error.message}`;
                        if (listData.error.message.includes("location") || listData.error.message.includes("not supported")) isRegionError = true;
                    }
                } catch (e) {
                    modelInfo = "Could not verify model list (Network/CORS error).";
                }

                if (err.message.includes("location") || err.message.includes("Region")) isRegionError = true;

                let regionMsg = "";
                if (isRegionError) {
                    regionMsg = `
                        <div style="background: rgba(255, 80, 80, 0.2); border: 1px solid #ff4444; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                            <h4 style="color:#ffcc00; margin:0 0 5px 0;"><i class="fa-solid fa-globe"></i> Region Restricted</h4>
                            <p style="margin:0; font-size:0.9em; color:#fff;">
                                Google Gemini is currently blocked in your location (e.g. Hong Kong, China).
                                <br><br>
                                <strong>Fix:</strong> Please connect to a <strong>VPN</strong> (USA, Singapore, Japan) and try again.
                            </p>
                        </div>`;
                }

                const imageGallery = document.getElementById('image-gallery');
                imageGallery.innerHTML = `
                        <div class="glass-card" style="border-left: 4px solid #ff4444; padding: 20px;">
                            ${regionMsg}
                            <h3 style="color:#ff4444; margin-top:0;"><i class="fa-solid fa-bug"></i> Google API Failed</h3>
                            <p style="font-family:monospace; background:rgba(0,0,0,0.3); padding:10px; border-radius:5px;">${err.message}</p>
                            <div style="margin-top:15px; padding:12px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:8px; font-size:0.9em; line-height:1.4;">
                                ${modelInfo}
                            </div>
                            <div style="margin-top:10px; font-size:0.9em; color:#ddd;">
                                <strong>Diagnosis Tips:</strong>
                                <ul style="margin-top:5px;">
                                    <li><strong>Key Format:</strong> ${apiKey.startsWith('AIza') ? 'Valid prefix (AIza)' : 'INVALID prefix'} (${apiKey.length} chars)</li>
                                    <li><strong>Restrictions:</strong> If the list above is empty or shows an error, your API Key is restricted or Generative AI is disabled.</li>
                                </ul>
                            </div>
                            <button onclick="this.parentElement.style.display='none'" class="glass-btn" style="margin-top:10px; font-size:0.8em;">Dismiss</button>
                        </div>
                    `;
                return null;
            }
        }
    };


    // Helper: Robust Download
    const downloadImage = (dataUrl, filename) => {
        const link = document.createElement('a');
        link.href = dataUrl; // Data URLs usually work, but for large files Blob is safer? 
        // Chrome handles large Data URIs fine in href download attribute usually up to ~2MB.
        // Imagen images can be large. Let's do Blob conversion to be safe.
        fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            })
            .catch(() => {
                // Fallback
                link.href = dataUrl;
                link.download = filename;
                link.click();
            });
    };
    // Expose to window for onclick
    window.downloadImage = downloadImage;

    // MODEL LOCK: Once a model succeeds, we reuse it for all scenes (consistency)
    let lockedImageModel = null;

    // Helper: Call Google Gemini Link for Image Generation (Dynamic Discovery)
    const generateAIImage = async (apiKey, prompt, referenceImageBase64 = null, onStatusUpdate = null, aspectRatio = "4:3") => {
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        const allErrors = [];

        // MODEL LOCK CHECK: If we already found a working model, use it directly
        if (lockedImageModel) {
            console.log(`[ImageGen] Using LOCKED model: ${lockedImageModel}`);
            const candidatesIds = [lockedImageModel];

            // Skip discovery, go straight to execution
            const tryImgModel = async (idx) => {
                if (idx >= candidatesIds.length) {
                    console.error("Locked model failed.");
                    lockedImageModel = null; // Reset lock
                    throw new Error("Locked model failed. Please regenerate.");
                }

                const modelId = candidatesIds[idx];
                console.log(`[ImageGen] Using ${modelId}...`);

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

                const parts = [];
                const aspectInstruction = aspectRatio === "3:4"
                    ? "VERTICAL PORTRAIT format (taller than wide, 3:4 aspect ratio)"
                    : "HORIZONTAL LANDSCAPE format (wider than tall, 4:3 aspect ratio)";

                let finalPrompt = `Generate a cinematic 8k image in ${aspectInstruction} of: ${prompt}.`;
                if (referenceImageBase64) {
                    finalPrompt += `
                    CRITICAL INSTRUCTION (FACE ID LOCK):
                    1. The character in this scene MUST have the EXACT SAME FACE, hair, and facial structure as the person in the attached reference image.
                    2. Maintain 100% facial identity consistency.
                    3. Do not change the person's ethnicity or key features.
                    4. This is the same person acting in a movie scene.`;
                }
                parts.push({ text: finalPrompt });

                if (referenceImageBase64) {
                    const b64Data = referenceImageBase64.split(',')[1] || referenceImageBase64;
                    const mimeType = referenceImageBase64.includes('image/png') ? 'image/png' : 'image/jpeg';
                    parts.push({ inlineData: { mimeType: mimeType, data: b64Data } });
                }

                const body = { contents: [{ parts: parts }] };

                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    const data = await response.json();

                    if (data.error) {
                        const msg = `[${modelId}] ERROR: ${data.error.message || JSON.stringify(data.error)}`;
                        console.warn(msg);
                        throw new Error(msg);
                    }

                    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
                        for (const part of data.candidates[0].content.parts) {
                            if (part.inlineData && part.inlineData.mimeType.startsWith('image')) {
                                lockedImageModel = modelId; // LOCK IT
                                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                            }
                        }
                    }

                    throw new Error(`[${modelId}] Success but NO image data in response.`);
                } catch (e) {
                    throw e;
                }
            };

            return tryImgModel(0);
        }

        // 1. DYNAMIC MODEL DISCOVERY (First time only)
        let validModelIds = [];
        try {
            console.log("[DynamicDiscovery] Fetching available models...");
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const listData = await listRes.json();

            if (listData.models) {
                // Filter for generateContent support
                validModelIds = listData.models
                    .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
                    .map(m => m.name.replace('models/', '')); // Remove prefix if present

                console.log("[DynamicDiscovery] Available Generators:", validModelIds);
            }
        } catch (e) {
            console.warn("[DynamicDiscovery] Failed to list models, using fallbacks.", e);
        }

        // 2. PRIORITY LOGIC (2026 Context - Authorized List)
        const preferredPatterns = [
            'nano-banana-pro-preview',
            'gemini-3-pro-image-preview',
            'gemini-3-pro-preview',
            'veo-3',
            'gemini-2.0-flash-exp-image-generation',
            'imagen-4'
        ];

        // Find matches in validModelIds based on patterns
        let candidatesIds = [];

        // A. Add discovered matches first
        preferredPatterns.forEach(pattern => {
            const matches = validModelIds.filter(id => id.includes(pattern));
            candidatesIds.push(...matches);
        });

        // B. Add explicit Hardcoded Fallbacks (IMAGE GENERATION MODELS ONLY)
        if (candidatesIds.length === 0) {
            candidatesIds = [
                // WORKING Image Generation Models (from user's available list)
                "gemini-2.0-flash-exp-image-generation",
                "nano-banana-pro-preview",
                "gemini-2.5-flash-image-preview",
                "gemini-2.5-flash-image",
                "gemini-3-pro-image-preview",
                // Legacy fallbacks
                "gemini-2.0-flash-exp",
                "gemini-1.5-pro"
            ];
        }

        // Remove duplicates
        candidatesIds = [...new Set(candidatesIds)];
        console.log("[ImageGen] Final Model Candidate List:", candidatesIds);

        // 3. EXECUTION LOOP
        const tryImgModel = async (idx) => {
            if (idx >= candidatesIds.length) {
                console.error("All Image Gen models failed.");
                throw new Error(allErrors.join("\n\n"));
            }

            const modelId = candidatesIds[idx];
            console.log(`[ImageGen] Trying ${modelId}...`);
            if (onStatusUpdate) onStatusUpdate(`Initializing ${modelId}...`);
            if (onStatusUpdate) onStatusUpdate(`Initializing ${modelId}...`);

            // Protocol: Standard generateContent
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

            const parts = [];
            // Text Prompt with Aspect Ratio
            const aspectInstruction = aspectRatio === "3:4"
                ? "VERTICAL PORTRAIT format (taller than wide, 3:4 aspect ratio)"
                : "HORIZONTAL LANDSCAPE format (wider than tall, 4:3 aspect ratio)";

            let finalPrompt = `Generate a cinematic 8k image in ${aspectInstruction} of: ${prompt}.`;
            if (referenceImageBase64) {
                finalPrompt += `
                CRITICAL INSTRUCTION (FACE ID LOCK):
                1. The character in this scene MUST have the EXACT SAME FACE, hair, and facial structure as the person in the attached reference image.
                2. Maintain 100% facial identity consistency.
                3. Do not change the person's ethnicity or key features.
                4. This is the same person acting in a movie scene.`;
            }
            parts.push({ text: finalPrompt });

            // Multimodal Image Attachment
            if (referenceImageBase64) {
                const b64Data = referenceImageBase64.split(',')[1] || referenceImageBase64;
                const mimeType = referenceImageBase64.includes('image/png') ? 'image/png' : 'image/jpeg';
                parts.push({ inlineData: { mimeType: mimeType, data: b64Data } });
            }

            const body = { contents: [{ parts: parts }] };

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await response.json();

                // Catch API Errors
                if (data.error) {
                    const msg = `[${modelId}] ERROR: ${data.error.message || JSON.stringify(data.error)}`;
                    console.warn(msg);

                    // RETRY LOGIC for Quota (429) - Smart Backoff
                    if (data.error.code === 429 || msg.includes("Quota") || msg.includes("rate limit")) {
                        // Extract wait time if available (e.g., "Please retry in 48.26s")
                        const waitMatch = msg.match(/retry in ([0-9.]+)(?:s|ms)/i);
                        let waitMs = 10000; // Default 10s
                        if (waitMatch && waitMatch[1]) {
                            waitMs = Math.ceil(parseFloat(waitMatch[1]) * 1000) + 2000; // Value + buffer
                            console.warn(`[Quota] API requested wait. Sleeping for ${waitMs / 1000}s...`);
                        } else {
                            console.warn(`[Quota] Hit limit. Sleeping for 10s...`);
                        }

                        // Notify UI & Countdown
                        const totalSeconds = Math.ceil(waitMs / 1000);
                        for (let s = totalSeconds; s > 0; s--) {
                            if (onStatusUpdate) onStatusUpdate(`Quota Hit. Retrying in ${s}s...`);
                            await sleep(1000);
                        }

                        // Retry the SAME model
                        return tryImgModel(idx);
                    }

                    allErrors.push(msg);
                    return tryImgModel(idx + 1); // Try NEXT model
                }

                // Check for Content
                if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
                    for (const part of data.candidates[0].content.parts) {
                        if (part.inlineData && part.inlineData.mimeType.startsWith('image')) {
                            // SUCCESS! Lock this model for future scenes
                            if (!lockedImageModel) {
                                lockedImageModel = modelId;
                                console.log(`[ImageGen] ✅ Model LOCKED: ${modelId} (will be reused for all scenes)`);
                            }
                            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                        }
                    }
                }

                // Check for Old PaLM/Imagen Predict format (Unlikely for generateContent but possible)
                if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
                    return `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
                }

                allErrors.push(`[${modelId}] Success but NO image data in response.`);
                return tryImgModel(idx + 1);

            } catch (e) {
                // Network Error - Retry with Exponential Backoff
                const isNetworkError = e.message.includes("fetch") || e.message.includes("Network");

                if (isNetworkError && (!e.retryCount || e.retryCount < 3)) {
                    const retryCount = (e.retryCount || 0) + 1;
                    const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s

                    console.warn(`[${modelId}] Network error. Retry ${retryCount}/3 in ${waitTime / 1000}s...`);
                    if (onStatusUpdate) onStatusUpdate(`Network issue. Retrying in ${waitTime / 1000}s...`);

                    await sleep(waitTime);

                    // Retry same model
                    e.retryCount = retryCount;
                    return tryImgModel(idx);
                }

                allErrors.push(`[${modelId}] Network Error: ${e.message}`);
                return tryImgModel(idx + 1);
            }
        };

        return tryImgModel(0);
    };

    // Helper: Generate Video with Veo 3.1 API
    const generateVeoVideo = async (apiKey, imageBase64, prompt, duration = 5, onStatusUpdate = null) => {
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        const errors = [];

        // Veo models to try (in priority order)
        // Note: Veo 3.x supports sound, Veo 2.x typically does not.
        const veoModels = [
            "veo-3.1-generate-preview",
            "veo-3.0-generate-001",
            "veo-3.0-fast-generate-001"
        ];

        for (const modelId of veoModels) {
            try {
                console.log(`[Veo] Trying ${modelId} via predictLongRunning...`);
                // Use predictLongRunning endpoint
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predictLongRunning?key=${apiKey}`;

                // Prepare Reference Image list
                const imageList = Array.isArray(imageBase64) ? imageBase64 : [imageBase64];
                const parts = [];

                for (const img of imageList) {
                    if (!img) continue;
                    let b64Data;
                    let mimeType;
                    if (img.startsWith('data:')) {
                        b64Data = img.split(',')[1];
                        mimeType = img.split(';')[0].split(':')[1];
                    } else if (img.startsWith('blob:')) {
                        try {
                            const blobRes = await fetch(img);
                            const blob = await blobRes.blob();
                            b64Data = await new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                                reader.onerror = reject;
                                reader.readAsDataURL(blob);
                            });
                            mimeType = blob.type;
                        } catch (e) { continue; }
                    } else {
                        b64Data = img;
                        mimeType = 'image/jpeg';
                    }
                    parts.push({ inlineData: { mimeType, data: b64Data } });
                }

                // Add prompt text - Enhanced for Veo 3.x Cantonese audio capabilities
                const enhancedPrompt = `Generate a ${duration}-second cinematic movie based on the following storyboard: ${prompt}. 
                MANDATORY: All character dialogue MUST be in CANTONESE (廣東話) ONLY. Include natural ambient sound effects and cinematic background music. Ensure realistic movements and high fidelity.`;
                parts.unshift({ text: enhancedPrompt });

                // Final streamlined request payload for maximum compatibility.
                // We provide the prompt and reference image directly.
                // Duration and Aspect are handled via the text prompt to avoid 400 status.
                const requestPayload = {
                    instances: [{
                        prompt: enhancedPrompt,
                        image: (parts[1] && parts[1].inlineData && parts[1].inlineData.mimeType.startsWith('image/')) ? {
                            bytesBase64Encoded: parts[1].inlineData.data,
                            mimeType: parts[1].inlineData.mimeType
                        } : undefined,
                        video: (parts[1] && parts[1].inlineData && parts[1].inlineData.mimeType.startsWith('video/')) ? {
                            bytesBase64Encoded: parts[1].inlineData.data,
                            mimeType: parts[1].inlineData.mimeType
                        } : undefined
                    }]
                };

                if (onStatusUpdate) onStatusUpdate(`Requesting ${modelId}...`);
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestPayload)
                });

                const data = await response.json();

                if (!response.ok || data.error) {
                    const msg = data.error ? data.error.message : response.statusText;
                    console.warn(`[${modelId}] Initialization Error: ${msg}`);
                    errors.push(`[${modelId}] ${msg}`);
                    continue;
                }

                if (!data.name) {
                    errors.push(`[${modelId}] Missing Operation Name.`);
                    continue;
                }

                const opName = data.name;
                console.log(`[Veo] Operation started: ${opName}`);

                // --- POLLING ---
                let pollCount = 0;
                const maxPolls = 180; // 15 mins max (Veo can take several minutes)
                while (pollCount < maxPolls) {
                    pollCount++;
                    if (onStatusUpdate) onStatusUpdate(`Polling ${modelId} (${pollCount * 5}s)...`);

                    const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${opName}?key=${apiKey}`;
                    const pollRes = await fetch(pollUrl);
                    const pollData = await pollRes.json();

                    if (pollData.done) {
                        if (pollData.error) {
                            throw new Error(`Operation Failed: ${pollData.error.message}`);
                        }

                        // Robust Extraction Logic
                        const res = pollData.response || {};
                        console.log(`[Veo] Operation Progress: Done. Response Structure:`, res);

                        // Check inside generateVideoResponse wrapper if present
                        const mainRes = res.generateVideoResponse || res;
                        const videoCandidates = [];

                        // 1. Collect all possible video objects
                        if (mainRes.video) videoCandidates.push(mainRes.video);
                        if (Array.isArray(mainRes.videos)) {
                            mainRes.videos.forEach(v => videoCandidates.push(v.video || v));
                        }
                        if (Array.isArray(mainRes.generatedVideos)) {
                            mainRes.generatedVideos.forEach(v => videoCandidates.push(v.video || v));
                        }
                        if (Array.isArray(mainRes.generatedSamples)) {
                            mainRes.generatedSamples.forEach(s => {
                                if (s.video) videoCandidates.push(s.video);
                            });
                        }

                        // 2. Process found video candidates
                        for (const v of videoCandidates) {
                            let videoData = null;
                            if (v.bytesBase64Encoded) {
                                videoData = `data:video/mp4;base64,${v.bytesBase64Encoded}`;
                            } else if (v.uri) {
                                // IMPORTANT: Files API URIs require the key to be accessible via <video> tag
                                videoData = v.uri.includes('?') ? `${v.uri}&key=${apiKey}` : `${v.uri}?key=${apiKey}`;
                            }

                            if (videoData) {
                                console.log(`[Veo] ✅ Video Located! Model: ${modelId}`);
                                return { videoBase64: videoData, model: modelId };
                            }
                        }

                        // 3. Last Resort: Check for 'candidates' (Gemini style)
                        if (mainRes.candidates && mainRes.candidates[0].content && mainRes.candidates[0].content.parts) {
                            const part = mainRes.candidates[0].content.parts.find(p => p.inlineData && p.inlineData.mimeType.startsWith('video'));
                            if (part) {
                                return {
                                    videoBase64: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                                    model: modelId
                                };
                            }
                        }

                        console.error(`[${modelId}] FAILED to extract video. Structure:`, JSON.stringify(res));
                        throw new Error(`Success status, but no video data found in response. Checked: video, videos, generatedVideos, generatedSamples, candidates.`);
                    }

                    await sleep(5000); // Poll every 5 seconds
                }
                throw new Error("Polling timed out.");

            } catch (e) {
                console.warn(`[${modelId}] Error:`, e.message);
                errors.push(`[${modelId}] ${e.message}`);
            }
        }

        throw new Error("Veo3 Generation FAILED. Diagnostics:\n" + errors.join("\n"));
    };

    // 2. Dual Protagonist Compositor (Face Preservation)
    // Strictly composites uploads onto a Master 1080p Canvas. NO generation.
    const createProcessedImage = (imgSrc1, imgSrc2, transformType, description, callback) => {
        const loadImg = (src) => new Promise((resolve) => {
            if (!src) resolve(null);
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });

        Promise.all([loadImg(imgSrc1), loadImg(imgSrc2)]).then(([img1, img2]) => {
            if (!img1 && !img2) { callback(null, "Error"); return; }

            // Master Canvas (1920x1080)
            const masterW = 1920;
            const masterH = 1080;
            const canvas = document.createElement('canvas');
            canvas.width = masterW;
            canvas.height = masterH;
            const ctx = canvas.getContext('2d');

            // --- Composition ---
            // Fill dark cinematic background
            ctx.fillStyle = '#0f0f0f';
            ctx.fillRect(0, 0, masterW, masterH);

            // Helper to draw image 'cover' style into a rect
            const drawCover = (img, x, y, w, h) => {
                if (!img) return;
                const ratio = w / h;
                const srcRatio = img.width / img.height;
                let sx, sy, sw, sh;

                if (srcRatio > ratio) {
                    sh = img.height;
                    sw = img.height * ratio;
                    sy = 0;
                    sx = (img.width - sw) / 2;
                } else {
                    sw = img.width;
                    sh = img.width / ratio;
                    sx = 0;
                    sy = (img.height - sh) / 2;
                }
                ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
            };

            // Layout Logic
            // If Dual: Female Left (45%), Male Right (45%), overlapping slightly or separated
            const hasFemale = !!img1;
            const hasMale = !!img2;

            if (hasFemale && hasMale) {
                // Side by Side
                drawCover(img1, 0, 0, masterW * 0.5, masterH);
                drawCover(img2, masterW * 0.5, 0, masterW * 0.5, masterH);
            } else if (hasFemale) {
                drawCover(img1, 0, 0, masterW, masterH);
            } else {
                drawCover(img2, 0, 0, masterW, masterH);
            }

            // --- Lens Crop (Camera Move) ---
            const finalCanvas = document.createElement('canvas');
            const fw = 1280; const fh = 720;
            finalCanvas.width = fw; finalCanvas.height = fh;
            const fctx = finalCanvas.getContext('2d');

            let sx = 0, sy = 0, sw = masterW, sh = masterH;

            // Transform IDs: 0-Wide, 1-Dolly, 2-CFemale, 3-CMale, 4-Mid
            switch (transformType) {
                case 0: // Wide: Show everything
                    break;
                case 1: // Dolly In: Zoom Center
                    sw = masterW * 0.6; sh = masterH * 0.6;
                    sx = (masterW - sw) / 2; sy = (masterH - sh) * 0.4;
                    break;
                case 2: // Close Female: Crop Left
                    if (hasFemale && hasMale) {
                        sw = masterW * 0.4; sh = masterH * 0.7;
                        sx = masterW * 0.05; sy = masterH * 0.1;
                    } else {
                        sw = masterW * 0.5; sh = masterH * 0.5;
                        sx = (masterW - sw) / 2; sy = masterH * 0.1;
                    }
                    break;
                case 3: // Close Male: Crop Right
                    if (hasFemale && hasMale) {
                        sw = masterW * 0.4; sh = masterH * 0.7;
                        sx = masterW * 0.55; sy = masterH * 0.1;
                    } else {
                        sw = masterW * 0.5; sh = masterH * 0.5;
                        sx = (masterW - sw) / 2; sy = masterH * 0.1;
                    }
                    break;
                case 4: // Mid: Center crop - Modified to show BOTH
                    // If we have 2 people, Mid shot should show the split.
                    if (hasFemale && hasMale) {
                        // Wide enough to see both sides of the split (center 40% left + center 40% right)
                        sw = masterW * 0.95; sh = masterH * 0.95;
                        sx = (masterW - sw) / 2; sy = (masterH - sh) * 0.05;
                    } else {
                        sw = masterW * 0.8; sh = masterH * 0.8;
                        sx = (masterW - sw) / 2; sy = (masterH - sh) * 0.2;
                    }
                    break;
                default:
                    // Wide
                    break;
            }

            fctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, fw, fh);

            // Add Cinematic Filter (Subtle Grading)
            // --- Atmosphere / Color Grading (Director's Touch) ---
            // Based on description keywords, apply a subtle overlay
            const descLower = (description || "").toLowerCase();
            if (descLower.includes("wedding") || descLower.includes("love") || descLower.includes("romance") || descLower.includes("婚")) {
                fctx.fillStyle = 'rgba(255, 220, 200, 0.15)'; // Warm/Rose tint
                fctx.fillRect(0, 0, fw, fh);
            } else if (descLower.includes("night") || descLower.includes("dark") || descLower.includes("sad")) {
                fctx.fillStyle = 'rgba(20, 30, 60, 0.3)'; // Cool/Blue tint
                fctx.fillRect(0, 0, fw, fh);
            } else {
                fctx.fillStyle = 'rgba(255, 200, 150, 0.05)'; // Default cinematic
                fctx.fillRect(0, 0, fw, fh);
            }

            callback(finalCanvas.toDataURL('image/png'), "");
        });
    };

    // Helper for generating prompts (Used by Gallery)
    const parsePrompts = (text, count) => {
        // Just a dummy for gallery view if needed, but our GenerateScreenplay provides the real text
        return Array(count).fill(text);
    };

    // Stub
    const renderMockGallery = async () => { };
    // Helper to map Move ID from Name
    const getTransformId = (moveName) => {
        if (!moveName) return 0;
        const n = moveName.toLowerCase();
        if (n.includes("wide") || n.includes("est")) return 0;
        if (n.includes("dolly") || n.includes("zoom")) return 1;
        if (n.includes("female") && n.includes("close")) return 2;
        if (n.includes("male") && n.includes("close")) return 3;
        if (n.includes("mid") || n.includes("interaction")) return 4;
        if (n.includes("pan")) return 4; // Use Mid/Pan logic
        return 0; // Default Wide
    };

    // Helper: Production Logging
    const addProductionLog = (msg, type = 'info') => {
        const logContent = document.getElementById('log-content');
        const productionLogs = document.getElementById('production-logs');
        if (!logContent || !productionLogs) return;

        productionLogs.classList.remove('hidden');
        const entry = document.createElement('div');
        const timestamp = new Date().toLocaleTimeString();
        let color = '#00ffcc';
        if (type === 'warn') color = '#ffcc00';
        if (type === 'error') color = '#ff3333';
        if (type === 'success') color = '#33ff33';

        entry.innerHTML = `<span style="color:rgba(255,255,255,0.4);">[${timestamp}]</span> <span style="color:${color}">${msg}</span>`;
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
    };

    // 3. FFmpeg-Based Video Stitcher (Lossless concatenation of Veo3 clips)
    const stitchVideos = async (scenes, durationPerSceneMs = 5000) => {
        addProductionLog(`Starting FFmpeg Reel Assembly: ${scenes.length} scenes.`, 'info');

        const SERVER_URL = 'http://localhost:3000'; // Update this to your server URL if different

        try {
            // Filter only scenes with actual Veo videos
            const videoScenes = scenes.filter(s => s.veoVideo);

            if (videoScenes.length === 0) {
                throw new Error('No video clips found to merge. Please enable Veo 3.1 video generation.');
            }

            addProductionLog(`Found ${videoScenes.length} video clips to merge.`, 'info');

            // Step 1: Upload all video blobs to the server
            const uploadedPaths = [];
            for (let i = 0; i < videoScenes.length; i++) {
                const scene = videoScenes[i];
                addProductionLog(`Uploading scene ${i + 1}/${videoScenes.length} to server...`, 'info');

                // Convert data URL to blob
                const response = await fetch(scene.veoVideo);
                const blob = await response.blob();

                // Create FormData and upload
                const formData = new FormData();
                formData.append('video', blob, `scene-${i + 1}.mp4`);

                const uploadResponse = await fetch(`${SERVER_URL}/api/save-video`, {
                    method: 'POST',
                    body: formData
                });

                if (!uploadResponse.ok) {
                    throw new Error(`Failed to upload scene ${i + 1}: ${uploadResponse.statusText}`);
                }

                const uploadResult = await uploadResponse.json();
                uploadedPaths.push(uploadResult.filePath);
                addProductionLog(`Scene ${i + 1} uploaded: ${uploadResult.filename}`, 'success');
            }

            // Step 2: Request FFmpeg concatenation
            addProductionLog('Requesting FFmpeg concatenation...', 'info');
            const concatResponse = await fetch(`${SERVER_URL}/api/concat-videos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoPaths: uploadedPaths })
            });

            if (!concatResponse.ok) {
                const errorData = await concatResponse.json();
                throw new Error(`FFmpeg concatenation failed: ${errorData.error || concatResponse.statusText}`);
            }

            const concatResult = await concatResponse.json();
            addProductionLog(`FFmpeg Success: ${concatResult.message}`, 'success');

            // Step 3: Return the final video URL
            const finalVideoUrl = `${SERVER_URL}/output/${concatResult.filename}`;
            addProductionLog(`Final video ready: ${concatResult.filename}`, 'success');

            return finalVideoUrl;

        } catch (error) {
            addProductionLog(`FFmpeg Stitching Error: ${error.message}`, 'error');
            console.error('FFmpeg stitching failed:', error);
            throw error;
        }
    };



    // --- Main Workflow Trigger ---

    btnGenVideo.addEventListener('click', async () => {
        if (!state.femaleImg && !state.maleImg) {
            alert('Please upload at least one character photo.');
            return;
        }
        if (!state.sceneText.trim()) {
            alert('Please enter a scene description.');
            return;
        }

        const originalBtnText = btnGenVideo.innerHTML;
        const promptText = state.sceneText;
        const visualDetails = document.getElementById('visual-details').value;
        const aspectRatio = document.getElementById('aspect-ratio').value;

        // Detect Character Mode: Solo or Dual
        const hasFemale = !!state.femaleImg;
        const hasMale = !!state.maleImg;
        const characterMode = (hasFemale && hasMale) ? "dual" : "solo";
        console.log(`[CharacterMode] ${characterMode.toUpperCase()} - Female: ${hasFemale}, Male: ${hasMale}`);

        // Setup Duration & Scene Count
        const durationTotal = parseInt(document.getElementById('video-duration').value, 10);
        const sceneCount = Math.max(1, Math.floor(durationTotal / 10));

        btnGenVideo.disabled = true;
        btnGenVideo.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Initializing Google AI Director...`;
        addProductionLog("Initializing Google AI Director...", 'info');

        // --- DIAGNOSTIC CHECK ---
        const apiKey = document.getElementById('api-key').value.trim();
        try {
            console.log("Compiling available models...");
            addProductionLog("Compiling available models...", 'info');
            const modelRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const modelData = await modelRes.json();

            if (modelData.models) {
                const modelNames = modelData.models.map(m => m.name);
                console.log("Available Models:", modelNames);
                const veoInfo = modelData.models.filter(m => m.name.includes('veo')).map(m => `${m.name.split('/').pop()} [${m.supportedGenerationMethods.join(', ')}]`);
                addProductionLog(`Available Models: ${modelNames.length}`, 'info');
                if (veoInfo.length > 0) addProductionLog(`Veo Capabilities: ${veoInfo.join(' | ')}`, 'info');

                const hasGemini2 = modelNames.some(m => m.includes('gemini-2.0-flash-exp'));
                const hasGemini3 = modelNames.some(m => m.includes('gemini-3') || m.includes('nano-banana'));
                const hasVeo3 = modelNames.some(m => m.includes('veo-3.1'));

                const matchingGemini3 = modelNames.filter(m => m.includes('gemini-3') || m.includes('nano-banana'));
                const matchingVeo = modelNames.filter(m => m.includes('veo-3.1'));

                console.log("Image Models Detected: ", { hasGemini2, hasGemini3, hasVeo3 });
                addProductionLog(`AI Detection: Gemini 2.0: ${hasGemini2}, Gemini 3 Pro Engine: ${hasGemini3} (${matchingGemini3.join(', ')}), Veo 3.1: ${hasVeo3} (${matchingVeo.join(', ')})`, 'success');
            } else if (modelData.error) {
                console.warn("Model List Error:", modelData.error);
                addProductionLog(`Model List Error: ${modelData.error.message}`, 'warn');

                // Only block for AUTHENTICATION errors (401, 403), not rate limits or network issues
                const isAuthError = modelData.error.code === 401 || modelData.error.code === 403;
                const isInvalidKey = modelData.error.code === 400 && modelData.error.message.includes("API key not valid");

                if (isAuthError || isInvalidKey) {
                    alert(`Invalid API Key: ${modelData.error.message}\n\nPlease verify your key starts with "AIza" and has the correct permissions.`);
                    addProductionLog(`Invalid API Key: ${modelData.error.message}`, 'error');
                    btnGenVideo.disabled = false;
                    btnGenVideo.innerHTML = originalBtnText;
                    return;
                }

                // For other errors (rate limits, network), just warn and continue
                console.warn("Diagnostic check failed, but continuing anyway. Error:", modelData.error.message);
                addProductionLog(`Diagnostic check failed, but continuing anyway. Error: ${modelData.error.message}`, 'warn');
            }
        } catch (e) {
            console.warn("Diagnostic skipped due to net error", e);
            addProductionLog(`Diagnostic skipped due to network error: ${e.message}`, 'warn');
        }

        // Step 1: Generate Screenplay (Google AI Mode)
        setTimeout(async () => {
            let screenplayResult;
            try {
                addProductionLog("Generating screenplay with AI Director...", 'info');
                screenplayResult = await generateScreenplay(promptText, sceneCount, (statusMsg) => {
                    btnGenVideo.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> ${statusMsg}`;
                    addProductionLog(`Screenplay: ${statusMsg}`, 'info');
                }, visualDetails, aspectRatio, characterMode); // pass visualDetails, aspectRatio, and characterMode
            } catch (err) {
                console.error("Screenplay Generation Error:", err);
                alert("AI Director failed: " + err.message);
                addProductionLog(`Screenplay Generation Failed: ${err.message}`, 'error');
                btnGenVideo.innerHTML = originalBtnText;
                btnGenVideo.disabled = false;
                return;
            }

            if (!screenplayResult) {
                addProductionLog("Screenplay generation returned no result.", 'error');
                btnGenVideo.innerHTML = originalBtnText;
                btnGenVideo.disabled = false;
                return;
            }

            const screenplay = screenplayResult.scenes;
            const aiSource = screenplayResult.source;
            console.log("Screenplay generated via:", aiSource);
            addProductionLog(`Screenplay generated via: ${aiSource}. Total scenes: ${screenplay.length}`, 'success');

            btnGenVideo.innerHTML = `<i class="fa-solid fa-video"></i> Filming ${sceneCount} Cinematic Scenes...`;
            imageGallery.innerHTML = '';

            const scriptBox = document.createElement('div');
            scriptBox.className = 'glass-card';
            scriptBox.style.marginBottom = '20px';
            scriptBox.style.padding = '15px';
            scriptBox.style.textAlign = 'left';
            scriptBox.style.gridColumn = '1 / -1'; // Full Width (Landscape)

            scriptBox.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="margin:0;"><i class="fa-solid fa-scroll"></i> AI Director's Screenplay</h3>
                <span class="badge" style="background:${aiSource.includes('Real') ? '#4CAF50' : '#FF9800'}; padding:4px 8px; border-radius:4px; font-size:0.8em; color:white;">${aiSource}</span>
            </div>
            <div style="max-height: 300px; overflow-y: auto; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                <ul style="list-style:none; padding:0;">
                    ${screenplay.map(s => `<li style="margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1);">
                        <span class="badge" style="background:var(--primary-color); padding:2px 6px; border-radius:4px; font-size:0.8em; margin-right:5px;">${s.cameraMove}</span>
                        ${s.description}
                    </li>`).join('')}
                </ul>
            </div>`;
            imageGallery.appendChild(scriptBox);

            const statusMsg = document.createElement('div');
            statusMsg.className = 'placeholder-text';
            statusMsg.innerHTML = `<p><i class="fa-solid fa-clapperboard"></i> <strong>Production Status:</strong> Screenplay locked. Now Filming...</p>`;
            imageGallery.appendChild(statusMsg);

            const generatePollinationsImage = async (prompt) => {
                const encodedPrompt = encodeURIComponent(prompt + ", cinematic, 8k, photorealistic");
                const seed = Math.floor(Math.random() * 1000000);
                const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&model=flux&seed=${seed}&nologo=true`;
                try {
                    console.log("[Pollinations] Generating:", prompt);
                    const response = await fetch(url);
                    if (!response.ok) throw new Error("Pollinations API Error: " + response.statusText);
                    const blob = await response.blob();
                    return URL.createObjectURL(blob);
                } catch (e) {
                    console.warn("Pollinations Failed:", e);
                    return null;
                }
            };

            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            const scenes = [];

            // Helper to update the UI gallery as we generate
            const renderGalleryItem = (sceneResult, idx) => {
                const div = document.createElement('div');
                div.className = 'gallery-item glass-card';

                const isAI = sceneResult.type.includes('AI') || sceneResult.type.includes('Veo');
                const isError = sceneResult.type.startsWith('ERROR');
                let badgeColor = isAI ? '#4CAF50' : '#F44336';

                let mediaContent = '';
                if (isError) {
                    mediaContent = `<div style="width:100%; height:150px; background:#330000; display:flex; align-items:center; justify-content:center; color:#ffcccc; font-size:0.8em; padding:10px; text-align:center;">
                        <i class="fa-solid fa-triangle-exclamation"></i> ${sceneResult.type}
                    </div>`;
                } else if (sceneResult.veoVideo) {
                    mediaContent = `<video src="${sceneResult.veoVideo}" controls loop muted style="width:100%; height:150px; object-fit:cover;"></video>`;
                } else {
                    mediaContent = `<img src="${sceneResult.url}" style="width:100%; height:150px; object-fit:cover;">`;
                }

                div.innerHTML = `
                    <div style="overflow:hidden; border-radius:8px; margin-bottom:0.2rem;">
                        ${mediaContent}
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; padding:0 2px;">
                        <span style="background:rgba(0,0,0,0.6); padding:2px 6px; border-radius:4px; font-size:0.7em; margin-bottom:4px; display:inline-block; border:1px solid rgba(255,255,255,0.3); color:#fff;"><i class="fa-solid fa-video"></i> ${sceneResult.cameraMove}</span>
                        <span style="background:${badgeColor}; padding:2px 6px; border-radius:4px; font-size:0.7em; color:#fff;">${sceneResult.type}</span>
                    </div>
                    <div class="scene-caption"><i class="fa-solid fa-quote-left"></i> ${sceneResult.description}</div>
                    <div style="display:flex; gap:5px; margin-top:10px;">
                        ${!isError ? `
                            <button onclick="downloadImage('${sceneResult.url}', 'scene_${idx + 1}.png')" class="glass-btn" style="flex:1; font-size:0.75em; padding:8px 0;">
                                <i class="fa-solid fa-image"></i> Get Photo
                            </button>
                            ${sceneResult.veoVideo ? `
                            <button onclick="downloadImage('${sceneResult.veoVideo}', 'scene_${idx + 1}.mp4')" class="glass-btn" style="flex:1; font-size:0.75em; padding:8px 0; border-color: #4CAF50; color: #4CAF50;">
                                <i class="fa-solid fa-file-video"></i> Get Video
                            </button>
                            ` : ''}
                        ` : ''}
                    </div>
                `;
                imageGallery.appendChild(div);
            };

            for (let i = 0; i < screenplay.length; i++) {
                const scene = screenplay[i];
                const sceneNum = i + 1;

                btnGenVideo.innerHTML = `<i class="fa-solid fa-paintbrush"></i> Generating Scene ${sceneNum}/${screenplay.length}...`;
                addProductionLog(`Generating Scene ${sceneNum}/${screenplay.length}: "${scene.description}"`, 'info');

                let sceneResult = { ...scene, url: '', veoVideo: null, type: 'Init' };

                try {
                    const promptToUse = scene.image_prompt_en || scene.description;

                    // Determine which reference image to use
                    let refImage = state.femaleImg;
                    if (scene.cameraMove.includes("Male") && state.maleImg) {
                        refImage = state.maleImg;
                    }

                    // 1. Generate Static Reference Image
                    addProductionLog(`AI Image [S${sceneNum}]: Generating base image...`, 'info');
                    const aiUrl = await generateAIImage(apiKey, promptToUse, refImage, (statusMsg) => {
                        btnGenVideo.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> Scene ${sceneNum}: ${statusMsg}`;
                        addProductionLog(`AI Image [S${sceneNum}]: ${statusMsg}`, 'info');
                    }, aspectRatio);

                    if (aiUrl) {
                        sceneResult.url = aiUrl;
                        sceneResult.type = lockedImageModel || 'AI Generator';
                        addProductionLog(`AI Image [S${sceneNum}]: ✅ Base image generated by ${sceneResult.type}.`, 'success');

                        // 2. Generate Veo3 Video Clip if enabled
                        const veoEnabled = document.getElementById('enable-veo').checked;
                        if (veoEnabled) {
                            try {
                                addProductionLog(`Filming Scene ${sceneNum} with Veo 3.1...`, 'info');
                                btnGenVideo.innerHTML = `<i class="fa-solid fa-film"></i> Veo3: Generating Clip ${i + 1}/${screenplay.length}... (Please wait)`;

                                // Try 8 seconds if the user asked for 10s (closest valid)
                                const targetDuration = Math.min(8, Math.max(4, Math.floor(durationTotal / screenplay.length)));
                                const veoResult = await generateVeoVideo(apiKey, aiUrl, promptToUse, targetDuration, (status) => {
                                    btnGenVideo.innerHTML = `<i class="fa-solid fa-film"></i> Veo3: ${status} (Scene ${i + 1})`;
                                    addProductionLog(`Veo3 [S${sceneNum}]: ${status}`, 'info');
                                });

                                if (veoResult && veoResult.videoBase64) {
                                    sceneResult.veoVideo = veoResult.videoBase64;
                                    sceneResult.type = `Veo 3.1 (Cinema)`;
                                    addProductionLog(`Veo3 [S${sceneNum}]: ✅ Video Captured Successfully!`, 'success');
                                }
                            } catch (veoErr) {
                                addProductionLog(`Veo3 [S${sceneNum}]: ❌ FAILED - ${veoErr.message}`, 'error');
                                console.warn(`Veo Failed for Scene ${sceneNum}:`, veoErr.message);
                            }
                        }
                    } else {
                        throw new Error("AI Image Generation failed.");
                    }
                } catch (e) {
                    addProductionLog(`Scene ${sceneNum} Production Error: ${e.message}`, 'error');
                    console.error(`Scene ${sceneNum} failed:`, e);
                    sceneResult.type = 'ERROR: ' + e.message;
                }

                scenes.push(sceneResult);
                renderGalleryItem(sceneResult, i);

                if (i < screenplay.length - 1) await delay(1000);
            }

            // --- Step 3: Stitching Final Movie ---
            btnGenVideo.innerHTML = `<i class="fa-solid fa-film"></i> Final Movie Assembly...`;
            addProductionLog("Beginning video assembly and global audio sync...", 'info');

            try {
                // Calculation: Actual duration per scene to match user request
                const sceneDuration = (durationTotal / screenplay.length) * 1000;
                addProductionLog(`Stitching: ${screenplay.length} scenes, ${durationTotal}s total (${sceneDuration}ms each)`, 'info');

                let finalVideoUrl;
                // OPTIMIZATION: If only ONE scene and it's a real Veo video, use it directly!
                // This preserves 100% quality, sound, and solves "slow motion" / "dark screen" canvas issues.
                if (scenes.length === 1 && scenes[0].veoVideo) {
                    addProductionLog("Direct delivery: Single Veo scene detected. Bypassing canvas stitcher for maximum quality.", 'success');
                    finalVideoUrl = scenes[0].veoVideo;
                } else {
                    finalVideoUrl = await stitchVideos(scenes, sceneDuration);
                }

                videoSection.classList.remove('hidden');
                videoSection.scrollIntoView({ behavior: 'smooth' });
                finalVideo.src = finalVideoUrl;
                finalVideo.load(); // Ensure metadata loads
                finalVideo.play();

                let caption = document.getElementById('video-caption') || document.createElement('p');
                caption.id = 'video-caption';
                caption.className = 'scene-caption';
                caption.style.textAlign = 'center';
                caption.style.marginTop = '10px';
                if (!document.getElementById('video-caption')) finalVideo.parentElement.appendChild(caption);

                const realVeoCount = scenes.filter(s => !!s.veoVideo).length;
                caption.innerHTML = `<strong>Final Production:</strong> ${realVeoCount}/${scenes.length} Scenes with Real Veo3 Video & Pure AI Audio.`;
                addProductionLog(`Production Complete! Total Real Veo clips: ${realVeoCount}`, 'success');

                const dlLink = document.getElementById('download-link');
                dlLink.href = finalVideoUrl;
                dlLink.download = `cinema_production_${Date.now()}.mp4`;
                dlLink.innerHTML = `<i class="fa-solid fa-download"></i> Download Full Cinematic MP4`;

                // Add Raw Batch Download Link
                const rawVeos = scenes.filter(s => !!s.veoVideo);
                if (rawVeos.length > 0) {
                    const batchContainer = document.createElement('div');
                    batchContainer.style.marginTop = '15px';
                    batchContainer.style.textAlign = 'center';

                    const btnAll = document.createElement('button');
                    btnAll.className = 'glass-btn';
                    btnAll.style.borderColor = '#4CAF50';
                    btnAll.style.color = '#4CAF50';
                    btnAll.innerHTML = `<i class="fa-solid fa-file-zipper"></i> Download All ${rawVeos.length} Raw Veo Clips`;
                    btnAll.onclick = () => {
                        rawVeos.forEach((s, idx) => {
                            setTimeout(() => {
                                downloadImage(s.veoVideo, `raw_veo_scene_${idx + 1}.mp4`);
                            }, idx * 500); // Stagger downloads for reliability
                        });
                    };
                    batchContainer.appendChild(btnAll);
                    dlLink.parentElement.appendChild(batchContainer);
                }
            } catch (stitchErr) {
                addProductionLog(`Assembly Failed: ${stitchErr.message}`, 'error');
                console.error("Stitching Failed:", stitchErr);
                alert("Assembly failed, but you can download individual scenes above.");
            }

            btnGenVideo.innerHTML = originalBtnText;
            btnGenVideo.disabled = false;

        }, 1500);
    });

});
