'use client';

import React, { useEffect, useRef } from 'react';
import { EditorState, Extension } from '@codemirror/state';
import { 
  EditorView, 
  keymap, 
  lineNumbers, 
  highlightActiveLineGutter, 
  highlightActiveLine,
  ViewPlugin, 
  Decoration, 
  DecorationSet, 
  ViewUpdate, 
  WidgetType 
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo } from '@codemirror/commands';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { linter, lintGutter, Diagnostic } from '@codemirror/lint';
import { EditorTab } from '@/types';
import { useTheme } from '@/lib/theme-context';

// VS Code & Kinetic Light Syntax Highlighting
export const kineticLightHighlight = HighlightStyle.define([
  { tag: t.tagName, color: '#00685f', fontWeight: 'bold' }, // HTML tags: Teal
  { tag: t.angleBracket, color: '#0284c7', fontWeight: 'bold' }, // <, >, </, />
  { tag: t.attributeName, color: '#7c3aed' }, // class, id, src, href: Purple
  { tag: t.attributeValue, color: '#15803d' }, // "value": Green
  { tag: t.string, color: '#15803d' },
  { tag: t.comment, color: '#94a3b8', fontStyle: 'italic' },
  { tag: t.keyword, color: '#9333ea', fontWeight: '600' }, // function, let, var, const, return
  { tag: t.number, color: '#ea580c' },
  { tag: t.bool, color: '#ea580c' },
  { tag: t.propertyName, color: '#0284c7' }, // CSS properties
  { tag: t.className, color: '#4338ca', fontWeight: '600' }, // CSS .class
  { tag: t.operator, color: '#0d9488' },
  { tag: t.punctuation, color: '#64748b' },
  { tag: t.function(t.variableName), color: '#2563eb' },
  { tag: t.variableName, color: '#1a1c1c' },
  { tag: t.definition(t.variableName), color: '#00685f' },
]);

// VS Code Dark & One Dark Syntax Highlighting
export const kineticDarkHighlight = HighlightStyle.define([
  { tag: t.tagName, color: '#4ec9b0', fontWeight: 'bold' }, // HTML tags: Emerald/Teal
  { tag: t.angleBracket, color: '#808080', fontWeight: 'bold' }, // <, >: Grey
  { tag: t.attributeName, color: '#9cdcfe' }, // attributes: Light Sky Blue
  { tag: t.attributeValue, color: '#ce9178' }, // strings: Warm Orange
  { tag: t.string, color: '#ce9178' },
  { tag: t.comment, color: '#6a9955', fontStyle: 'italic' }, // comments: Green
  { tag: t.keyword, color: '#c586c0', fontWeight: '600' }, // keywords: Violet
  { tag: t.number, color: '#b5cea8' }, // numbers: Sage Green
  { tag: t.bool, color: '#569cd6' },
  { tag: t.propertyName, color: '#9cdcfe' }, // CSS property: Light Blue
  { tag: t.className, color: '#dcdcaa', fontWeight: '600' }, // CSS class: Soft Gold
  { tag: t.operator, color: '#d4d4d4' },
  { tag: t.punctuation, color: '#ffd700' },
  { tag: t.function(t.variableName), color: '#dcdcaa' },
  { tag: t.variableName, color: '#9cdcfe' },
  { tag: t.definition(t.variableName), color: '#4fc1ff' },
]);

// Light Theme Editor Styles
const lightEditorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14.5px',
    fontFamily: "'JetBrains Mono', Consolas, Monaco, monospace",
    backgroundColor: '#ffffff',
    color: '#1a1c1c',
  },
  '.cm-content': {
    caretColor: '#00685f',
    padding: '16px 0',
    lineHeight: '1.7',
    fontFamily: "'JetBrains Mono', Consolas, Monaco, monospace",
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#00685f',
    borderLeftWidth: '2.5px',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(98, 250, 227, 0.35) !important',
  },
  '.cm-gutters': {
    backgroundColor: '#f9f9f9',
    color: '#94a3b8',
    borderRight: '1px solid #eeeeee',
    paddingRight: '6px',
    userSelect: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#e8f5f3',
    color: '#00685f',
    fontWeight: 'bold',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(0, 104, 95, 0.04)',
  },
  '.cm-line': {
    padding: '0 16px',
  },
  '.cm-matchingBracket, .cm-nonmatchingBracket': {
    backgroundColor: '#e2e8f0',
    outline: '1px solid #00685f',
  },
  // VS Code Indentation Guide Lines
  '.cm-indent-guide': {
    display: 'inline-block',
    position: 'relative',
    width: '0px',
    height: '1.6em',
    verticalAlign: 'text-bottom',
    pointerEvents: 'none',
    borderLeft: '1px solid rgba(0, 0, 0, 0.09)',
    marginRight: '-1px',
  },
  // Red Error Indicator (Line marker only, no wavy underline)
  '.cm-lintRange-error': {
    backgroundImage: 'none !important',
    backgroundColor: 'transparent !important',
    textDecoration: 'none !important',
  },
  '.cm-lint-marker-error': {
    content: '""',
    display: 'inline-block',
    width: '8px',
    height: '8px',
    backgroundColor: '#ef4444',
    borderRadius: '50%',
    marginLeft: '2px',
  },
}, { dark: false });

