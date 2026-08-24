let selectedElement = null, currentEditEl = null, elCounter = 0, prevState = null, isCreating = false, currentType = null, currentUploadSrc = null;
let isDragging = false, isPinching = false, startX, startY, startLeft, startTop, initialDist = 0, startW = 0, startH = 0, hasDragged = false;
alert('سلام! جاوااسکریپت با موفقیت لود شد!');
let pages = [{ id: 1, name: "صفحه اصلی", bg: "#0e1621" }];
let selectedPageId = 1;

// --- صفحات ---
function renderPages() {
    const list = document.getElementById('existing-pages'); list.innerHTML = '';
    pages.forEach(p => {
        const item = document.createElement('div');
        item.className = 'menu-item'; item.innerHTML = `<span>📄 ${p.name}</span><span>›</span>`;
        item.onclick = () => selectPage(p.id);
        list.appendChild(item);
    });
}
function selectPage(id) {
    selectedPageId = id;
    const p = pages.find(x => x.id === id); if(!p) return;
    document.getElementById('canvas').style.backgroundColor = p.bg;
    document.getElementById('page-name').value = p.name;
    document.getElementById('page-bg-color').value = p.bg;
    showView('view-page-settings');
}
function updatePageData() {
    const p = pages.find(x => x.id === selectedPageId); if(!p) return;
    p.name = document.getElementById('page-name').value;
    p.bg = document.getElementById('page-bg-color').value;
    document.getElementById('canvas').style.backgroundColor = p.bg;
    renderPages(); populatePageLinks();
}
function addNewPage() {
    const newId = Date.now();
    pages.push({ id: newId, name: "صفحه " + (pages.length + 1), bg: "#1a1a2e" });
    renderPages(); selectPage(newId);
}

// --- ناوبری ---
function goToBuilder() { document.getElementById('home-screen').classList.remove('active'); document.getElementById('builder-screen').classList.add('active'); renderPages(); populatePageLinks(); }
function goToHome() { document.getElementById('builder-screen').classList.remove('active'); document.getElementById('home-screen').classList.add('active'); }
function openDrawer() { document.getElementById('drawer').classList.add('active'); document.getElementById('overlay').classList.add('active'); showView('view-main'); }
function hideDrawer() { document.getElementById('drawer').classList.remove('active'); document.getElementById('overlay').classList.remove('active'); }
function closeDrawerAndDeselect() { hideDrawer(); if (currentEditEl) lockElement(currentEditEl); deselectAllElements(); }
function showView(viewId) {
    document.querySelectorAll('.drawer-view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    updateExistingLists();
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
    const content = document.createElement('div'); content.className = 'el-content'; el.appendChild(content);
    document.getElementById('canvas').appendChild(el);
    initInteractions(el); applySettingsToElement(el); enableEditMode(el); hideDrawer();
}

function applySettingsToElement(el) {
    const type = el.getAttribute('data-type'); const content = el.querySelector('.el-content');
    if(type === 'button') {
        content.innerText = document.getElementById('btn-text').value || 'دکمه';
        el.style.width = document.getElementById('btn-width').value + 'px';
        el.style.height = document.getElementById('btn-height').value + 'px';
        el.style.fontFamily = `${document.getElementById('btn-font').value}, sans-serif`;
        el.style.fontSize = document.getElementById('btn-font-size').value + 'px';
        el.style.fontWeight = document.getElementById('btn-font-weight').value;
        
        if(document.getElementById('btn-bg-transparent').checked) {
            el.style.background = 'transparent'; el.style.color = '#ffffff';
        } else {
            el.style.background = document.getElementById('btn-bg-color').value;
            el.style.color = isDark(el.style.background) ? '#ffffff' : '#17212b';
        }
        if(document.getElementById('btn-border-transparent').checked) {
            el.style.borderColor = 'transparent'; el.style.borderWidth = '0px';
        } else {
            el.style.borderColor = document.getElementById('btn-border-color').value;
            el.style.borderWidth = document.getElementById('btn-border-width').value + 'px';
        }
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
        const swText = document.getElementById('sw-text').value;
        const swColor = document.getElementById('sw-on-color').value;
        const txtColor = document.getElementById('sw-text-color').value;
        const swType = document.getElementById('sw-type').value;
        
        if(swType === 'toggle') {
            content.innerHTML = `<div class="boolean-switch on" style="background:${swColor}"><div class="boolean-knob"></div></div><span style="color:${txtColor}">${swText}</span>`;
        } else {
            content.innerHTML = `<div class="boolean-checkbox on" style="background:${swColor}">✔</div><span style="color:${txtColor}">${swText}</span>`;
        }
        el.style.width = 'auto'; el.style.height = 'auto'; el.style.minWidth = '100px'; el.style.minHeight = '30px';
        el.style.background = 'transparent'; el.style.border = 'none';
    } else if(type === 'input') {
        const ph = document.getElementById('in-placeholder').value;
        content.innerHTML = `<input type="text" placeholder="${ph}" style="width: 100%; height: 100%; background: transparent; border: none; color: white; font-family: 'Vazirmatn'; outline: none; pointer-events: none;" disabled>`;
        el.style.width = document.getElementById('in-width').value + 'px';
        el.style.height = document.getElementById('in-height').value + 'px';
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
    if(prevState) { el.style.top = prevState.top; el.style.left = prevState.left; el.style.width = prevState.width; el.style.height = prevState.height; lockElement(el); selectLockedElement(el); }
    else { el.remove(); selectedElement = null; currentEditEl = null; }
}
function selectLockedElement(el) {
    deselectAllElements(); el.classList.add('selected');
    const toolbar = document.createElement('div'); toolbar.className = 'btn-toolbar';
    toolbar.appendChild(createToolBtn('edit', '✏️', () => enableEditMode(el)));
    toolbar.appendChild(createToolBtn('settings', '⚙️', () => { loadSettingsForElement(el); openDrawer(); }));
    el.appendChild(toolbar);
}
function enableEditMode(el) {
    deselectAllElements(); prevState = { top: el.style.top, left: el.style.left, width: el.style.width, height: el.style.height };
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
        if(el.style.background === 'transparent' || el.style.background === '') {
            document.getElementById('btn-bg-transparent').checked = true; document.getElementById('btn-bg-color').disabled = true;
        } else {
            document.getElementById('btn-bg-transparent').checked = false; document.getElementById('btn-bg-color').disabled = false;
            document.getElementById('btn-bg-color').value = rgbToHex(el.style.background);
        }
        if(el.style.borderWidth === '0px' || el.style.borderColor === 'transparent') {
            document.getElementById('btn-border-transparent').checked = true; document.getElementById('btn-border-color').disabled = true;
        } else {
            document.getElementById('btn-border-transparent').checked = false; document.getElementById('btn-border-color').disabled = false;
            document.getElementById('btn-border-color').value = rgbToHex(el.style.borderColor);
        }
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
            const item = document.createElement('div'); item.className = 'menu-item'; item.style.marginBottom = '8px';
            const content = el.querySelector('.el-content');
            if(type === 'button' || type === 'text') item.innerText = content.innerText.substring(0,15);
            else if(type === 'switch') item.innerText = 'سوئیچ: ' + (content.querySelector('span')?.innerText || '');
            else if(type === 'input') item.innerText = 'فیلد: ' + (content.querySelector('input')?.placeholder || '');
            else item.innerText = 'تصویر ' + (i+1);
            item.onclick = () => { loadSettingsForElement(el); openDrawer(); };
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
        if (el.classList.contains('locked') && !e.target.classList.contains('tool-btn')) selectLockedElement(el);
    });
}

