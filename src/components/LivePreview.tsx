'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Radio, X } from 'lucide-react';

interface LivePreviewProps {
  htmlCode: string;
  cssCode: string;
  jsCode: string;
  assets?: { [fileName: string]: string }; // Name -> Data URL
  onNavigateFile?: (fileName: string) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onClose?: () => void;
  onGoLive?: () => void;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function LivePreview({
  htmlCode,
  cssCode,
  jsCode,
  assets = {},
  onNavigateFile,
  isFullscreen = false,
  onToggleFullscreen,
  onClose,
  onGoLive,
}: LivePreviewProps) {
  const [debouncedHtml, setDebouncedHtml] = useState(htmlCode);
  const [debouncedCss, setDebouncedCss] = useState(cssCode);
  const [debouncedJs, setDebouncedJs] = useState(jsCode);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  // Listen to postMessage from iframe to open external links cleanly in parent window or navigate local files
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      if (event.data.type === 'NAVIGATE_LOCAL_FILE' && event.data.fileName) {
        if (onNavigateFile) {
          onNavigateFile(event.data.fileName);
        }
      } else if (event.data.type === 'OPEN_EXTERNAL_URL' && event.data.url) {
        let url = event.data.url.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('//') && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
          url = 'https://' + url;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onNavigateFile]);

