(function() {
  'use strict';

  const SELECTORS = {
    conversationItem: 'a[href*="/app/"]',
    searchSnippet: 'search-snippet, search-zero-state .conversation-container, project-chat-row'
  };

  const SVG_ICONS = {
    bookOpen: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="18" height="18" fill="currentColor"><rect width="256" height="256" fill="none"/><path d="M224,48,128,80,32,48V192l96,32,96-32Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="128" y1="80" x2="128" y2="224" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/></svg>`,
    filePdf: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="18" height="18" fill="currentColor"><rect width="256" height="256" fill="none"/><path d="M160,208h24a32,32,0,0,0,32-32V80a8,8,0,0,0-2.34-5.66L182.34,42.34A8,8,0,0,0,176,40H80A32,32,0,0,0,48,72v24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><path d="M48,144h64a24,24,0,0,1,24,24v16a24,24,0,0,1-24,24H48Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><path d="M128,144v64" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><path d="M176,144v48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><path d="M168,144v48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><polyline points="160 40 160 96 216 96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/></svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="18" height="18" fill="currentColor"><rect width="256" height="256" fill="none"/><line x1="216" y1="56" x2="40" y2="56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="88" y1="24" x2="168" y2="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><path d="M200,56V208a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="104" y1="104" x2="104" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="152" y1="104" x2="152" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/></svg>`,
    x: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16" fill="currentColor"><rect width="256" height="256" fill="none"/><line x1="200" y1="56" x2="56" y2="200" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="200" y1="200" x2="56" y2="56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/></svg>`,
    spinner: `<svg class="gemling-animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="18" height="18" fill="currentColor"><rect width="256" height="256" fill="none"/><path d="M128,32a96,96,0,1,1-96,96" fill="none" stroke="#2563eb" stroke-linecap="round" stroke-linejoin="round" stroke-width="20"/><path d="M128,32A96,96,0,0,1,224,128" fill="none" stroke="#e5e7eb" stroke-linecap="round" stroke-linejoin="round" stroke-width="20"/></svg>`,
    checkCircle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="22" height="22" fill="currentColor"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><polyline points="172 104 113.3 162.7 84 133.3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/></svg>`
  };

  function showDefaultView() {
    const defaultView = actionBar?.querySelector('#gemlingDefaultView');
    const progressView = actionBar?.querySelector('#gemlingProgressView');
    const resultView = actionBar?.querySelector('#gemlingResultView');
    
    defaultView?.classList.remove('gemling-hidden');
    progressView?.classList.add('gemling-hidden');
    resultView?.classList.add('gemling-hidden');
  }

  function showProgressView(text, percent) {
    const defaultView = actionBar?.querySelector('#gemlingDefaultView');
    const progressView = actionBar?.querySelector('#gemlingProgressView');
    const resultView = actionBar?.querySelector('#gemlingResultView');
    
    defaultView?.classList.add('gemling-hidden');
    progressView?.classList.remove('gemling-hidden');
    resultView?.classList.add('gemling-hidden');

    const progressText = actionBar?.querySelector('#gemlingProgressText');
    const progressBar = actionBar?.querySelector('#gemlingProgressBar');

    if (progressText) progressText.textContent = text;
    if (progressBar) progressBar.style.width = `${percent}%`;
  }

  function showResultView(text) {
    const defaultView = actionBar?.querySelector('#gemlingDefaultView');
    const progressView = actionBar?.querySelector('#gemlingProgressView');
    const resultView = actionBar?.querySelector('#gemlingResultView');
    
    defaultView?.classList.add('gemling-hidden');
    progressView?.classList.add('gemling-hidden');
    resultView?.classList.remove('gemling-hidden');

    const resultText = actionBar?.querySelector('#gemlingResultText');
    if (resultText) resultText.textContent = text;
  }

  function handleFinishAction() {
    showDefaultView();
    handleCancelBulk();
  }

  let checkedConversationIds = new Set(); // 用 conversationId 存储选中状态
  let actionBar = null;
  let apiState = null; // { at, notebookPath, bodyTemplate }
  let isBulkDeleteActive = false;
  let apiStateDelete = null;
  let awaitDeleteConvId = null;
  let isEnabled = true;
  let conversationObserver = null;
  let snippetInterval = null;

  function init() {
    // Check if this is an export runner tab
    if (window.location.search.includes('gemling-export=true')) {
      runExportTabLogic();
      return;
    }

    chrome.storage.local.get({ isEnabled: true }, (result) => {
      isEnabled = result.isEnabled;
      if (isEnabled) {
        startExtension();
      } else {
        listenForMessages();
      }
    });
  }

  function startExtension() {
    observeConversationList();
    listenForApiCapture();
    listenForMessages();

    // Inject checkboxes for existing items
    document.querySelectorAll(SELECTORS.conversationItem).forEach(injectCheckbox);
    document.querySelectorAll(SELECTORS.searchSnippet).forEach(injectCheckbox);
    updateCount();
  }

  function stopExtension() {
    if (conversationObserver) {
      conversationObserver.disconnect();
      conversationObserver = null;
    }
    if (snippetInterval) {
      clearInterval(snippetInterval);
      snippetInterval = null;
    }
    document.querySelectorAll('.gemling-checkbox').forEach(cb => cb.remove());
    checkedConversationIds.clear();
    if (actionBar) {
      actionBar.classList.add('gemling-action-bar-hidden');
    }
  }

  function listenForMessages() {
    if (window.gemlingListenerAdded) return;
    window.gemlingListenerAdded = true;

    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'toggle-gemling') {
        isEnabled = message.isEnabled;
        if (isEnabled) {
          startExtension();
        } else {
          stopExtension();
        }
      }
    });
  }

  function listenForApiCapture() {
    if (window.gemlingApiCapturedListenerAdded) return;
    window.gemlingApiCapturedListenerAdded = true;

    window.addEventListener('gemling-api-captured', (e) => {
      const { url, sourcePathRaw, at, notebookPath, bodyTemplate, convId } = e.detail;
      // 只接受有效的捕获数据（notebookPath 必须存在）
      if (!notebookPath) {
        console.log('[Gemling] 忽略无效捕获: notebookPath 为空');
        return;
      }
      apiState = { url, sourcePathRaw, at, notebookPath, bodyTemplate, originalConvId: convId };
      console.log(`[Gemling] API 已捕获: notebook=${notebookPath}, at=${at.substring(0, 20)}..., convId=${convId}`);
      console.log('[Gemling] sourcePathRaw:', sourcePathRaw);
      updateButtonState();
    });

    window.addEventListener('gemling-api-captured-raw', (e) => {
      if (isBulkDeleteActive && awaitDeleteConvId) {
        const { url, sourcePathRaw, bodyTemplate } = e.detail;

        // 确保捕获的是删除 RPC（通常包含 qWymEb 或 hXkFw）
        let isDeleteRpc = false;
        try {
          const u = new URL(url, window.location.origin);
          const rpcids = u.searchParams.get('rpcids') || '';
          if (rpcids.includes('qWymEb') || rpcids.includes('hXkFw')) {
            isDeleteRpc = true;
          }
        } catch (err) {
          if (url.includes('qWymEb') || url.includes('hXkFw')) {
            isDeleteRpc = true;
          }
        }

        if (!isDeleteRpc) {
          console.log('[Gemling] 忽略非删除 API 请求:', url);
          return;
        }

        const rawId = awaitDeleteConvId.startsWith('c_') ? awaitDeleteConvId.substring(2) : awaitDeleteConvId;
        if (bodyTemplate && (bodyTemplate.includes(awaitDeleteConvId) || bodyTemplate.includes(rawId))) {
          apiStateDelete = { url, sourcePathRaw, bodyTemplate, originalConvId: awaitDeleteConvId };
          console.log(`[Gemling] Delete API 已捕获: convId=${awaitDeleteConvId}`);
        }
      }
    });
  }

  function injectActionBar() {
    if (actionBar) return;

    actionBar = document.createElement('div');
    actionBar.className = 'gemling-action-bar gemling-action-bar-hidden';

    // 初始化国际化文本
    const selectedText = chrome.i18n.getMessage("countSelected", ["0"]);
    const addText = chrome.i18n.getMessage("actionAdd");
    const deleteText = chrome.i18n.getMessage("actionDelete");
    const cancelText = chrome.i18n.getMessage("actionCancel");
    const exportText = chrome.i18n.getMessage("actionExport");

    actionBar.innerHTML = `
      <span class="gemling-status" style="display: none;"></span>
      <!-- ====== View 1: Default Action View ====== -->
      <div id="gemlingDefaultView" class="gemling-view gemling-default-view">
          <div class="gemling-count-section">
              <div class="gemling-badge" id="gemlingSelectedCountBadge">0</div>
              <span class="gemling-count-text">${selectedText}</span>
          </div>
          <div class="gemling-buttons-section">
              <button class="gemling-action-btn gemling-btn-add" title="${addText}" disabled>
                  ${SVG_ICONS.bookOpen}
                  <span class="gemling-btn-label">${addText}</span>
              </button>
              <button class="gemling-action-btn gemling-btn-export" title="${exportText}" disabled>
                  ${SVG_ICONS.filePdf}
                  <span class="gemling-btn-label">${exportText}</span>
              </button>
              <div class="gemling-divider"></div>
              <button class="gemling-action-btn gemling-btn-delete" title="${deleteText}" disabled>
                  ${SVG_ICONS.trash}
                  <span class="gemling-btn-label">${deleteText}</span>
              </button>
          </div>
          <div class="gemling-divider"></div>
          <button class="gemling-close-btn gemling-btn-cancel" title="${cancelText}">
              ${SVG_ICONS.x}
          </button>
      </div>

      <!-- ====== View 2: Progress View ====== -->
      <div id="gemlingProgressView" class="gemling-view gemling-progress-view gemling-hidden">
          <div class="gemling-progress-header">
              <span id="gemlingProgressText" class="gemling-progress-text">正在处理...</span>
              <div class="gemling-spinner">
                  ${SVG_ICONS.spinner}
              </div>
          </div>
          <div class="gemling-progress-bar-bg">
              <div id="gemlingProgressBar" class="gemling-progress-bar-fill" style="width: 0%"></div>
          </div>
      </div>

      <!-- ====== View 3: Result View ====== -->
      <div id="gemlingResultView" class="gemling-view gemling-result-view gemling-hidden">
          <div class="gemling-result-info">
              ${SVG_ICONS.checkCircle}
              <span id="gemlingResultText" class="gemling-result-text">处理完成</span>
          </div>
          <button class="gemling-finish-btn" id="gemlingFinishBtn">
              完成
          </button>
      </div>
    `;

    document.body.appendChild(actionBar);

    const btn = actionBar.querySelector('.gemling-btn-add');
    if (btn) {
      btn.addEventListener('click', handleBulkAddToNotebook);
    }

    const btnDelete = actionBar.querySelector('.gemling-btn-delete');
    if (btnDelete) {
      btnDelete.addEventListener('click', handleBulkDelete);
    }

    const btnCancel = actionBar.querySelector('.gemling-btn-cancel');
    if (btnCancel) {
      btnCancel.addEventListener('click', handleCancelBulk);
    }

    const btnExport = actionBar.querySelector('.gemling-btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', handleBulkExport);
    }

    const btnFinish = actionBar.querySelector('#gemlingFinishBtn');
    if (btnFinish) {
      btnFinish.addEventListener('click', handleFinishAction);
    }
  }

  function updateCount() {
    const count = checkedConversationIds.size;
    injectActionBar();
    
    const countBadge = actionBar.querySelector('#gemlingSelectedCountBadge');
    if (countBadge) {
      countBadge.textContent = count.toString();
    }
    const countEl = actionBar.querySelector('.gemling-count-text');
    if (countEl) {
      countEl.textContent = chrome.i18n.getMessage("countSelected", [count.toString()]);
    }

    if (count > 0) {
      showActionBar();
    } else {
      hideActionBar();
    }

    updateButtonState();
  }

  function showActionBar() {
    if (!actionBar) return;
    if (actionBar.classList.contains('gemling-action-bar-enter')) return;
    
    actionBar.classList.remove('gemling-action-bar-hidden');
    actionBar.classList.remove('gemling-action-bar-exit');
    actionBar.classList.add('gemling-action-bar-enter');
  }

  function hideActionBar() {
    if (!actionBar) return;
    if (actionBar.classList.contains('gemling-action-bar-hidden')) return;
    if (actionBar.classList.contains('gemling-action-bar-exit')) return;

    actionBar.classList.remove('gemling-action-bar-enter');
    actionBar.classList.add('gemling-action-bar-exit');
    setTimeout(() => {
      if (checkedConversationIds.size === 0) {
        actionBar.classList.add('gemling-action-bar-hidden');
      }
    }, 300);
  }

  function updateButtonState() {
    const btn = actionBar.querySelector('.gemling-btn-add');
    const btnDelete = actionBar.querySelector('.gemling-btn-delete');
    const btnExport = actionBar.querySelector('.gemling-btn-export');

    const hasSelection = checkedConversationIds.size > 0;

    if (btn) {
      btn.disabled = !hasSelection;
    }
    if (btnDelete) {
      btnDelete.disabled = !hasSelection;
    }
    if (btnExport) {
      btnExport.disabled = !hasSelection;
    }

    const btnCancel = actionBar.querySelector('.gemling-btn-cancel');
    if (btnCancel) {
      btnCancel.disabled = !hasSelection;
    }
  }

  function observeConversationList() {
    if (conversationObserver) return;

    conversationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches(SELECTORS.conversationItem) || node.matches(SELECTORS.searchSnippet)) {
              injectCheckbox(node);
            }
            node.querySelectorAll(SELECTORS.conversationItem).forEach(injectCheckbox);
            node.querySelectorAll(SELECTORS.searchSnippet).forEach(injectCheckbox);
          }
        });
      });
    });

    conversationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    document.querySelectorAll(SELECTORS.conversationItem).forEach(injectCheckbox);
    document.querySelectorAll(SELECTORS.searchSnippet).forEach(injectCheckbox);

    // Request conv IDs from probe.js periodically for snippets and project-chat-rows
    if (!snippetInterval) {
      snippetInterval = setInterval(() => {
        if (document.querySelector('search-snippet:not([data-gemling-conv-id]), search-zero-state .conversation-container:not([data-gemling-conv-id]), project-chat-row:not([data-gemling-conv-id])')) {
          window.dispatchEvent(new CustomEvent('gemling-request-conv-id'));
        }
      }, 1000);
    }

    if (!window.convIdReadyListenerAdded) {
      window.convIdReadyListenerAdded = true;
      window.addEventListener('gemling-conv-id-ready', () => {
        if (isEnabled) {
          document.querySelectorAll(SELECTORS.searchSnippet).forEach(injectCheckbox);
        }
      });
    }
  }

  function injectCheckbox(item) {
    if (item.querySelector('.gemling-checkbox')) return;

    const convId = getConversationId(item);
    if (!convId) return; // Might be a snippet still waiting for its ID

    // Ensure search-snippet is relative for absolute checkbox positioning
    if (item.tagName.toLowerCase() === 'search-snippet') {
      if (!item.style.position) {
        item.style.position = 'relative'; 
      }
    } else if (item.classList.contains('conversation-container')) {
      if (!item.style.display || item.style.display === 'block') {
        item.style.display = 'flex';
        item.style.alignItems = 'center';
      }
    }

    const checkbox = document.createElement('div');
    checkbox.className = 'gemling-checkbox';
    checkbox.dataset.checked = 'false';
    checkbox.dataset.convId = convId;

    // 恢复选中状态
    if (checkedConversationIds.has(convId)) {
      checkbox.dataset.checked = 'true';
    }

    checkbox.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });

    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();

      const isChecked = checkbox.dataset.checked === 'true';
      checkbox.dataset.checked = isChecked ? 'false' : 'true';

      if (!isChecked) {
        checkedConversationIds.add(convId);
      } else {
        checkedConversationIds.delete(convId);
      }

      // Removed button state resetting as it's now handled by the dedicated finish action view

      updateCount();
    });

    let targetContainer = item;
    if (item.tagName.toLowerCase() === 'project-chat-row') {
      targetContainer = item.querySelector('.project-chat-row-container') || item;
    } else {
      const startArea = item.querySelector('.mdc-list-item__start') || item.querySelector('.leading-icon-container');
      if (startArea) {
        targetContainer = startArea;
      }
    }
    targetContainer.insertBefore(checkbox, targetContainer.firstChild);
  }

  function getConversationId(item) {
    if (item.tagName.toLowerCase() === 'search-snippet' || item.classList.contains('conversation-container') || item.tagName.toLowerCase() === 'project-chat-row') {
      let id = item.getAttribute('data-gemling-conv-id');
      if (!id || id === 'not-found' || id.startsWith('pending-')) {
        const elId = item.getAttribute('id');
        if (elId && (/^[0-9a-fA-F]{16}$/.test(elId) || elId.startsWith('c_'))) {
          id = elId;
        }
      }
      return (!id || id === 'not-found' || id.startsWith('pending-')) ? null : id;
    }

    const href = item.getAttribute('href') || '';
    // href 格式: /app/xxx 或 /app/xxx/yyy
    const match = href.match(/\/app\/(?:c\/)?([^/?#]+)/);
    return match ? match[1] : null;
  }

  function isRealConversationId(convId) {
    if (!convId) return false;
    if (convId.startsWith('pending-') || convId.startsWith('not-found-') || convId.startsWith('search-result-')) return false;
    return true;
  }

  function normalizeConversationId(convId) {
    if (!convId) return null;
    return convId.startsWith('c_') ? convId : `c_${convId}`;
  }


  function handleCancelBulk() {
    isBulkDeleteActive = false;
    apiStateDelete = null;
    checkedConversationIds.clear();
    document.querySelectorAll('.gemling-checkbox').forEach(cb => {
      cb.dataset.checked = 'false';
    });

    // Reset button datasets
    const btn = actionBar?.querySelector('.gemling-btn-add');
    if (btn) btn.dataset.state = '';

    const btnDelete = actionBar?.querySelector('.gemling-btn-delete');
    if (btnDelete) btnDelete.dataset.state = '';

    const btnExport = actionBar?.querySelector('.gemling-btn-export');
    if (btnExport) btnExport.dataset.state = '';

    updateCount();
  }

  async function handleBulkAddToNotebook() {
    const btn = actionBar.querySelector('.gemling-btn-add');
    if (!btn) return;

    // 清除旧的 API 状态，确保等待新的笔记本选择
    apiState = null;

    // 获取第一个选中的对话项
    const firstConvId = checkedConversationIds.values().next().value;
    if (!firstConvId) {
      return;
    }

    const firstItem = findConversationItem(firstConvId);
    if (!firstItem) {
      console.error('[Gemling] 未找到对话项:', firstConvId);
      return;
    }

    // 1. 显示选择视图
    showProgressView(chrome.i18n.getMessage("actionSelect"), 0);
    triggerNativeAddToNotebook(firstItem);

    // 等待 API 捕获（最多等待 30 秒）
    const captured = await waitForApiCapture(30000);
    if (!captured) {
      showDefaultView();
      updateCount();
      return;
    }

    // API 已捕获（用户已选择笔记本），第一个对话已通过手动添加成功
    // 从 DOM 中移除该对话并从 checkedConversationIds 中删除
    const firstItemToRemove = firstItem.closest('gem-nav-list-item') || firstItem.closest('project-chat-row') || firstItem.closest('li') || firstItem;
    firstItemToRemove.remove();
    checkedConversationIds.delete(firstConvId);

    // 批量处理所有选中的对话
    const convIds = Array.from(checkedConversationIds);
    let successCount = 1;
    let failCount = 0;

    // 处理剩下的对话
    for (let i = 0; i < convIds.length; i++) {
      const convId = convIds[i];
      // 进度显示考虑上第一个已成功的
      const current = i + 2;
      const total = convIds.length + 1;
      const percent = (current / total) * 100;
      const progressMsg = chrome.i18n.getMessage("actionProcessing", [current.toString(), total.toString()]);
      
      showProgressView(progressMsg, percent);

      try {
        await addToNotebookViaApi(convId);
        successCount++;
        // 从 DOM 中移除该对话并从 checkedConversationIds 中删除
        const item = findConversationItem(convId);
        if (item) {
          const itemToRemove = item.closest('gem-nav-list-item') || item.closest('project-chat-row') || item.closest('li') || item;
          itemToRemove.remove();
        }
        checkedConversationIds.delete(convId);
      } catch (err) {
        console.error('[Gemling] 添加失败:', convId, err);
        failCount++;
      }

      await delay(800);
    }

    const failMsg = failCount > 0 ? chrome.i18n.getMessage("actionFailMsg", [failCount.toString()]) : '';
    const doneText = chrome.i18n.getMessage("actionDone", [successCount.toString(), failMsg]);
    showResultView(doneText);
  }


  async function handleBulkDelete() {
    const btnDelete = actionBar.querySelector('.gemling-btn-delete');
    if (!btnDelete) return;

    isBulkDeleteActive = true;

    const convIds = Array.from(checkedConversationIds);
    if (convIds.length === 0) {
      return;
    }

    const firstConvId = convIds[0];
    const firstItem = findConversationItem(firstConvId);
    if (!firstItem) {
      console.error('[Gemling] 未找到对话项:', firstConvId);
      return;
    }

    // ── Step 1: First conversation - user manually confirms (safety check) ──
    showProgressView("等待手动确认删除...", 0);
    triggerNativeDelete(firstItem);

    const userConfirmed = await waitForDialogUserConfirm();
    if (!userConfirmed) {
      // User cancelled the dialog
      showDefaultView();
      handleCancelBulk();
      return;
    }

    // First item deleted via native UI
    checkedConversationIds.delete(firstConvId);
    const firstItemToRemove = firstItem.closest('gem-nav-list-item') || firstItem.closest('project-chat-row') || firstItem.closest('li') || firstItem;
    firstItemToRemove.remove();

    let successCount = 1;
    let failCount = 0;

    // ── Step 2: Remaining conversations - native UI with auto-confirm ──
    for (let i = 1; i < convIds.length; i++) {
      const convId = convIds[i];
      const current = i + 1;
      const total = convIds.length;
      const percent = (current / total) * 100;
      const progressMsg = chrome.i18n.getMessage("actionProcessing", [current.toString(), total.toString()]);
      
      showProgressView(progressMsg, percent);

      const item = findConversationItem(convId);
      if (!item) {
        console.warn('[Gemling] 未找到对话项，跳过:', convId);
        failCount++;
        continue;
      }

      console.log(`[Gemling] Auto-deleting ${current}/${total}: ${convId}`);

      try {
        // Trigger native delete menu
        triggerNativeDelete(item);

        // Auto-click confirm button in the dialog
        const deleted = await autoConfirmDeleteDialog();
        if (deleted) {
          successCount++;
          const itemToRemove = item.closest('gem-nav-list-item') || item.closest('project-chat-row') || item.closest('li') || item;
          itemToRemove.remove();
          checkedConversationIds.delete(convId);
        } else {
          console.error('[Gemling] Auto-confirm failed for:', convId);
          failCount++;
        }
      } catch (err) {
        console.error('[Gemling] 删除失败:', convId, err);
        failCount++;
      }

      // Wait between deletions to avoid rate limiting
      if (i < convIds.length - 1) {
        await delay(1500);
      }
    }

    const failMsg = failCount > 0 ? chrome.i18n.getMessage("actionFailMsg", [failCount.toString()]) : '';
    const doneText = chrome.i18n.getMessage("actionDone", [successCount.toString(), failMsg]);
    showResultView(doneText);
    isBulkDeleteActive = false;
  }

  function triggerNativeDelete(item) {
    const container = item.closest('gem-nav-list-item') || item.closest('project-chat-row') || item.parentElement;
    let menuBtn = container?.querySelector('button[data-test-id="actions-menu-button"]') ||
                  container?.querySelector('button[data-test-id="conversation-actions-menu-icon-button"]') ||
                  container?.querySelector('.gem-conversation-actions-menu-button') ||
                  container?.querySelector('button[aria-label="更多选项"]') ||
                  container?.querySelector('button[aria-label="More options"]') ||
                  container?.querySelector('button[aria-haspopup="menu"]') ||
                  container?.querySelector('gem-icon-button[aria-haspopup="true"] button') ||
                  container?.querySelector('button');

    if (!menuBtn) {
      const fallbackItem = document.querySelector(SELECTORS.conversationItem);
      if (fallbackItem) {
        const fallbackContainer = fallbackItem.closest('gem-nav-list-item') || fallbackItem.closest('project-chat-row') || fallbackItem.parentElement;
        menuBtn = fallbackContainer?.querySelector('button[data-test-id="actions-menu-button"]') ||
                  fallbackContainer?.querySelector('button[data-test-id="conversation-actions-menu-icon-button"]') ||
                  fallbackContainer?.querySelector('button[aria-label="更多选项"]') ||
                  fallbackContainer?.querySelector('button[aria-label="More options"]') ||
                  fallbackContainer?.querySelector('button[aria-haspopup="menu"]') ||
                  fallbackContainer?.querySelector('gem-icon-button[aria-haspopup="true"] button') ||
                  fallbackContainer?.querySelector('button');
        if (menuBtn) {
          const fallbackConvId = getConversationId(fallbackItem);
          const targetConvId = getConversationId(item);
          if (fallbackConvId && targetConvId) {
             window.dispatchEvent(new CustomEvent('gemling-set-override-delete', {
               detail: {
                 original: normalizeConversationId(fallbackConvId),
                 target: normalizeConversationId(targetConvId)
               }
             }));
          }
        }
      }
    }

    if (!menuBtn) {
      console.error('[Gemling] 未找到菜单按钮');
      return;
    }

    menuBtn.click();
    setTimeout(() => clickDeleteMenuItem(), 100);
  }

  function pollAndClickMenu(keywords) {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const menuItems = document.querySelectorAll('[role="menuitem"], [role="menuitemradio"], mat-menu-item');
      for (const menuItem of menuItems) {
        const text = menuItem.textContent || '';
        const isVisible = !!(menuItem.offsetWidth || menuItem.offsetHeight || menuItem.getClientRects().length);
        if (isVisible && keywords.some(kw => text.includes(kw))) {
          clearInterval(interval);
          menuItem.click();
          return;
        }
      }
      if (attempts > 20) {
        clearInterval(interval);
        console.error('[Gemling] 未找到菜单项:', keywords);
      }
    }, 100);
  }

  function clickDeleteMenuItem() {
    pollAndClickMenu(['删除', 'Delete', 'delete']);
  }

  // Helper: find a visible dialog in the DOM
  function findVisibleDialog() {
    const dialogs = document.querySelectorAll('mat-dialog-container, mdc-dialog, .mat-mdc-dialog-container, dialog[open], [role="dialog"]');
    for (const d of dialogs) {
      if (d.offsetWidth > 0 || d.offsetHeight > 0 || d.hasAttribute('open')) {
        return d;
      }
    }
    return null;
  }

  // Wait for user to manually confirm the delete dialog (first deletion only)
  function waitForDialogUserConfirm() {
    return new Promise(resolve => {
      let dialogAppeared = false;
      const startTime = Date.now();

      const checkInterval = setInterval(() => {
        if (Date.now() - startTime > 30000) {
          clearInterval(checkInterval);
          console.log('[Gemling] waitForDialogUserConfirm timeout (30s)');
          resolve(false);
          return;
        }

        const visibleDialog = findVisibleDialog();
        if (visibleDialog) {
          dialogAppeared = true;
        } else if (dialogAppeared) {
          clearInterval(checkInterval);
          console.log('[Gemling] User confirmed first delete dialog');
          // Small delay to let the delete request complete
          setTimeout(() => resolve(true), 500);
        }
      }, 200);
    });
  }

  // Auto-confirm the delete dialog (for subsequent deletions)
  function autoConfirmDeleteDialog() {
    return new Promise(resolve => {
      let dialogAppeared = false;
      let confirmClicked = false;
      const startTime = Date.now();

      const checkInterval = setInterval(() => {
        if (Date.now() - startTime > 15000) {
          clearInterval(checkInterval);
          console.error('[Gemling] autoConfirmDeleteDialog timeout (15s)');
          resolve(false);
          return;
        }

        const visibleDialog = findVisibleDialog();

        if (visibleDialog && !dialogAppeared) {
          dialogAppeared = true;
          console.log('[Gemling] Auto-confirm dialog appeared');

          // Wait a brief moment, then find and click the confirm button
          setTimeout(() => {
            const confirmBtn = findConfirmButton(visibleDialog);
            if (confirmBtn) {
              console.log('[Gemling] Clicking confirm button:', confirmBtn.textContent.trim());
              confirmBtn.click();
              confirmClicked = true;
            } else {
              console.error('[Gemling] Could not find confirm button in dialog');
              // Try clicking any button that's not a cancel
              const fallbackBtn = findConfirmButtonFallback(visibleDialog);
              if (fallbackBtn) {
                console.log('[Gemling] Clicking fallback button:', fallbackBtn.textContent.trim());
                fallbackBtn.click();
                confirmClicked = true;
              }
            }
          }, 300);
        } else if (dialogAppeared && !visibleDialog) {
          // Dialog closed
          clearInterval(checkInterval);
          if (confirmClicked) {
            console.log('[Gemling] Auto-confirm dialog closed successfully');
            setTimeout(() => resolve(true), 300);
          } else {
            resolve(false);
          }
        }
      }, 150);
    });
  }

  // Find the confirm/delete button inside a dialog
  function findConfirmButton(dialog) {
    const buttons = dialog.querySelectorAll('button');
    const deleteKeywords = ['删除', 'delete', 'remove', '确认', 'confirm', 'ok'];
    const cancelKeywords = ['取消', 'cancel', '关闭', 'close', 'dismiss'];

    for (const btn of buttons) {
      const text = (btn.textContent || '').trim().toLowerCase();
      if (text.length === 0) continue;

      // Check if it matches a delete/confirm keyword and NOT a cancel keyword
      const isConfirm = deleteKeywords.some(kw => text.includes(kw));
      const isCancel = cancelKeywords.some(kw => text.includes(kw));

      if (isConfirm && !isCancel) {
        return btn;
      }
    }
    return null;
  }

  // Fallback: find the primary/danger/colored button (usually the confirm action)
  function findConfirmButtonFallback(dialog) {
    const buttons = Array.from(dialog.querySelectorAll('button'));
    const cancelKeywords = ['取消', 'cancel', '关闭', 'close', 'dismiss'];

    // Filter out cancel buttons
    const nonCancelBtns = buttons.filter(btn => {
      const text = (btn.textContent || '').trim().toLowerCase();
      return text.length > 0 && !cancelKeywords.some(kw => text.includes(kw));
    });

    // Prefer buttons with warn/danger/primary class
    for (const btn of nonCancelBtns) {
      const cls = (btn.className || '').toLowerCase();
      if (cls.includes('warn') || cls.includes('danger') || cls.includes('primary') || cls.includes('affirmative')) {
        return btn;
      }
    }

    // Return the last non-cancel button (usually the action button is on the right)
    return nonCancelBtns.length > 0 ? nonCancelBtns[nonCancelBtns.length - 1] : null;
  }

  function replaceConvIdInObject(obj, target, replacement) {
    if (!obj) return obj;
    if (typeof obj === 'string') {
      if (obj === target) return replacement;
      const targetRaw = target.startsWith('c_') ? target.substring(2) : target;
      const replacementRaw = replacement.startsWith('c_') ? replacement.substring(2) : replacement;
      if (obj === targetRaw) return replacementRaw;
      return obj.replace(new RegExp(target, 'g'), replacement)
                .replace(new RegExp(targetRaw, 'g'), replacementRaw);
    }
    if (Array.isArray(obj)) {
      return obj.map(item => replaceConvIdInObject(item, target, replacement));
    }
    if (typeof obj === 'object') {
      const result = {};
      for (const key in obj) {
        result[key] = replaceConvIdInObject(obj[key], target, replacement);
      }
      return result;
    }
    return obj;
  }

  async function deleteViaApi(convId) {
    const normalizedConvId = normalizeConversationId(convId);
    if (!normalizedConvId) {
      throw new Error('缺少有效的对话 ID');
    }
    if (!apiStateDelete) {
      throw new Error('缺少 API 状态');
    }

    const originalConvId = apiStateDelete.originalConvId;
    const originalRaw = originalConvId.startsWith('c_') ? originalConvId.substring(2) : originalConvId;
    const targetRaw = normalizedConvId.startsWith('c_') ? normalizedConvId.substring(2) : normalizedConvId;

    let bodyText = apiStateDelete.bodyTemplate;
    
    // Globally replace the exact strings
    bodyText = bodyText.replace(new RegExp(originalConvId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), normalizedConvId);
    bodyText = bodyText.replace(new RegExp(originalRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), targetRaw);

    let sourcePath = apiStateDelete.sourcePathRaw || '';
    if (sourcePath.includes(originalRaw)) {
      sourcePath = sourcePath.replace(new RegExp(originalRaw, 'g'), targetRaw);
    }
    
    const capturedUrl = new URL(apiStateDelete.url, window.location.origin);
    const bl = capturedUrl.searchParams.get('bl') || '';
    const fSid = capturedUrl.searchParams.get('f.sid') || '';
    const hl = capturedUrl.searchParams.get('hl') || 'zh-CN';
    const rpcids = capturedUrl.searchParams.get('rpcids') || 'qWymEb';

    const reqid = Math.floor(Math.random() * 9000000) + 1000000;
    const url = `/_/BardChatUi/data/batchexecute?rpcids=${rpcids}&source-path=${sourcePath}&bl=${bl}&f.sid=${fSid}&hl=${hl}&_reqid=${reqid}&rt=c`;

    console.log('[Gemling Debug] Sending delete request:', {
      url,
      bodyText,
      targetConvId: normalizedConvId
    });
    try {
      const params = new URLSearchParams(bodyText);
      const fReq = params.get('f.req');
      if (fReq) {
        console.log('[Gemling Debug Detail] Extension Delete Request - parsed f.req:', JSON.stringify(JSON.parse(fReq), null, 2));
      }
    } catch (err) {}

    const response = await fetchInMainWorld(url, bodyText);

    console.log('[Gemling Debug] Delete response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    console.log('[Gemling Debug] Delete response body:', text);
    const jsonText = text.replace(/^\)\]\}'\s*\n?/, '');
    
    if (!jsonText.includes('wrb.fr') || jsonText.includes('"er",')) {
      console.error('[Gemling] API delete response indicates failure:', text.substring(0, 200));
      throw new Error('API delete failed');
    }
  }



  function findConversationItem(convId) {
    // 根据 conversationId 查找对应的对话项 DOM 元素
    const items = document.querySelectorAll(`${SELECTORS.conversationItem}, ${SELECTORS.searchSnippet}`);
    for (const item of items) {
      const itemConvId = getConversationId(item);
      if (itemConvId === convId) {
        return item;
      }
    }
    return null;
  }

  function triggerNativeAddToNotebook(item) {
    const container = item.closest('gem-nav-list-item') || item.closest('project-chat-row') || item.parentElement;
    let menuBtn = container?.querySelector('button[data-test-id="actions-menu-button"]') ||
                  container?.querySelector('button[data-test-id="conversation-actions-menu-icon-button"]') ||
                  container?.querySelector('.gem-conversation-actions-menu-button') ||
                  container?.querySelector('button[aria-label="更多选项"]') ||
                  container?.querySelector('button[aria-label="More options"]') ||
                  container?.querySelector('button[aria-haspopup="menu"]') ||
                  container?.querySelector('gem-icon-button[aria-haspopup="true"] button') ||
                  container?.querySelector('button');

    if (!menuBtn) {
      // Fallback: Use a random conversation item's menu and proxy the convId
      const fallbackItem = document.querySelector(SELECTORS.conversationItem);
      if (fallbackItem) {
        const fallbackContainer = fallbackItem.closest('gem-nav-list-item') || fallbackItem.closest('project-chat-row') || fallbackItem.parentElement;
        menuBtn = fallbackContainer?.querySelector('button[data-test-id="actions-menu-button"]') ||
                  fallbackContainer?.querySelector('button[data-test-id="conversation-actions-menu-icon-button"]') ||
                  fallbackContainer?.querySelector('button[aria-label="更多选项"]') ||
                  fallbackContainer?.querySelector('button[aria-label="More options"]') ||
                  fallbackContainer?.querySelector('button[aria-haspopup="menu"]') ||
                  fallbackContainer?.querySelector('gem-icon-button[aria-haspopup="true"] button') ||
                  fallbackContainer?.querySelector('button');
        if (menuBtn) {
          const targetConvId = getConversationId(item);
          if (targetConvId) {
            window.dispatchEvent(new CustomEvent('gemling-set-override-convid', {
              detail: { convId: normalizeConversationId(targetConvId) }
            }));
          }
        }
      }
    }

    if (!menuBtn) {
      console.error('[Gemling] 未找到菜单按钮');
      return;
    }

    menuBtn.click();

    // 等待菜单出现后点击"添加到笔记本"选项
    setTimeout(() => clickAddToNotebookMenuItem(), 100);
  }

  function clickAddToNotebookMenuItem() {
    pollAndClickMenu(['笔记本', 'notebook', 'Notebook', 'Save', 'save', 'Add']);
  }

  function waitForApiCapture(timeout) {
    return new Promise((resolve) => {
      if (apiState) {
        resolve(true);
        return;
      }

      const handler = () => {
        window.removeEventListener('gemling-api-captured', handler);
        resolve(true);
      };

      window.addEventListener('gemling-api-captured', handler);

      setTimeout(() => {
        window.removeEventListener('gemling-api-captured', handler);
        resolve(false);
      }, timeout);
    });
  }

  async function addToNotebookViaApi(convId) {
    const normalizedConvId = normalizeConversationId(convId);
    if (!normalizedConvId) {
      throw new Error('缺少有效的对话 ID');
    }

    // 解析并重建 f.req，只更新请求体中的 conversation id，避免误替换其他编码片段。
    const params = new URLSearchParams(apiState.bodyTemplate);
    const fReq = params.get('f.req');
    if (!fReq) {
      throw new Error('捕获的请求缺少 f.req');
    }

    let parsed;
    let inner;
    try {
      parsed = JSON.parse(fReq);
      inner = JSON.parse(parsed[0][0][1]);
    } catch (err) {
      throw new Error(`解析捕获请求失败: ${err.message}`);
    }

    if (!inner?.[2] || !Array.isArray(inner[2])) {
      throw new Error('捕获的请求结构不符合预期');
    }

    inner[2][0] = normalizedConvId;
    parsed[0][0][1] = JSON.stringify(inner);
    params.set('f.req', JSON.stringify(parsed));

    const bodyText = params.toString();

    // source-path 指向目标 notebook 页面，不包含当前对话 ID，直接复用捕获值。
    const sourcePath = apiState.sourcePathRaw || '';

    // 从捕获的 URL 中提取其他必要参数
    const capturedUrl = new URL(apiState.url, window.location.origin);
    const bl = capturedUrl.searchParams.get('bl') || '';
    const fSid = capturedUrl.searchParams.get('f.sid') || '';
    const hl = capturedUrl.searchParams.get('hl') || 'zh-CN';
    const rpcids = capturedUrl.searchParams.get('rpcids') || 'MUAZcd';

    // 生成新的 _reqid（随机数）
    const reqid = Math.floor(Math.random() * 9000000) + 1000000;

    const url = `/_/BardChatUi/data/batchexecute?rpcids=${rpcids}&source-path=${sourcePath}&bl=${bl}&f.sid=${fSid}&hl=${hl}&_reqid=${reqid}&rt=c`;

    console.log('[Gemling] 发送请求到:', url);
    console.log('[Gemling] 请求体:', bodyText.substring(0, 100));

    const response = await fetchInMainWorld(url, bodyText);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // 检查响应内容
    const text = await response.text();
    console.log('[Gemling] API 响应:', text.substring(0, 200));

    // Google batchexecute 响应以 )]}\' 开头（anti-XSSI 前缀），需要跳过
    const jsonText = text.replace(/^\)\]\}'\s*\n?/, '');

    // 检查响应是否包含有效的 RPC 结果
    if (!jsonText.includes('wrb.fr')) {
      throw new Error(`API 返回无效响应: ${text.substring(0, 100)}`);
    }

    // 尝试解析以确认没有服务端错误
    try {
      // 响应可能包含多行 JSON（length-prefixed），取第一行数据
      const lines = jsonText.split('\n').filter(l => l.trim() && !/^\d+$/.test(l.trim()));
      if (lines.length > 0) {
        const parsed = JSON.parse(lines[0]);
        // parsed 格式: [["wrb.fr","MUAZcd","...",null,null,null,"generic"]]
        // 如果第一个元素的第三项是 "generic" 而无实际数据，可能是错误
        const rpcResult = parsed?.[0];
        if (rpcResult && rpcResult[0] === 'wrb.fr' && rpcResult[2]) {
          console.log('[Gemling] 添加成功:', normalizedConvId);
        }
      }
    } catch (parseErr) {
      // 解析失败不一定是错误，只要 HTTP 200 且包含 wrb.fr 就认为成功
      console.warn('[Gemling] 响应解析警告:', parseErr.message);
    }
  }

  // ── CRC-32 and ZIP creation helpers ──
  const CRC_TABLE = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    CRC_TABLE[n] = c;
  }

  function crc32(strOrUint8Array) {
    let bytes;
    if (typeof strOrUint8Array === 'string') {
      bytes = new TextEncoder().encode(strOrUint8Array);
    } else {
      bytes = strOrUint8Array;
    }
    let crc = 0 ^ -1;
    for (let i = 0; i < bytes.length; i++) {
      crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  class ZipBuilder {
    constructor() {
      this.files = [];
    }

    addFile(name, contentStrOrBytes, isBase64 = false) {
      let contentBytes;
      if (isBase64) {
        const binaryStr = atob(contentStrOrBytes);
        contentBytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          contentBytes[i] = binaryStr.charCodeAt(i);
        }
      } else if (contentStrOrBytes instanceof Uint8Array) {
        contentBytes = contentStrOrBytes;
      } else {
        contentBytes = new TextEncoder().encode(contentStrOrBytes);
      }
      
      const nameBytes = new TextEncoder().encode(name);
      const crc = crc32(contentBytes);
      this.files.push({
        name: name,
        nameBytes: nameBytes,
        contentBytes: contentBytes,
        crc: crc,
        size: contentBytes.length
      });
    }

    build() {
      let localHeadersSize = 0;
      let centralDirectorySize = 0;

      // Calculate sizes
      this.files.forEach(f => {
        localHeadersSize += 30 + f.nameBytes.length + f.size;
        centralDirectorySize += 46 + f.nameBytes.length;
      });

      const totalSize = localHeadersSize + centralDirectorySize + 22;
      const buffer = new ArrayBuffer(totalSize);
      const view = new DataView(buffer);
      const uint8 = new Uint8Array(buffer);

      let offset = 0;

      // 1. Write local file headers and data
      this.files.forEach(f => {
        f.offset = offset; // record offset for central directory

        // Signature (4 bytes) - 0x04034b50
        view.setUint32(offset, 0x04034b50, true);
        offset += 4;

        // Version needed to extract (2 bytes) - 10
        view.setUint16(offset, 10, true);
        offset += 2;

        // General purpose bit flag (2 bytes) - 0x0800 (UTF-8 filename)
        view.setUint16(offset, 0x0800, true);
        offset += 2;

        // Compression method (2 bytes) - 0 (Store)
        view.setUint16(offset, 0, true);
        offset += 2;

        // Last mod file time (2 bytes)
        view.setUint16(offset, 0x6000, true);
        offset += 2;

        // Last mod file date (2 bytes)
        view.setUint16(offset, 0x5cbe, true);
        offset += 2;

        // CRC-32 (4 bytes)
        view.setUint32(offset, f.crc, true);
        offset += 4;

        // Compressed size (4 bytes)
        view.setUint32(offset, f.size, true);
        offset += 4;

        // Uncompressed size (4 bytes)
        view.setUint32(offset, f.size, true);
        offset += 4;

        // File name length (2 bytes)
        view.setUint16(offset, f.nameBytes.length, true);
        offset += 2;

        // Extra field length (2 bytes) - 0
        view.setUint16(offset, 0, true);
        offset += 2;

        // File name
        uint8.set(f.nameBytes, offset);
        offset += f.nameBytes.length;

        // File data
        uint8.set(f.contentBytes, offset);
        offset += f.size;
      });

      const centralDirectoryOffset = offset;

      // 2. Write central directory
      this.files.forEach(f => {
        // Signature (4 bytes) - 0x02014b50
        view.setUint32(offset, 0x02014b50, true);
        offset += 4;

        // Version made by (2 bytes) - 0x0314 (UNIX, version 2.0)
        view.setUint16(offset, 0x0314, true);
        offset += 2;

        // Version needed to extract (2 bytes) - 10
        view.setUint16(offset, 10, true);
        offset += 2;

        // General purpose bit flag (2 bytes) - 0x0800 (UTF-8 filename)
        view.setUint16(offset, 0x0800, true);
        offset += 2;

        // Compression method (2 bytes) - 0
        view.setUint16(offset, 0, true);
        offset += 2;

        // Last mod file time (2 bytes)
        view.setUint16(offset, 0x6000, true);
        offset += 2;

        // Last mod file date (2 bytes)
        view.setUint16(offset, 0x5cbe, true);
        offset += 2;

        // CRC-32 (4 bytes)
        view.setUint32(offset, f.crc, true);
        offset += 4;

        // Compressed size (4 bytes)
        view.setUint32(offset, f.size, true);
        offset += 4;

        // Uncompressed size (4 bytes)
        view.setUint32(offset, f.size, true);
        offset += 4;

        // File name length (2 bytes)
        view.setUint16(offset, f.nameBytes.length, true);
        offset += 2;

        // Extra field length (2 bytes) - 0
        view.setUint16(offset, 0, true);
        offset += 2;

        // File comment length (2 bytes) - 0
        view.setUint16(offset, 0, true);
        offset += 2;

        // Disk number start (2 bytes) - 0
        view.setUint16(offset, 0, true);
        offset += 2;

        // Internal file attributes (2 bytes) - 0
        view.setUint16(offset, 0, true);
        offset += 2;

        // External file attributes (4 bytes) - 0x81A40000 (regular file)
        view.setUint32(offset, 0x81A40000, true);
        offset += 4;

        // Local header offset (4 bytes)
        view.setUint32(offset, f.offset, true);
        offset += 4;

        // File name
        uint8.set(f.nameBytes, offset);
        offset += f.nameBytes.length;
      });

      const centralDirectorySizeActual = offset - centralDirectoryOffset;

      // 3. Write end of central directory record (EOCD)
      // Signature (4 bytes) - 0x06054b50
      view.setUint32(offset, 0x06054b50, true);
      offset += 4;

      // Number of this disk (2 bytes) - 0
      view.setUint16(offset, 0, true);
      offset += 2;

      // Disk where central directory starts (2 bytes) - 0
      view.setUint16(offset, 0, true);
      offset += 2;

      // Number of central directory records on this disk (2 bytes)
      view.setUint16(offset, this.files.length, true);
      offset += 2;

      // Total number of central directory records (2 bytes)
      view.setUint16(offset, this.files.length, true);
      offset += 2;

      // Size of central directory (4 bytes)
      view.setUint32(offset, centralDirectorySizeActual, true);
      offset += 4;

      // Offset of start of central directory (4 bytes)
      view.setUint32(offset, centralDirectoryOffset, true);
      offset += 4;

      // Comment length (2 bytes) - 0
      view.setUint16(offset, 0, true);
      offset += 2;

      return new Blob([uint8], { type: 'application/zip' });
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function domToMarkdown(node, exportContext) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const tagName = node.tagName.toLowerCase();
    
    // Skip code actions, hidden buttons or copy buttons.
    // Allow buttons that contain images (e.g. Gemini's generated image gallery buttons)
    if (node.classList.contains('code-actions-container') || 
        node.querySelector('.copy-code-button') ||
        (tagName === 'button' && !node.querySelector('img')) ||
        node.style.display === 'none') {
      return '';
    }

    const childrenMarkdown = () => {
      let result = '';
      for (const child of node.childNodes) {
        result += domToMarkdown(child, exportContext);
      }
      return result;
    };

    switch (tagName) {
      case 'p':
        return '\n\n' + childrenMarkdown().trim() + '\n\n';
      case 'br':
        return '\n';
      case 'strong':
      case 'b':
        return `**${childrenMarkdown().trim()}**`;
      case 'em':
      case 'i':
        return `*${childrenMarkdown().trim()}*`;
      case 'h1':
        return `\n\n# ${childrenMarkdown().trim()}\n\n`;
      case 'h2':
        return `\n\n## ${childrenMarkdown().trim()}\n\n`;
      case 'h3':
        return `\n\n### ${childrenMarkdown().trim()}\n\n`;
      case 'h4':
        return `\n\n#### ${childrenMarkdown().trim()}\n\n`;
      case 'h5':
        return `\n\n##### ${childrenMarkdown().trim()}\n\n`;
      case 'h6':
        return `\n\n###### ${childrenMarkdown().trim()}\n\n`;
      case 'code':
        if (node.parentElement && node.parentElement.tagName.toLowerCase() !== 'pre') {
          return `\`${node.textContent}\``;
        }
        return node.textContent;
      case 'pre':
        const codeElement = node.querySelector('code');
        const codeText = codeElement ? codeElement.textContent : node.textContent;
        let lang = '';
        if (codeElement) {
          const classes = Array.from(codeElement.classList);
          const langClass = classes.find(c => c.startsWith('language-') || c.startsWith('lang-'));
          if (langClass) {
            lang = langClass.replace(/^(language-|lang-)/, '');
          }
        }
        return `\n\n\`\`\`${lang}\n${codeText.trim()}\n\`\`\`\n\n`;
      case 'a':
        const href = node.getAttribute('href') || '';
        const text = childrenMarkdown().trim();
        return href ? `[${text}](${href})` : text;
      case 'ul':
        return '\n' + childrenMarkdown() + '\n';
      case 'ol':
        return '\n' + childrenMarkdown() + '\n';
      case 'li':
        const parentTag = node.parentElement ? node.parentElement.tagName.toLowerCase() : 'ul';
        if (parentTag === 'ol') {
          const siblings = Array.from(node.parentElement.children);
          const index = siblings.indexOf(node) + 1;
          return `${index}. ${childrenMarkdown().trim()}\n`;
        }
        return `* ${childrenMarkdown().trim()}\n`;
      case 'blockquote':
        return `\n\n> ${childrenMarkdown().trim().split('\n').join('\n> ')}\n\n`;
      case 'table':
        return `\n\n${childrenMarkdown().trim()}\n\n`;
      case 'thead':
      case 'tbody':
        return childrenMarkdown();
      case 'tr':
        const cells = Array.from(node.childNodes).filter(n => n.nodeType === Node.ELEMENT_NODE);
        const isHeaderRow = cells.every(c => c.tagName.toLowerCase() === 'th');
        let rowMarkdown = '| ' + cells.map(c => domToMarkdown(c, exportContext).trim()).join(' | ') + ' |\n';
        if (isHeaderRow) {
          rowMarkdown += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
        }
        return rowMarkdown;
      case 'td':
      case 'th':
        return childrenMarkdown().trim().replace(/\|/g, '\\|');
      case 'hr':
        return '\n\n---\n\n';
      case 'img':
        const src = node.getAttribute('src') || '';
        const alt = node.getAttribute('alt') || 'image';
        if (node.classList.contains('avatar') || node.classList.contains('profile-img') || node.classList.contains('user-avatar') || src.includes('/a/') || src.includes('/a-/')) {
          return '';
        }
        if (src && exportContext) {
          let imgIndex = exportContext.images.findIndex(x => x.src === src);
          if (imgIndex === -1) {
            exportContext.images.push({
              src: src,
              alt: alt,
              ext: getExtensionFromMimeOrUrl(src),
              element: node
            });
            imgIndex = exportContext.images.length - 1;
          }
          const filename = `images/${exportContext.convId}_${imgIndex + 1}.${exportContext.images[imgIndex].ext}`;
          return `\n\n![${alt}](${filename})\n\n`;
        }
        return '';
      default:
        return childrenMarkdown();
    }
  }

  function extractMessages(doc, exportContext) {
    const elements = doc.querySelectorAll('user-query-content, message-content');
    let markdown = '';
    
    elements.forEach(el => {
      const tagName = el.tagName.toLowerCase();
      if (tagName === 'user-query-content') {
        const promptText = el.textContent.trim();
        markdown += `### User\n\n${promptText}\n\n`;

        if (exportContext) {
          const userQueryTurn = el.closest('user-query') || el.parentElement;
          if (userQueryTurn) {
            const imgs = userQueryTurn.querySelectorAll('img');
            imgs.forEach(img => {
              // Ensure we only process images inside THIS user-query-content, or images that are completely outside any user-query-content
              const closestContent = img.closest('user-query-content');
              if (closestContent && closestContent !== el) return;

              const src = img.getAttribute('src') || '';
              if (img.classList.contains('avatar') || img.classList.contains('profile-img') || img.classList.contains('user-avatar') || src.includes('/a/') || src.includes('/a-/')) return;

              if (src) {
                let imgIndex = exportContext.images.findIndex(x => x.src === src);
                if (imgIndex === -1) {
                  exportContext.images.push({
                    src: src,
                    alt: img.getAttribute('alt') || 'uploaded_image',
                    ext: getExtensionFromMimeOrUrl(src),
                    element: img
                  });
                  imgIndex = exportContext.images.length - 1;
                }
                const filename = `images/${exportContext.convId}_${imgIndex + 1}.${exportContext.images[imgIndex].ext}`;
                markdown += `![uploaded_image](${filename})\n\n`;
              }
            });
          }
        }
      } else if (tagName === 'message-content') {
        const responseMd = domToMarkdown(el, exportContext);
        markdown += `### Gemini\n\n${responseMd.trim()}\n\n`;
        markdown += `---\n\n`;
      }
    });
    
    return markdown;
  }

  function getConversationTitle(convId) {
    const item = findConversationItem(convId);
    if (item) {
      const titleSelectors = ['h2', '.chat-title', '[data-test-id="chat-title"]', '.snippet-title', '.conversation-title', '.title', 'h3', '.text-content', 'span'];
      for (const sel of titleSelectors) {
        const el = item.querySelector(sel);
        if (el && el.textContent.trim()) {
          return el.textContent.trim();
        }
      }
      const tempEl = item.cloneNode(true);
      const cb = tempEl.querySelector('.gemling-checkbox');
      if (cb) cb.remove();
      const menu = tempEl.querySelector('button');
      if (menu) menu.remove();
      return tempEl.textContent.trim() || convId;
    }
    return convId;
  }

  async function getConversationContent(convId) {
    const cleanId = convId.startsWith('c_') ? convId.substring(2) : convId;

    if (window.location.pathname.includes(cleanId)) {
      const exportContext = { convId: cleanId, images: [] };
      const markdown = extractMessages(document, exportContext);
      
      console.log('[Gemling] ExportContext images found (foreground):', exportContext.images.length);
      const fetchedImages = [];
      for (let i = 0; i < exportContext.images.length; i++) {
        const imgInfo = exportContext.images[i];
        const filename = `images/${cleanId}_${i + 1}.${imgInfo.ext}`;
        console.log(`[Gemling] Fetching image (foreground) ${i+1}/${exportContext.images.length}:`, imgInfo.src);
        try {
          const { base64, mimeType } = await fetchImageAsBase64(imgInfo.src, imgInfo.element);
          fetchedImages.push({
            filename: filename,
            base64: base64,
            mimeType: mimeType
          });
          console.log(`[Gemling] Successfully fetched image ${i+1} (foreground)`);
        } catch (fetchErr) {
          console.error('[Gemling] Failed to fetch image (foreground):', imgInfo.src, fetchErr);
        }
      }
      console.log(`[Gemling] Successfully fetched ${fetchedImages.length} out of ${exportContext.images.length} images (foreground)`);
      const title = getConversationTitleFromPage() || convId;
      return { markdown: markdown, images: fetchedImages, title: title };
    }
    
    return new Promise((resolve, reject) => {
      const storageKey = `gemling_export_${cleanId}`;
      chrome.storage.local.remove(storageKey);
      
      const changeHandler = (changes, area) => {
        if (area === 'local' && changes[storageKey]) {
          const result = changes[storageKey].newValue;
          if (result) {
            chrome.storage.onChanged.removeListener(changeHandler);
            clearTimeout(timeoutId);
            chrome.storage.local.remove(storageKey);
            if (result.status === 'success') {
              resolve({ markdown: result.markdown, images: result.images || [], title: result.title });
            } else {
              reject(new Error(result.error || 'Failed to export conversation'));
            }
          }
        }
      };
      
      chrome.storage.onChanged.addListener(changeHandler);
      chrome.runtime.sendMessage({ action: 'open-export-tab', convId: cleanId });
      
      const timeoutId = setTimeout(() => {
        chrome.storage.onChanged.removeListener(changeHandler);
        reject(new Error('Timeout waiting for conversation tab to load'));
      }, 30000);
    });
  }

  // ── PDF Export Helpers ──

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function inlineMarkdownToHtml(text, imageMap) {
    text = escapeHtml(text);
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Handle images BEFORE links (![alt](src) contains [alt](src) which the link regex would match)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      if (imageMap && imageMap[src]) {
        return `<img src="${imageMap[src]}" alt="${alt}" style="max-width:100%;height:auto;margin:8px 0;display:block;">`;
      }
      return '';
    });
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return text;
  }

  function markdownBlockToHtml(mdText, imageMap) {
    let html = '';
    const lines = mdText.split('\n');
    let inCodeBlock = false;
    let codeContent = '';
    let inList = false;
    let listType = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trimStart().startsWith('```')) {
        if (inCodeBlock) {
          html += `<pre><code>${escapeHtml(codeContent)}</code></pre>\n`;
          codeContent = '';
          inCodeBlock = false;
        } else {
          if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
          inCodeBlock = true;
        }
        continue;
      }
      if (inCodeBlock) { codeContent += line + '\n'; continue; }

      if (line.trim() === '' || line.trim() === '---') {
        if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
        continue;
      }

      const headingMatch = line.match(/^(#{1,6}) (.+)$/);
      if (headingMatch) {
        if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
        const level = Math.min(headingMatch[1].length + 1, 6); // offset by 1 since h1 is conv title
        html += `<h${level}>${inlineMarkdownToHtml(headingMatch[2], imageMap)}</h${level}>\n`;
        continue;
      }

      if (line.match(/^\* /)) {
        if (!inList || listType !== 'ul') {
          if (inList) html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
          html += '<ul>\n'; inList = true; listType = 'ul';
        }
        html += `<li>${inlineMarkdownToHtml(line.replace(/^\* /, ''), imageMap)}</li>\n`;
        continue;
      }
      if (line.match(/^\d+\. /)) {
        if (!inList || listType !== 'ol') {
          if (inList) html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
          html += '<ol>\n'; inList = true; listType = 'ol';
        }
        html += `<li>${inlineMarkdownToHtml(line.replace(/^\d+\. /, ''), imageMap)}</li>\n`;
        continue;
      }

      if (line.startsWith('> ')) {
        if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
        html += `<blockquote><p>${inlineMarkdownToHtml(line.substring(2), imageMap)}</p></blockquote>\n`;
        continue;
      }

      if (line.startsWith('|')) {
        if (line.match(/^\|[\s\-:|]+\|$/)) continue;
        const cells = line.split('|').filter(c => c.trim() !== '').map(c => c.trim());
        const nextLine = (i + 1 < lines.length) ? lines[i + 1] : '';
        const isHeader = nextLine.match(/^\|[\s\-:|]+\|$/);
        const tag = isHeader ? 'th' : 'td';
        if (isHeader) html += '<table><thead>\n';
        html += '<tr>' + cells.map(c => `<${tag}>${inlineMarkdownToHtml(c, imageMap)}</${tag}>`).join('') + '</tr>\n';
        if (isHeader) { html += '</thead><tbody>\n'; }
        const afterSep = isHeader ? i + 2 : i + 1;
        if (afterSep >= lines.length || !lines[afterSep].startsWith('|')) {
          html += '</tbody></table>\n';
        }
        continue;
      }

      // Handle image lines: ![alt](path)
      const imgLineMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgLineMatch) {
        if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
        const imgAlt = imgLineMatch[1];
        const imgSrc = imgLineMatch[2];
        if (imageMap && imageMap[imgSrc]) {
          html += `<div class="image-container"><img src="${imageMap[imgSrc]}" alt="${escapeHtml(imgAlt)}"></div>\n`;
        }
        continue;
      }

      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      html += `<p>${inlineMarkdownToHtml(line, imageMap)}</p>\n`;
    }

    if (inList) html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
    if (inCodeBlock) html += `<pre><code>${escapeHtml(codeContent)}</code></pre>\n`;
    return html;
  }

  function parseConversationMarkdown(markdown) {
    const messages = [];
    const regex = /### (User|Gemini)\s*\n([\s\S]*?)(?=\n### (?:User|Gemini)\s*\n|$)/g;
    let match;
    while ((match = regex.exec(markdown)) !== null) {
      const role = match[1].toLowerCase();
      let content = match[2].trim().replace(/\n---\s*$/, '').trim();
      messages.push({ role, content });
    }
    return messages;
  }

  function buildSinglePdfHtml(conv) {
    const messages = parseConversationMarkdown(conv.markdown);

    // Build image lookup map: filename -> data URI
    const imageMap = {};
    if (conv.images && conv.images.length > 0) {
      for (const img of conv.images) {
        imageMap[img.filename] = `data:${img.mimeType};base64,${img.base64}`;
      }
    }

    let conversationsHtml = `<div class="conversation">\n`;
    conversationsHtml += `<div class="conv-header">\n`;
    conversationsHtml += `  <h1 class="conv-title">${escapeHtml(conv.title)}</h1>\n`;
    conversationsHtml += `  <div class="conv-date">${escapeHtml(conv.date)}</div>\n`;
    conversationsHtml += `</div>\n`;

    for (const msg of messages) {
      if (msg.role === 'user') {
        // Extract image references before stripping for text display
        const userImgRefs = [...msg.content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
        let text = msg.content.replace(/!\[.*?\]\(.*?\)/g, '').trim();
        const truncated = text.length > 100;
        if (truncated) text = text.substring(0, 100);
        conversationsHtml += `<div class="message message-user">\n`;
        conversationsHtml += `  <div class="role-label">👤 User</div>\n`;
        conversationsHtml += `  <div class="message-content"><p>${escapeHtml(text)}${truncated ? '<span class="truncated">…</span>' : ''}</p>`;
        // Render user-uploaded images
        for (const imgRef of userImgRefs) {
          const imgSrc = imgRef[2];
          if (imageMap[imgSrc]) {
            conversationsHtml += `<div class="user-images"><img src="${imageMap[imgSrc]}" alt="${escapeHtml(imgRef[1])}"></div>`;
          }
        }
        conversationsHtml += `</div>\n`;
        conversationsHtml += `</div>\n`;
      } else {
        conversationsHtml += `<div class="message message-gemini">\n`;
        conversationsHtml += `  <div class="role-label">✨ Gemini</div>\n`;
        conversationsHtml += `  <div class="message-content">${markdownBlockToHtml(msg.content, imageMap)}</div>\n`;
        conversationsHtml += `</div>\n`;
      }
    }
    conversationsHtml += `</div>\n`;

    return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 12pt;
  line-height: 1.6;
  color: #000;
  background: #fff;
}
.content { max-width: 800px; margin: 0 auto; padding: 20px; }
.conversation { background: #fff; }
.conv-header { margin-bottom: 30px; }
.conv-title { font-size: 18pt; font-weight: bold; margin-bottom: 5px; }
.conv-date { font-size: 10pt; color: #666; }
.message { margin: 20px 0; }
.role-label { font-size: 11pt; font-weight: bold; margin-bottom: 5px; text-decoration: underline; }
.message-user .role-label { color: #333; }
.message-gemini .role-label { color: #000; }
.message-content p { margin: 10px 0; }
h2, h3, h4 { margin: 20px 0 10px; }
h2 { font-size: 16pt; } h3 { font-size: 14pt; }
pre { margin: 15px 0; font-family: monospace; font-size: 10pt; white-space: pre-wrap; word-wrap: break-word; }
code { font-family: monospace; font-size: 10pt; }
blockquote { border-left: 3px solid #ccc; padding-left: 10px; margin: 15px 0; color: #444; }
table { border-collapse: collapse; width: 100%; margin: 15px 0; }
th, td { border: 1px solid #000; padding: 5px 10px; text-align: left; }
ul, ol { padding-left: 25px; margin: 10px 0; }
a { color: #000; text-decoration: underline; }
.truncated { color: #666; }
.image-container { margin: 10px 0; text-align: center; }
.image-container img { max-width: 100%; height: auto; }
.user-images { margin: 8px 0; }
.user-images img { max-width: 300px; height: auto; border-radius: 4px; }
</style>
</head>
<body>
<div class="content">
${conversationsHtml}
</div>
</body>
</html>`;
  }

  function generatePdfBlob(htmlString) {
    return new Promise((resolve, reject) => {
      if (typeof html2pdf === 'undefined') {
        reject(new Error("html2pdf library is not loaded."));
        return;
      }

      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '800px';
      iframe.style.height = '600px';
      iframe.style.left = '-9999px';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(htmlString);
      doc.close();

      const opt = {
        margin:       10,
        filename:     'export.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const contentEl = doc.querySelector('.content') || doc.body;

      html2pdf().set(opt).from(contentEl).output('blob')
        .then(blob => {
          document.body.removeChild(iframe);
          resolve(blob);
        })
        .catch(err => {
          document.body.removeChild(iframe);
          reject(err);
        });
    });
  }

  async function handleBulkExport() {
    const btnExport = actionBar.querySelector('.gemling-btn-export');
    if (!btnExport) return;

    const convIds = Array.from(checkedConversationIds);
    let successCount = 0;
    let failCount = 0;

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const zip = new ZipBuilder();

    for (let i = 0; i < convIds.length; i++) {
      const convId = convIds[i];
      const current = i + 1;
      const total = convIds.length;
      const percent = (current / total) * 100;
      const progressMsg = chrome.i18n.getMessage("actionProcessing", [current.toString(), total.toString()]);
      
      showProgressView(progressMsg, percent);

      try {
        const { markdown, images: fetchedImages, title: fetchedTitle } = await getConversationContent(convId);
        
        let listTitle = getConversationTitle(convId);
        let title = (listTitle && listTitle !== convId) ? listTitle : fetchedTitle;
        if (!title || title === convId) {
          title = convId;
        }
        
        let safeTitle = title.replace(/[\\\/:\*\?"<>\|]/g, '_').trim();
        if (!safeTitle || safeTitle === '_' || safeTitle === '..') {
          safeTitle = `conversation_${convId}`;
        }
        
        let filename = `${safeTitle}.pdf`;
        let counter = 1;
        while (zip.files.some(f => f.name.toLowerCase() === filename.toLowerCase())) {
          filename = `${safeTitle}_${counter}.pdf`;
          counter++;
        }

        // Add images as separate files in the ZIP first, so we don't lose them if PDF generation fails
        if (fetchedImages && fetchedImages.length > 0) {
          for (const img of fetchedImages) {
            zip.addFile(img.filename, img.base64, true);
          }
        }

        const htmlStr = buildSinglePdfHtml({ title, markdown, date: dateStr, images: fetchedImages });
        const pdfBlob = await generatePdfBlob(htmlStr);
        
        const base64 = await blobToBase64(pdfBlob);
        zip.addFile(filename, base64, true);

        successCount++;
      } catch (err) {
        console.error('[Gemling] PDF导出失败:', convId, err);
        failCount++;
      }

      await delay(500);
    }

    if (successCount > 0) {
      try {
        const zipBlob = zip.build();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        const zipFilename = `gemini_pdfs_${yyyy}${mm}${dd}_${hh}${min}${ss}.zip`;
        
        downloadBlob(zipBlob, zipFilename);
      } catch (zipErr) {
        console.error('[Gemling] ZIP build/download error:', zipErr);
        failCount = convIds.length - successCount + 1;
      }
    }

    const failMsg = failCount > 0 ? chrome.i18n.getMessage("actionFailMsg", [failCount.toString()]) : '';
    const doneText = chrome.i18n.getMessage("actionDone", [successCount.toString(), failMsg]);
    showResultView(doneText);
  }

  function runExportTabLogic() {
    console.log('[Gemling] Export runner tab loaded');
    
    const match = window.location.pathname.match(/\/app\/(?:c\/)?([^/?#]+)/);
    const convId = match ? match[1] : null;
    if (!convId) {
      reportExportError('invalid-id', 'No conversation ID found in URL');
      return;
    }
    
    const storageKey = `gemling_export_${convId}`;
    let attempts = 0;
    const maxAttempts = 60; // 30 seconds
    
    const interval = setInterval(async () => {
      attempts++;
      
      const messages = document.querySelectorAll('user-query-content, message-content');
      if (messages.length > 0) {
        clearInterval(interval);
        
        try {
          // Wait for all images to finish loading before extracting
          const allImgs = document.querySelectorAll('message-content img, user-query img');
          if (allImgs.length > 0) {
            console.log('[Gemling] Waiting for', allImgs.length, 'images to load...');
            const imgPromises = Array.from(allImgs).map(img => {
              if (img.complete && img.naturalWidth > 0) return Promise.resolve();
              return new Promise(resolve => {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', resolve, { once: true });
                setTimeout(resolve, 8000); // Per-image timeout
              });
            });
            await Promise.all(imgPromises);
            // Extra delay for any lazy-loaded images that may trigger after initial load
            await delay(1000);
            console.log('[Gemling] All images loaded, proceeding with extraction');
          }

          const exportContext = { convId: convId, images: [] };
          const markdown = extractMessages(document, exportContext);
          const title = getConversationTitleFromPage() || convId;
          
            console.log('[Gemling] ExportContext images found:', exportContext.images.length);
            
            const fetchedImages = [];
            for (let i = 0; i < exportContext.images.length; i++) {
              const imgInfo = exportContext.images[i];
              const filename = `images/${convId}_${i + 1}.${imgInfo.ext}`;
              console.log(`[Gemling] Fetching image ${i+1}/${exportContext.images.length}:`, imgInfo.src);
              try {
                const { base64, mimeType } = await fetchImageAsBase64(imgInfo.src, imgInfo.element);
                fetchedImages.push({
                  filename: filename,
                  base64: base64,
                  mimeType: mimeType
                });
                console.log(`[Gemling] Successfully fetched image ${i+1}`);
              } catch (fetchErr) {
                console.error('[Gemling] Failed to fetch image:', imgInfo.src, fetchErr);
              }
            }
            console.log(`[Gemling] Successfully fetched ${fetchedImages.length} out of ${exportContext.images.length} images`);
          
          chrome.storage.local.set({
            [storageKey]: {
              status: 'success',
              markdown: markdown,
              title: title,
              images: fetchedImages
            }
          }, () => {
            chrome.runtime.sendMessage({ action: 'close-tab' });
          });
        } catch (err) {
          reportExportError(convId, err.message);
        }
        return;
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        reportExportError(convId, 'Timeout waiting for elements to render');
      }
    }, 500);
    
    function reportExportError(id, errMsg) {
      chrome.storage.local.set({
        [storageKey]: { status: 'error', error: errMsg }
      }, () => {
        chrome.runtime.sendMessage({ action: 'close-tab' });
      });
    }
  }

  function getConversationTitleFromPage() {
    const selectors = ['h2', 'chat-title', '.chat-title', '.title', 'h3'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        return el.textContent.trim();
      }
    }
    return null;
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function fetchInMainWorld(url, body) {
    return new Promise((resolve, reject) => {
      const actionId = Math.random().toString(36).substring(2);
      
      const handler = (e) => {
        if (e.detail.actionId === actionId) {
          window.removeEventListener('gemling-main-fetch-response', handler);
          if (e.detail.ok) {
            resolve({
              ok: true,
              status: e.detail.status,
              text: () => Promise.resolve(e.detail.text)
            });
          } else {
            reject(new Error(e.detail.error || `HTTP ${e.detail.status}`));
          }
        }
      };

      window.addEventListener('gemling-main-fetch-response', handler);

      window.dispatchEvent(new CustomEvent('gemling-main-fetch', {
        detail: { url, body, actionId }
      }));
    });
  }

  async function fetchImageAsBase64(url, imgElement) {
    // Strategy 1: data: URLs — extract directly, no fetch needed
    if (url.startsWith('data:')) {
      const match = url.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], base64: match[2] };
      }
      throw new Error('Invalid data URL format');
    }

    // Strategy 2: Main world fetch — THE PRIMARY STRATEGY
    // probe.js runs in MAIN world with the page's cookies & same-origin access,
    // so it can fetch ANY image the page itself can display (blob:, googleusercontent, etc.)
    try {
      const result = await fetchImageViaMainWorld(url);
      return result;
    } catch (mainWorldErr) {
      console.warn('[Gemling] Main world image fetch failed for', url, ':', mainWorldErr.message);
    }

    // Strategy 3: Canvas draw from DOM element reference (fallback)
    if (imgElement) {
      try {
        const base64 = await imageElementToBase64(imgElement);
        if (base64) {
          return { mimeType: 'image/png', base64: base64 };
        }
      } catch (canvasErr) {
        console.warn('[Gemling] Canvas fallback failed:', canvasErr.message);
      }
    }

    // Strategy 4: Direct fetch from content script (isolated world, rarely works for cross-origin)
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const base64 = await blobToBase64(blob);
        return { mimeType: blob.type || 'image/png', base64: base64 };
      }
    } catch (err) {
      console.warn('[Gemling] Content script direct fetch failed:', err.message);
    }

    // Strategy 5: Background service worker proxy (last resort)
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'fetch-image', url: url }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.status === 'success') {
          resolve({ mimeType: response.mimeType, base64: response.base64 });
        } else {
          reject(new Error(response?.error || 'All image fetch strategies failed'));
        }
      });
    });
  }

  function fetchImageViaMainWorld(url) {
    return new Promise((resolve, reject) => {
      const readyHandler = (e) => {
        if (e.detail.url === url) {
          window.removeEventListener('gemling-main-image-ready', readyHandler);
          clearTimeout(timeoutId);
          if (e.detail.status === 'success') {
            resolve({ mimeType: e.detail.mimeType, base64: e.detail.base64 });
          } else {
            reject(new Error(e.detail.error || 'Main world fetch failed'));
          }
        }
      };

      window.addEventListener('gemling-main-image-ready', readyHandler);
      window.dispatchEvent(new CustomEvent('gemling-main-fetch-image', { detail: { url: url } }));

      const timeoutId = setTimeout(() => {
        window.removeEventListener('gemling-main-image-ready', readyHandler);
        reject(new Error('Timeout waiting for main world image fetch'));
      }, 20000);
    });
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function getExtensionFromMimeOrUrl(src) {
    if (src.startsWith('data:')) {
      const match = src.match(/^data:image\/([a-zA-Z+]+);base64/);
      if (match) {
        let ext = match[1].toLowerCase();
        if (ext === 'jpeg') return 'jpg';
        if (ext === 'svg+xml') return 'svg';
        return ext;
      }
    }
    try {
      const url = new URL(src);
      const pathname = url.pathname;
      const extMatch = pathname.match(/\.([a-zA-Z0-9]+)$/);
      if (extMatch) {
        const ext = extMatch[1].toLowerCase();
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
          return ext === 'jpeg' ? 'jpg' : ext;
        }
      }
    } catch (e) {}
    return 'png';
  }

  function imageElementToBase64(img) {
    return new Promise((resolve, reject) => {
      if (!img) {
        reject(new Error('No image element provided'));
        return;
      }
      
      const doDraw = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 800;
          canvas.height = img.naturalHeight || img.height || 600;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/png');
          const base64 = dataUrl.split(',')[1];
          resolve(base64);
        } catch (e) {
          reject(e);
        }
      };

      if (img.complete && img.naturalWidth > 0) {
        doDraw();
      } else {
        const loadHandler = () => {
          img.removeEventListener('load', loadHandler);
          img.removeEventListener('error', errorHandler);
          doDraw();
        };
        const errorHandler = (err) => {
          img.removeEventListener('load', loadHandler);
          img.removeEventListener('error', errorHandler);
          reject(new Error('Image failed to load in DOM'));
        };
        img.addEventListener('load', loadHandler);
        img.addEventListener('error', errorHandler);
        
        setTimeout(() => {
          img.removeEventListener('load', loadHandler);
          img.removeEventListener('error', errorHandler);
          reject(new Error('Timeout waiting for image load'));
        }, 10000);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
