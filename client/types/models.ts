export type Role = "admin" | "agent";

export type FieldStage = "planted" | "growing" | "ready" | "harvested";

export type FieldStatus = "active" | "at_risk" | "completed";

export interface ApiUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
}

export interface Field {
  id: number;
  name: string;
  crop_type: string;
  planting_date: string;
  current_stage: FieldStage;
  status: FieldStatus;
  notes: string;
  /** Present on writes; on reads prefer `assigned_agents` + `fieldAgentIds()`. */
  assigned_agent_ids?: number[];
  assigned_agents?: ApiUser[];
  created_at: string;
  updated_at: string;
}

export interface FieldUpdate {
  id: number;
  field: number;
  field_name: string;
  stage: FieldStage;
  notes: string;
  agent: ApiUser;
  timestamp: string;
}

export function displayUserName(user: Pick<ApiUser, "first_name" | "last_name" | "username">) {
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return full || user.username;
}

export function fieldAgentIds(field: Field): number[] {
  if (field.assigned_agents?.length) {
    return field.assigned_agents.map((a) => a.id);
  }
  return field.assigned_agent_ids ?? [];
}
