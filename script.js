// --- データ管理 ---
let projects = JSON.parse(localStorage.getItem('lime_pro_data') || '[]');
let currentProjectId = null;
let scenario = [];
let editIndex = -1;
let nextTriggerIndex = 0;
let bIconData = "https://picsum.photos/100";

// --- 初期ロード ---
document.addEventListener('DOMContentLoaded', () => {
    renderHistory();
    document.getElementById('setup-b-icon-file').addEventListener('change', handleIconChange);
    document.getElementById('chat-form').addEventListener('submit', handleChatSubmit);
});

// --- ホーム画面 & プロジェクト管理 ---
function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = "";
    projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    projects.forEach(p => {
        const item = document.createElement('div');
        item.className = "memo-item p-4 border-b flex flex-col cursor-pointer";
        item.onclick = () => loadProject(p.id);
        
        const previewText = p.scenario.slice(0, 2).map(s => {
            if (s.type === 'text') return s.text;
            if (s.type === 'call') return '📞' + s.text;
            return '🖼メディア';
        }).join(' / ') || 'セリフがありません';
        
        const date = new Date(p.updatedAt).toLocaleString('ja-JP', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});

        item.innerHTML = `
            <div class="font-bold text-base truncate">${p.title}</div>
            <div class="flex items-center text-[11px] text-gray-500 mt-1">
                <span class="mr-2 whitespace-nowrap font-medium text-gray-600">${date}</span>
                <span class="truncate text-gray-400">${previewText}</span>
            </div>
        `;
        list.appendChild(item);
    });
}

function openNewModal() { document.getElementById('new-modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('new-modal').classList.add('hidden'); }

// 新規プロジェクト作成（ホームの「新規作成」ボタンから呼ばれる）
function startNewProject(type) {
    // 1. データをリセット
    currentProjectId = Date.now();
    scenario = [];
    editIndex = -1;
    
    // 2. 入力フィールドを初期化
    document.getElementById('project-title').value = "無題の台本";
    document.getElementById('setup-b-name').value = "相手役";
    document.getElementById('setup-b-icon-preview').src = "https://picsum.photos/100";
    
    // 3. プレビューをクリアし、開始ボタンを隠す（新規時はまだメッセージがないため）
    renderPreview();
    document.getElementById('start-btn').classList.add('hidden');
    
    // 4. 画面を切り替える
    showScreen('setup-screen');
}

// 画面切り替えの共通関数（これがあるか確認してください）
function showScreen(id) {
    // 全画面を隠す
    const screens = ['home-screen', 'setup-screen', 'talk-screen'];
    screens.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.classList.add('hidden');
    });
    
    // 指定した画面だけ表示
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove('hidden');
    } else {
        console.error("指定されたIDの画面が見つかりません:", id);
    }
}

function loadProject(id) {
    const p = projects.find(x => x.id === id);
    if (!p) return;
    currentProjectId = p.id;
    scenario = p.scenario;
    bIconData = p.bIcon;
    document.getElementById('project-title').value = p.title;
    document.getElementById('setup-b-name').value = p.bName;
    document.getElementById('setup-b-icon-preview').src = bIconData;
    showScreen('setup-screen');
    renderPreview();
}

function saveAndGoHome() {
    const projectData = {
        id: currentProjectId,
        title: document.getElementById('project-title').value,
        scenario: scenario,
        bName: document.getElementById('setup-b-name').value,
        bIcon: bIconData,
        updatedAt: new Date().toISOString()
    };
    const idx = projects.findIndex(p => p.id === currentProjectId);
    if (idx > -1) projects[idx] = projectData;
    else projects.push(projectData);
    localStorage.setItem('lime_pro_data', JSON.stringify(projects));
    renderHistory();
    showScreen('home-screen');
}

function deleteCurrentProject() {
    if (!confirm("この台本を削除してもよろしいですか？")) return;
    projects = projects.filter(p => p.id !== currentProjectId);
    localStorage.setItem('lime_pro_data', JSON.stringify(projects));
    renderHistory();
    showScreen('home-screen');
}

