let selectedElement = null, currentEditEl = null, elCounter = 0, prevState = null, isCreating = false, currentType = null, currentUploadSrc = null;
let isDragging = false, isPinching = false, startX, startY, startLeft, startTop, initialDist = 0, startW = 0, startH = 0, startFontSize = 16, hasDragged = false;
let isCreatingPage = false;
let simulateMode = false;

let pages = [];
let selectedPageId = 1;
let homePageId = 1;
let currentProjectId = null;
let currentUser = null;

// --- سیستم کاربران و پروژه‌ها (دیتابیس محلی) ---
function enterApp() {
    currentUser = localStorage.getItem('nocode_current_user');
    if(currentUser) {
        showScreen('projects-screen');
        renderProjects();
    } else {
        showScreen('auth-screen');
    }
}
function register() {
    const u = document.getElementById('auth-username').value;
    const p = document.getElementById('auth-password').value;
    if(!u || !p) { document.getElementById('auth-status').innerText = "نام کاربری و رمز را وارد کنید."; return; }
    let users = JSON.parse(localStorage.getItem('nocode_users') || '{}');
    if(users[u]) { document.getElementById('auth-status').innerText = "این کاربر قبلا ثبت شده. وارد شوید."; return; }
    users[u] = p;
    localStorage.setItem('nocode_users', JSON.stringify(users));
    loginSuccess(u);
}
function login() {
    const u = document.getElementById('auth-username').value;
    const p = document.getElementById('auth-password').value;
    let users = JSON.parse(localStorage.getItem('nocode_users') || '{}');
    if(users[u] === p) { loginSuccess(u); }
    else { document.getElementById('auth-status').innerText = "نام کاربری یا رمز اشتباه است."; }
}
function loginSuccess(u) {
    currentUser = u;
    localStorage.setItem('nocode_current_user', u);
    showScreen('projects-screen');
    renderProjects();
}
function logout() {
    localStorage.removeItem('nocode_current_user');
    currentUser = null;
    showScreen('home-screen');
}
function getProjects() {
    return JSON.parse(localStorage.getItem(`nocode_projects_${currentUser}`) || '[]');
}
function saveProjects(projs) {
    localStorage.setItem(`nocode_projects_${currentUser}`, JSON.stringify(projs));
}
function renderProjects() {
    const list = document.getElementById('project-list'); list.innerHTML = '';
    const projs = getProjects();
    if(projs.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#aaa;">هنوز پروژه‌ای نساخته‌اید.</p>';
        return;
    }
    projs.forEach(p => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.innerHTML = `<span>📱 ${p.name}</span><span>✏️</span>`;
        item.onclick = () => openProject(p.id);
        list.appendChild(item);
    });
}
function newProject() {
    const name = prompt("نام پروژه جدید را وارد کنید:", "اپلیکیشن من");
    if(!name) return;
    const projs = getProjects();
    const newProj = { id: Date.now(), name: name, data: { pages: [{ id: 1, name: "صفحه اصلی", bg: "#0e1621" }], elements: [] } };
    projs.push(newProj);
    saveProjects(projs);
    openProject(newProj.id);
}
function openProject(id) {
    const projs = getProjects();
    const proj = projs.find(p => p.id === id);
    if(!proj) return;
    currentProjectId = id;
    
    // پاک کردن صفحه
    document.getElementById('canvas').innerHTML = '';
    
    // لود دیتای پروژه
    pages = proj.data.pages;
    selectedPageId = pages[0].id;
    homePageId = pages[0].id;
    
    // ساخت المان‌ها
    proj.data.elements.forEach(elData => {
        const el = document.createElement('div');
        el.className = 'draggable-el locked';
        el.style.top = elData.top; el.style.left = elData.left;
        el.style.width = elData.width; el.style.height = elData.height;
        el.style.background = elData.background; el.style.color = elData.color;
        el.style.borderColor = elData.borderColor; el.style.borderWidth = elData.borderWidth;
        el.style.borderRadius = elData.borderRadius;
        el.style.fontFamily = elData.fontFamily; el.style.fontSize = elData.fontSize; el.style.fontWeight = elData.fontWeight;
        el.setAttribute('data-type', elData.type);
        el.dataset.pageId = elData.pageId;
        el.dataset.link = elData.link || '';
        
        const content = document.createElement('div'); content.className = 'el-content';
        if(elData.type === 'button') content.innerText = elData.text;
        else if(elData.type === 'text') content.innerText = elData.text;
        else if(elData.type === 'switch') {
            if(elData.swType === 'checkbox') content.innerHTML = `<div class="boolean-checkbox on" style="background:${elData.swColor}">✔</div><span style="color:${elData.txtColor}">${elData.swText}</span>`;
            else content.innerHTML = `<div class="boolean-switch on" style="background:${elData.swColor}"><div class="boolean-knob"></div></div><span style="color:${elData.txtColor}">${elData.swText}</span>`;
        } else if(elData.type === 'input') {
            content.innerHTML = `<input type="text" placeholder="${elData.placeholder}" style="width: 100%; height: 100%; background: transparent; border: none; color: ${elData.textColor}; outline: none; padding: 0 10px;" disabled>`;
        }
        
        el.appendChild(content);
        document.getElementById('canvas').appendChild(el);
        initInteractions(el);
    });
    
    showScreen('builder-screen');
    renderPages();
    populatePageLinks();
    selectPage(selectedPageId);
}
function goToProjects() {
    saveAppData(true); // سیو خاموش
    showScreen('projects-screen');
    renderProjects();
}
function saveAppData(silent = false) {
    if(!currentUser || !currentProjectId) return;
    let appData = { pages: pages, elements: [] };
    document.querySelectorAll('#canvas .draggable-el').forEach(el => {
        const type = el.getAttribute('data-type'); const content = el.querySelector('.el-content');
        let elData = {
            pageId: el.dataset.pageId, type: type,
            top: el.style.top, left: el.style.left, width: el.style.width, height: el.style.height,
            background: el.style.background, color: el.style.color,
            borderColor: el.style.borderColor, borderWidth: el.style.borderWidth, borderRadius: el.style.borderRadius,
            fontFamily: el.style.fontFamily, fontSize: el.style.fontSize, fontWeight: el.style.fontWeight,
            link: el.dataset.link
        };
        if(type === 'button' || type === 'text') elData.text = content.innerText;
        else if(type === 'switch') {
            elData.swText = content.querySelector('span')?.innerText || '';
            elData.swColor = content.querySelector('.boolean-switch, .boolean-checkbox')?.style.background || '#27c93f';
            elData.txtColor = content.querySelector('span')?.style.color || '#ffffff';
            elData.swType = content.querySelector('.boolean-checkbox') ? 'checkbox' : 'toggle';
        } else if(type === 'input') {
            elData.placeholder = content.querySelector('input')?.placeholder || '';
            elData.textColor = content.querySelector('input')?.style.color || '#ffffff';
        }
        appData.elements.push(elData);
    });
    
    let projs = getProjects();
    let projIndex = projs.findIndex(p => p.id === currentProjectId);
    if(projIndex > -1) {
        projs[projIndex].data = appData;
        saveProjects(projs);
        if(!silent) alert("✅ پروژه ذخیره شد!");
    }
}

