import { useEffect, useRef, useState } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { json } from '@codemirror/lang-json'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

interface Props {
  column: string
  value: unknown
  editable: boolean
  saving: boolean
  error: string | null
  onSave: (text: string) => void
  onClose: () => void
}

const jsonTheme = EditorView.theme(
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
  },
  { dark: true },
)

const jsonHighlight = HighlightStyle.define([
  { tag: tags.propertyName, color: '#e8a052' },
  { tag: tags.string, color: '#d4c8b8' },
  { tag: tags.number, color: '#f0bc78' },
  { tag: tags.bool, color: '#c8873a', fontWeight: 'bold' },
  { tag: tags.null, color: '#8a7b6e', fontStyle: 'italic' },
  { tag: tags.punctuation, color: '#8a7b6e' },
])

function prettyPrint(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }
  return JSON.stringify(value, null, 2)
}

export default function JsonCellModal({ column, value, editable, saving, error, onSave, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [docText, setDocText] = useState(() => prettyPrint(value))

  useEffect(() => {
    if (!containerRef.current) return
    const view = new EditorView({
      state: EditorState.create({
        doc: docText,
        extensions: [
          history(),
          json(),
          syntaxHighlighting(jsonHighlight),
          jsonTheme,
          EditorState.readOnly.of(!editable),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) setDocText(update.state.doc.toString())
          }),
          keymap.of([...historyKeymap, ...defaultKeymap]),
        ],
      }),
      parent: containerRef.current,
    })
    viewRef.current = view
    view.focus()
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Mounted once per modal open (component is remounted per cell via `key`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-brick-950/90 z-50 flex items-stretch md:items-center md:justify-center md:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full h-full md:h-auto md:max-h-[85vh] md:max-w-2xl bg-brick-900 border-0 md:border border-brick-700 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-brick-800 shrink-0">
          <h2 className="text-cream-200 text-xs uppercase tracking-widest truncate">
            {column}
            {!editable && (
              <span className="ml-2 text-brick-500 normal-case tracking-normal">read-only</span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-brick-400 hover:text-copper-500 transition-colors text-lg leading-none px-2"
          >
            ✕
          </button>
        </div>

        <div ref={containerRef} className="flex-1 min-h-0 overflow-auto" />

        {(error || editable) && (
          <div className="flex items-center gap-3 px-4 py-3 border-t border-brick-800 shrink-0">
            {error && <span className="text-danger-400 text-xs flex-1">{error}</span>}
            {editable && (
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="h-11 md:h-8 px-4 text-xs uppercase tracking-widest text-brick-400 hover:text-cream-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onSave(docText)}
                  disabled={saving}
                  className="h-11 md:h-8 px-4 text-xs uppercase tracking-widest bg-copper-500 hover:bg-copper-400 text-brick-950 font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
