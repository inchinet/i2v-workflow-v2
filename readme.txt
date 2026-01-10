need vpn to USA
I2V (image to video)工作流 in Z:\antigravity\i2v-workflow based on this readme.txt

Please create a liquid glass interface, input are
1)由 local 上載女主角照片
2)由 local 上載男主角照片 (optional)
3)text box (5000字 max，中英文輸入皆可) 需要場境的簡介，例:兩位情侶在㗎啡座攪笑對話情景/二人夢幻的一個浪漫婚禮片段。
4)AI模式(google or chatgpt API)根據輸入3編寫故事，需要的場景（部分）使用許多電影分鏡（例如傾斜tilt、跨度span、推拉dolly…等)，使其具有專業電影的感覺。必須用繁體中文，廣東話做對白，其他環境聲配音Veo3自動生成。
如果分了場景，人物容貌，衣着需要連貫，不會因為分場，日變夜，室外變室內，分場一黑衣人變分場二白衣人。
Locked Visual Details, input text: 保持人物容貌, 衣着, 耳環眼鏡, 化妝, 場景, 日夜, 室外/室內, 除非轉場境
更新 AI 導演系統，使其能夠檢測單主角模式和雙主角模式。
5) 可以新增一個輸入選項，允許選擇影像/視訊輸出的橫向（4:3）或縱向（3:4）模式。
6)按下（產生最終影片）(generate final video) : 產生一條根據上述，有主角及環境聲配音，約一分鐘或以上的影片

重點:
基於 Account 秒數限制，或需要分段先由 nanobananapro 生出分場單主角/雙人主角的圖(需要面貌與上載照片完全一樣，不可以變樣)，
這些分段生成的照片需要容許下載，並丢進 veo3 去產生主角們容貌一致，根據 input-3 要求的境場，最後分場影片併接一起，最終影片(mp4-use ffmpeg to merge)當然要容許下載。 字幕不需要，我自己後加。




--v2--
Z:\antigravity\i2v-workflow-v2
based everything in  Z:\antigravity\i2v-workflow, pls modify:

需求是我需要10個場景文字方塊輸入（first是必填，其他是optional）。
因為這樣可以讓我輸入各個場景需要的內容（基於：分場單主角/雙人主角的圖（需要面貌與上載照片完全一樣，不可以變樣）），但我不需要AI來寫故事，我自己寫。
必須用繁體中文，廣東話做對白場景: veo3影片和最終mp4（使用ffmpeg合併）




