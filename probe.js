(function() {
  // 拦截 XHR 以捕获 MUAZcd (添加到笔记本) 请求
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._gemlingMethod = method;
    this._gemlingUrl = typeof url === 'string' ? url : '';
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (this._gemlingMethod?.toUpperCase() === 'POST' && this._gemlingUrl.includes('MUAZcd')) {
      try {
        const bodyText = typeof body === 'string' ? body : '';
        const fReq = new URLSearchParams(bodyText).get('f.req');
        const at = new URLSearchParams(bodyText).get('at');

        if (fReq && at) {
          const parsed = JSON.parse(fReq);
          const innerStr = parsed[0][0][1]; // "[null,[...],["conv_id",...,null,null,null,"notebooks/...",...]]"
          const inner = JSON.parse(innerStr);
          const notebookPath = inner[2][7]; // "notebooks/xxxx"
          const convId = inner[2][0]; // "c_xxxx"

          // 提取 source-path 原始值（不解码）
          const urlMatch = this._gemlingUrl.match(/source-path=([^&]+)/);
          const sourcePathRaw = urlMatch ? urlMatch[1] : '';

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
      } catch(e) {
        console.error('[Gemling] parse error:', e);
      }
    }
    return originalSend.apply(this, arguments);
  };
})();