// Dark Theme Editor Styles
const darkEditorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14.5px',
    fontFamily: "'JetBrains Mono', Consolas, Monaco, monospace",
    backgroundColor: '#181a1f',
    color: '#abb2bf',
  },
  '.cm-content': {
    caretColor: '#62fae3',
    padding: '16px 0',
    lineHeight: '1.7',
    fontFamily: "'JetBrains Mono', Consolas, Monaco, monospace",
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#62fae3',
    borderLeftWidth: '2.5px',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(98, 250, 227, 0.25) !important',
  },
  '.cm-gutters': {
    backgroundColor: '#14161a',
    color: '#5c6370',
    borderRight: '1px solid #21252b',
    paddingRight: '6px',
    userSelect: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#2c313a',
    color: '#62fae3',
    fontWeight: 'bold',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  '.cm-line': {
    padding: '0 16px',
  },
  '.cm-matchingBracket, .cm-nonmatchingBracket': {
    backgroundColor: '#3e4451',
    outline: '1px solid #62fae3',
  },
  // VS Code Indentation Guide Lines
  '.cm-indent-guide': {
    display: 'inline-block',
    position: 'relative',
    width: '0px',
    height: '1.6em',
    verticalAlign: 'text-bottom',
    pointerEvents: 'none',
    borderLeft: '1px solid rgba(255, 255, 255, 0.11)',
    marginRight: '-1px',
  },
  // Red Error Indicator (Line marker only, no wavy underline)
  '.cm-lintRange-error': {
    backgroundImage: 'none !important',
    backgroundColor: 'transparent !important',
    textDecoration: 'none !important',
  },
  '.cm-lint-marker-error': {
    content: '""',
    display: 'inline-block',
    width: '8px',
    height: '8px',
    backgroundColor: '#f87171',
    borderRadius: '50%',
    marginLeft: '2px',
  },
}, { dark: true });

// Indent Guide Widget & ViewPlugin for VS Code style indentation guide lines

class IndentGuideWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-indent-guide';
    span.setAttribute('aria-hidden', 'true');
    return span;
  }
  ignoreEvent() {
    return true;
  }
}

const indentGuidePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder: any[] = [];
      const tabSize = 2;

      for (const { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos <= to) {
          const line = view.state.doc.lineAt(pos);
          const lineText = line.text;
          const match = lineText.match(/^[ \t]+/);
          if (match) {
            const spaces = match[0].replace(/\t/g, '  ').length;
            const levels = Math.floor(spaces / tabSize);
            for (let i = 1; i <= levels; i++) {
              const guidePos = line.from + (i - 1) * tabSize;
              builder.push(
                Decoration.widget({
                  widget: new IndentGuideWidget(),
                  side: 1,
                }).range(guidePos)
              );
            }
          }
          pos = line.to + 1;
        }
      }
      return Decoration.set(builder, true);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// Emmet ! shortcut for HTML boilerplate
