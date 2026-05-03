(function() {
  // 拦截 XHR 以捕获 MUAZcd (添加到笔记本) 和其他 API 请求 (如删除)
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._gemlingMethod = method;
    this._gemlingUrl = typeof url === 'string' ? url : '';
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (this._gemlingMethod?.toUpperCase() === 'POST' && this._gemlingUrl.includes('batchexecute')) {
      try {
        const bodyText = typeof body === 'string' ? body : '';
        const urlMatch = this._gemlingUrl.match(/source-path=([^&]+)/);
        const sourcePathRaw = urlMatch ? urlMatch[1] : '';

        if (this._gemlingUrl.includes('MUAZcd')) {
          const fReq = new URLSearchParams(bodyText).get('f.req');
          const at = new URLSearchParams(bodyText).get('at');

          if (fReq && at) {
            const parsed = JSON.parse(fReq);
            const innerStr = parsed[0][0][1];
            const inner = JSON.parse(innerStr);
            const notebookPath = inner[2][7];
            const convId = inner[2][0];

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
          // 其他 batchexecute 请求，原样抛出，用于未知的 API (如删除)
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
    return originalSend.apply(this, arguments);
  };
})();
