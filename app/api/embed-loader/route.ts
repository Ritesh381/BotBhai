import { NextRequest } from "next/server";

export const runtime = "edge";

// Serve the embeddable widget loader script.
// The loader creates a sandboxed iframe that hosts the full chat UI.
export function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://botbhai.app";

  const js = `
(function() {
  'use strict';
  var cfg = window.BotBhai || {};
  var script = document.currentScript ||
    document.querySelector('script[data-bot-id]');
  if (!script) return;

  var botId = cfg.botId || script.getAttribute('data-bot-id');
  var key   = cfg.key   || script.getAttribute('data-key') || '';
  var pos   = cfg.position || script.getAttribute('data-position') || 'bottom-right';
  var open  = cfg.openOnLoad === true;

  if (!botId) return;

  var ORIGIN = '${appUrl}';
  var isOpen = open;

  // ── Create launcher button ──
  var btn = document.createElement('button');
  btn.id = 'botbhai-launcher';
  btn.setAttribute('aria-label', 'Open chat');
  btn.style.cssText = [
    'position:fixed', pos.includes('right') ? 'right:20px' : 'left:20px',
    'bottom:20px', 'width:54px', 'height:54px', 'border-radius:50%',
    'border:none', 'cursor:pointer', 'z-index:2147483646',
    'box-shadow:0 4px 16px rgba(0,0,0,.25)', 'font-size:24px',
    'background:#4f46e5', 'color:#fff', 'display:flex',
    'align-items:center', 'justify-content:center',
  ].join(';');
  btn.textContent = '💬';
  document.body.appendChild(btn);

  // ── Create iframe container ──
  var container = document.createElement('div');
  container.id = 'botbhai-container';
  container.style.cssText = [
    'position:fixed', pos.includes('right') ? 'right:20px' : 'left:20px',
    'bottom:84px', 'width:370px', 'height:580px', 'border-radius:16px',
    'overflow:hidden', 'z-index:2147483645',
    'box-shadow:0 8px 32px rgba(0,0,0,.2)', 'display:none',
    'border:1px solid rgba(0,0,0,.08)',
  ].join(';');

  var iframe = document.createElement('iframe');
  iframe.id = 'botbhai-iframe';
  iframe.src = ORIGIN + '/embed/' + botId + '?key=' + encodeURIComponent(key);
  iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups');
  iframe.style.cssText = 'width:100%;height:100%;border:none;display:block';
  iframe.allow = 'clipboard-write';
  container.appendChild(iframe);
  document.body.appendChild(container);

  function toggle() {
    isOpen = !isOpen;
    container.style.display = isOpen ? 'block' : 'none';
    btn.textContent = isOpen ? '✕' : '💬';
    btn.setAttribute('aria-label', isOpen ? 'Close chat' : 'Open chat');
  }

  btn.addEventListener('click', toggle);

  // postMessage bridge (explicit origin check)
  window.addEventListener('message', function(e) {
    if (e.origin !== ORIGIN) return;
    if (e.data && e.data.type === 'botbhai:resize') {
      container.style.height = (e.data.height || 580) + 'px';
    }
    if (e.data && e.data.type === 'botbhai:close') toggle();
  });

  if (open) toggle();
})();
`.trim();

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
