import { api } from './client'

export interface Connection {
  id: string
  name: string
  engine: 'mysql' | 'postgres'
  host: string
  port: number
  user: string
  password: string
  database?: string
}

export interface SavedQuery {
  id: string
  connectionId: string
  name: string
  sql: string
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  affectedRows?: number
}

export interface TableColumn {
  name: string
  type: string
  nullable: boolean
}

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ accessToken: string }>('/auth/login', { username, password }),
}

// Connections
export const connectionsApi = {
  list: () => api.get<Connection[]>('/connections'),
  get: (id: string) => api.get<Connection>(`/connections/${id}`),
  create: (data: Omit<Connection, 'id'>) =>
    api.post<Connection>('/connections', data),
  update: (id: string, data: Partial<Omit<Connection, 'id'>>) =>
    api.put<Connection>(`/connections/${id}`, data),
  delete: (id: string) => api.delete<void>(`/connections/${id}`),
  test: (id: string) =>
    api.post<{ ok: boolean; message?: string }>(`/connections/${id}/test`),
  testPayload: (data: Omit<Connection, 'id'>) =>
    api.post<{ ok: boolean; message?: string }>('/connections/test', data),
  setDatabase: (id: string, database: string) =>
    api.patch<Connection>(`/connections/${id}/database`, { database }),
}

// Explorer
export const explorerApi = {
  databases: (connectionId: string) =>
    api.get<string[]>(`/connections/${connectionId}/explorer/databases`),
  tables: (connectionId: string) =>
    api.get<string[]>(`/connections/${connectionId}/explorer/tables`),
  describeTable: (connectionId: string, table: string) =>
    api.get<TableColumn[]>(
      `/connections/${connectionId}/explorer/tables/${table}`,
    ),
}

// Query
export const queryApi = {
  execute: (connectionId: string, sql: string) =>
    api.post<QueryResult>(`/connections/${connectionId}/query`, { sql }),
}

// AI
export const aiApi = {
  models: () => api.get<{ models: string[] }>('/ai/models'),
  generate: (connectionId: string, prompt: string, model: string) =>
    api.post<{ sql: string }>(`/ai/${connectionId}/generate`, { prompt, model }),
}

// Saved Queries
export const savedQueriesApi = {
  list: (connectionId: string) =>
    api.get<SavedQuery[]>(`/connections/${connectionId}/saved-queries`),
  create: (connectionId: string, data: { name: string; sql: string }) =>
    api.post<SavedQuery>(`/connections/${connectionId}/saved-queries`, data),
  update: (
    connectionId: string,
    id: string,
    data: Partial<{ name: string; sql: string }>,
  ) =>
    api.put<SavedQuery>(
      `/connections/${connectionId}/saved-queries/${id}`,
      data,
    ),
  delete: (connectionId: string, id: string) =>
    api.delete<void>(`/connections/${connectionId}/saved-queries/${id}`),
}
