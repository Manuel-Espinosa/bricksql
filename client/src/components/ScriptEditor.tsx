import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { EditorView, keymap, placeholder as cmPlaceholder, lineNumbers } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { sql } from '@codemirror/lang-sql'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { autocompletion } from '@codemirror/autocomplete'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

export interface ScriptEditorHandle {
  getSqlToRun(): string
  focus(): void
}

interface Props {
  value: string
  onChange: (value: string) => void
  schema: Record<string, string[]>
  onRun: () => void
}

function extractStatementAtPos(content: string, pos: number): string {
  // Delimiters: ';' or a blank line (\n\n). Semicolons are optional —
  // statements separated only by blank lines also work.
  // ';' end is i+1 so clicking ON the semicolon (which puts the cursor at i+1) still
  // resolves to the correct statement.
  const stmts: Array<{ start: number; end: number; sql: string }> = []
  let stmtStart = 0
  let i = 0

  while (i <= content.length) {
    if (i === content.length) {
      const sql = content.slice(stmtStart, i).trim()
      if (sql) stmts.push({ start: stmtStart, end: i, sql })
      break
    }
    if (content[i] === ';') {
      const sql = content.slice(stmtStart, i).trim()
      if (sql) stmts.push({ start: stmtStart, end: i + 1, sql })
      stmtStart = i + 1
      i++
      continue
    }
    // Blank line: two consecutive newlines (with any spaces in between)
    if (content[i] === '\n' && /^\s*\n/.test(content.slice(i + 1))) {
      const sql = content.slice(stmtStart, i).trim()
      if (sql) stmts.push({ start: stmtStart, end: i, sql })
      // skip all trailing newlines so the next stmtStart is at real content
      while (i < content.length && (content[i] === '\n' || content[i] === '\r')) i++
      stmtStart = i
      continue
    }
    i++
  }

  for (const stmt of stmts) {
    if (pos >= stmt.start && pos <= stmt.end) return stmt.sql
  }
  return stmts.length > 0 ? stmts[stmts.length - 1].sql : content.trim()
}

const brickTheme = EditorView.theme(
  {
    '&': { height: '100%', fontSize: '12px' },
    '.cm-scroller': {
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      lineHeight: '1.6',
      overflow: 'auto',
    },
    '.cm-content': { padding: '16px', caretColor: '#c8873a' },
    '&.cm-focused': { outline: 'none' },
    '&.cm-focused .cm-cursor': { borderLeftColor: '#c8873a' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: '#3d3329',
    },
    '.cm-activeLine': { backgroundColor: '#252019' },
    '.cm-placeholder': { color: '#554840' },
    '.cm-gutters': {
      backgroundColor: '#1a1612',
      borderRight: '1px solid #2e2820',
      color: '#554840',
    },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 4px', minWidth: '28px' },
    '.cm-activeLineGutter': { backgroundColor: '#252019', color: '#8a7b6e' },
    '.cm-tooltip': {
      backgroundColor: '#252019',
      border: '1px solid #2e2820',
      borderRadius: '2px',
    },
    '.cm-tooltip-autocomplete ul li': { padding: '2px 8px', color: '#d4c8b8' },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: '#3d3329',
      color: '#f0e8d8',
    },
  },
  { dark: true },
)

const brickHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#c8873a', fontWeight: 'bold' },
  { tag: tags.string, color: '#e8a052' },
  { tag: tags.number, color: '#f0bc78' },
  { tag: tags.comment, color: '#6b5f52', fontStyle: 'italic' },
  { tag: tags.operator, color: '#d4c8b8' },
  { tag: tags.punctuation, color: '#8a7b6e' },
])

const ScriptEditor = forwardRef<ScriptEditorHandle, Props>(
  ({ value, onChange, schema, onRun }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)
    const onRunRef = useRef(onRun)
    const sqlCompartment = useRef(new Compartment())
    onRunRef.current = onRun

    useImperativeHandle(ref, () => ({
      getSqlToRun() {
        const view = viewRef.current
        if (!view) return ''
        const { state } = view
        const sel = state.selection.main
        if (!sel.empty) return state.sliceDoc(sel.from, sel.to).trim()
        return extractStatementAtPos(state.doc.toString(), sel.head)
      },
      focus() {
        viewRef.current?.focus()
      },
    }))

    // Mount editor once
    useEffect(() => {
      if (!containerRef.current) return
      const compartment = sqlCompartment.current
      const view = new EditorView({
        state: EditorState.create({
          doc: value,
          extensions: [
            history(),
            lineNumbers(),
            compartment.of(sql({ schema })),
            autocompletion(),
            syntaxHighlighting(brickHighlight),
            brickTheme,
            cmPlaceholder('SELECT * FROM ...'),
            EditorView.updateListener.of((update) => {
              if (update.docChanged) onChange(update.state.doc.toString())
            }),
            keymap.of([
              { key: 'Mod-Enter', run: () => { onRunRef.current(); return true } },
              ...historyKeymap,
              ...defaultKeymap,
            ]),
          ],
        }),
        parent: containerRef.current,
      })
      viewRef.current = view
      return () => { view.destroy(); viewRef.current = null }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Reconfigure schema when it changes (loaded asynchronously after mount)
    useEffect(() => {
      const view = viewRef.current
      if (!view) return
      view.dispatch({ effects: sqlCompartment.current.reconfigure(sql({ schema })) })
    }, [schema])

    // Sync external value changes (loadSql from Table Explorer or Saved Queries)
    useEffect(() => {
      const view = viewRef.current
      if (!view) return
      if (view.state.doc.toString() === value) return
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      })
    }, [value])

    return <div ref={containerRef} className="absolute inset-0 text-cream-100" />
  },
)

ScriptEditor.displayName = 'ScriptEditor'
export default ScriptEditor