function showScreen(id) {
    ['home-screen', 'setup-screen', 'talk-screen'].forEach(s => document.getElementById(s).classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// --- セットアップ画面の機能 ---
function handleIconChange(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => { 
            bIconData = e.target.result; 
            document.getElementById('setup-b-icon-preview').src = bIconData; 
            renderPreview(); 
        };
        reader.readAsDataURL(file);
    }
}

function toggleTypeFields() {
    const type = document.getElementById('setup-type').value;
    document.getElementById('field-text').classList.toggle('hidden', type !== 'text');
    document.getElementById('field-media').classList.toggle('hidden', type !== 'media');
    document.getElementById('field-call').classList.toggle('hidden', type !== 'call');
    document.getElementById('field-sticker').classList.toggle('hidden', type !== 'sticker');
    
    // 既読スルーの時は入力欄を全部隠す
    if (type === 'ignore') {
        document.getElementById('field-text').classList.add('hidden');
    }
    
    if(type === 'call') toggleCallTimeField();
}

function toggleCallTimeField() {
    const callType = document.getElementById('setup-call-type').value;
    document.getElementById('setup-call-time').classList.toggle('hidden', callType !== '通話終了');
}

function handleStickerUpload(input) {
    for(let f of input.files){
        let r = new FileReader();
        r.onload = e => {
            const src = e.target.result;
            const stickerId = "sticker-" + Date.now() + Math.random();

            // スタンプ一覧（削除ボタン付きのコンテナ）
            const container = document.createElement('div');
            container.id = stickerId;
            container.className = 'relative group w-12 h-12';

            const sImg = document.createElement('img');
            sImg.src = src;
            sImg.className = 'w-full h-full border object-cover cursor-pointer';
            sImg.onclick = () => {
                document.getElementById('setup-type').value = 'sticker';
                toggleTypeFields();
                document.getElementById('setup-text').value = '{STAMP}' + src;
            };

            const delBtn = document.createElement('button');
            delBtn.innerHTML = '×';
            delBtn.className = 'absolute -top-1 -right-1 bg-red-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition';
            delBtn.onclick = (event) => {
                event.stopPropagation();
                if(confirm("このスタンプを削除しますか？")) {
                    document.getElementById(stickerId).remove();
                    // パネル側のスタンプも削除
                    document.getElementById(stickerId + "-p").remove();
                }
            };

            container.appendChild(sImg);
            container.appendChild(delBtn);
            document.getElementById('sticker-list').appendChild(container); // 「登録済みスタンプ」の場所に表示

            // セットアップの選択用（サイズを w-10 h-10 に固定し、枠からはみ出さないよう設定）
            const selectImg = sImg.cloneNode();
            selectImg.style.width = "40px";
            selectImg.style.height = "40px";
            selectImg.style.objectFit = "contain";
            selectImg.className = 'border cursor-pointer hover:scale-110 transition bg-gray-50';
            selectImg.onclick = sImg.onclick;
            document.getElementById('setup-sticker-select').appendChild(selectImg);

            // トーク画面のパネル用
            const pImg = document.createElement('img');
            pImg.id = stickerId + "-p";
            pImg.src = src; 
            pImg.className = 'w-16 h-16 object-contain cursor-pointer';
            pImg.onclick = () => {
                document.getElementById('user-input').value = '{STAMP}' + src;
                document.getElementById('chat-form').dispatchEvent(new Event('submit'));
                document.getElementById('sticker-panel').classList.add('hidden');
            };
            document.getElementById('sticker-panel').appendChild(pImg);
        };
        r.readAsDataURL(f);
    }
}

async function addOrUpdateScenario() {
    const type = document.getElementById('setup-type').value;
    const side = document.getElementById('setup-side').value;
    const time = document.getElementById('setup-time').value;
    const isWait = document.getElementById('setup-is-wait').checked;
    let data = { type, side, time, isWait };

    if (type === 'text') {
        data.text = document.getElementById('setup-text').value;
    } else if (type === 'sticker') {
        data.text = document.getElementById('setup-text').value;
        if (!data.text.startsWith('{STAMP}')) { alert('スタンプを選択してください'); return; }
    } else if (type === 'media') {
        const fileInput = document.getElementById('setup-media-file');
        if (fileInput.files[0]) {
            const file = fileInput.files[0];
            data.mediaType = file.type.startsWith('video') ? 'video' : 'image';
            data.text = await fileToBase64(file);
        } else if (editIndex > -1) {
            data.text = scenario[editIndex].text; data.mediaType = scenario[editIndex].mediaType;
        }
    } else if (type === 'call') {
        const ct = document.getElementById('setup-call-type').value;
        const cd = document.getElementById('setup-call-time').value;
        data.callType = ct; data.callDuration = cd;
        if (ct === '通話終了') data.text = `通話終了 ${cd}`;
        else if (ct === '不在着信') data.text = (side === 'right') ? '応答なし' : '不在着信';
        else data.text = 'キャンセル';
    }

    if (editIndex > -1) { 
        scenario[editIndex] = data; 
        editIndex = -1; 
        document.getElementById('add-btn').innerText = "追加 / 更新"; 
    } else { 
        scenario.push(data); 
    }

    renderPreview();
    document.getElementById('setup-text').value = "";
    document.getElementById('start-btn').classList.remove('hidden');
}

const fileToBase64 = file => new Promise((r, j) => {
    const rd = new FileReader(); rd.readAsDataURL(file);
    rd.onload = () => r(rd.result); rd.onerror = e => j(e);
});

function renderPreview() {
    const list = document.getElementById('preview-list'); list.innerHTML = "";
    const bName = document.getElementById('setup-b-name').value;
    scenario.forEach((item, i) => {
        const wrap = document.createElement('div');
        wrap.className = "relative group";
        const isRight = item.side === 'right';
        const bubbleClass = isRight ? 'my-bubble' : 'other-bubble';
        
        let inner = "";
        let useBubble = true;
        if (item.type === 'media') {
            inner = item.mediaType === 'image' ? `<img src="${item.text}" class="max-w-[120px] rounded">` : `<div class="bg-black/20 p-2 text-[10px] text-white rounded">🎥 動画</div>`;
        } else if (item.type === 'call') {
            inner = `<div class="flex items-center"><span class="call-icon">📞</span><span>${item.text}</span></div>`;
        } else if (item.type === 'sticker' || (item.text && item.text.startsWith("{STAMP}"))) {
            inner = `<img src="${item.text.replace('{STAMP}', '')}" class="w-20 h-20 object-contain">`;
            useBubble = false;
        } else if (item.type === 'ignore') {
            inner = `<div class="italic text-gray-400">（ここで既読がつく）</div>`;
        } else {
            inner = item.text || "";
        }

        const finalBubbleClass = useBubble ? bubbleClass : ""; 
        const paddingClass = useBubble ? "p-2 rounded-xl" : "";

        wrap.innerHTML = `
            <div class="flex ${isRight ? 'justify-end' : 'justify-start'} items-end space-x-1">
                ${!isRight ? `<img src="${bIconData}" class="w-7 h-7 rounded-full object-cover">` : ''}
                <div class="flex flex-col ${isRight ? 'items-end' : 'items-start'} max-w-[80%]">
                    ${!isRight ? `<span class="text-[8px] text-white/80 ml-1 font-bold">${bName}</span>` : ''}
                    <div class="${finalBubbleClass} ${paddingClass} text-[11px] text-black whitespace-pre-wrap shadow-sm">${inner}</div>
                    <span class="text-[7px] text-gray-400 mt-0.5">${item.time}</span>
                </div>
            </div>
            <div class="absolute -top-3 ${isRight ? 'left-0' : 'right-0'} hidden group-hover:flex space-x-1 z-10">
                <button onclick="editStep(${i})" class="bg-blue-500 text-white text-[9px] px-2 py-1 rounded shadow">編集</button>
                <button onclick="deleteStep(${i})" class="bg-red-500 text-white text-[9px] px-2 py-1 rounded shadow">削除</button>
            </div>
        `;
        list.appendChild(wrap);
    });
    list.scrollTop = list.scrollHeight;
}

window.editStep = (i) => {
    const item = scenario[i]; editIndex = i;
    document.getElementById('setup-type').value = item.type;
    document.getElementById('setup-side').value = item.side;
    document.getElementById('setup-time').value = item.time;
    document.getElementById('setup-is-wait').checked = item.isWait;
    toggleTypeFields();
    if(item.type === 'text') document.getElementById('setup-text').value = item.text;
    if(item.type === 'call') {
        document.getElementById('setup-call-type').value = item.callType;
        document.getElementById('setup-call-time').value = item.callDuration || ""; toggleCallTimeField();
    }
    document.getElementById('add-btn').innerText = "更新する";
    document.getElementById('setup-screen').scrollTo(0,0);
};

window.deleteStep = (i) => { if(confirm("削除しますか？")) { scenario.splice(i, 1); renderPreview(); } };

// --- 本番トーク機能 ---
function startTalk() {
    document.getElementById('header-name').innerText = document.getElementById('setup-b-name').value;
    showScreen('talk-screen');
    document.getElementById('chat-box').innerHTML = "";
    nextTriggerIndex = 0;
}

function backToSetup() { showScreen('setup-screen'); }
function toggleStickerPanel() { document.getElementById('sticker-panel').classList.toggle('hidden'); }

function handleChatSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('user-input');
    const val = input.value.trim();
    if (nextTriggerIndex >= scenario.length) return;
    const target = scenario[nextTriggerIndex];

    if (val !== "" && target.side === 'right' && target.type === 'text' && val === target.text) {
        addMessage(target); nextTriggerIndex++; input.value = ""; processNextSteps();
    } else if (val === "" && target.side === 'right' && target.type !== 'text') {
        addMessage(target); nextTriggerIndex++; processNextSteps();
    } else if (val.startsWith("{STAMP}") && target.side === 'right' && target.type === 'sticker' && val === target.text) {
        addMessage(target); nextTriggerIndex++; input.value = ""; processNextSteps();
    }
}

