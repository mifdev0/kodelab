'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { store } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { UserProject } from '@/types';
import { RefreshCw, Code2, ExternalLink, Globe } from 'lucide-react';

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function transformHtmlLinks(rawHtml: string): string {
  if (!rawHtml) return '';

  return rawHtml.replace(/<a\b([^>]*)>/gi, (match, attrs) => {
    const hrefMatch = attrs.match(/href=(?:"([^"]*)"|'([^']*)'|([^>\s]+))/i);
    if (!hrefMatch) return match;

    const rawHref = (hrefMatch[1] || hrefMatch[2] || hrefMatch[3] || '').trim();
    if (!rawHref || rawHref === '#' || rawHref.startsWith('javascript:')) {
      return match;
    }

    if (rawHref.startsWith('#')) {
      return match;
    }

    const isExternal = rawHref.startsWith('http://') || 
                       rawHref.startsWith('https://') || 
                       rawHref.startsWith('//') || 
                       rawHref.startsWith('mailto:') || 
                       rawHref.startsWith('tel:') || 
                       rawHref.startsWith('www.') || 
                       /^[a-zA-Z0-9-]+\.(com|org|net|id|io|edu|gov|co|app|dev)(\/|$|\?)/i.test(rawHref);

    if (isExternal) {
      let finalUrl = rawHref;
      if (!rawHref.startsWith('http://') && !rawHref.startsWith('https://') && !rawHref.startsWith('//') && !rawHref.startsWith('mailto:') && !rawHref.startsWith('tel:')) {
        finalUrl = 'https://' + rawHref;
      }
      const cleanedAttrs = attrs
        .replace(/href=(?:"[^"]*"|'[^']*'|[^>\s]+)/i, '')
        .replace(/target=(?:"[^"]*"|'[^']*'|[^>\s]+)/i, '')
        .trim();
      return `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" ${cleanedAttrs}>`;
    }

    const cleanFileName = rawHref.replace(/^(\.\/|\/)/, '');
    const cleanedAttrs = attrs
      .replace(/href=(?:"[^"]*"|'[^']*'|[^>\s]+)/i, '')
      .replace(/target=(?:"[^"]*"|'[^']*'|[^>\s]+)/i, '')
      .trim();

    return `<a href="javascript:void(0)" data-kodelab-file="${cleanFileName}" onclick="try{window.parent.postMessage({type:'NAVIGATE_LOCAL_FILE',fileName:'${cleanFileName}'},'*');}catch(e){}return false;" ${cleanedAttrs}>`;
  });
}

function LivePreviewContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('project');
  const { user } = useAuth();

  const [project, setProject] = useState<UserProject | null>(null);
  const [htmlCode, setHtmlCode] = useState('');
  const [cssCode, setCssCode] = useState('');
  const [jsCode, setJsCode] = useState('');
  const [assets, setAssets] = useState<{ [name: string]: string }>({});
  const [htmlFiles, setHtmlFiles] = useState<{ [name: string]: string }>({});
  const [currentHtmlFile, setCurrentHtmlFile] = useState<string>('index.html');
  const [renderKey, setRenderKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Determine if viewer can access source code in editor (only author or teacher)
  const isOwner = Boolean(user && project && (user.id === project.student_id));
  const isTeacher = user?.role === 'teacher';
  const canAccessSourceCode = isOwner || isTeacher;

  // Load project by ID or listen to live broadcast
  useEffect(() => {
    if (projectIdParam) {
      const loadProject = () => {
        const proj = store.getUserProject(projectIdParam);
        if (proj) {
          setProject(proj);
          const files = proj.files || [];
          
          const htmlMap: { [name: string]: string } = {};
          let indexContent = '';
          files.forEach(f => {
            if (f.language === 'html' || f.name.endsWith('.html')) {
              htmlMap[f.name] = f.content;
              if (f.name.toLowerCase() === 'index.html' || !indexContent) {
                indexContent = f.content;
              }
            }
          });

          const allCss = files
            .filter(f => f.language === 'css' || f.name.endsWith('.css'))
            .map(f => f.content)
            .join('\n\n');

          const allJs = files
            .filter(f => f.language === 'js' || f.name.endsWith('.js'))
            .map(f => f.content)
            .join('\n\n');

          const assetsMap: { [name: string]: string } = {};
          files.forEach(f => {
            if (f.language === 'image' || f.name.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i)) {
              assetsMap[f.name] = f.content;
            }
          });

          setHtmlFiles(htmlMap);
          setHtmlCode(indexContent);
          setCssCode(allCss);
          setJsCode(allJs);
          setAssets(assetsMap);
        }
      };

      loadProject();
      store.syncWithSupabase().then(() => loadProject());
      return;
    }

    // 1. Initial load from localStorage (editor live broadcast)
    try {
      const stored = localStorage.getItem('kodelab_preview_payload');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.projectId) {
          const proj = store.getUserProject(parsed.projectId);
          if (proj) setProject(proj);
        }
        if (parsed.html !== undefined) setHtmlCode(parsed.html || '');
        if (parsed.css !== undefined) setCssCode(parsed.css || '');
        if (parsed.js !== undefined) setJsCode(parsed.js || '');
        if (parsed.assets) setAssets(parsed.assets || {});
        if (parsed.htmlFiles) setHtmlFiles(parsed.htmlFiles);
      } else {
        // Fallback: If no preview payload in localStorage, load user's most recent project
        const userProjects = store.getUserProjects();
        if (userProjects && userProjects.length > 0) {
          const defaultProj = userProjects[0];
          setProject(defaultProj);
          const files = defaultProj.files || [];
          const htmlMap: { [name: string]: string } = {};
          let indexContent = '';
          files.forEach(f => {
            if (f.language === 'html' || f.name.endsWith('.html')) {
              htmlMap[f.name] = f.content;
              if (f.name.toLowerCase() === 'index.html' || !indexContent) {
                indexContent = f.content;
              }
            }
          });
          setHtmlFiles(htmlMap);
          setHtmlCode(indexContent);
          setCssCode(files.filter(f => f.language === 'css' || f.name.endsWith('.css')).map(f => f.content).join('\n\n'));
          setJsCode(files.filter(f => f.language === 'js' || f.name.endsWith('.js')).map(f => f.content).join('\n\n'));
        }
      }
    } catch (e) {
      console.error('Failed to load initial preview payload', e);
    }

    // 2. Real-time BroadcastChannel listener
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('kodelab_live_preview');
      channel.onmessage = (event) => {
        if (event.data) {
          if (event.data.projectId) {
            const proj = store.getUserProject(event.data.projectId);
            if (proj) setProject(proj);
          }
          if (event.data.html !== undefined) setHtmlCode(event.data.html || '');
          if (event.data.css !== undefined) setCssCode(event.data.css || '');
          if (event.data.js !== undefined) setJsCode(event.data.js || '');
          if (event.data.assets) setAssets(event.data.assets);
          if (event.data.htmlFiles) setHtmlFiles(event.data.htmlFiles);
        }
      };
    } catch (e) {
      console.error('BroadcastChannel not supported', e);
    }

    // 3. Storage event listener for cross-tab updates
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'kodelab_preview_payload' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.projectId) {
            const proj = store.getUserProject(parsed.projectId);
            if (proj) setProject(proj);
          }
          if (parsed.html !== undefined) setHtmlCode(parsed.html || '');
          if (parsed.css !== undefined) setCssCode(parsed.css || '');
          if (parsed.js !== undefined) setJsCode(parsed.js || '');
          if (parsed.assets) setAssets(parsed.assets || {});
          if (parsed.htmlFiles) setHtmlFiles(parsed.htmlFiles);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [projectIdParam]);

  // Listen to postMessage from iframe for relative file navigation and external links
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      if (event.data.type === 'NAVIGATE_LOCAL_FILE' && event.data.fileName) {
        const target = event.data.fileName.trim().toLowerCase();
        // Look up file in htmlFiles
        const matchedKey = Object.keys(htmlFiles).find(k => {
          const lk = k.toLowerCase();
          return lk === target || lk === `${target}.html` || lk.replace(/\.html$/, '') === target;
        });

        if (matchedKey && htmlFiles[matchedKey] !== undefined) {
          setCurrentHtmlFile(matchedKey);
          setHtmlCode(htmlFiles[matchedKey]);
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
  }, [htmlFiles]);

  // Combine HTML + CSS + JS into single sandboxed document
  const combinedSrcDoc = useMemo(() => {
    let content = htmlCode || '';
    let styleContent = cssCode || '';

    // Automatically resolve uploaded assets
    if (assets && Object.keys(assets).length > 0) {
      Object.entries(assets).forEach(([name, dataUrl]) => {
        const escaped = escapeRegExp(name);
        const regexSrc = new RegExp(`src=['"](?:\\./)?${escaped}['"]`, 'gi');
        content = content.replace(regexSrc, `src="${dataUrl}"`);

        const regexUrl = new RegExp(`url\\(['"]?(?:\\./)?${escaped}['"]?\\)`, 'gi');
        styleContent = styleContent.replace(regexUrl, `url('${dataUrl}')`);
        content = content.replace(regexUrl, `url('${dataUrl}')`);
      });
    }

    // Transform all anchor tags: local links use postMessage, external links use target="_blank"
    content = transformHtmlLinks(content);

    if (!content.trim() && !styleContent.trim() && !jsCode.trim()) {
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
      background: #ffffff;
      color: #64748b;
      text-align: center;
    }
    .icon { font-size: 44px; margin-bottom: 12px; }
    h2 { font-size: 20px; color: #0f172a; margin: 0 0 6px 0; }
    p { font-size: 14px; margin: 0; }
  </style>
</head>
<body>
  <div class="icon">💻</div>
  <h2>${project ? project.name : 'Live Server Ready'}</h2>
  <p>${project ? 'This project has no HTML content yet.' : 'Start writing HTML, CSS, or JS in your Kodelab editor...'}</p>
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

    document.addEventListener('DOMContentLoaded', function() {
      try {
        ${jsCode}
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
  }, [htmlCode, cssCode, jsCode, assets, project]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRenderKey(prev => prev + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  return (
    <main className="w-screen h-screen m-0 p-0 overflow-hidden bg-white flex flex-col relative">
      {/* Top Floating Control Bar (when viewing project directly or standalone) */}
      {project && (
        <div className="h-11 bg-slate-900 text-white px-4 flex items-center justify-between border-b border-slate-800 shrink-0 select-none z-10 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-xs tracking-wide">
              {project.name}
            </span>
            <span className="text-[11px] text-slate-400">
              by {project.student?.full_name || 'Student'} ({project.student?.class_name || '7A'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className={`p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
              title="Refresh Preview"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {canAccessSourceCode ? (
              <a
                href={`/projects/${project.id}`}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-primary text-white hover:bg-primary-hover rounded-lg text-xs font-bold transition-colors"
                title={isOwner ? "Open and edit in Code Editor" : "Inspect student code (Read-Only)"}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{isOwner ? 'Edit Code' : 'Inspect Code'}</span>
              </a>
            ) : (
              <span className="text-[11px] font-bold text-slate-400 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700/60 flex items-center gap-1.5 shadow-2xs">
                <Globe className="w-3 h-3 text-emerald-400" />
                <span>Live Web View</span>
              </span>
            )}
          </div>
        </div>
      )}

      <iframe
        key={renderKey}
        title="Live Server Output"
        srcDoc={combinedSrcDoc}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-same-origin"
        className="w-full flex-1 border-0 bg-white m-0 p-0 block"
      />
    </main>
  );
}

export default function StandaloneLivePreviewPage() {
  return (
    <Suspense fallback={<div className="w-screen h-screen flex items-center justify-center text-xs font-semibold text-slate-500">Loading Preview...</div>}>
      <LivePreviewContent />
    </Suspense>
  );
}
