(function() {
  'use strict';

  const SELECTORS = {
    conversationItem: 'a[data-test-id="conversation"]'
  };

  let checkedConversationIds = new Set(); // 用 conversationId 存储选中状态
  let actionBar = null;
  let apiState = null; // { url, rpcId, sourcePathRaw, at, fReqTemplate, bodyTemplate, originalConvId }
  let targetCaptureConvId = null;

  function init() {
    observeConversationList();
    listenForApiCapture();
  }

  function listenForApiCapture() {
    window.addEventListener('gemling-api-captured', (e) => {
      const { url, rpcId, sourcePathRaw, at, fReqTemplate, bodyTemplate } = e.detail;

      if (!targetCaptureConvId) {
        return;
      }

      // 验证捕获到的请求体中是否包含我们期待的 targetCaptureConvId
      if (!fReqTemplate.includes(targetCaptureConvId)) {
        console.log('[Gemling] 忽略不相关的 API 捕获。期待:', targetCaptureConvId);
        return;
      }

      apiState = {
        url,
        rpcId,
        sourcePathRaw,
        at,
        fReqTemplate,
        bodyTemplate,
        originalConvId: targetCaptureConvId
      };

      console.log(`[Gemling] API 已捕获: rpcId=${rpcId}, convId=${targetCaptureConvId}`);
      updateButtonState();
    });
  }

  function injectActionBar() {
    if (actionBar) return;

    actionBar = document.createElement('div');
    actionBar.className = 'gemling-action-bar gemling-action-bar-hidden';

    // 初始化国际化文本
    const selectedText = chrome.i18n.getMessage("countSelected", ["0"]);
    const addText = chrome.i18n.getMessage("actionAdd");

    actionBar.innerHTML = `
      <span class="gemling-count">${selectedText}</span>
      <span class="gemling-status"></span>
      <button class="gemling-btn" disabled>${addText}</button>
    `;

    document.body.appendChild(actionBar);

    const btnCancel = actionBar.querySelector('.gemling-btn-cancel');
    btnCancel.addEventListener('click', handleCancelSelection);

    const btnAdd = actionBar.querySelector('.gemling-btn-add');
    btnAdd.addEventListener('click', handleBulkAddToNotebook);

    const btnDelete = actionBar.querySelector('.gemling-btn-delete');
    btnDelete.addEventListener('click', handleBulkDelete);
  }

  function updateCount() {
    const count = checkedConversationIds.size;
    injectActionBar();
    const countEl = actionBar.querySelector('.gemling-count');

    countEl.textContent = chrome.i18n.getMessage("countSelected", [count.toString()]);

    const btnAdd = actionBar.querySelector('.gemling-btn-add');
    const btnDelete = actionBar.querySelector('.gemling-btn-delete');

    if (count > 0 || btnAdd.dataset.state === 'finished' || btnDelete.dataset.state === 'finished') {
      actionBar.classList.remove('gemling-action-bar-hidden');
    } else {
      actionBar.classList.add('gemling-action-bar-hidden');
    }

    updateButtonState();
  }

  function updateButtonState() {
    const btnAdd = actionBar.querySelector('.gemling-btn-add');
    const btnDelete = actionBar.querySelector('.gemling-btn-delete');
    const statusEl = actionBar.querySelector('.gemling-status');

    statusEl.textContent = '';
    statusEl.className = 'gemling-status';

    const count = checkedConversationIds.size;

    // 如果处于处理中或等待状态，保持按钮禁用（除了当前正在 finish 的按钮需要重置）
    // 但这个逻辑主要由 handleBulk 中的 DOM 操作直接控制。
    // 这里处理基础的可用性：

    if (btnAdd.dataset.state === 'finished' || btnDelete.dataset.state === 'finished') {
      btnAdd.disabled = false;
      btnDelete.disabled = false;
    } else {
      btnAdd.disabled = count === 0;
      btnDelete.disabled = count === 0;
    }
  }

  function observeConversationList() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches(SELECTORS.conversationItem)) {
              injectCheckbox(node);
            }
            node.querySelectorAll(SELECTORS.conversationItem).forEach(injectCheckbox);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    document.querySelectorAll(SELECTORS.conversationItem).forEach(injectCheckbox);
  }

  function injectCheckbox(item) {
    if (item.querySelector('.gemling-checkbox')) return;

    const convId = getConversationId(item);
    if (!convId) return;

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

      const btn = actionBar?.querySelector('.gemling-btn');
      if (btn && btn.dataset.state === 'finished') {
        btn.dataset.state = '';
        btn.textContent = chrome.i18n.getMessage("actionAdd");
      }

      updateCount();
    });

    item.insertBefore(checkbox, item.firstChild);
  }

  function getConversationId(item) {
    const href = item.getAttribute('href') || '';
    // href 格式: /app/xxx 或 /app/xxx/yyy
    const match = href.match(/^\/app\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  function normalizeConversationId(convId) {
    if (!convId) return null;
    return convId.startsWith('c_') ? convId : `c_${convId}`;
  }

  function handleCancelSelection() {
    checkedConversationIds.clear();
    document.querySelectorAll('.gemling-checkbox').forEach(cb => {
      cb.dataset.checked = 'false';
    });

    if (actionBar) {
      const btnAdd = actionBar.querySelector('.gemling-btn-add');
      if (btnAdd) {
        btnAdd.dataset.state = '';
        btnAdd.textContent = '添加到笔记本';
      }
      const btnDelete = actionBar.querySelector('.gemling-btn-delete');
      if (btnDelete) {
        btnDelete.dataset.state = '';
        btnDelete.textContent = '删除';
      }
    }

    updateCount();
  }

  async function handleBulkAddToNotebook() {
    const btn = actionBar.querySelector('.gemling-btn');
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
    const otherBtn = actionBar.querySelector(isAdd ? '.gemling-btn-delete' : '.gemling-btn-add');
    if (otherBtn) otherBtn.disabled = true;

    // 清除旧的 API 状态
    apiState = null;
    targetCaptureConvId = null;

    const firstConvId = checkedConversationIds.values().next().value;
    if (!firstConvId) {
      updateButtonState();
      return;
    }

    const firstItem = findConversationItem(firstConvId);
    if (!firstItem) {
      console.error('[Gemling] 未找到对话项:', firstConvId);
      updateButtonState();
      return;
    }

    btn.textContent = chrome.i18n.getMessage("actionSelect");
    triggerNativeAddToNotebook(firstItem);

    // 等待 API 捕获
    const captured = await waitForApiCapture(30000, !isAdd);
    if (!captured) {
      btn.textContent = actionAddText;
      btn.disabled = false;
      return;
    }

    // 第一个对话已成功
    removeConversationItemFromDom(firstConvId);
    checkedConversationIds.delete(firstConvId);

    const convIds = Array.from(checkedConversationIds);
    let successCount = 1;
    let failCount = 0;

    for (let i = 0; i < convIds.length; i++) {
      const convId = convIds[i];
      // 进度显示考虑上第一个已成功的
      const current = (i + 2).toString();
      const total = (convIds.length + 1).toString();
      btn.textContent = chrome.i18n.getMessage("actionProcessing", [current, total]);

      try {
        await executeActionViaApi(convId);
        successCount++;
        removeConversationItemFromDom(convId);
        checkedConversationIds.delete(convId);
      } catch (err) {
        console.error(`[Gemling] ${isAdd ? '添加' : '删除'}失败:`, convId, err);
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

  function removeConversationItemFromDom(convId) {
    const item = findConversationItem(convId);
    if (item) {
      const itemParent = item.closest('li') || item.parentElement;
      if (itemParent) itemParent.remove();
    }
  }

  function findConversationItem(convId) {
    // 根据 conversationId 查找对应的对话项 DOM 元素
    const items = document.querySelectorAll(SELECTORS.conversationItem);
    for (const item of items) {
      const itemConvId = getConversationId(item);
      if (itemConvId === convId) {
        return item;
      }
    }
    return null;
  }

  function triggerNativeMenuAction(item, keywords) {
    // 三点菜单按钮在对话项的兄弟元素 conversation-actions-container 中
    const parent = item.parentElement;
    const actionsContainer = parent?.querySelector('.conversation-actions-container');
    const menuBtn = actionsContainer?.querySelector('button[data-test-id="conversation-actions-menu-icon-button"]') ||
                    actionsContainer?.querySelector('button[aria-haspopup="menu"]');

    if (!menuBtn) {
      console.error('[Gemling] 未找到菜单按钮');
      return;
    }

    menuBtn.click();

    setTimeout(() => clickNativeMenuItem(keywords), 100);
  }

  function clickNativeMenuItem(keywords) {
    const menuItems = document.querySelectorAll('[role="menuitem"], [role="menuitemradio"]');
    for (const menuItem of menuItems) {
      const text = menuItem.textContent || '';
      if (keywords.some(kw => text.includes(kw))) {
        menuItem.click();
        return;
      }
    }

    console.error('[Gemling] 未找到匹配的菜单项:', keywords);
  }

  function waitForApiCapture(timeout, expectDialog) {
    return new Promise((resolve) => {
      if (apiState) {
        resolve(true);
        return;
      }

      let resolved = false;
      let dialogObserver = null;
      let dialogCloseTimeout = null;

      const cleanup = () => {
        resolved = true;
        window.removeEventListener('gemling-api-captured', apiHandler);
        if (dialogObserver) dialogObserver.disconnect();
        if (dialogCloseTimeout) clearTimeout(dialogCloseTimeout);
      };

      const finish = (result) => {
        if (resolved) return;
        cleanup();
        resolve(result);
      };

      const apiHandler = () => {
        finish(true);
      };

      window.addEventListener('gemling-api-captured', apiHandler);

      if (expectDialog) {
        // 监听系统对话框的出现和消失 (如果用户点击取消/关闭对话框，则提前终止等待)
        dialogObserver = new MutationObserver(() => {
          const dialog = document.querySelector('mat-dialog-container');
          if (!dialog) {
            // 如果系统对话框消失，给 500ms 缓冲等待 API 捕获
            // 如果 API 没捕获，说明用户点击了“取消”或点击空白处关闭了对话框
            if (!dialogCloseTimeout && !resolved) {
              dialogCloseTimeout = setTimeout(() => {
                console.log('[Gemling] 系统对话框已关闭，未捕获 API，取消批量操作');
                finish(false);
              }, 500);
            }
          } else {
            // 如果弹出了新对话框（或重新弹出），清除超时器
            if (dialogCloseTimeout) {
              clearTimeout(dialogCloseTimeout);
              dialogCloseTimeout = null;
            }
          }
        });

        dialogObserver.observe(document.body, { childList: true, subtree: true });
      }

      setTimeout(() => {
        console.log('[Gemling] 等待 API 捕获超时');
        finish(false);
      }, timeout);
    });
  }

  async function executeActionViaApi(convId) {
    const normalizedConvId = normalizeConversationId(convId);
    if (!normalizedConvId) {
      throw new Error('缺少有效的对话 ID');
    }

    const params = new URLSearchParams(apiState.bodyTemplate);
    const fReq = params.get('f.req');
    if (!fReq) {
      throw new Error('捕获的请求缺少 f.req');
    }

    let parsed;
    try {
      parsed = JSON.parse(fReq);
      if (!parsed || !parsed[0] || !parsed[0][0] || typeof parsed[0][0][1] !== 'string') {
        throw new Error('捕获的请求结构不符合预期');
      }

      // 进行全局字符串替换
      let innerStr = parsed[0][0][1];
      innerStr = innerStr.replace(new RegExp(apiState.originalConvId, 'g'), normalizedConvId);

      parsed[0][0][1] = innerStr;
      params.set('f.req', JSON.stringify(parsed));
    } catch (err) {
      throw new Error(`修改请求失败: ${err.message}`);
    }

    const bodyText = params.toString();

    const sourcePath = apiState.sourcePathRaw || '';

    // 从捕获的 URL 中提取其他必要参数
    const capturedUrl = new URL(apiState.url, window.location.origin);
    const bl = capturedUrl.searchParams.get('bl') || '';
    const fSid = capturedUrl.searchParams.get('f.sid') || '';
    const hl = capturedUrl.searchParams.get('hl') || 'zh-CN';

    // 生成新的 _reqid（随机数）
    const reqid = Math.floor(Math.random() * 9000000) + 1000000;

    const rpcId = apiState.rpcId || 'MUAZcd';

    const url = `/_/BardChatUi/data/batchexecute?rpcids=${rpcId}&source-path=${sourcePath}&bl=${bl}&f.sid=${fSid}&hl=${hl}&_reqid=${reqid}&rt=c`;

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
