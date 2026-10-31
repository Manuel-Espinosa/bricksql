import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mcpApi } from '../api'

async function copyText(text: string): Promise<void> {
  // navigator.clipboard is unavailable on plain-http LAN origins, so fall back.
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  document.execCommand('copy')
  area.remove()
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div>
      <div className="text-brick-500 text-[10px] uppercase tracking-widest mb-1">
        {label}
      </div>
      <div className="flex items-stretch gap-1">
        <code className="flex-1 min-w-0 bg-brick-950 border border-brick-800 px-2 py-1.5 text-xs text-cream-200 break-all">
          {value}
        </code>
        <button
          onClick={async () => {
            await copyText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
          className="px-2 text-xs text-brick-400 hover:text-copper-500 border border-brick-800 transition-colors shrink-0"
        >
          {copied ? '✓' : 'copy'}
        </button>
      </div>
    </div>
  )
}

export default function McpDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['mcp-settings'],
    queryFn: mcpApi.settings,
  })

  const toggle = useMutation({
    mutationFn: ({ id, exposed }: { id: string; exposed: boolean }) =>
      mcpApi.setExposed(id, exposed),
    onSettled: () => qc.invalidateQueries({ queryKey: ['mcp-settings'] }),
  })

  const baseUrl = data?.publicUrl ?? window.location.origin
  const endpoint = `${baseUrl}/api/mcp`
  const command = `claude mcp add --transport http bricksql ${endpoint} --header "Authorization: Bearer <BRICKSQL_MCP_TOKEN>"`

  return (
    <div className="fixed inset-0 bg-brick-950/90 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-brick-900 border border-brick-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-cream-200 text-xs uppercase tracking-widest">
            mcp access
          </h2>
          <button
            onClick={onClose}
            className="text-brick-500 hover:text-cream-200 text-sm"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {isLoading && (
          <p className="text-brick-500 text-xs">
            loading<span className="cursor-blink" />
          </p>
        )}
        {error && (
          <p className="text-danger-400 text-xs">{(error as Error).message}</p>
        )}

        {data && (
          <div className="space-y-5">
            {data.enabled ? (
              <div className="space-y-3">
                <CopyRow label="endpoint" value={endpoint} />
                <CopyRow label="claude code" value={command} />
                <p className="text-brick-600 text-[11px]">
                  Replace <code>&lt;BRICKSQL_MCP_TOKEN&gt;</code> with the token
                  set on the server. Agents get read-only SELECT access to the
                  connections checked below.
                </p>
              </div>
            ) : (
              <p className="text-copper-500 text-xs border border-brick-800 p-3">
                MCP access is disabled. Set <code>BRICKSQL_MCP_TOKEN</code> on
                the server and restart to enable it.
              </p>
            )}

            <div>
              <div className="text-brick-500 text-[10px] uppercase tracking-widest mb-2">
                exposed connections
              </div>
              {data.connections.length === 0 ? (
                <p className="text-brick-600 text-xs">no connections yet</p>
              ) : (
                <ul className="space-y-1">
                  {data.connections.map((c) => (
                    <li key={c.id}>
                      <label
                        className={`flex items-center gap-3 border border-brick-800 bg-brick-950 px-3 py-2 ${
                          data.enabled ? 'cursor-pointer' : 'opacity-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="accent-copper-500"
                          checked={c.mcpExposed}
                          disabled={!data.enabled || toggle.isPending}
                          onChange={(e) =>
                            toggle.mutate({ id: c.id, exposed: e.target.checked })
                          }
                        />
                        <span className="text-copper-500 text-xs uppercase w-6 shrink-0">
                          {c.engine === 'postgres' ? 'pg' : 'my'}
                        </span>
                        <span className="text-cream-100 text-sm truncate">
                          {c.name}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {toggle.error && (
                <p className="text-danger-400 text-xs mt-2">
                  {(toggle.error as Error).message}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
