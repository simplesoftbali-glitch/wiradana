import { supabase } from './supabase'

export type AuditEntityType = 'actual_expenses' | 'rab_items'
export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE'

export interface AuditLog {
  id: string
  user_id: string
  project_id: string
  entity_type: AuditEntityType
  action_type: AuditActionType
  description: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
}

interface LogActivityInput {
  projectId: string
  entityType: AuditEntityType
  actionType: AuditActionType
  description: string
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
}

export async function logActivity({
  projectId,
  entityType,
  actionType,
  description,
  oldValues = null,
  newValues = null,
}: LogActivityInput): Promise<void> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    throw new Error(`Gagal memverifikasi sesi untuk audit log: ${sessionError.message}`)
  }
  if (!session) {
    throw new Error('Sesi pengguna tidak ditemukan; audit log tidak dapat disimpan.')
  }

  const { error } = await supabase.from('audit_logs').insert({
    user_id: session.user.id,
    project_id: projectId,
    entity_type: entityType,
    action_type: actionType,
    description,
    old_values: oldValues,
    new_values: newValues,
  })

  if (error) {
    throw new Error(`Gagal menyimpan audit log: ${error.message}`)
  }
}
