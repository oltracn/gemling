(function() {
  'use strict';

  const SELECTORS = {
    conversationItem: 'a[data-test-id="conversation"]'
  };

  let checkedConversations = new Set();
  let actionBar = null;
  let apiState = null; // { at, notebookPath, bodyTemplate }

  function init() {
    observeConversationList();
    listenForApiCapture();
  }

  function listenForApiCapture() {
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
  }

  function injectActionBar() {
    if (actionBar) return;

    actionBar = document.createElement('div');
    actionBar.className = 'gemling-action-bar gemling-action-bar-hidden';
    actionBar.innerHTML = `
      <span class="gemling-count">已选中 0 项</span>
      <span class="gemling-status"></span>
      <button class="gemling-btn" disabled>添加到笔记本</button>
    `;

    document.body.appendChild(actionBar);

    const btn = actionBar.querySelector('.gemling-btn');
    btn.addEventListener('click', handleBulkAddToNotebook);
  }

  function updateCount() {
    const count = checkedConversations.size;
    injectActionBar();
    const countEl = actionBar.querySelector('.gemling-count');

    countEl.textContent = `已选中 ${count} 项`;

    if (count > 0) {
      actionBar.classList.remove('gemling-action-bar-hidden');
    } else {
      actionBar.classList.add('gemling-action-bar-hidden');
    }

    updateButtonState();
  }

  function updateButtonState() {
    const btn = actionBar.querySelector('.gemling-btn');
    const statusEl = actionBar.querySelector('.gemling-status');

    // 清空状态提示，不再显示警告
    statusEl.textContent = '';
    statusEl.className = 'gemling-status';

    // 按钮始终可用（只要有选中项）
    btn.disabled = checkedConversations.size === 0;
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

    const checkbox = document.createElement('div');
    checkbox.className = 'gemling-checkbox';
    checkbox.dataset.checked = 'false';

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
        checkedConversations.add(item);
      } else {
        checkedConversations.delete(item);
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

  async function handleBulkAddToNotebook() {
    const btn = actionBar.querySelector('.gemling-btn');
    btn.disabled = true;

    let skipFirst = false;

    // 如果 API 未捕获，先触发第一个对话项的三点菜单
    if (!apiState) {
      const firstItem = checkedConversations.values().next().value;
      if (!firstItem) {
        btn.disabled = false;
        return;
      }

      btn.textContent = '请手动添加一次...';
      triggerNativeAddToNotebook(firstItem);

      // 等待 API 捕获（最多等待 30 秒）
      const captured = await waitForApiCapture(30000);
      if (!captured) {
        btn.textContent = '添加到笔记本';
        btn.disabled = false;
        return;
      }

      // 第一个对话已被手动添加，标记跳过
      skipFirst = true;
    }

    // API 已捕获，批量处理
    const conversations = Array.from(checkedConversations);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < conversations.length; i++) {
      const item = conversations[i];

      // 跳过第一个（已手动添加）
      if (skipFirst && i === 0) {
        successCount++;
        continue;
      }

      const convId = getConversationId(item);
      btn.textContent = `处理中 ${i + 1}/${conversations.length}`;

      if (!convId) {
        console.error('[Gemling] 无法获取对话 ID:', item);
        failCount++;
        continue;
      }

      try {
        await addToNotebookViaApi(convId);
        successCount++;
      } catch (err) {
        console.error('[Gemling] 添加失败:', convId, err);
        failCount++;
      }

      await delay(800);
    }

    btn.textContent = `完成 ${successCount}项${failCount > 0 ? `，失败${failCount}项` : ''}`;
    await delay(2000);

    btn.textContent = '添加到笔记本';
    btn.disabled = false;

    checkedConversations.clear();
    document.querySelectorAll('.gemling-checkbox').forEach(cb => cb.dataset.checked = 'false');
    updateCount();
  }

  function triggerNativeAddToNotebook(item) {
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

    // 等待菜单出现后点击"添加到笔记本"选项
    setTimeout(() => clickAddToNotebookMenuItem(), 100);
  }

  function clickAddToNotebookMenuItem() {
    // 查找菜单中的"添加到笔记本"选项
    const menuItems = document.querySelectorAll('[role="menuitem"], [role="menuitemradio"]');
    for (const menuItem of menuItems) {
      const text = menuItem.textContent || '';
      if (text.includes('笔记本') || text.includes('notebook') || text.includes('Notebook')) {
        menuItem.click();
        return;
      }
    }

    // 如果没找到，可能是英文界面
    for (const menuItem of menuItems) {
      const text = menuItem.textContent || '';
      if (text.includes('Save') || text.includes('save') || text.includes('Add')) {
        menuItem.click();
        return;
      }
    }

    console.error('[Gemling] 未找到"添加到笔记本"菜单项');
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
