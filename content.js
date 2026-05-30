(function() {
  'use strict';

  const SELECTORS = {
    conversationItem: 'a[href*="/app/"]',
    searchSnippet: 'search-snippet, search-zero-state .conversation-container, project-chat-row'
  };

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
        if (bodyTemplate && bodyTemplate.includes(awaitDeleteConvId)) {
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

    actionBar.innerHTML = `
      <span class="gemling-count">${selectedText}</span>
      <span class="gemling-status"></span>
      <button class="gemling-btn gemling-btn-cancel" disabled>${cancelText}</button>
      <button class="gemling-btn gemling-btn-delete" disabled>${deleteText}</button>
      <button class="gemling-btn" disabled>${addText}</button>
    `;

    document.body.appendChild(actionBar);

    const btn = actionBar.querySelector('.gemling-btn:not(.gemling-btn-delete):not(.gemling-btn-cancel)');
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
  }

  function updateCount() {
    const count = checkedConversationIds.size;
    injectActionBar();
    const countEl = actionBar.querySelector('.gemling-count');

    if (countEl) {
      countEl.textContent = chrome.i18n.getMessage("countSelected", [count.toString()]);
    }

    const btn = actionBar.querySelector('.gemling-btn:not(.gemling-btn-delete):not(.gemling-btn-cancel)');
    const btnDelete = actionBar.querySelector(".gemling-btn-delete");
    if (count > 0 || btn?.dataset?.state === 'finished' || btnDelete?.dataset?.state === 'finished') {
      actionBar.classList.remove('gemling-action-bar-hidden');
    } else {
      actionBar.classList.add('gemling-action-bar-hidden');
    }

    updateButtonState();
  }

  function updateButtonState() {
    const btn = actionBar.querySelector('.gemling-btn:not(.gemling-btn-delete):not(.gemling-btn-cancel)');
    const btnDelete = actionBar.querySelector('.gemling-btn-delete');
    const btnCancel = actionBar.querySelector('.gemling-btn-cancel');
    const statusEl = actionBar.querySelector('.gemling-status');

    // 清空状态提示，不再显示警告
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.className = 'gemling-status';
    }

    const hasSelection = checkedConversationIds.size > 0;

    if (btn?.dataset?.state === 'finished') {
      btn.disabled = false;
    } else if (btn) {
      btn.disabled = !hasSelection;
    }

    if (btnDelete?.dataset?.state === 'finished') {
      btnDelete.disabled = false;
    } else if (btnDelete) {
      btnDelete.disabled = !hasSelection;
    }

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

      const btn = actionBar?.querySelector('.gemling-btn:not(.gemling-btn-delete):not(.gemling-btn-cancel)');
      if (btn && btn.dataset.state === 'finished') {
        btn.dataset.state = '';
        btn.textContent = chrome.i18n.getMessage("actionAdd");
      }

      const btnDelete = actionBar?.querySelector('.gemling-btn-delete');
      if (btnDelete && btnDelete.dataset.state === 'finished') {
        btnDelete.dataset.state = '';
        btnDelete.textContent = chrome.i18n.getMessage("actionDelete");
      }

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
      const id = item.getAttribute('data-gemling-conv-id');
      return (!id || id === 'not-found') ? null : id;
    }

    const href = item.getAttribute('href') || '';
    // href 格式: /app/xxx 或 /app/xxx/yyy
    const match = href.match(/\/app\/([^/?#]+)/);
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

    // reset button states
    const btn = actionBar?.querySelector('.gemling-btn:not(.gemling-btn-delete):not(.gemling-btn-cancel)');
    if (btn) {
      btn.dataset.state = '';
      btn.textContent = chrome.i18n.getMessage("actionAdd");
    }

    const btnDelete = actionBar?.querySelector('.gemling-btn-delete');
    if (btnDelete) {
      btnDelete.dataset.state = '';
      btnDelete.textContent = chrome.i18n.getMessage("actionDelete");
    }

    updateCount();
  }

  async function handleBulkAddToNotebook() {
    const btn = actionBar.querySelector('.gemling-btn:not(.gemling-btn-delete):not(.gemling-btn-cancel)');
    if (!btn) return;

    const actionAddText = chrome.i18n.getMessage("actionAdd");

    if (btn.dataset.state === 'finished') {
      btn.dataset.state = '';
      btn.textContent = actionAddText;
      checkedConversationIds.clear();
      document.querySelectorAll('.gemling-checkbox').forEach(cb => cb.dataset.checked = 'false');
      updateCount();
      return;
    }

    btn.disabled = true;

    // 清除旧的 API 状态，确保等待新的笔记本选择
    apiState = null;

    // 获取第一个选中的对话项
    const firstConvId = checkedConversationIds.values().next().value;
    if (!firstConvId) {
      btn.disabled = false;
      return;
    }

    const firstItem = findConversationItem(firstConvId);
    if (!firstItem) {
      console.error('[Gemling] 未找到对话项:', firstConvId);
      btn.disabled = false;
      return;
    }

    btn.textContent = chrome.i18n.getMessage("actionSelect");
    triggerNativeAddToNotebook(firstItem);

    // 等待 API 捕获（最多等待 30 秒）
    const captured = await waitForApiCapture(30000);
    if (!captured) {
      btn.textContent = actionAddText;
      btn.disabled = false;
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
      const current = (i + 2).toString();
      const total = (convIds.length + 1).toString();
      btn.textContent = chrome.i18n.getMessage("actionProcessing", [current, total]);

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
    btn.textContent = chrome.i18n.getMessage("actionDone", [successCount.toString(), failMsg]);
    btn.dataset.state = 'finished';
    btn.disabled = false;
    updateCount();
  }


  async function handleBulkDelete() {
    const btnDelete = actionBar.querySelector('.gemling-btn-delete');
    if (!btnDelete) return;

    const actionDeleteText = chrome.i18n.getMessage("actionDelete");

    if (btnDelete.dataset.state === 'finished') {
      handleCancelBulk();
      return;
    }

    btnDelete.disabled = true;
    isBulkDeleteActive = true;
    apiStateDelete = null;

    const firstConvId = checkedConversationIds.values().next().value;
    if (!firstConvId) {
      btnDelete.disabled = false;
      return;
    }

    const firstItem = findConversationItem(firstConvId);
    if (!firstItem) {
      console.error('[Gemling] 未找到对话项:', firstConvId);
      btnDelete.disabled = false;
      return;
    }

    awaitDeleteConvId = normalizeConversationId(firstConvId) || firstConvId;
    btnDelete.textContent = "..."; // Processing indication
    triggerNativeDelete(firstItem);

    // Wait for dialog to appear and then disappear
    const confirmed = await waitForDialogAndCaptureDelete();
    if (!confirmed || !apiStateDelete) {
      // User cancelled
      handleCancelBulk();
      return;
    }

    // First one deleted via UI, proceed to delete rest via API
    checkedConversationIds.delete(firstConvId);
    if (firstItem) {
      const firstItemToRemove = firstItem.closest('gem-nav-list-item') || firstItem.closest('project-chat-row') || firstItem.closest('li') || firstItem;
      firstItemToRemove.remove();
    }

    const convIds = Array.from(checkedConversationIds);
    let successCount = 1;
    let failCount = 0;

    for (let i = 0; i < convIds.length; i++) {
      const convId = convIds[i];
      const current = (i + 2).toString();
      const total = (convIds.length + 1).toString();
      btnDelete.textContent = chrome.i18n.getMessage("actionProcessing", [current, total]);

      try {
        await deleteViaApi(convId);
        successCount++;
        const item = findConversationItem(convId);
        if (item) {
          const itemToRemove = item.closest('gem-nav-list-item') || item.closest('project-chat-row') || item.closest('li') || item;
          itemToRemove.remove();
        }
        checkedConversationIds.delete(convId);
      } catch (err) {
        console.error('[Gemling] 删除失败:', convId, err);
        failCount++;
      }

      await delay(800);
    }

    const failMsg = failCount > 0 ? chrome.i18n.getMessage("actionFailMsg", [failCount.toString()]) : '';
    btnDelete.textContent = chrome.i18n.getMessage("actionDone", [successCount.toString(), failMsg]);
    btnDelete.dataset.state = 'finished';
    btnDelete.disabled = false;
    isBulkDeleteActive = false;
    updateCount();
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
      // Find fallback menu button for search-snippets
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
        if (keywords.some(kw => text.includes(kw))) {
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

  function waitForDialogAndCaptureDelete() {
    return new Promise(resolve => {
      let dialogAppeared = false;
      const checkInterval = setInterval(() => {
        const dialog = document.querySelector('mat-dialog-container');
        if (dialog) {
          dialogAppeared = true;
        } else if (dialogAppeared && !dialog) {
          clearInterval(checkInterval);
          // Wait a bit to ensure API request fires and is captured
          setTimeout(() => {
            resolve(!!apiStateDelete);
          }, 500);
        }
      }, 200);
    });
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
    let bodyText = apiStateDelete.bodyTemplate;

    // Simple string replace for the conversation ID within the URL encoded body
    bodyText = bodyText.replace(new RegExp(originalConvId, 'g'), normalizedConvId);

    const sourcePath = apiStateDelete.sourcePathRaw || '';
    const capturedUrl = new URL(apiStateDelete.url, window.location.origin);
    const bl = capturedUrl.searchParams.get('bl') || '';
    const fSid = capturedUrl.searchParams.get('f.sid') || '';
    const hl = capturedUrl.searchParams.get('hl') || 'zh-CN';

    const reqid = Math.floor(Math.random() * 9000000) + 1000000;
    capturedUrl.searchParams.set('_reqid', reqid.toString());
    const url = capturedUrl.toString();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      },
      body: bodyText,
      credentials: 'same-origin'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // We assume success on HTTP 200 for deletion
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

    // 生成新的 _reqid（随机数）
    const reqid = Math.floor(Math.random() * 9000000) + 1000000;

    const url = `/_/BardChatUi/data/batchexecute?rpcids=MUAZcd&source-path=${sourcePath}&bl=${bl}&f.sid=${fSid}&hl=${hl}&_reqid=${reqid}&rt=c`;

    console.log('[Gemling] 发送请求到:', url);
    console.log('[Gemling] 请求体:', bodyText.substring(0, 100));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      },
      body: bodyText,
      credentials: 'same-origin'
    });

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

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
