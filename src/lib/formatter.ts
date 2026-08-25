/**
 * Code Formatter & Beautifier for Kodelab (HTML, CSS, JS)
 * Formats messy student code into clean, properly indented, readable code like Prettier.
 */

// Void HTML elements that cannot have child nodes and do not need closing tags
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype'
]);

/**
 * Format CSS code with clean indentation and spacing
 */
export function formatCss(css: string, baseIndent: number = 0): string {
  if (!css || !css.trim()) return '';

  const indentStr = '  ';
  let clean = css.replace(/\r\n/g, '\n').replace(/\t/g, '  ');
  
  let result = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let inComment = false;
  let buffer = '';

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const next = clean[i + 1];

    // Comments /* ... */
    if (!inString && char === '/' && next === '*') {
      inComment = true;
      buffer += '/*';
      i++;
      continue;
    }
    if (inComment) {
      buffer += char;
      if (char === '*' && next === '/') {
        buffer += '/';
        i++;
        inComment = false;
        const currentIndent = indentStr.repeat(baseIndent + depth);
        result += (result.endsWith('\n') ? '' : '\n') + currentIndent + buffer.trim() + '\n';
        buffer = '';
      }
      continue;
    }

    // Strings
    if ((char === '"' || char === "'") && clean[i - 1] !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (stringChar === char) {
        inString = false;
      }
      buffer += char;
      continue;
    }
    if (inString) {
      buffer += char;
      continue;
    }

    // Braces & Semicolons
    if (char === '{') {
      const selector = buffer.trim();
      const currentIndent = indentStr.repeat(baseIndent + depth);
      if (result && !result.endsWith('\n\n') && !result.endsWith('{\n')) {
        result += result.endsWith('\n') ? '\n' : '\n\n';
      }
      result += currentIndent + selector + ' {\n';
      depth++;
      buffer = '';
    } else if (char === '}') {
      const remaining = buffer.trim();
      if (remaining) {
        const propIndent = indentStr.repeat(baseIndent + depth);
        result += propIndent + formatCssDeclaration(remaining) + ';\n';
      }
      depth = Math.max(0, depth - 1);
      const closeIndent = indentStr.repeat(baseIndent + depth);
      result += closeIndent + '}\n';
      buffer = '';
    } else if (char === ';') {
      const decl = buffer.trim();
      if (decl) {
        const propIndent = indentStr.repeat(baseIndent + depth);
        result += propIndent + formatCssDeclaration(decl) + ';\n';
      }
      buffer = '';
    } else {
      buffer += char;
    }
  }

  const remaining = buffer.trim();
  if (remaining) {
    result += indentStr.repeat(baseIndent + depth) + remaining + '\n';
  }

  return result.trimEnd();
}

function formatCssDeclaration(decl: string): string {
  const colonIdx = decl.indexOf(':');
  if (colonIdx === -1) return decl.trim();
  const prop = decl.slice(0, colonIdx).trim();
  const val = decl.slice(colonIdx + 1).trim();
  return `${prop}: ${val}`;
}

/**
 * Format JavaScript code with clean indentation and formatting
 */
export function formatJs(js: string, baseIndent: number = 0): string {
  if (!js || !js.trim()) return '';

  const indentStr = '  ';
  const lines = js.replace(/\r\n/g, '\n').replace(/\t/g, '  ').split('\n');
  
  let depth = 0;
  const result: string[] = [];

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) {
      if (result.length > 0 && result[result.length - 1] !== '') {
        result.push('');
      }
      continue;
    }

    // Check if line starts with closing brace
    let leadingCloses = 0;
    for (let char of line) {
      if (char === '}' || char === ')' || char === ']') leadingCloses++;
      else if (char !== ' ' && char !== '\t') break;
    }

    if (leadingCloses > 0) {
      depth = Math.max(0, depth - leadingCloses);
    }

    const currentIndent = indentStr.repeat(baseIndent + depth);
    result.push(currentIndent + line);

    // Count open braces vs close braces in line (excluding strings/comments)
    let openCount = 0;
    let inStr = false;
    let sChar = '';
    
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if ((c === '"' || c === "'" || c === '`') && line[j - 1] !== '\\') {
        if (!inStr) { inStr = true; sChar = c; }
        else if (sChar === c) { inStr = false; }
      } else if (!inStr) {
        if (c === '{' || c === '(' || c === '[') openCount++;
        else if (c === '}' || c === ')' || c === ']') openCount--;
      }
    }

    if (openCount > 0) {
      depth += openCount;
    }
  }

  return result.join('\n').trimEnd();
}

/**
 * Tokenize and format HTML with embedded CSS (<style>) and JS (<script>)
 */
