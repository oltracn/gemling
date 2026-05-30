(function() {
  let overrideConvId = null;
  window.addEventListener('gemling-set-override-convid', (e) => {
    overrideConvId = e.detail.convId;
  });

  let overrideDeleteData = null;
  window.addEventListener('gemling-set-override-delete', (e) => {
    overrideDeleteData = e.detail;
  });

  // ── API Response Data: title → convId mapping ──
  const apiConvData = []; // [{id, title}, ...]

  function extractConvDataFromResponse(text) {
    if (!text || typeof text !== 'string') return;
    try {
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed);
            scanForConvPairs(parsed, 0, new Set());
          } catch(e) {}
        }
      }
    } catch(e) {}
  }

  function scanForConvPairs(obj, depth, seen) {
    if (depth > 25 || !obj || typeof obj !== 'object' || seen.has(obj)) return;
    seen.add(obj);

    if (Array.isArray(obj)) {
      // Check if this array contains a c_ ID alongside a title-like string
      let cId = null;
      let possibleTitle = null;

      for (const item of obj) {
        if (typeof item === 'string') {
          if (!cId && item.startsWith('c_') && item.length > 5 && item.length < 60) {
            cId = item;
          } else if (!possibleTitle && item.length > 2 && item.length < 200
                     && !item.startsWith('/') && !item.startsWith('http')
                     && !item.startsWith('c_') && !/^[0-9a-f]{16}$/i.test(item)
                     && !item.includes('wrb.fr') && !item.includes('generic')
                     && !item.includes('boq-') && !item.includes('_/js/')
                     && !/^\d+$/.test(item)) {
            possibleTitle = item;
          }
        }
      }

      if (cId && possibleTitle && !apiConvData.find(d => d.id === cId)) {
        apiConvData.push({ id: cId, title: possibleTitle });
      }

      // Recurse: parse stringified JSON and sub-arrays
      for (const item of obj) {
        if (typeof item === 'string' && item.length > 10 && item.startsWith('[')) {
          try {
            const parsed = JSON.parse(item);
            scanForConvPairs(parsed, depth + 1, seen);
          } catch(e) {}
        } else if (typeof item === 'object' && item !== null) {
          scanForConvPairs(item, depth + 1, seen);
        }
      }
    }
  }

  // ── Conv ID Extraction from DOM Elements ──
  window.addEventListener('gemling-request-conv-id', () => {
    function checkString(str) {
      if (str.startsWith('/app/') && str.length > 10) {
        const match = str.match(/[/]app[/](?:c[/])?([^/?#]+)/);
        if (match) return match[1];
      }
      if (str.startsWith('c_') && str.length > 5) return str;
      if (/^[0-9a-fA-F]{16}$/.test(str)) return str;
      return null;
    }

    function findConvId(obj, depth = 0, seen = new Set()) {
      if (depth > 15 || !obj || typeof obj !== 'object' || seen.has(obj)) return null;
      seen.add(obj);

      if (!Array.isArray(obj)) {
        for (const key of ['id', 'conversationId', 'name', 'chatId']) {
          try {
            const val = obj[key];
            if (typeof val === 'string') {
              const res = checkString(val);
              if (res) return res;
              if (/^[0-9a-zA-Z_-]{12,25}$/.test(val)) return val;
            }
          } catch(e) {}
        }
      }

      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          const item = obj[i];
          if (typeof item === 'string') {
            const res = checkString(item);
            if (res) return res;
          }
          const nested = findConvId(item, depth + 1, seen);
          if (nested) return nested;
        }
      } else {
        for (const key in obj) {
          try {
            const item = obj[key];
            if (typeof item === 'string') {
              const res = checkString(item);
              if (res) return res;
            }
            const nested = findConvId(item, depth + 1, seen);
            if (nested) return nested;
          } catch(e) {}
        }
      }
      return null;
    }

    const snippets = document.querySelectorAll('search-snippet:not([data-gemling-conv-id]), search-zero-state .conversation-container:not([data-gemling-conv-id]), project-chat-row:not([data-gemling-conv-id])');

    snippets.forEach((snippet, index) => {
      let id = null;

      // ── Diagnostic (first unresolved item only) ──
      if (index === 0 && !window.__gemlingDiagDone) {
        window.__gemlingDiagDone = true;
        console.log('[Gemling Diag] window.ng available:', typeof window.ng !== 'undefined');
        console.log('[Gemling Diag] snippet tag:', snippet.tagName, 'class:', snippet.className);
        console.log('[Gemling Diag] snippet.__ngContext__:', !!snippet.__ngContext__);
        console.log('[Gemling Diag] apiConvData count:', apiConvData.length,
          'sample:', JSON.stringify(apiConvData.slice(0, 3)));

        let p = snippet.parentElement;
        for (let i = 0; i < 5 && p; i++) {
          console.log('[Gemling Diag] parent[' + i + ']:',
            p.tagName, (p.className || '').substring(0, 40),
            '__ngContext__:', !!p.__ngContext__);
          p = p.parentElement;
        }

        // Log title detection
        const titleCandidates = snippet.querySelectorAll('h2, h3, p, span, .chat-title, .title, .snippet-title');
        console.log('[Gemling Diag] title candidates:', titleCandidates.length);
        titleCandidates.forEach((el, i) => {
          if (i < 3) console.log('[Gemling Diag]   [' + i + ']', el.tagName + '.' + el.className, '=', JSON.stringify(el.textContent.trim().substring(0, 80)));
        });
      }

      // ── Strategy 0: Direct id attribute ──
      if (!id) {
        const elId = snippet.getAttribute('id');
        if (elId) {
          const res = checkString(elId);
          if (res) id = res;
        }
      }

      // ── Strategy 1: Inner <a href="/app/..."> ──
      if (!id) {
        const innerLink = snippet.querySelector('a[href*="/app/"]');
        if (innerLink) {
          const hrefMatch = innerLink.getAttribute('href').match(/[/]app[/](?:c[/])?([^/?#]+)/);
          if (hrefMatch) id = hrefMatch[1];
        }
      }

      // ── Strategy 2: jslog with /app/ route ──
      if (!id) {
        try {
          const allJslogs = snippet.querySelectorAll('[jslog]');
          for (const el of allJslogs) {
            const jslogVal = el.getAttribute('jslog');
            const routeMatch = jslogVal.match(/[/]app[/](?:c[/])?([a-zA-Z0-9_-]{8,})/);
            if (routeMatch) { id = routeMatch[1]; break; }
          }
        } catch(e) {}
      }

      // ── Strategy 3: Own __ngContext__ ──
      if (!id && snippet.__ngContext__) {
        id = findConvId(snippet.__ngContext__);
      }

      // ── Strategy 4-6: ng APIs ──
      if (!id && window.ng) {
        try { const c = window.ng.getComponent(snippet); if (c) id = findConvId(c); } catch(e) {}
      }
      if (!id && window.ng) {
        try { const c = window.ng.getContext(snippet); if (c) id = findConvId(c); } catch(e) {}
      }
      if (!id && window.ng) {
        try { const c = window.ng.getOwningComponent(snippet); if (c) id = findConvId(c); } catch(e) {}
      }

      // ── Strategy 7: Walk up DOM tree (max 3 levels) ──
      if (!id) {
        let parent = snippet.parentElement;
        for (let i = 0; i < 3 && parent && !id; i++) {
          if (parent.__ngContext__) {
            id = findConvId(parent.__ngContext__);
          }
          if (!id && window.ng) {
            try { const c = window.ng.getComponent(parent); if (c) id = findConvId(c); } catch(e) {}
          }
          parent = parent.parentElement;
        }
      }

      // ── Strategy 8: Check child elements for __ngContext__ ──
      if (!id) {
        const children = snippet.querySelectorAll('*');
        for (const child of children) {
          if (child.__ngContext__) {
            id = findConvId(child.__ngContext__);
            if (id) break;
          }
        }
      }

      // ── Strategy 9: Title matching from API responses ──
      if (!id && apiConvData.length > 0) {
        // Try multiple selectors to find the title text
        const titleSelectors = ['h2', '.chat-title', '[data-test-id="chat-title"]',
                                '.snippet-title', '.conversation-title', '.title', 'h3'];
        let titleText = null;
        for (const sel of titleSelectors) {
          const el = snippet.querySelector(sel);
          if (el && el.textContent.trim()) {
            titleText = el.textContent.trim();
            break;
          }
        }

        if (titleText) {
          // Exact match first
          let match = apiConvData.find(d => d.title === titleText);
          // Partial match: title contains or is contained
          if (!match) {
            match = apiConvData.find(d =>
              d.title.includes(titleText) || titleText.includes(d.title));
          }
          if (match) {
            id = match.id;
          }
        }

        // Also try matching by first line of text content
        if (!id) {
          const firstText = snippet.textContent.trim().split('\n')[0]?.trim();
          if (firstText && firstText.length > 3) {
            const match = apiConvData.find(d => d.title === firstText);
            if (match) {
              id = match.id;
            }
          }
        }
      }

      // ── Result ──
      if (id) {
        snippet.setAttribute('data-gemling-conv-id', id);
        console.log('[Gemling] Found conv ID for', snippet.tagName, index, ':', id);
      } else {
        let pseudoId = 'pending-' + Date.now() + '-' + index;
        snippet.setAttribute('data-gemling-conv-id', pseudoId);
        console.warn('[Gemling] Could not find conv ID for', snippet.tagName, index);
      }
      window.dispatchEvent(new CustomEvent('gemling-conv-id-ready'));
    });
  });

  // ── XHR Override ──
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._gemlingMethod = method;
    this._gemlingUrl = typeof url === 'string' ? url : '';
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(body) {
    // ── Response interception: extract conversation data from API responses ──
    if (this._gemlingUrl && this._gemlingUrl.includes('batchexecute')) {
      this.addEventListener('load', function() {
        try {
          extractConvDataFromResponse(this.responseText);
        } catch(e) {}
      });
    }

    // ── Request modification for bulk operations ──
    let modified = false;
    if (this._gemlingMethod?.toUpperCase() === 'POST' && this._gemlingUrl.includes('batchexecute')) {
      try {
        let bodyText = typeof body === 'string' ? body : '';
        const urlMatch = this._gemlingUrl.match(/source-path=([^&]+)/);
        const sourcePathRaw = urlMatch ? urlMatch[1] : '';

        if (this._gemlingUrl.includes('MUAZcd')) {
          const params = new URLSearchParams(bodyText);
          const fReq = params.get('f.req');
          const at = params.get('at');

          if (fReq && at) {
            const parsed = JSON.parse(fReq);
            const innerStr = parsed[0][0][1];
            const inner = JSON.parse(innerStr);
            const notebookPath = inner[2][7];
            let convId = inner[2][0];

            if (overrideConvId) {
              inner[2][0] = overrideConvId;
              parsed[0][0][1] = JSON.stringify(inner);
              params.set('f.req', JSON.stringify(parsed));
              bodyText = params.toString();
              body = bodyText;
              convId = overrideConvId;
              overrideConvId = null;
              modified = true;
            }

            window.dispatchEvent(new CustomEvent('gemling-api-captured', {
              detail: {
                url: this._gemlingUrl,
                sourcePathRaw: sourcePathRaw,
                at: at,
                notebookPath: notebookPath,
                convId: convId,
                fReqTemplate: innerStr,
                bodyTemplate: bodyText
              }
            }));
          }
        } else {
          if (overrideDeleteData) {
            const orig = overrideDeleteData.original;
            const target = overrideDeleteData.target;

            if (orig && target && typeof orig === 'string' && typeof target === 'string') {
              const origRaw = orig.startsWith('c_') ? orig.substring(2) : orig;
              const targetRaw = target.startsWith('c_') ? target.substring(2) : target;

              if (bodyText.includes(orig)) {
                bodyText = bodyText.replace(new RegExp(orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), target);
                modified = true;
              }
              if (bodyText.includes(origRaw)) {
                bodyText = bodyText.replace(new RegExp(origRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), targetRaw);
                modified = true;
              }

              if (modified) {
                body = bodyText;
                overrideDeleteData = null;
              }
            }
          }

          window.dispatchEvent(new CustomEvent('gemling-api-captured-raw', {
            detail: {
              url: this._gemlingUrl,
              sourcePathRaw: sourcePathRaw,
              bodyTemplate: bodyText
            }
          }));
        }
      } catch(e) {
        console.error('[Gemling] parse error:', e);
      }
    }
    if (modified) {
      return originalSend.call(this, body);
    } else {
      return originalSend.apply(this, arguments);
    }
  };

  // Universal image fetcher in MAIN world - has page's cookies & same-origin access
  window.addEventListener('gemling-main-fetch-image', (e) => {
    const url = e.detail.url;
    const eventName = 'gemling-main-image-ready';

    // For data: URLs, just extract directly
    if (url.startsWith('data:')) {
      const match = url.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        window.dispatchEvent(new CustomEvent(eventName, {
          detail: { url, status: 'success', base64: match[2], mimeType: match[1] }
        }));
      } else {
        window.dispatchEvent(new CustomEvent(eventName, {
          detail: { url, status: 'error', error: 'Invalid data URL' }
        }));
      }
      return;
    }

    // Try fetch first (works for blob:, https:, etc. — main world has full access)
    fetch(url, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          window.dispatchEvent(new CustomEvent(eventName, {
            detail: { url, status: 'success', base64, mimeType: blob.type || 'image/png' }
          }));
        };
        reader.onerror = () => {
          window.dispatchEvent(new CustomEvent(eventName, {
            detail: { url, status: 'error', error: 'FileReader error' }
          }));
        };
        reader.readAsDataURL(blob);
      })
      .catch(fetchErr => {
        // Fetch failed — try finding the image in DOM and drawing it to canvas
        console.warn('[Gemling Probe] Main world fetch failed for', url, fetchErr.message, '— trying canvas');
        try {
          const imgs = document.querySelectorAll('img');
          let targetImg = null;
          for (const img of imgs) {
            if (img.src === url || img.getAttribute('src') === url) {
              targetImg = img;
              break;
            }
          }
          if (targetImg && targetImg.complete && targetImg.naturalWidth > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = targetImg.naturalWidth;
            canvas.height = targetImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(targetImg, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            const base64 = dataUrl.split(',')[1];
            window.dispatchEvent(new CustomEvent(eventName, {
              detail: { url, status: 'success', base64, mimeType: 'image/png' }
            }));
            return;
          }
        } catch (canvasErr) {
          console.warn('[Gemling Probe] Canvas fallback also failed:', canvasErr.message);
        }
        window.dispatchEvent(new CustomEvent(eventName, {
          detail: { url, status: 'error', error: fetchErr.message }
        }));
      });
  });

  // Keep legacy event name for backward compatibility
  window.addEventListener('gemling-main-fetch-blob', (e) => {
    window.dispatchEvent(new CustomEvent('gemling-main-fetch-image', { detail: e.detail }));
    // Bridge old response event name
    const handler = (ev) => {
      if (ev.detail.url === e.detail.url) {
        window.removeEventListener('gemling-main-image-ready', handler);
        window.dispatchEvent(new CustomEvent('gemling-main-blob-ready', { detail: ev.detail }));
      }
    };
    window.addEventListener('gemling-main-image-ready', handler);
  });
})();