// --- صفحات ---
function renderPages() {
    const list = document.getElementById('existing-pages'); list.innerHTML = '';
    const switcher = document.getElementById('page-switcher'); switcher.innerHTML = '';
    pages.forEach(p => {
        const item = document.createElement('div');
        item.className = 'menu-item'; item.innerHTML = `<span>📄 ${p.name}</span><span>›</span>`;
        item.onclick = () => selectPage(p.id);
        list.appendChild(item);
        const opt = document.createElement('option');
        opt.value = p.id; opt.innerText = p.name + (p.id === homePageId ? " (صفحه اصلی)" : "");
        switcher.appendChild(opt);
    });
    switcher.value = selectedPageId;
}
function prepareNewPage() {
    isCreatingPage = true;
    document.getElementById('page-name').value = "صفحه " + (pages.length + 1);
    document.getElementById('page-bg-color').value = "#1a1a2e";
    document.getElementById('page-create').style.display = 'block';
    document.getElementById('page-delete').style.display = 'none';
    document.getElementById('page-set-home').style.display = 'none';
    showView('view-page-settings');
}
function createPageFromSettings() {
    const newId = Date.now();
    const name = document.getElementById('page-name').value || "صفحه جدید";
    const bg = document.getElementById('page-bg-color').value;
    pages.push({ id: newId, name: name, bg: bg });
    renderPages();
    selectPage(newId);
    isCreatingPage = false;
}
function switchPage(id) {
    if(simulateMode) return;
    selectedPageId = parseInt(id);
    const p = pages.find(x => x.id === selectedPageId); if(!p) return;
    document.getElementById('canvas').style.backgroundColor = p.bg;
    document.querySelectorAll('#canvas .draggable-el').forEach(el => {
        el.style.display = (parseInt(el.dataset.pageId) === selectedPageId) ? 'flex' : 'none';
    });
    document.getElementById('page-switcher').value = selectedPageId;
    deselectAllElements();
}
function selectPage(id) {
    if(simulateMode) return;
    switchPage(id);
    isCreatingPage = false;
    document.getElementById('page-create').style.display = 'none';
    document.getElementById('page-delete').style.display = 'block';
    document.getElementById('page-set-home').style.display = (selectedPageId === homePageId) ? 'none' : 'block';
    showView('view-page-settings');
}
function updatePageData() {
    if(isCreatingPage) return;
    const p = pages.find(x => x.id === selectedPageId); if(!p) return;
    p.name = document.getElementById('page-name').value;
    p.bg = document.getElementById('page-bg-color').value;
    document.getElementById('canvas').style.backgroundColor = p.bg;
    renderPages(); populatePageLinks();
}
function deleteSelectedPage() {
    if(pages.length <= 1) { alert("شما باید حداقل یک صفحه داشته باشید!"); return; }
    const pageIndex = pages.findIndex(x => x.id === selectedPageId);
    pages.splice(pageIndex, 1);
    renderPages(); populatePageLinks();
    selectPage(pages[0].id);
}
function setAsHomePage() {
    homePageId = selectedPageId;
    document.getElementById('page-set-home').style.display = 'none';
    renderPages();
}