const emmetHtmlKeymap = keymap.of([
  {
    key: 'Tab',
    run: (view) => {
      const state = view.state;
      const range = state.selection.main;
      const line = state.doc.lineAt(range.head);
      const textBefore = line.text.slice(0, range.head - line.from).trim();

      if (textBefore === '!') {
        const boilerplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Web Document</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Hello World!</h1>
  
  <script src="script.js"></script>
</body>
</html>`;
        view.dispatch({
          changes: { from: line.from, to: line.to, insert: boilerplate },
          selection: { anchor: line.from + boilerplate.indexOf('<h1>Hello World!</h1>') + 4 },
        });
        return true;
      }
      return false;
    },
  },
]);

// HTML Void elements that do not require closing tags
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
  'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype'
]);

// Full syntax and tag hierarchy validator for HTML
function validateHtml(content: string, docLength: number): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const tagStack: { tag: string; from: number; to: number }[] = [];

  let pos = 0;
  while (pos < content.length) {
    if (content[pos] === '<') {
      const tagStart = pos;

      // 1. Skip comments <!-- ... -->
      if (content.startsWith('<!--', pos)) {
        const commentEnd = content.indexOf('-->', pos);
        if (commentEnd === -1) {
          diagnostics.push({
            from: pos,
            to: Math.min(pos + 4, docLength),
            severity: 'error',
            message: 'Syntax Error: Comment <!-- is missing closing -->',
          });
          break;
        }
        pos = commentEnd + 3;
        continue;
      }

      // 2. Check if closing tag </tag
      const isClosing = content[pos + 1] === '/';
      const nameStart = isClosing ? pos + 2 : pos + 1;

      // Extract tag name [a-zA-Z0-9\-]
      let nameEnd = nameStart;
      while (nameEnd < content.length && /[a-zA-Z0-9\-]/.test(content[nameEnd])) {
        nameEnd++;
      }

      const tagName = content.slice(nameStart, nameEnd).toLowerCase();

      // If no valid tag name, skip
      if (!tagName) {
        pos++;
        continue;
      }

      if (tagName === '!doctype') {
        const gt = content.indexOf('>', pos);
        pos = gt === -1 ? content.length : gt + 1;
        continue;
      }

      // Find closing `>` without crossing into the next `<`
      const nextGt = content.indexOf('>', pos);
      const nextLt = content.indexOf('<', pos + 1);

      let isMalformed = false;
      let tagEnd = 0;

      if (nextGt === -1 || (nextLt !== -1 && nextLt < nextGt)) {
        // Tag is missing closing `>`
        isMalformed = true;
        tagEnd = nextLt !== -1 ? nextLt : content.length;
        const tagSnippet = content.slice(tagStart, Math.min(tagStart + 12, tagEnd)).trim();
        diagnostics.push({
          from: tagStart,
          to: Math.min(tagStart + tagSnippet.length, docLength),
          severity: 'error',
          message: `Syntax Error: Tag "${tagSnippet}" is missing closing bracket ">"`,
        });
      } else {
        tagEnd = nextGt + 1;
      }

      const tagText = content.slice(tagStart, tagEnd);
      const isSelfClosing = tagText.endsWith('/>') || VOID_ELEMENTS.has(tagName);

      if (!isClosing) {
        if (!isSelfClosing) {
          tagStack.push({
            tag: tagName,
            from: tagStart,
            to: Math.min(tagStart + tagName.length + 1, docLength),
          });
        }
      } else {
        // Closing tag </tagName>
        if (VOID_ELEMENTS.has(tagName)) {
          diagnostics.push({
            from: tagStart,
            to: Math.min(tagEnd, docLength),
            severity: 'error',
            message: `Syntax Error: '<${tagName}>' is a void element and must not have a closing tag '</${tagName}>'`,
          });
        } else if (tagStack.length === 0) {
          if (!isMalformed) {
            diagnostics.push({
              from: tagStart,
              to: Math.min(tagEnd, docLength),
              severity: 'error',
              message: `Syntax Error: Closing tag '</${tagName}>' has no matching opening tag '<${tagName}>'`,
            });
          }
        } else {
          const top = tagStack[tagStack.length - 1];
          if (top.tag === tagName) {
            tagStack.pop();
          } else {
            // Find deeper in stack
            let foundIdx = -1;
            for (let k = tagStack.length - 1; k >= 0; k--) {
              if (tagStack[k].tag === tagName) {
                foundIdx = k;
                break;
              }
            }

            if (foundIdx >= 0) {
              // Intervening tags were never closed
              for (let k = tagStack.length - 1; k > foundIdx; k--) {
                const unclosed = tagStack[k];
                diagnostics.push({
                  from: unclosed.from,
                  to: unclosed.to,
                  severity: 'error',
                  message: `Syntax Error: Tag '<${unclosed.tag}>' is missing closing tag '</${unclosed.tag}>'`,
                });
              }
              tagStack.splice(foundIdx);
            } else {
              if (!isMalformed) {
                diagnostics.push({
                  from: tagStart,
                  to: Math.min(tagEnd, docLength),
                  severity: 'error',
                  message: `Syntax Error: Mismatched closing tag '</${tagName}>', expected '</${top.tag}>'`,
                });
              }
              tagStack.pop();
            }
          }
        }
      }

      pos = tagEnd;
    } else {
      pos++;
    }
  }

  // Any remaining tags in stack at EOF are unclosed tags
  for (const unclosed of tagStack) {
    diagnostics.push({
      from: unclosed.from,
      to: unclosed.to,
      severity: 'error',
      message: `Syntax Error: Tag '<${unclosed.tag}>' is missing closing tag '</${unclosed.tag}>'`,
    });
  }

  // 3. Check CSS braces inside <style> ... </style> blocks
  const styleBlockRegex = /<style[^>]*>([\s\S]*?)(?:<\/style>|$)/gi;
  let styleMatch;
  while ((styleMatch = styleBlockRegex.exec(content)) !== null) {
    const styleContent = styleMatch[1];
    const styleStartIndex = styleMatch.index + styleMatch[0].indexOf(styleContent);
    
    let openCount = 0;
    let lastOpenPos = 0;
    for (let c = 0; c < styleContent.length; c++) {
      if (styleContent[c] === '{') {
        openCount++;
        lastOpenPos = styleStartIndex + c;
      } else if (styleContent[c] === '}') {
        if (openCount > 0) {
          openCount--;
        } else {
          const errPos = styleStartIndex + c;
          diagnostics.push({
            from: errPos,
            to: errPos + 1,
            severity: 'error',
            message: 'Syntax Error: Unexpected closing brace "}" in <style>',
          });
        }
      }
    }

    if (openCount > 0) {
      diagnostics.push({
        from: lastOpenPos,
        to: Math.min(lastOpenPos + 1, docLength),
        severity: 'error',
        message: 'Syntax Error: Unclosed opening brace "{" in <style>',
      });
    }
  }

  return diagnostics;
}

// Real-time Syntax Diagnostic Linter
const createDiagnosticLinter = (lang: EditorTab) => linter((view) => {
  const doc = view.state.doc;
  const content = doc.toString();

  if (lang === 'html') {
    return validateHtml(content, doc.length);
  } else if (lang === 'css') {
    const diagnostics: Diagnostic[] = [];
    let openCount = 0;
    let lastOpenPos = 0;
    for (let i = 0; i < content.length; i++) {
      if (content[i] === '{') {
        openCount++;
        lastOpenPos = i;
      } else if (content[i] === '}') {
        if (openCount > 0) {
          openCount--;
        } else {
          diagnostics.push({
            from: i,
            to: i + 1,
            severity: 'error',
            message: 'Syntax Error: Unexpected closing brace "}" without matching "{"',
          });
        }
      }
    }

    if (openCount > 0) {
      diagnostics.push({
        from: lastOpenPos,
        to: Math.min(lastOpenPos + 1, doc.length),
        severity: 'error',
        message: 'Syntax Error: Unclosed opening brace "{" missing closing "}"',
      });
    }
    return diagnostics;

  } else if (lang === 'js') {
    const diagnostics: Diagnostic[] = [];
    try {
      new Function(content);
    } catch (err: any) {
      diagnostics.push({
        from: 0,
        to: Math.min(doc.length, 12),
        severity: 'error',
        message: `JavaScript Error: ${err.message}`,
      });
    }
    return diagnostics;
  }

  return [];
}, { delay: 300 });

interface CodeMirrorEditorProps {
  value: string;
  language: EditorTab;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  onUndoRef?: React.MutableRefObject<(() => void) | null>;
  onRedoRef?: React.MutableRefObject<(() => void) | null>;
}

export default function CodeMirrorEditor({
  value,
  language,
  onChange,
  readOnly = false,
  onUndoRef,
  onRedoRef,
}: CodeMirrorEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const updatingFromProps = useRef(false);
  const { theme } = useTheme();

  // Expose undo/redo functions via refs
  useEffect(() => {
    if (onUndoRef) {
      onUndoRef.current = () => {
        if (viewRef.current) undo(viewRef.current);
      };
    }
    if (onRedoRef) {
      onRedoRef.current = () => {
        if (viewRef.current) redo(viewRef.current);
      };
    }
  }, [onUndoRef, onRedoRef]);

  useEffect(() => {
    if (!editorRef.current) return;

    // Determine language extension
    let langExtension: Extension = html({ autoCloseTags: true, matchClosingTags: true });
    if (language === 'css') {
      langExtension = css();
    } else if (language === 'js') {
      langExtension = javascript();
    }

    const isDark = theme === 'dark';
    const activeThemeExtension = isDark ? darkEditorTheme : lightEditorTheme;
    const activeHighlightExtension = syntaxHighlighting(isDark ? kineticDarkHighlight : kineticLightHighlight);

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      indentGuidePlugin,
      history(),
      closeBrackets(),
      autocompletion(),
      activeThemeExtension,
      activeHighlightExtension,
      langExtension,
      lintGutter(),
      createDiagnosticLinter(language),
      keymap.of([
        indentWithTab,
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...completionKeymap,
      ]),
      EditorView.lineWrapping,
    ];

    if (language === 'html') {
      extensions.push(emmetHtmlKeymap);
    }

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true));
    } else if (onChange) {
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !updatingFromProps.current) {
            onChange(update.state.doc.toString());
          }
        })
      );
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, readOnly, theme]);

  // Sync external value changes
  useEffect(() => {
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString();
      if (value !== currentValue) {
        updatingFromProps.current = true;
        viewRef.current.dispatch({
          changes: { from: 0, to: currentValue.length, insert: value },
        });
        updatingFromProps.current = false;
      }
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      className="w-full h-full text-left overflow-hidden relative select-text"
    />
  );
}