async function processNextSteps() {
    while (nextTriggerIndex < scenario.length) {
        const msg = scenario[nextTriggerIndex];
        
        // 自分のセリフ（右側）なら入力を待つためループを抜ける
        if (msg.side === 'right') break;

        // 時差計算：直前の自分の送信時刻(scenario[nextTriggerIndex-1])と、今回の相手の返信時刻の差
        let prevTime = nextTriggerIndex > 0 ? scenario[nextTriggerIndex-1].time : msg.time;
        let totalDelay = msg.isWait ? calculateDelay(prevTime, msg.time) : 1500;

        // 【ステップ1】既読がつくまでの待機 (返信5秒前まで)
        const waitBeforeRead = Math.max(totalDelay - 5000, 0);
        await new Promise(r => setTimeout(r, waitBeforeRead));
        
        // 既読バッジを表示
        document.querySelectorAll('.read-badge').forEach(el => el.classList.add('visible'));

        // 【ステップ2】既読がついてから実際に返信（またはスルー確定）が来るまでの待機 (残り5秒)
        const remainingDelay = totalDelay > 5000 ? 5000 : 0;
        await new Promise(r => setTimeout(r, remainingDelay));

        // 既読スルー設定の場合
        if (msg.type === 'ignore') {
            nextTriggerIndex++;
            // 既読スルーの次もまた「相手(左)」のセリフやスルーが続く可能性があるので再帰的にチェック
            processNextSteps();
            return;
        }

        // 通常メッセージの表示
        addMessage(msg);
        nextTriggerIndex++;
    }
}

