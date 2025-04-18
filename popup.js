// ✅ 공통 요소
const toggle = document.getElementById('mode-toggle');
const siteInput = document.getElementById('site-input');
const addBtn = document.getElementById('add-site');
const addCurrentBtn = document.getElementById('add-current');
const list = document.getElementById('whitelist');
const whitelistSection = document.getElementById('whitelist-section');
const statusMsg = document.getElementById('status-msg');

// ✅ JS 제한 관련 요소
const jsToggle = document.getElementById('js-mode-toggle');
const jsSiteInput = document.getElementById('js-site-input');
const addJsBtn = document.getElementById('add-js-site');
const jsList = document.getElementById('js-whitelist');
const jsSection = document.getElementById('js-whitelist-section');

// ✅ 도메인 정규화
function normalizeDomain(host) {
  return host.replace(/^https?:\/\//, '')
             .replace(/^www\./, '')
             .toLowerCase();
}

// ✅ content.js 즉시 재적용
function reloadContentScript() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
  });
}

// ✅ 작동 여부 배지 표시
function updateBadge(isEnabled) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    chrome.action.setBadgeText({ tabId, text: isEnabled ? '✅' : '' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#4CAF50' });
  });
}

// ✅ 현재 탭 작동 여부 확인
function updateStatus() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0] || !tabs[0].url.startsWith('http')) return;
    const hostname = normalizeDomain(new URL(tabs[0].url).hostname);

    chrome.storage.sync.get(['whitelist', 'mode', 'jsWhitelist', 'jsMode'], ({ whitelist = [], mode = 'whitelist', jsWhitelist = [], jsMode = false }) => {
      const matched = whitelist.some(site => hostname.endsWith(site));
      const matchedJs = jsMode || jsWhitelist.some(site => hostname.endsWith(site));
      const isEnabled = mode === 'global' || matched;

      statusMsg.textContent = isEnabled || matchedJs ? '✅ 현재 페이지에서 작동 중입니다.' : '';
      //updateBadge(isEnabled || matchedJs);
    });
  });
}

// ✅ 일반 복사 허용 사이트 목록 렌더링
function renderList(items) {
  list.innerHTML = '';
  items.forEach(site => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = site;

    const delBtn = document.createElement('button');
    delBtn.textContent = '삭제';
    delBtn.onclick = () => {
      const updated = items.filter(s => s !== site);
      chrome.storage.sync.set({ whitelist: updated }, () => {
        renderList(updated);
        reloadContentScript();
        updateStatus();
      });
    };

    li.appendChild(span);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

// ✅ JS 제한 사이트 목록 렌더링
function renderJsList(items) {
  jsList.innerHTML = '';
  items.forEach(site => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = site;

    const delBtn = document.createElement('button');
    delBtn.textContent = '삭제';
    delBtn.onclick = () => {
      const updated = items.filter(s => s !== site);
      chrome.storage.sync.set({ jsWhitelist: updated }, () => {
        renderJsList(updated);
        reloadContentScript();
        updateStatus();
      });
    };

    li.appendChild(span);
    li.appendChild(delBtn);
    jsList.appendChild(li);
  });
}

// ✅ 초기 상태 로딩
chrome.storage.sync.get(['whitelist', 'mode', 'jsWhitelist', 'jsMode'], ({ whitelist = [], mode = 'whitelist', jsWhitelist = [], jsMode = false }) => {
  toggle.checked = (mode === 'global');
  whitelistSection.style.display = toggle.checked ? 'none' : 'block';
  renderList(whitelist);

  jsToggle.checked = jsMode;
  jsSection.style.display = jsMode ? 'none' : 'block';
  renderJsList(jsWhitelist);

  updateStatus();
});

// ✅ 일반 복사 허용 모드 토글
toggle.onchange = () => {
  const mode = toggle.checked ? 'global' : 'whitelist';
  chrome.storage.sync.set({ mode }, () => {
    whitelistSection.style.display = toggle.checked ? 'none' : 'block';
    reloadContentScript();
    updateStatus();
  });
};

// ✅ JS 제한 모드 토글
// jsToggle.onchange = () => {
//   const mode = jsToggle.checked;
//   chrome.storage.sync.set({ jsMode: mode }, () => {
//     jsSection.style.display = mode ? 'none' : 'block';
//     reloadContentScript();
//     updateStatus();
//   });
// };
jsToggle.onchange = () => {
  const mode = jsToggle.checked;

  // ✅ background.js에 ruleset 적용 요청 (안전하게)
  chrome.runtime.sendMessage({
    action: 'toggleJsBlocking',
    enabled: mode
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("background 연결 실패:", chrome.runtime.lastError.message);
    } else {
      console.log("JS 차단 ruleset 적용됨:", response);
    }
  });

  chrome.storage.sync.set({ jsMode: mode }, () => {
    jsSection.style.display = mode ? 'none' : 'block';
    reloadContentScript();
    updateStatus();
  });
};

// ✅ 사이트 추가 (복사 허용)
addBtn.onclick = () => {
  const val = normalizeDomain(siteInput.value.trim());
  if (val) {
    chrome.storage.sync.get(['whitelist'], ({ whitelist = [] }) => {
      if (!whitelist.includes(val)) {
        const updated = [...whitelist, val];
        chrome.storage.sync.set({ whitelist: updated }, () => {
          siteInput.value = '';
          renderList(updated);
          reloadContentScript();
          updateStatus();
        });
      }
    });
  }
};

// ✅ 사이트 추가 (JS 제한)
addJsBtn.onclick = () => {
  const val = normalizeDomain(jsSiteInput.value.trim());
  if (val) {
    chrome.storage.sync.get(['jsWhitelist'], ({ jsWhitelist = [] }) => {
      if (!jsWhitelist.includes(val)) {
        const updated = [...jsWhitelist, val];
        chrome.storage.sync.set({ jsWhitelist: updated }, () => {
          jsSiteInput.value = '';
          renderJsList(updated);
          reloadContentScript();
          updateStatus();
        });
      }
    });
  }
};

// ✅ 현재 페이지 자동 입력
addCurrentBtn.onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = new URL(tabs[0].url);
    const host = normalizeDomain(url.hostname);
    siteInput.value = host;
  });
};