const canvas = document.getElementById('canvas');
canvas.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('tool-btn')) return; if (!currentEditEl) return; e.preventDefault();
    if (e.touches.length === 1) {
        isDragging = true; isPinching = false; hasDragged = false;
        startX = e.touches[0].clientX; startY = e.touches[0].clientY; startLeft = currentEditEl.offsetLeft; startTop = currentEditEl.offsetTop;
    } else if (e.touches.length === 2) {
        isDragging = false; isPinching = true; hasDragged = true; initialDist = getDistance(e.touches[0], e.touches[1]);
        startW = currentEditEl.offsetWidth; startH = currentEditEl.offsetHeight;
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (!currentEditEl) return;
    if (isPinching && e.touches.length === 2) {
        e.preventDefault(); let scale = getDistance(e.touches[0], e.touches[1]) / initialDist;
        let newW = Math.max(40, startW * scale); let newH = Math.max(30, startH * scale);
        currentEditEl.style.width = newW + 'px'; currentEditEl.style.height = newH + 'px';
        if(selectedElement === currentEditEl) {
            const type = currentEditEl.getAttribute('data-type');
            if(type === 'button') { document.getElementById('btn-width').value = Math.round(newW); document.getElementById('btn-height').value = Math.round(newH); }
            else if(type === 'image') { document.getElementById('img-width').value = Math.round(newW); document.getElementById('img-height').value = Math.round(newH); }
            else if(type === 'input') { document.getElementById('in-width').value = Math.round(newW); document.getElementById('in-height').value = Math.round(newH); }
        }
    } else if (isDragging && e.touches.length === 1) {
        e.preventDefault(); hasDragged = true;
        currentEditEl.style.left = (startLeft + e.touches[0].clientX - startX) + 'px';
        currentEditEl.style.top = (startTop + e.touches[0].clientY - startY) + 'px';
    }
}, { passive: false });

canvas.addEventListener('touchend', () => { isDragging = false; isPinching = false; });

canvas.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('tool-btn')) return; if (!currentEditEl) return;
    isDragging = true; hasDragged = false; startX = e.clientX; startY = e.clientY; startLeft = currentEditEl.offsetLeft; startTop = currentEditEl.offsetTop;
});
document.addEventListener('mousemove', (e) => {
    if (isDragging && currentEditEl) {
        hasDragged = true; currentEditEl.style.left = (startLeft + e.clientX - startX) + 'px'; currentEditEl.style.top = (startTop + e.clientY - startY) + 'px';
    }
});
document.addEventListener('mouseup', () => { setTimeout(() => hasDragged = false, 100); isDragging = false; });
canvas.addEventListener('click', (e) => { if(e.target.id === 'canvas') deselectAllElements(); });

function getDistance(t1, t2) { const dx = t1.clientX - t2.clientX; const dy = t1.clientY - t2.clientY; return Math.sqrt(dx * dx + dy * dy); }
function rgbToHex(rgb) { if(!rgb || rgb.startsWith('#')) return rgb || '#5fc9f8'; const p = rgb.match(/\d+/g); if(!p) return '#5fc9f8'; return '#' + p.map(x => parseInt(x).toString(16).padStart(2, '0')).join(''); }
function isDark(hex) { if(!hex) return false; const c = hex.substring(1), rgb = parseInt(c, 16), r = (rgb >> 16) & 0xff, g = (rgb >> 8) & 0xff, b = (rgb >> 0) & 0xff; return (0.2126*r + 0.7152*g + 0.0722*b) < 128; }
