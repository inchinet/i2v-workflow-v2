
document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const dropFemale = document.getElementById('drop-female');
    const inputFemale = document.getElementById('female-photo');
    const previewFemale = document.getElementById('preview-female');

    const dropMale = document.getElementById('drop-male');
    const inputMale = document.getElementById('male-photo');
    const previewMale = document.getElementById('preview-male');

    // Scene textareas (10 total)
    const sceneInputs = [];
    const charCounters = [];
    for (let i = 1; i <= 10; i++) {
        sceneInputs.push(document.getElementById(`scene-${i}`));
        charCounters.push(document.getElementById(`char-${i}`));
    }

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
            console.log("已從儲存載入 API 金鑰。");
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
        scenes: [] // Array of user-provided scene descriptions
    };

    // --- Helpers ---
    const handleFileSelect = (file, previewContainer, key, dropZone = null) => {
        if (!file) return;

        console.log(`正在處理 ${key} 的檔案:`, file.name);

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
                img.alt = "預覽";
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
            console.log(`${key} 預覽已更新`);
        };
        reader.onerror = (err) => console.error("檔案讀取錯誤:", err);
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
            console.log('檔案輸入已變更', key);
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
            console.log('檔案已拖放到區域', key);
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

    // --- Text Input for 10 scenes ---
    sceneInputs.forEach((textarea, idx) => {
        if (!textarea) return;
        textarea.addEventListener('input', (e) => {
            const counter = charCounters[idx];
            if (counter) {
                counter.textContent = e.target.value.length;
            }
        });
    });

    // --- Dialogue to Narrative Converter ---
    const convertDialogueToNarrative = async (dialogueText, sceneNumber) => {
        const apiKey = document.getElementById('api-key').value.trim();

        if (!apiKey) {
            alert('請先輸入 Google Gemini API 金鑰以使用對白轉換功能。');
            return null;
        }

        if (!dialogueText.trim()) {
            alert('場景描述為空，無需轉換。');
            return null;
        }

        // Check if there's a structured dialogue section
        const dialogueMatch = dialogueText.match(/\*\*Dialogue:\*\*\s*([\s\S]*?)(?=\n\n|$)/i);

        let textToConvert;
        let hasStructuredDialogue = false;

        if (dialogueMatch) {
            // Found structured dialogue section
            textToConvert = dialogueMatch[1].trim();
            hasStructuredDialogue = true;
        } else {
            // Check for simple dialogue format (阿明: ... 阿花: ...)
            const simpleDialoguePattern = /[\u4e00-\u9fff]+:\s*\([^)]*\)|[\u4e00-\u9fff]+:\s*.+/;
            if (simpleDialoguePattern.test(dialogueText)) {
                textToConvert = dialogueText;
            } else {
                // Already in narrative format or no dialogue found
                alert('未檢測到對白格式。場景描述似乎已經是敘述格式，或沒有找到對白部分。');
                return null;
            }
        }

        try {
            const prompt = `你是一個專業的電影場景描述轉換助手。請將以下劇本格式的對白轉換為敘述性的場景描述，適合用於 AI 影片生成。

重要規則：
1. 將角色名稱轉換為"男主角"或"女主角"（如果有具體名字，保留名字，例如"男主角阿明"、"女主角阿花"）
2. 保留所有情感描述和動作指示
3. 將對白內容轉換為敘述形式，描述角色說了什麼
4. 保持廣東話用詞和語氣
5. 在結尾添加"保持人物容貌, 髮型衣着, 化妝。"
6. 只輸出轉換後的場景描述，不要添加任何解釋或額外文字

原始對白：
${textToConvert}

轉換後的場景描述：`;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message || '轉換失敗');
            }

            if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
                const convertedText = data.candidates[0].content.parts[0].text.trim();

                // If there was a structured dialogue section, replace only that part
                if (hasStructuredDialogue) {
                    const updatedText = dialogueText.replace(
                        /\*\*Dialogue:\*\*\s*[\s\S]*?(?=\n\n|$)/i,
                        `**Narrative Description:**\n${convertedText}`
                    );
                    return updatedText;
                } else {
                    // Return just the converted text
                    return convertedText;
                }
            }

            throw new Error('無法從 API 響應中提取轉換結果');

        } catch (error) {
            console.error('對白轉換錯誤:', error);
            alert(`轉換失敗: ${error.message}`);
            return null;
        }
    };

    // --- Setup Convert Buttons ---
    const convertButtons = document.querySelectorAll('.convert-btn');
    convertButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const sceneNumber = btn.getAttribute('data-scene');
            const textarea = document.getElementById(`scene-${sceneNumber}`);

            if (!textarea) return;

            const originalText = textarea.value;

            // Disable button and show loading state
            btn.disabled = true;
            btn.classList.add('loading');
            const originalBtnText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-rotate"></i> 轉換中...';

            try {
                const convertedText = await convertDialogueToNarrative(originalText, sceneNumber);

                if (convertedText) {
                    textarea.value = convertedText;
                    // Update character counter
                    const counter = charCounters[parseInt(sceneNumber) - 1];
                    if (counter) {
                        counter.textContent = convertedText.length;
                    }
                    // Brief success feedback
                    btn.innerHTML = '<i class="fa-solid fa-check"></i> 已轉換';
                    setTimeout(() => {
                        btn.innerHTML = originalBtnText;
                    }, 2000);
                }
            } catch (error) {
                console.error('轉換錯誤:', error);
            } finally {
                btn.disabled = false;
                btn.classList.remove('loading');
                setTimeout(() => {
                    btn.innerHTML = originalBtnText;
                }, 2000);
            }
        });
    });


    // --- Helper: Collect User Scenes ---
    const collectUserScenes = () => {
        const scenes = [];
        const cameraMovesPattern = [
            "Wide Shot (大遠景)",
            "Mid Shot (中景)",
            "Close-up Female (女角特寫)",
            "Close-up Male (男角特寫)",
            "Dolly In (推鏡)",
            "Pan (運鏡)",
            "Mid Shot (中景)",
            "Wide Shot (大遠景)",
            "Close-up Female (女角特寫)",
            "Dolly In (推鏡)"
        ];

        sceneInputs.forEach((textarea, idx) => {
            if (!textarea) return;
            const text = textarea.value.trim();
            if (text.length > 0) {
                scenes.push({
                    idx: scenes.length,
                    description: text,
                    image_prompt_en: text, // Use same text for image generation
                    cameraMove: cameraMovesPattern[idx] || "Mid Shot (中景)",
                    transformId: getTransformId(cameraMovesPattern[idx] || "Mid Shot")
                });
            }
        });

        return scenes;
    };

    // Helper to map Move ID from Name
    const getTransformId = (moveName) => {
        if (!moveName) return 0;
        const n = moveName.toLowerCase();
        if (n.includes("wide") || n.includes("遠景")) return 0;
        if (n.includes("dolly") || n.includes("推鏡")) return 1;
        if (n.includes("female") && n.includes("close")) return 2;
        if (n.includes("女角") && n.includes("特寫")) return 2;
        if (n.includes("male") && n.includes("close")) return 3;
        if (n.includes("男角") && n.includes("特寫")) return 3;
        if (n.includes("mid") || n.includes("中景")) return 4;
        if (n.includes("pan") || n.includes("運鏡")) return 4;
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

    // Helper: Robust Download
    const downloadImage = (dataUrl, filename) => {
        const link = document.createElement('a');
        link.href = dataUrl;
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

    // Helper: Call Google Gemini for Image Generation (Dynamic Discovery)
    const generateAIImage = async (apiKey, prompt, referenceImageBase64 = null, onStatusUpdate = null, aspectRatio = "4:3", visualDetails = "") => {
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        const allErrors = [];

        // MODEL LOCK CHECK: If we already found a working model, use it directly
        if (lockedImageModel) {
            console.log(`[圖像生成] 使用鎖定模型: ${lockedImageModel}`);
            const candidatesIds = [lockedImageModel];

            const tryImgModel = async (idx) => {
                if (idx >= candidatesIds.length) {
                    console.error("鎖定模型失敗。");
                    lockedImageModel = null;
                    throw new Error("鎖定模型失敗。請重新生成。");
                }

                const modelId = candidatesIds[idx];
                console.log(`[圖像生成] 使用 ${modelId}...`);

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

                const parts = [];
                const aspectInstruction = aspectRatio === "3:4"
                    ? "垂直肖像格式（高於寬，3:4 比例）"
                    : "水平橫向格式（寬於高，4:3 比例）";

                let finalPrompt = '';

                // Append visual details if provided
                const visualContext = visualDetails ? `\n\nVISUAL & LOCATION CONSISTENCY LOCK (MANDATORY):\n${visualDetails}\nEnsure these visual details (appearance, environment, lighting) are strictly followed unless the scene description explicitly overrides them.` : "";

                // CRITICAL: Reference image instructions come FIRST for maximum priority
                if (referenceImageBase64) {
                    finalPrompt = `🔴 CRITICAL PRIORITY - FACIAL IDENTITY LOCK 🔴

                    **MANDATORY REQUIREMENTS (HIGHEST PRIORITY):**
                    1. The person in the generated image MUST have the EXACT SAME FACE as the attached reference image
                    2. PRESERVE 100% FACIAL IDENTITY - same ethnicity, race, skin tone, facial structure, eye shape, nose, mouth
                    3. DO NOT change the person's race or ethnicity under ANY circumstances
                    4. This is the SAME PERSON performing in a movie scene - maintain complete facial consistency
                    5. Match the reference photo's hairstyle, hair color, and facial features precisely
                    6. If the reference shows an Asian person, the output MUST be Asian. If Caucasian, output MUST be Caucasian. If African, output MUST be African.
                    
                    ${visualContext}

                    **SCENE DESCRIPTION (Secondary Priority):**
                    Generate a photorealistic 8k image in ${aspectInstruction} format showing: ${prompt}
                    
                    **STYLE REQUIREMENTS:**
                    - Photorealistic photography style (真實攝影照片風格)
                    - Real human faces with skin texture
                    - Absolutely NO anime, illustration, cartoon, or painting styles
                    - Natural lighting and depth of field effects
                    
                    ⚠️ REMINDER: The character's face, ethnicity, and race MUST match the reference image EXACTLY. This is non-negotiable.`;
                } else {
                    finalPrompt = `生成一張真實照片級別的 8k 圖像，格式為 ${aspectInstruction}，內容：${prompt}。
                    
                    ${visualContext}

                    風格要求：
                    - 必須是真實攝影照片風格（photorealistic）
                    - 真實的人類面孔和皮膚紋理
                    - 絕對不要動漫、插畫、卡通或繪畫風格
                    - 使用真實的光影和景深效果`;
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
                        const msg = `[${modelId}] 錯誤: ${data.error.message || JSON.stringify(data.error)}`;
                        console.warn(msg);
                        throw new Error(msg);
                    }

                    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
                        for (const part of data.candidates[0].content.parts) {
                            if (part.inlineData && part.inlineData.mimeType.startsWith('image')) {
                                lockedImageModel = modelId;
                                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                            }
                        }
                    }

                    throw new Error(`[${modelId}] 成功但響應中沒有圖像數據。`);
                } catch (e) {
                    throw e;
                }
            };

            return tryImgModel(0);
        }

        // 1. DYNAMIC MODEL DISCOVERY (First time only)
        let validModelIds = [];
        try {
            console.log("[動態發現] 正在獲取可用模型...");
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const listData = await listRes.json();

            if (listData.models) {
                validModelIds = listData.models
                    .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
                    .map(m => m.name.replace('models/', ''));

                console.log("[動態發現] 可用生成器:", validModelIds);
            }
        } catch (e) {
            console.warn("[動態發現] 列出模型失敗，使用後備。", e);
        }

        // 2. PRIORITY LOGIC
        const preferredPatterns = [
            'nano-banana-pro-preview',
            'gemini-3-pro-image-preview',
            'gemini-3-pro-preview',
            'veo-3',
            'gemini-2.0-flash-exp-image-generation',
            'imagen-4'
        ];

        let candidatesIds = [];

        preferredPatterns.forEach(pattern => {
            const matches = validModelIds.filter(id => id.includes(pattern));
            candidatesIds.push(...matches);
        });

        if (candidatesIds.length === 0) {
            candidatesIds = [
                "gemini-2.0-flash-exp-image-generation",
                "nano-banana-pro-preview",
                "gemini-2.5-flash-image-preview",
                "gemini-2.5-flash-image",
                "gemini-3-pro-image-preview",
                "gemini-2.0-flash-exp",
                "gemini-1.5-pro"
            ];
        }

        candidatesIds = [...new Set(candidatesIds)];
        console.log("[圖像生成] 最終模型候選列表:", candidatesIds);

        // 3. EXECUTION LOOP
        const tryImgModel = async (idx) => {
            if (idx >= candidatesIds.length) {
                console.error("所有圖像生成模型失敗。");
                throw new Error(allErrors.join("\n\n"));
            }

            const modelId = candidatesIds[idx];
            console.log(`[圖像生成] 嘗試 ${modelId}...`);
            if (onStatusUpdate) onStatusUpdate(`正在初始化 ${modelId}...`);

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

            const parts = [];
            const aspectInstruction = aspectRatio === "3:4"
                ? "垂直肖像格式（高於寬，3:4 比例）"
                : "水平橫向格式（寬於高，4:3 比例）";

            let finalPrompt = '';

            // Append visual details if provided
            const visualContext = visualDetails ? `\n\nVISUAL & LOCATION CONSISTENCY LOCK (MANDATORY):\n${visualDetails}\nEnsure these visual details (appearance, environment, lighting) are strictly followed unless the scene description explicitly overrides them.` : "";

            // CRITICAL: Reference image instructions come FIRST for maximum priority
            if (referenceImageBase64) {
                finalPrompt = `🔴 CRITICAL PRIORITY - FACIAL IDENTITY LOCK 🔴

                **MANDATORY REQUIREMENTS (HIGHEST PRIORITY):**
                1. The person in the generated image MUST have the EXACT SAME FACE as the attached reference image
                2. PRESERVE 100% FACIAL IDENTITY - same ethnicity, race, skin tone, facial structure, eye shape, nose, mouth
                3. DO NOT change the person's race or ethnicity under ANY circumstances
                4. This is the SAME PERSON performing in a movie scene - maintain complete facial consistency
                5. Match the reference photo's hairstyle, hair color, and facial features precisely
                6. If the reference shows an Asian person, the output MUST be Asian. If Caucasian, output MUST be Caucasian. If African, output MUST be African.
                
                ${visualContext}

                **SCENE DESCRIPTION (Secondary Priority):**
                Generate a photorealistic 8k image in ${aspectInstruction} format showing: ${prompt}
                
                **STYLE REQUIREMENTS:**
                - Photorealistic photography style (真實攝影照片風格)
                - Real human faces with skin texture
                - Absolutely NO anime, illustration, cartoon, or painting styles
                - Natural lighting and depth of field effects
                
                ⚠️ REMINDER: The character's face, ethnicity, and race MUST match the reference image EXACTLY. This is non-negotiable.`;
            } else {
                finalPrompt = `生成一張真實照片級別的 8k 圖像，格式為 ${aspectInstruction}，內容：${prompt}。
                
                ${visualContext}

                風格要求：
                - 必須是真實攝影照片風格（photorealistic）
                - 真實的人類面孔和皮膚紋理
                - 絕對不要動漫、插畫、卡通或繪畫風格
                - 使用真實的光影和景深效果`;
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
                    const msg = `[${modelId}] 錯誤: ${data.error.message || JSON.stringify(data.error)}`;
                    console.warn(msg);

                    // RETRY LOGIC for Quota (429)
                    if (data.error.code === 429 || msg.includes("Quota") || msg.includes("rate limit")) {
                        const waitMatch = msg.match(/retry in ([0-9.]+)(?:s|ms)/i);
                        let waitMs = 10000;
                        if (waitMatch && waitMatch[1]) {
                            waitMs = Math.ceil(parseFloat(waitMatch[1]) * 1000) + 2000;
                            console.warn(`[配額] API 請求等待。睡眠 ${waitMs / 1000}秒...`);
                        } else {
                            console.warn(`[配額] 達到限制。睡眠 10秒...`);
                        }

                        const totalSeconds = Math.ceil(waitMs / 1000);
                        for (let s = totalSeconds; s > 0; s--) {
                            if (onStatusUpdate) onStatusUpdate(`配額已達。${s}秒後重試...`);
                            await sleep(1000);
                        }

                        return tryImgModel(idx);
                    }

                    allErrors.push(msg);
                    return tryImgModel(idx + 1);
                }

                if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
                    for (const part of data.candidates[0].content.parts) {
                        if (part.inlineData && part.inlineData.mimeType.startsWith('image')) {
                            if (!lockedImageModel) {
                                lockedImageModel = modelId;
                                console.log(`[圖像生成] ✅ 模型已鎖定: ${modelId}（將用於所有場景）`);
                            }
                            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                        }
                    }
                }

                if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
                    return `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
                }

                allErrors.push(`[${modelId}] 成功但響應中沒有圖像數據。`);
                return tryImgModel(idx + 1);

            } catch (e) {
                const isNetworkError = e.message.includes("fetch") || e.message.includes("Network");

                if (isNetworkError && (!e.retryCount || e.retryCount < 3)) {
                    const retryCount = (e.retryCount || 0) + 1;
                    const waitTime = Math.pow(2, retryCount) * 1000;

                    console.warn(`[${modelId}] 網絡錯誤。重試 ${retryCount}/3 在 ${waitTime / 1000}秒...`);
                    if (onStatusUpdate) onStatusUpdate(`網絡問題。${waitTime / 1000}秒後重試...`);

                    await sleep(waitTime);

                    e.retryCount = retryCount;
                    return tryImgModel(idx);
                }

                allErrors.push(`[${modelId}] 網絡錯誤: ${e.message}`);
                return tryImgModel(idx + 1);
            }
        };

        return tryImgModel(0);
    };

    // Helper: Generate Video with Veo 3.1 API
    const generateVeoVideo = async (apiKey, imageBase64, prompt, duration = 5, onStatusUpdate = null, visualDetails = '') => {
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        const errors = [];

        const veoModels = [
            "veo-3.1-generate-preview",
            "veo-3.0-generate-001",
            "veo-3.0-fast-generate-001"
        ];

        for (const modelId of veoModels) {
            try {
                console.log(`[Veo] 嘗試 ${modelId} 通過 predictLongRunning...`);
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predictLongRunning?key=${apiKey}`;

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

                // Enhanced prompt for Cantonese audio and clothing consistency
                // Append user's locked visual details if provided
                const visualDetailsText = visualDetails && visualDetails.trim()
                    ? `\n\n視覺一致性要求：${visualDetails.trim()}`
                    : '';

                const enhancedPrompt = `生成一段 ${duration} 秒的電影級影片，基於以下分鏡：${prompt}。
                
                重要要求：
                1. 音頻：所有角色對白和旁白必須100%使用廣東話（粵語/Cantonese）。
                2. 服裝：角色必須保持與參考圖像完全相同的服裝、髮型和配飾。
                3. 音效：包含自然環境音效和電影背景音樂。
                4. 動作：確保動作逼真且高保真度。${visualDetailsText}
                
                CRITICAL: All dialogue and narration must be in Cantonese (廣東話). Character clothing must match the reference image exactly.`;

                // Log the complete prompt for debugging
                console.log(`[Veo] 完整提示詞 (${modelId}):\n`, enhancedPrompt);
                if (onStatusUpdate) {
                    onStatusUpdate(`準備提示詞: ${prompt.substring(0, 50)}...`);
                }

                parts.unshift({ text: enhancedPrompt });

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

                if (onStatusUpdate) onStatusUpdate(`正在請求 ${modelId}...`);
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestPayload)
                });

                const data = await response.json();

                if (!response.ok || data.error) {
                    const msg = data.error ? data.error.message : response.statusText;
                    console.warn(`[${modelId}] 初始化錯誤: ${msg}`);
                    errors.push(`[${modelId}] ${msg}`);
                    continue;
                }

                if (!data.name) {
                    errors.push(`[${modelId}] 缺少操作名稱。`);
                    continue;
                }

                const opName = data.name;
                console.log(`[Veo] 操作已開始: ${opName}`);

                // --- POLLING ---
                let pollCount = 0;
                const maxPolls = 180;
                while (pollCount < maxPolls) {
                    pollCount++;
                    if (onStatusUpdate) onStatusUpdate(`輪詢 ${modelId} (${pollCount * 5}秒)...`);

                    const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${opName}?key=${apiKey}`;
                    const pollRes = await fetch(pollUrl);
                    const pollData = await pollRes.json();

                    if (pollData.done) {
                        if (pollData.error) {
                            throw new Error(`操作失敗: ${pollData.error.message}`);
                        }

                        const res = pollData.response || {};
                        console.log(`[Veo] 操作進度: 完成。響應結構:`, res);

                        const mainRes = res.generateVideoResponse || res;
                        const videoCandidates = [];

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

                        for (const v of videoCandidates) {
                            let videoData = null;
                            if (v.bytesBase64Encoded) {
                                videoData = `data:video/mp4;base64,${v.bytesBase64Encoded}`;
                            } else if (v.uri) {
                                videoData = v.uri.includes('?') ? `${v.uri}&key=${apiKey}` : `${v.uri}?key=${apiKey}`;
                            }

                            if (videoData) {
                                console.log(`[Veo] ✅ 影片已定位！模型: ${modelId}`);
                                return { videoBase64: videoData, model: modelId };
                            }
                        }

                        if (mainRes.candidates && mainRes.candidates[0].content && mainRes.candidates[0].content.parts) {
                            const part = mainRes.candidates[0].content.parts.find(p => p.inlineData && p.inlineData.mimeType.startsWith('video'));
                            if (part) {
                                return {
                                    videoBase64: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                                    model: modelId
                                };
                            }
                        }

                        // Check for RAI (Responsible AI) safety filter blocking
                        if (mainRes.raiMediaFilteredCount && mainRes.raiMediaFilteredCount > 0) {
                            const reasons = mainRes.raiMediaFilteredReasons || [];
                            const reasonText = reasons.join(' ');
                            console.error(`[${modelId}] 安全過濾器阻止: ${reasonText}`);
                            throw new Error(`內容安全過濾器觸發: ${reasonText}\n\n建議：請簡化場景描述，移除對白，只描述視覺動作。例如："女主角微笑看著男主角" 而不是 "女主角講：你好靚仔！"`);
                        }

                        console.error(`[${modelId}] 無法提取影片。結構:`, JSON.stringify(res));
                        throw new Error(`成功狀態，但響應中未找到影片數據。已檢查: video, videos, generatedVideos, generatedSamples, candidates。`);
                    }

                    await sleep(5000);
                }
                throw new Error("輪詢超時。");

            } catch (e) {
                console.warn(`[${modelId}] 錯誤:`, e.message);
                errors.push(`[${modelId}] ${e.message}`);
            }
        }

        throw new Error("Veo3 生成失敗。診斷:\n" + errors.join("\n"));
    };

    // 3. FFmpeg-Based Video Stitcher
    const stitchVideos = async (scenes, durationPerSceneMs = 5000) => {
        addProductionLog(`開始 FFmpeg 影片組裝: ${scenes.length} 個場景。`, 'info');

        const SERVER_URL = 'http://localhost:3000';

        try {
            const videoScenes = scenes.filter(s => s.veoVideo);

            if (videoScenes.length === 0) {
                throw new Error('未找到影片片段進行合併。請啟用 Veo 3.1 影片生成。');
            }

            addProductionLog(`找到 ${videoScenes.length} 個影片片段進行合併。`, 'info');

            // Step 1: Upload all video blobs to the server
            const uploadedPaths = [];
            for (let i = 0; i < videoScenes.length; i++) {
                const scene = videoScenes[i];
                addProductionLog(`正在上傳場景 ${i + 1}/${videoScenes.length} 到伺服器...`, 'info');

                const response = await fetch(scene.veoVideo);
                const blob = await response.blob();

                const formData = new FormData();
                formData.append('video', blob, `scene-${i + 1}.mp4`);

                const uploadResponse = await fetch(`${SERVER_URL}/api/save-video`, {
                    method: 'POST',
                    body: formData
                });

                if (!uploadResponse.ok) {
                    throw new Error(`上傳場景 ${i + 1} 失敗: ${uploadResponse.statusText}`);
                }

                const uploadResult = await uploadResponse.json();
                uploadedPaths.push(uploadResult.filePath);
                addProductionLog(`場景 ${i + 1} 已上傳: ${uploadResult.filename}`, 'success');
            }

            // Step 2: Request FFmpeg concatenation
            addProductionLog('正在請求 FFmpeg 合併...', 'info');
            const concatResponse = await fetch(`${SERVER_URL}/api/concat-videos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoPaths: uploadedPaths })
            });

            if (!concatResponse.ok) {
                const errorData = await concatResponse.json();
                throw new Error(`FFmpeg 合併失敗: ${errorData.error || concatResponse.statusText}`);
            }

            const concatResult = await concatResponse.json();
            addProductionLog(`FFmpeg 成功: ${concatResult.message}`, 'success');

            const finalVideoUrl = `${SERVER_URL}/output/${concatResult.filename}`;
            addProductionLog(`最終影片準備就緒: ${concatResult.filename}`, 'success');

            return finalVideoUrl;

        } catch (error) {
            addProductionLog(`FFmpeg 拼接錯誤: ${error.message}`, 'error');
            console.error('FFmpeg 拼接失敗:', error);
            throw error;
        }
    };

    // --- Main Workflow Trigger ---
    btnGenVideo.addEventListener('click', async () => {
        // Collect user scenes
        const userScenes = collectUserScenes();

        if (userScenes.length === 0) {
            alert('請至少填寫場景 1。');
            return;
        }

        if (!state.femaleImg && !state.maleImg) {
            alert('請至少上傳一張角色照片。');
            return;
        }

        const originalBtnText = btnGenVideo.innerHTML;
        const visualDetails = document.getElementById('visual-details').value;
        const aspectRatio = document.getElementById('aspect-ratio').value;

        // Detect Character Mode
        const hasFemale = !!state.femaleImg;
        const hasMale = !!state.maleImg;
        const characterMode = (hasFemale && hasMale) ? "dual" : "solo";
        console.log(`[角色模式] ${characterMode.toUpperCase()} - 女主角: ${hasFemale}, 男主角: ${hasMale}`);

        btnGenVideo.disabled = true;
        btnGenVideo.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 正在初始化...`;
        addProductionLog("正在初始化影片生成流程...", 'info');

        const apiKey = document.getElementById('api-key').value.trim();

        // Display screenplay
        setTimeout(async () => {
            const screenplay = userScenes;
            console.log("使用用戶提供的場景:", screenplay);
            addProductionLog(`用戶提供的場景總數: ${screenplay.length}`, 'success');

            btnGenVideo.innerHTML = `<i class="fa-solid fa-video"></i> 正在拍攝 ${screenplay.length} 個電影場景...`;
            imageGallery.innerHTML = '';

            const scriptBox = document.createElement('div');
            scriptBox.className = 'glass-card';
            scriptBox.style.marginBottom = '20px';
            scriptBox.style.padding = '15px';
            scriptBox.style.textAlign = 'left';
            scriptBox.style.gridColumn = '1 / -1';

            scriptBox.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="margin:0;"><i class="fa-solid fa-scroll"></i> 場景列表</h3>
                <span class="badge" style="background:#4CAF50; padding:4px 8px; border-radius:4px; font-size:0.8em; color:white;">用戶自訂</span>
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
            statusMsg.innerHTML = `<p><i class="fa-solid fa-clapperboard"></i> <strong>製作狀態:</strong> 場景已鎖定。正在拍攝...</p>`;
            imageGallery.appendChild(statusMsg);

            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            const scenes = [];

            // Helper to update the UI gallery
            const renderGalleryItem = (sceneResult, idx) => {
                const div = document.createElement('div');
                div.className = 'gallery-item glass-card';

                const isAI = sceneResult.type.includes('AI') || sceneResult.type.includes('Veo');
                const isError = sceneResult.type.startsWith('錯誤');
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
                                <i class="fa-solid fa-image"></i> 獲取照片
                            </button>
                            ${sceneResult.veoVideo ? `
                            <button onclick="downloadImage('${sceneResult.veoVideo}', 'scene_${idx + 1}.mp4')" class="glass-btn" style="flex:1; font-size:0.75em; padding:8px 0; border-color: #4CAF50; color: #4CAF50;">
                                <i class="fa-solid fa-file-video"></i> 獲取影片
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

                btnGenVideo.innerHTML = `<i class="fa-solid fa-paintbrush"></i> 正在生成場景 ${sceneNum}/${screenplay.length}...`;
                addProductionLog(`正在生成場景 ${sceneNum}/${screenplay.length}: "${scene.description}"`, 'info');

                let sceneResult = { ...scene, url: '', veoVideo: null, type: '初始化' };

                try {
                    const promptToUse = scene.image_prompt_en || scene.description;

                    let refImage = state.femaleImg;
                    if (scene.cameraMove.includes("男角") && state.maleImg) {
                        refImage = state.maleImg;
                    } else if (scene.cameraMove.includes("Male") && state.maleImg) {
                        refImage = state.maleImg;
                    }

                    // 1. Generate Static Reference Image
                    addProductionLog(`AI 圖像 [S${sceneNum}]: 正在生成基礎圖像...`, 'info');
                    const aiUrl = await generateAIImage(apiKey, promptToUse, refImage, (statusMsg) => {
                        btnGenVideo.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> 場景 ${sceneNum}: ${statusMsg}`;
                        addProductionLog(`AI 圖像 [S${sceneNum}]: ${statusMsg}`, 'info');
                    }, aspectRatio, visualDetails);

                    if (aiUrl) {
                        sceneResult.url = aiUrl;
                        sceneResult.type = lockedImageModel || 'AI 生成器';
                        addProductionLog(`AI 圖像 [S${sceneNum}]: ✅ 基礎圖像已由 ${sceneResult.type} 生成。`, 'success');

                        // 2. Generate Veo3 Video Clip if enabled
                        const veoEnabled = document.getElementById('enable-veo').checked;
                        if (veoEnabled) {
                            try {
                                addProductionLog(`正在用 Veo 3.1 拍攝場景 ${sceneNum}...`, 'info');
                                btnGenVideo.innerHTML = `<i class="fa-solid fa-film"></i> Veo3: 正在生成片段 ${i + 1}/${screenplay.length}... (請稍候)`;

                                const targetDuration = 8; // Fixed 8 seconds per scene
                                const veoResult = await generateVeoVideo(apiKey, aiUrl, promptToUse, targetDuration, (status) => {
                                    btnGenVideo.innerHTML = `<i class="fa-solid fa-film"></i> Veo3: ${status} (場景 ${i + 1})`;
                                    addProductionLog(`Veo3 [S${sceneNum}]: ${status}`, 'info');
                                }, visualDetails);

                                if (veoResult && veoResult.videoBase64) {
                                    sceneResult.veoVideo = veoResult.videoBase64;
                                    sceneResult.type = `Veo 3.1 (電影)`;
                                    addProductionLog(`Veo3 [S${sceneNum}]: ✅ 影片成功捕獲！`, 'success');
                                }
                            } catch (veoErr) {
                                addProductionLog(`Veo3 [S${sceneNum}]: ❌ 失敗 - ${veoErr.message}`, 'error');
                                console.warn(`場景 ${sceneNum} 的 Veo 失敗:`, veoErr.message);
                            }
                        }
                    } else {
                        throw new Error("AI 圖像生成失敗。");
                    }
                } catch (e) {
                    addProductionLog(`場景 ${sceneNum} 製作錯誤: ${e.message}`, 'error');
                    console.error(`場景 ${sceneNum} 失敗:`, e);
                    sceneResult.type = '錯誤: ' + e.message;
                }

                scenes.push(sceneResult);
                renderGalleryItem(sceneResult, i);

                if (i < screenplay.length - 1) await delay(1000);
            }

            // --- Step 3: Stitching Final Movie ---
            btnGenVideo.innerHTML = `<i class="fa-solid fa-film"></i> 最終影片組裝中...`;
            addProductionLog("開始影片組裝和全局音頻同步...", 'info');

            try {
                const sceneDuration = 8000; // 8 seconds per scene
                addProductionLog(`拼接: ${screenplay.length} 個場景，每個 ${sceneDuration}ms`, 'info');

                let finalVideoUrl;
                if (scenes.length === 1 && scenes[0].veoVideo) {
                    addProductionLog("直接交付: 檢測到單個 Veo 場景。繞過畫布拼接器以獲得最大質量。", 'success');
                    finalVideoUrl = scenes[0].veoVideo;
                } else {
                    finalVideoUrl = await stitchVideos(scenes, sceneDuration);
                }

                videoSection.classList.remove('hidden');
                videoSection.scrollIntoView({ behavior: 'smooth' });
                finalVideo.src = finalVideoUrl;
                finalVideo.load();
                finalVideo.play();

                let caption = document.getElementById('video-caption') || document.createElement('p');
                caption.id = 'video-caption';
                caption.className = 'scene-caption';
                caption.style.textAlign = 'center';
                caption.style.marginTop = '10px';
                if (!document.getElementById('video-caption')) finalVideo.parentElement.appendChild(caption);

                const realVeoCount = scenes.filter(s => !!s.veoVideo).length;
                caption.innerHTML = `<strong>最終製作:</strong> ${realVeoCount}/${scenes.length} 個場景包含真實 Veo3 影片和純 AI 音頻。`;
                addProductionLog(`製作完成！真實 Veo 片段總數: ${realVeoCount}`, 'success');

                const dlLink = document.getElementById('download-link');
                dlLink.href = finalVideoUrl;
                dlLink.download = `cinema_production_${Date.now()}.mp4`;
                dlLink.innerHTML = `<i class="fa-solid fa-download"></i> 下載完整電影 MP4`;

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
                    btnAll.innerHTML = `<i class="fa-solid fa-file-zipper"></i> 下載所有 ${rawVeos.length} 個原始 Veo 片段`;
                    btnAll.onclick = () => {
                        rawVeos.forEach((s, idx) => {
                            setTimeout(() => {
                                downloadImage(s.veoVideo, `raw_veo_scene_${idx + 1}.mp4`);
                            }, idx * 500);
                        });
                    };
                    batchContainer.appendChild(btnAll);
                    dlLink.parentElement.appendChild(batchContainer);
                }
            } catch (stitchErr) {
                addProductionLog(`組裝失敗: ${stitchErr.message}`, 'error');
                console.error("拼接失敗:", stitchErr);
                alert("組裝失敗，但您可以下載上面的單個場景。");
            }

            btnGenVideo.innerHTML = originalBtnText;
            btnGenVideo.disabled = false;

        }, 1500);
    });

});