// --- ناوبری ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}
function openDrawer() { document.getElementById('drawer').classList.add('active'); document.getElementById('overlay').classList.add('active'); }
function hideDrawer() { document.getElementById('drawer').classList.remove('active'); document.getElementById('overlay').classList.remove('active'); }
function closeDrawerAndDeselect() { hideDrawer(); if (currentEditEl) lockElement(currentEditEl); deselectAllElements(); }
function showView(viewId) {
    document.querySelectorAll('.drawer-view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    updateExistingLists();
}
function toggleDeviceView(btn) {
    document.body.classList.toggle('desktop-mode');
    btn.innerText = document.body.classList.contains('desktop-mode') ? '📱' : '💻';
}

// --- شبیه‌سازی ---
function startSimulation() {
    simulateMode = true;
    document.getElementById('builder-header').style.display = 'none';
    document.getElementById('simulator-header').style.display = 'flex';
    document.getElementById('canvas').classList.add('simulate-active');
    deselectAllElements();
    if(currentEditEl) lockElement(currentEditEl);
    renderSimulatorView(homePageId);
}
function stopSimulation() {
    simulateMode = false;
    document.getElementById('builder-header').style.display = 'flex';
    document.getElementById('simulator-header').style.display = 'none';
    document.getElementById('canvas').classList.remove('simulate-active');
    document.querySelectorAll('#canvas input').forEach(inp => inp.disabled = true);
    switchPage(selectedPageId);
}
function restartSimulation() { renderSimulatorView(homePageId); }
function renderSimulatorView(pageId) {
    const p = pages.find(x => x.id === pageId); if(!p) return;
    document.getElementById('canvas').style.backgroundColor = p.bg;
    document.querySelectorAll('#canvas .draggable-el').forEach(el => {
        if(parseInt(el.dataset.pageId) === pageId) {
            el.style.display = 'flex';
            const input = el.querySelector('input');
            if(input) input.disabled = false;
        } else {
            el.style.display = 'none';
        }
    });
}
function populatePageLinks() {
    const select = document.getElementById('btn-link-page'); if(!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">هیچ (بدون اتصال)</option>';
    pages.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name; opt.innerText = p.name;
        select.appendChild(opt);
    });
    if(currentVal) select.value = currentVal;
}
function toggleTransparent(checkbox, colorInputId) {
    document.getElementById(colorInputId).disabled = checkbox.checked;
    updateElement();
}

