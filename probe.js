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
    if (this._gemlingMethod?.toUpperCase() === 'POST' && this._gemlingUrl.includes('batchexecute')) {
      try {
        const bodyText = typeof body === 'string' ? body : '';
        const params = new URLSearchParams(bodyText);
        const fReq = params.get('f.req');
        const at = params.get('at');

        if (fReq && at) {
          const parsed = JSON.parse(fReq);
          // 预期格式为 [ [ [ "rpcId", "innerPayloadString", ... ] ] ]
          if (parsed && parsed[0] && parsed[0][0]) {
            const rpcId = parsed[0][0][0];
            const innerStr = parsed[0][0][1];

            // 提取 source-path 原始值（不解码）
            const urlMatch = this._gemlingUrl.match(/source-path=([^&]+)/);
            const sourcePathRaw = urlMatch ? urlMatch[1] : '';

            window.dispatchEvent(new CustomEvent('gemling-api-captured', {
              detail: {
                url: this._gemlingUrl,
                rpcId: rpcId,
                sourcePathRaw: sourcePathRaw,
                at: at,
                fReqTemplate: innerStr,
                bodyTemplate: bodyText
              }
            }));
          }
        }
      } catch(e) {
        console.error('[Gemling] parse error:', e);
      }
    }
    return originalSend.apply(this, arguments);
  };
})();