function calculateDelay(t1, t2) {
    if (!t1 || !t2) return 1500; 
    const [h1, m1] = t1.split(':').map(Number); 
    const [h2, m2] = t2.split(':').map(Number);
    
    // 分単位の差を計算
    let diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
    
    // もし日を跨いで数値がマイナスになった場合（例：23:59 -> 00:01）の補正
    if (diffMin < 0) diffMin += 1440; 

    // 1分 ＝ 60,000ミリ秒（60秒）で計算
    // 0:02送信 → 0:04返信なら 2分 × 60,000 ＝ 120,000ms（2分間待機）
    const finalDelay = diffMin * 60000;
    
    console.log(`時差再現: ${diffMin}分待機します (${finalDelay}ms)`);
    return finalDelay;
}

function addMessage(data) {
    const box = document.getElementById('chat-box');
    const div = document.createElement('div');
    div.className = `flex ${data.side === 'right' ? 'justify-end' : 'justify-start'} items-end space-x-2`;
    
    let content = "";
    let useBubble = true;

    if (data.type === 'media') {
        content = data.mediaType === 'image' ? `<img src="${data.text}" class="rounded-lg max-w-[200px] shadow-sm">` : `<video src="${data.text}" controls class="rounded-lg max-w-[200px] shadow-sm"></video>`;
    } else if (data.type === 'call') {
        content = `<div class="flex items-center"><span class="call-icon">📞</span><span>${data.text}</span></div>`;
    } else if (data.text && data.text.startsWith("{STAMP}")) {
        content = `<img src="${data.text.replace('{STAMP}', '')}" style="width:120px;height:120px;object-fit:contain;">`;
        useBubble = false;
    } else {
        content = data.text;
    }

    const bubbleStyle = useBubble ? (data.side === 'right' ? 'my-bubble p-2.5 rounded-2xl' : 'other-bubble p-2.5 rounded-2xl') : "";
    
    // --- 【重要】visible を削除して、最初からは表示しないようにする ---
    const rb = data.side === 'right' ? '<span class="read-badge mr-1">既読</span>' : '';

    div.innerHTML = `
        ${data.side === 'left' ? `<img src="${bIconData}" class="w-9 h-9 rounded-full object-cover flex-shrink-0 shadow-sm">` : ''}
        <div class="flex flex-col ${data.side === 'right' ? 'items-end' : 'items-start'}">
            ${data.side === 'left' ? `<span class="text-[10px] text-gray-200 mb-0.5 ml-1">${document.getElementById('setup-b-name').value}</span>` : ''}
            <div class="${bubbleStyle} max-w-[240px] text-black shadow-sm whitespace-pre-wrap">${content}</div>
            <div class="text-[9px] text-white mt-1 opacity-90 flex items-center">${rb}${data.time}</div>
        </div>`;
    box.appendChild(div);
    // 確実に最新メッセージまでスクロールさせる
    setTimeout(() => {
        box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    }, 50);
}

async function handleTalkMediaUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const mediaData = await fileToBase64(file);
        const mediaType = file.type.startsWith('video') ? 'video' : 'image';
        
        // シナリオの次のステップがmediaかつ自分側なら送信可能
        const target = scenario[nextTriggerIndex];
        if (target && target.side === 'right' && target.type === 'media') {
            // 本来はファイルをアップロードしてURLにするべきですが、プレビュー用にデータをセット
            target.text = mediaData;
            target.mediaType = mediaType;
            addMessage(target);
            nextTriggerIndex++;
            processNextSteps();
        } else {
            alert("今は画像を送信する順番ではありません（または相手側の設定です）");
        }
        input.value = ""; // 連続選択可能にするためリセット
    }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('Service Worker 登録完了'))
    .catch(err => console.error('登録失敗', err));
}