  // Debounce code updates (350ms) per PRD performance requirement
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedHtml(htmlCode);
      setDebouncedCss(cssCode);
      setDebouncedJs(jsCode);
    }, 350);

    return () => clearTimeout(handler);
  }, [htmlCode, cssCode, jsCode]);

  // Combine HTML + CSS + JS into single sandboxed document
  const combinedSrcDoc = useMemo(() => {
    let content = debouncedHtml || '';
    let styleContent = debouncedCss || '';

    // Automatically resolve uploaded assets in HTML & CSS
    if (assets && Object.keys(assets).length > 0) {
      Object.entries(assets).forEach(([name, dataUrl]) => {
        const escaped = escapeRegExp(name);
        // Map <img src="image.png"> or <img src="./image.png">
        const regexSrc = new RegExp(`src=['"](?:\\./)?${escaped}['"]`, 'gi');
        content = content.replace(regexSrc, `src="${dataUrl}"`);

        // Map CSS background url('image.png')
        const regexUrl = new RegExp(`url\\(['"]?(?:\\./)?${escaped}['"]?\\)`, 'gi');
        styleContent = styleContent.replace(regexUrl, `url('${dataUrl}')`);
        content = content.replace(regexUrl, `url('${dataUrl}')`);
      });
    }

    // Default pleasant background and fallback if completely empty
    if (!content.trim() && !styleContent.trim() && !debouncedJs.trim()) {
      return `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      padding: 0;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f9f9f9;
      color: #64748b;
      text-align: center;
    }
    .placeholder-icon {
      font-size: 40px;
      margin-bottom: 12px;
    }
    h2 {
      font-size: 18px;
      margin: 0 0 6px 0;
      color: #1a1c1c;
    }
    p {
      font-size: 14px;
      margin: 0;
      color: #6d7a77;
    }
  </style>
</head>
<body>
  <div class="placeholder-icon">💻</div>
  <h2>Live Preview</h2>
  <p>Type HTML code on the left to see your live preview here.</p>
</body>
</html>`;
    }

    const headInjection = `
  <style>
    /* Default font and baseline reset */
    html, body {
      font-family: system-ui, -apple-system, 'Public Sans', sans-serif;
    }
    ${styleContent}
  </style>
  <script>
    // Suppress unhandled preview errors silently in sandbox
    window.onerror = function() { return true; };
    window.addEventListener('unhandledrejection', function(e) { e.preventDefault(); });

    // Global Link Click Handler: delegates to parent window for local page navigation or external links
    function handleLinkClick(e) {
      var target = e.target;
      while (target && target.tagName !== 'A') {
        target = target.parentElement;
      }
      if (target && target.tagName === 'A') {
        var rawHref = target.getAttribute('href');
        if (rawHref) {
          var href = rawHref.trim();
          if (!href || href === '#' || href.startsWith('javascript:')) return;

          // Prevent default browser navigation to /lain.html 404
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();

          // 1. In-page anchor link (e.g. #about)
          if (href.startsWith('#')) {
            var el = document.getElementById(href.slice(1)) || document.querySelector('[name="' + href.slice(1) + '"]');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
            return;
          }

          // 2. Public / External web links: e.g. "https://google.com", "http://...", "www.youtube.com", "instagram.com"
          var isExternal = href.startsWith('http://') || 
                           href.startsWith('https://') || 
                           href.startsWith('//') || 
                           href.startsWith('mailto:') || 
                           href.startsWith('tel:') || 
                           href.startsWith('www.') || 
                           /^[a-zA-Z0-9-]+\.(com|org|net|id|io|edu|gov|co|app|dev)(\/|$|\?)/i.test(href);

          if (isExternal) {
            var finalUrl = href;
            if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('//') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
              finalUrl = 'https://' + href;
            }
            try {
              window.parent.postMessage({ type: 'OPEN_EXTERNAL_URL', url: finalUrl }, '*');
            } catch(err) {
              window.open(finalUrl, '_blank', 'noopener,noreferrer');
            }
            return;
          }

          // 3. Relative project file link: e.g. "lain.html", "./lain.html", "about.html"
          var cleanFileName = href.replace(/^(\.\/|\/)/, '');
          try {
            window.parent.postMessage({ type: 'NAVIGATE_LOCAL_FILE', fileName: cleanFileName }, '*');
          } catch(err) {}
        }
      }
    }
    document.addEventListener('click', handleLinkClick, true);
    window.addEventListener('click', handleLinkClick, true);
    document.addEventListener('auxclick', handleLinkClick, true);

    // Safely execute student JavaScript on load inside head
    document.addEventListener('DOMContentLoaded', function() {
      try {
        ${debouncedJs}
      } catch(err) {
        console.warn("Preview JS Notice:", err);
      }
    });
  </script>`;

    if (content.toLowerCase().includes('<head>')) {
      return content.replace(/<head>/i, `<head>${headInjection}`);
    } else if (content.toLowerCase().includes('</head>')) {
      return content.replace(/<\/head>/i, `${headInjection}</head>`);
    } else if (content.toLowerCase().includes('<html')) {
      return content.replace(/<html[^>]*>/i, `$&<head>${headInjection}</head>`);
    } else {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${headInjection}
</head>
<body>
${content}
</body>
</html>`;
    }
  }, [debouncedHtml, debouncedCss, debouncedJs, assets]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setRenderKey(prev => prev + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleOpenGoLiveTab = () => {
    if (onGoLive) {
      onGoLive();
    } else {
      window.open('/preview', 'kodelab_live_preview_tab');
    }
  };

  return (
    <section className="flex flex-col w-full h-full bg-surface-container-lowest dark:bg-[#181a1f] shadow-sm rounded-xl overflow-hidden relative border border-outline-variant/30 dark:border-gray-800 transition-colors">
      {/* Header bar */}
      <header className="h-12 bg-surface-container-low dark:bg-[#14161a] flex items-center justify-between px-3 border-b border-surface-container dark:border-gray-800 shrink-0">
        {/* macOS style window dots */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>

        {/* Central badge */}
        <div className="flex items-center bg-surface-container-lowest dark:bg-gray-900 px-3.5 py-1 rounded-full shadow-sm text-[11px] font-bold text-on-surface-variant dark:text-gray-300 gap-1.5 tracking-wide uppercase border border-surface-container/50 dark:border-gray-800">
          <span className="w-2 h-2 rounded-full bg-primary inline-block animate-pulse" />
          Live Preview
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Go Live / Open in Live Sync Tab */}
          <button
            onClick={handleOpenGoLiveTab}
            className="flex items-center gap-1 px-2.5 h-7 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold transition-colors"
            title="Go Live (Open Auto-Sync Preview in New Tab)"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
            <span className="hidden sm:inline">Go Live</span>
          </button>

          <button
            onClick={handleManualRefresh}
            className="w-7 h-7 flex items-center justify-center text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white hover:bg-surface-container dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh Preview"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          </button>

          {/* Close side preview button */}
          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-on-surface-variant dark:text-gray-400 hover:text-error dark:hover:text-red-400 hover:bg-error-container/20 rounded-lg transition-colors"
              title="Close Preview (Full Editor Width)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Sandboxed iframe canvas */}
      <div className="flex-1 bg-surface-bright dark:bg-gray-950 relative overflow-hidden flex items-stretch">
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        <iframe
          key={renderKey}
          title="Code Output Preview"
          srcDoc={combinedSrcDoc}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-same-origin"
          className="w-full h-full border-0 relative z-10 bg-white"
        />
      </div>
    </section>
  );
}