export function formatHtml(htmlStr: string): string {
  if (!htmlStr || !htmlStr.trim()) return '';

  const indentStr = '  ';
  let formatted = '';
  let depth = 0;
  
  const src = htmlStr.replace(/\r\n/g, '\n').replace(/\t/g, '  ');
  let pos = 0;

  while (pos < src.length) {
    // 1. Check for HTML comments: <!-- ... -->
    if (src.startsWith('<!--', pos)) {
      const endComment = src.indexOf('-->', pos);
      const commentEnd = endComment !== -1 ? endComment + 3 : src.length;
      const commentText = src.slice(pos, commentEnd).trim();
      
      const currentIndent = indentStr.repeat(depth);
      if (formatted && !formatted.endsWith('\n')) formatted += '\n';
      formatted += currentIndent + commentText + '\n';
      pos = commentEnd;
      continue;
    }

    // 2. Check for <!DOCTYPE ...>
    if (src.slice(pos, pos + 9).toLowerCase() === '<!doctype') {
      const endTag = src.indexOf('>', pos);
      const tagEnd = endTag !== -1 ? endTag + 1 : src.length;
      const docTypeStr = src.slice(pos, tagEnd).trim();
      
      formatted += docTypeStr + '\n';
      pos = tagEnd;
      continue;
    }

    // 3. Check for embedded <style> ... </style>
    const styleMatch = src.slice(pos).match(/^<style\b([^>]*)>/i);
    if (styleMatch) {
      const openTag = styleMatch[0];
      const endStyleIdx = src.toLowerCase().indexOf('</style>', pos + openTag.length);
      const currentIndent = indentStr.repeat(depth);
      
      if (formatted && !formatted.endsWith('\n')) formatted += '\n';
      formatted += currentIndent + openTag + '\n';
      
      if (endStyleIdx !== -1) {
        const rawCss = src.slice(pos + openTag.length, endStyleIdx);
        const formattedCss = formatCss(rawCss, depth + 1);
        if (formattedCss) {
          formatted += formattedCss + '\n';
        }
        formatted += currentIndent + '</style>\n';
        pos = endStyleIdx + 8;
      } else {
        pos += openTag.length;
      }
      continue;
    }

    // 4. Check for embedded <script> ... </script>
    const scriptMatch = src.slice(pos).match(/^<script\b([^>]*)>/i);
    if (scriptMatch) {
      const openTag = scriptMatch[0];
      const endScriptIdx = src.toLowerCase().indexOf('</script>', pos + openTag.length);
      const currentIndent = indentStr.repeat(depth);
      
      if (formatted && !formatted.endsWith('\n')) formatted += '\n';
      formatted += currentIndent + openTag + '\n';
      
      if (endScriptIdx !== -1) {
        const rawJs = src.slice(pos + openTag.length, endScriptIdx);
        const formattedJs = formatJs(rawJs, depth + 1);
        if (formattedJs) {
          formatted += formattedJs + '\n';
        }
        formatted += currentIndent + '</script>\n';
        pos = endScriptIdx + 9;
      } else {
        pos += openTag.length;
      }
      continue;
    }

    // 5. Check for Closing Tag </tag>
    if (src.startsWith('</', pos)) {
      const endTag = src.indexOf('>', pos);
      const tagEnd = endTag !== -1 ? endTag + 1 : src.length;
      const tagContent = src.slice(pos, tagEnd);
      
      depth = Math.max(0, depth - 1);
      const currentIndent = indentStr.repeat(depth);
      
      if (formatted && !formatted.endsWith('\n')) formatted += '\n';
      formatted += currentIndent + tagContent + '\n';
      pos = tagEnd;
      continue;
    }

    // 6. Check for Opening Tag <tag ...>
    if (src[pos] === '<' && /[a-zA-Z!]/.test(src[pos + 1] || '')) {
      const endTag = src.indexOf('>', pos);
      const tagEnd = endTag !== -1 ? endTag + 1 : src.length;
      const tagContent = src.slice(pos, tagEnd);
      
      // Extract tag name
      const tagNameMatch = tagContent.match(/^<([a-zA-Z0-9-]+)/);
      const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';
      const isSelfClosing = tagContent.endsWith('/>') || VOID_ELEMENTS.has(tagName);
      
      const currentIndent = indentStr.repeat(depth);
      if (formatted && !formatted.endsWith('\n')) formatted += '\n';
      formatted += currentIndent + cleanTagAttributes(tagContent);

      if (isSelfClosing) {
        formatted += '\n';
      } else {
        // Look ahead to see if closing tag is immediately next with short text
        const afterTag = src.slice(tagEnd);
        const nextCloseMatch = afterTag.match(new RegExp(`^([^<\\n]{1,80})<\\/${tagName}>`, 'i'));
        if (nextCloseMatch) {
          const text = nextCloseMatch[1].trim();
          formatted += (text ? text : '') + `</${tagName}>\n`;
          pos = tagEnd + nextCloseMatch[0].length;
          continue;
        } else {
          formatted += '\n';
          depth++;
        }
      }
      pos = tagEnd;
      continue;
    }

    // 7. Text Content between tags
    const nextTagIdx = src.indexOf('<', pos);
    const textEnd = nextTagIdx !== -1 ? nextTagIdx : src.length;
    const rawText = src.slice(pos, textEnd).trim();
    
    if (rawText) {
      const currentIndent = indentStr.repeat(depth);
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (formatted && !formatted.endsWith('\n')) formatted += '\n';
        formatted += currentIndent + line + '\n';
      }
    }
    pos = textEnd;
  }

  return formatted.trimEnd() + '\n';
}

function cleanTagAttributes(tagStr: string): string {
  return tagStr.replace(/\s+/g, ' ').replace(/\s+>/g, '>').replace(/\s+\/>/g, ' />');
}

/**
 * Universal code formatter dispatcher based on language
 */
export function formatCode(code: string, language: 'html' | 'css' | 'js' | 'image' | string): string {
  if (!code || !code.trim()) return code;

  try {
    const lang = language.toLowerCase();
    if (lang === 'html' || lang.endsWith('.html') || lang.endsWith('.htm')) {
      return formatHtml(code);
    }
    if (lang === 'css' || lang.endsWith('.css')) {
      return formatCss(code);
    }
    if (lang === 'js' || lang === 'javascript' || lang.endsWith('.js')) {
      return formatJs(code);
    }
    return code;
  } catch (err) {
    console.warn('Code format error:', err);
    return code;
  }
}