// --- المان‌ها ---
function prepareNewElement(type) {
    isCreating = true; currentType = type; elCounter++;
    if(type === 'button') {
        document.getElementById('btn-text').value = 'دکمه ' + elCounter;
        document.getElementById('btn-create').style.display = 'block'; document.getElementById('btn-delete').style.display = 'none';
        populatePageLinks();
        showView('view-button-settings');
    } else if(type === 'text') {
        document.getElementById('txt-content').value = 'متن جدید';
        document.getElementById('txt-create').style.display = 'block'; document.getElementById('txt-delete').style.display = 'none';
        showView('view-text-settings');
    } else if(type === 'image') {
        currentUploadSrc = null; document.getElementById('img-preview').style.display = 'none';
        document.getElementById('img-create').style.display = 'block'; document.getElementById('img-delete').style.display = 'none';
        showView('view-image-settings');
    } else if(type === 'switch') {
        document.getElementById('sw-type').value = 'toggle';
        document.getElementById('sw-create').style.display = 'block'; document.getElementById('sw-delete').style.display = 'none';
        showView('view-switch-settings');
    } else if(type === 'input') {
        document.getElementById('in-create').style.display = 'block'; document.getElementById('in-delete').style.display = 'none';
        showView('view-input-settings');
    }
}
function handleImageUpload(e) {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { currentUploadSrc = ev.target.result; document.getElementById('img-preview').src = currentUploadSrc; document.getElementById('img-preview').style.display = 'block'; };
    reader.readAsDataURL(file);
}
function createElementFromSettings(type) {
    const el = document.createElement('div');
    el.className = 'draggable-el locked'; el.style.top = '100px'; el.style.left = '100px';
    el.setAttribute('data-type', type);
    el.dataset.pageId = selectedPageId;
    const content = document.createElement('div'); content.className = 'el-content'; el.appendChild(content);
    document.getElementById('canvas').appendChild(el);
    initInteractions(el); applySettingsToElement(el); enableEditMode(el); hideDrawer();
}
function applySettingsToElement(el) {
    const type = el.getAttribute('data-type'); const content = el.querySelector('.el-content');
    if(type === 'button') {
        content.innerText = document.getElementById('btn-text').value || 'دکمه';
        el.style.width = document.getElementById('btn-width').value + 'px'; el.style.height = document.getElementById('btn-height').value + 'px';
        el.style.fontFamily = `${document.getElementById('btn-font').value}, sans-serif`;
        el.style.fontSize = document.getElementById('btn-font-size').value + 'px';
        el.style.fontWeight = document.getElementById('btn-font-weight').value;
        if(document.getElementById('btn-text-transparent').checked) el.style.color = 'transparent';
        else el.style.color = document.getElementById('btn-text-color').value;
        if(document.getElementById('btn-bg-transparent').checked) el.style.background = 'transparent';
        else el.style.background = document.getElementById('btn-bg-color').value;
        if(document.getElementById('btn-border-transparent').checked) { el.style.borderColor = 'transparent'; el.style.borderWidth = '0px'; }
        else { el.style.borderColor = document.getElementById('btn-border-color').value; el.style.borderWidth = document.getElementById('btn-border-width').value + 'px'; }
        el.style.borderRadius = document.getElementById('btn-shape').value + 'px';
        el.dataset.link = document.getElementById('btn-link-page').value;
    } else if(type === 'text') {
        content.innerText = document.getElementById('txt-content').value || 'متن';
        el.style.width = 'auto'; el.style.height = 'auto'; el.style.minWidth = '50px'; el.style.minHeight = '20px';
        el.style.fontFamily = `${document.getElementById('txt-font').value}, sans-serif`;
        el.style.fontWeight = document.getElementById('txt-weight').value;
        el.style.fontSize = document.getElementById('txt-size').value + 'px';
        el.style.color = document.getElementById('txt-color').value;
        el.style.background = 'transparent'; el.style.border = 'none';
    } else if(type === 'image') {
        if(currentUploadSrc) content.innerHTML = `<img src="${currentUploadSrc}">`;
        el.style.width = document.getElementById('img-width').value + 'px';
        el.style.height = document.getElementById('img-height').value + 'px';
        el.style.background = 'transparent'; el.style.border = 'none';
    } else if(type === 'switch') {
        const swText = document.getElementById('sw-text').value; const swColor = document.getElementById('sw-on-color').value;
        const txtColor = document.getElementById('sw-text-color').value; const swType = document.getElementById('sw-type').value;
        if(swType === 'toggle') content.innerHTML = `<div class="boolean-switch on" style="background:${swColor}"><div class="boolean-knob"></div></div><span style="color:${txtColor}">${swText}</span>`;
        else content.innerHTML = `<div class="boolean-checkbox on" style="background:${swColor}">✔</div><span style="color:${txtColor}">${swText}</span>`;
        el.style.width = 'auto'; el.style.height = 'auto'; el.style.minWidth = '100px'; el.style.minHeight = '30px';
        el.style.background = 'transparent'; el.style.border = 'none';
    } else if(type === 'input') {
        const ph = document.getElementById('in-placeholder').value; const txtColor = document.getElementById('in-text-color').value;
        content.innerHTML = `<input type="text" placeholder="${ph}" style="width: 100%; height: 100%; background: transparent; border: none; color: ${txtColor}; font-family: 'Vazirmatn'; outline: none; pointer-events: none; padding: 0 10px;" disabled>`;
        el.style.width = document.getElementById('in-width').value + 'px'; el.style.height = document.getElementById('in-height').value + 'px';
        el.style.background = document.getElementById('in-bg-color').value;
        el.style.borderColor = document.getElementById('in-border-color').value;
        el.style.borderWidth = '2px'; el.style.borderRadius = '8px';
    }
}
function updateElement() { if(!isCreating && !selectedElement) return; if(selectedElement) applySettingsToElement(selectedElement); updateExistingLists(); }
function deselectAllElements() {
    document.querySelectorAll('.draggable-el.locked.selected').forEach(el => {
        el.classList.remove('selected'); const t = el.querySelector('.btn-toolbar'); if(t) t.remove();
    });
}
function lockElement(el) { el.classList.remove('edit-mode'); el.classList.add('locked'); const t = el.querySelector('.btn-toolbar'); if(t) t.remove(); currentEditEl = null; prevState = null; }
function cancelEdit(el) {
    if(prevState) { 
        el.style.top = prevState.top; el.style.left = prevState.left; el.style.width = prevState.width; el.style.height = prevState.height; 
        if(prevState.fontSize) el.style.fontSize = prevState.fontSize + 'px';
        lockElement(el); selectLockedElement(el); 
    } else { el.remove(); selectedElement = null; currentEditEl = null; }
}
function deleteElement(el) { if(confirm("آیا از حذف این المان مطمئن هستید؟")) { el.remove(); selectedElement = null; currentEditEl = null; updateExistingLists(); } }
function selectLockedElement(el) {
    deselectAllElements(); el.classList.add('selected');
    const toolbar = document.createElement('div'); toolbar.className = 'btn-toolbar';
    toolbar.appendChild(createToolBtn('edit', '✏️', () => enableEditMode(el)));
    toolbar.appendChild(createToolBtn('settings', '⚙️', () => { loadSettingsForElement(el); openDrawer(); }));
    toolbar.appendChild(createToolBtn('trash', '🗑️', () => deleteElement(el)));
    el.appendChild(toolbar);
}
function enableEditMode(el) {
    deselectAllElements(); 
    prevState = { top: el.style.top, left: el.style.left, width: el.style.width, height: el.style.height, fontSize: parseInt(el.style.fontSize) || 16 };
    el.classList.add('edit-mode'); el.classList.remove('locked', 'selected'); currentEditEl = el; loadSettingsForElement(el);
    const toolbar = document.createElement('div'); toolbar.className = 'btn-toolbar';
    toolbar.appendChild(createToolBtn('confirm', '✔️', () => lockElement(el)));
    toolbar.appendChild(createToolBtn('cancel', '✖', () => cancelEdit(el)));
    el.appendChild(toolbar);
}
function loadSettingsForElement(el) {
    isCreating = false; selectedElement = el; const type = el.getAttribute('data-type'); const content = el.querySelector('.el-content');
    if(type === 'button') {
        document.getElementById('btn-text').value = content.innerText;
        document.getElementById('btn-width').value = parseFloat(el.style.width) || 120; document.getElementById('btn-height').value = parseFloat(el.style.height) || 50;
        document.getElementById('btn-font-size').value = parseInt(el.style.fontSize) || 16;
        document.getElementById('btn-font-weight').value = el.style.fontWeight || 'normal';
        document.getElementById('btn-font').value = el.style.fontFamily.split(',')[0].trim() || 'Vazirmatn';
        if(el.style.color === 'transparent') { document.getElementById('btn-text-transparent').checked = true; document.getElementById('btn-text-color').disabled = true; }
        else { document.getElementById('btn-text-transparent').checked = false; document.getElementById('btn-text-color').disabled = false; document.getElementById('btn-text-color').value = rgbToHex(el.style.color) || '#ffffff'; }
        if(el.style.background === 'transparent' || el.style.background === '') { document.getElementById('btn-bg-transparent').checked = true; document.getElementById('btn-bg-color').disabled = true; }
        else { document.getElementById('btn-bg-transparent').checked = false; document.getElementById('btn-bg-color').disabled = false; document.getElementById('btn-bg-color').value = rgbToHex(el.style.background); }
        if(el.style.borderWidth === '0px' || el.style.borderColor === 'transparent') { document.getElementById('btn-border-transparent').checked = true; document.getElementById('btn-border-color').disabled = true; }
        else { document.getElementById('btn-border-transparent').checked = false; document.getElementById('btn-border-color').disabled = false; document.getElementById('btn-border-color').value = rgbToHex(el.style.borderColor); }
        document.getElementById('btn-border-width').value = parseInt(el.style.borderWidth) || 0; 
        document.getElementById('btn-shape').value = el.style.borderRadius.replace('px', '') || '8';
        populatePageLinks();
        if(el.dataset.link) document.getElementById('btn-link-page').value = el.dataset.link;
        document.getElementById('btn-create').style.display = 'none'; document.getElementById('btn-delete').style.display = 'block';
        showView('view-button-settings');
    } else if(type === 'text') {
        document.getElementById('txt-content').value = content.innerText;
        document.getElementById('txt-font').value = el.style.fontFamily.split(',')[0].trim() || 'Vazirmatn';
        document.getElementById('txt-weight').value = el.style.fontWeight || 'normal';
        document.getElementById('txt-size').value = parseInt(el.style.fontSize) || 16;
        document.getElementById('txt-color').value = rgbToHex(el.style.color);
        document.getElementById('txt-create').style.display = 'none'; document.getElementById('txt-delete').style.display = 'block';
        showView('view-text-settings');
    } else if(type === 'image') {
        document.getElementById('img-width').value = parseFloat(el.style.width) || 150; document.getElementById('img-height').value = parseFloat(el.style.height) || 150;
        document.getElementById('img-create').style.display = 'none'; document.getElementById('img-delete').style.display = 'block';
        showView('view-image-settings');
    } else if(type === 'switch') {
        const span = content.querySelector('span');
        const sw = content.querySelector('.boolean-switch, .boolean-checkbox');
        const isCheckbox = content.querySelector('.boolean-checkbox');
        document.getElementById('sw-text').value = span ? span.innerText : '';
        document.getElementById('sw-type').value = isCheckbox ? 'checkbox' : 'toggle';
        document.getElementById('sw-on-color').value = rgbToHex(sw.style.background);
        document.getElementById('sw-text-color').value = span ? rgbToHex(span.style.color) : '#ffffff';
        document.getElementById('sw-create').style.display = 'none'; document.getElementById('sw-delete').style.display = 'block';
        showView('view-switch-settings');
    } else if(type === 'input') {
        const input = content.querySelector('input');
        document.getElementById('in-placeholder').value = input ? input.placeholder : '';
        document.getElementById('in-width').value = parseFloat(el.style.width) || 200;
        document.getElementById('in-height').value = parseFloat(el.style.height) || 40;
        document.getElementById('in-bg-color').value = rgbToHex(el.style.background);
        document.getElementById('in-text-color').value = input ? rgbToHex(input.style.color) : '#ffffff';
        document.getElementById('in-border-color').value = rgbToHex(el.style.borderColor);
        document.getElementById('in-create').style.display = 'none'; document.getElementById('in-delete').style.display = 'block';
        showView('view-input-settings');
    }
}
function updateExistingLists() {
    const types = { button: 'existing-buttons', text: 'existing-texts', image: 'existing-images', switch: 'existing-switches', input: 'existing-inputs' };
    for(let type in types) {
        const list = document.getElementById(types[type]); if(!list) continue; list.innerHTML = '';
        document.querySelectorAll(`#canvas .draggable-el[data-type="${type}"]`).forEach((el, i) => {
            if(parseInt(el.dataset.pageId) !== selectedPageId) return;
            const item = document.createElement('div'); item.className = 'menu-item'; item.style.marginBottom = '8px';
            const content = el.querySelector('.el-content');
            if(type === 'button' || type === 'text') item.innerText = content.innerText.substring(0,15);
            else if(type === 'switch') item.innerText = 'سوئیچ: ' + (content.querySelector('span')?.innerText || '');
            else if(type === 'input') item.innerText = 'فیلد: ' + (content.querySelector('input')?.placeholder || '');
            else item.innerText = 'تصویر ' + (i+1);
            item.onclick = () => { selectLockedElement(el); loadSettingsForElement(el); openDrawer(); };
            list.appendChild(item);
        });
    }
}
function deleteSelectedElement() {
    if(selectedElement) { selectedElement.remove(); selectedElement = null; currentEditEl = null;
        const viewMap = { button: 'view-button-list', text: 'view-text-list', image: 'view-image-list', switch: 'view-switch-list', input: 'view-input-list' };
        showView(viewMap[currentType] || 'view-main');
    }
}
function createToolBtn(type, icon, callback) {
    const btn = document.createElement('div'); btn.className = 'tool-btn ' + type; btn.innerHTML = icon;
    const trigger = (e) => { e.stopPropagation(); e.preventDefault(); callback(); };
    btn.addEventListener('touchstart', trigger, { passive: false }); btn.addEventListener('mousedown', trigger);
    return btn;
}
function initInteractions(el) {
    el.addEventListener('click', (e) => {
        if (hasDragged) { hasDragged = false; return; }
        if (simulateMode) {
            const type = el.getAttribute('data-type');
            if(type === 'button') {
                const linkName = el.dataset.link;
                const targetPage = pages.find(p => p.name === linkName);
                if(targetPage) renderSimulatorView(targetPage.id);
            } else if(type === 'switch') {
                const sw = el.querySelector('.boolean-switch, .boolean-checkbox');
                if(sw) sw.classList.toggle('on');
            }
            return;
        }
        if (el.classList.contains('locked') && !e.target.classList.contains('tool-btn')) selectLockedElement(el);
    });
}

const canvas = document.getElementById('canvas');
canvas.addEventListener('touchstart', (e) => {
    if(simulateMode) return;
    if (e.target.classList.contains('tool-btn')) return; if (!currentEditEl) return; e.preventDefault();
    if (e.touches.length === 1) {
        isDragging = true; isPinching = false; hasDragged = false;
        startX = e.touches[0].clientX; startY = e.touches[0].clientY; startLeft = currentEditEl.offsetLeft; startTop = currentEditEl.offsetTop;
    } else if (e.touches.length === 2) {
        isDragging = false; isPinching = true; hasDragged = true; initialDist = getDistance(e.touches[0], e.touches[1]);
        startW = currentEditEl.offsetWidth; startH = currentEditEl.offsetHeight;
        startFontSize = parseInt(currentEditEl.style.fontSize) || 16;
    }
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
    if(simulateMode) return;
    if (!currentEditEl) return;
    if (isPinching && e.touches.length === 2) {
        e.preventDefault(); let scale = getDistance(e.touches[0], e.touches[1]) / initialDist;
        const type = currentEditEl.getAttribute('data-type');
        if(type === 'text') {
            let newSize = Math.max(8, startFontSize * scale);
            currentEditEl.style.fontSize = newSize + 'px';
            if(selectedElement === currentEditEl) document.getElementById('txt-size').value = Math.round(newSize);
        } else {
            let newW = Math.max(40, startW * scale); let newH = Math.max(30, startH * scale);
            currentEditEl.style.width = newW + 'px'; currentEditEl.style.height = newH + 'px';
            if(selectedElement === currentEditEl) {
                if(type === 'button') { document.getElementById('btn-width').value = Math.round(newW); document.getElementById('btn-height').value = Math.round(newH); }
                else if(type === 'image') { document.getElementById('img-width').value = Math.round(newW); document.getElementById('img-height').value = Math.round(newH); }
                else if(type === 'input') { document.getElementById('in-width').value = Math.round(newW); document.getElementById('in-height').value = Math.round(newH); }
            }
        }
    } else if (isDragging && e.touches.length === 1) {
        e.preventDefault(); hasDragged = true;
        currentEditEl.style.left = (startLeft + e.touches[0].clientX - startX) + 'px';
        currentEditEl.style.top = (startTop + e.touches[0].clientY - startY) + 'px';
    }
}, { passive: false });
canvas.addEventListener('touchend', () => { isDragging = false; isPinching = false; });
canvas.addEventListener('mousedown', (e) => {
    if(simulateMode) return;
    if (e.target.classList.contains('tool-btn')) return; if (!currentEditEl) return;
    isDragging = true; hasDragged = false; startX = e.clientX; startY = e.clientY; startLeft = currentEditEl.offsetLeft; startTop = currentEditEl.offsetTop;
});
document.addEventListener('mousemove', (e) => {
    if (isDragging && currentEditEl) {
        hasDragged = true; currentEditEl.style.left = (startLeft + e.clientX - startX) + 'px'; currentEditEl.style.top = (startTop + e.clientY - startY) + 'px';
    }
});
document.addEventListener('mouseup', () => { setTimeout(() => hasDragged = false, 100); isDragging = false; });
canvas.addEventListener('click', (e) => { if(e.target.id === 'canvas' && !simulateMode) deselectAllElements(); });

function getDistance(t1, t2) { const dx = t1.clientX - t2.clientX; const dy = t1.clientY - t2.clientY; return Math.sqrt(dx * dx + dy * dy); }
function rgbToHex(rgb) { if(!rgb || rgb.startsWith('#')) return rgb || '#5fc9f8'; const p = rgb.match(/\d+/g); if(!p) return '#5fc9f8'; return '#' + p.map(x => parseInt(x).toString(16).padStart(2, '0')).join(''); }
function isDark(hex) { if(!hex) return false; const c = hex.substring(1), rgb = parseInt(c, 16), r = (rgb >> 16) & 0xff, g = (rgb >> 8) & 0xff, b = (rgb >> 0) & 0xff; return (0.2126*r + 0.7152*g + 0.0722*b) < 128; }
