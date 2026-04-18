export type Role = "admin" | "agent";

export type FieldStage =
  | "planted"
  | "germination"
  | "vegetative"
  | "flowering"
  | "fruiting"
  | "harvest"
  | "dormant";

export type FieldStatus = "active" | "at-risk" | "archived";

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  avatarUrl?: string;
  assignedFieldIds: string[];
  dateJoined: string;
}

export interface Field {
  id: string;
  name: string;
  cropType: string;
  plantingDate: string;
  currentStage: FieldStage;
  status: FieldStatus;
  assignedAgentId: string | null;
  notes: string;
  createdAt: string;
  sizeHectares?: number;
  locationLabel?: string;
}

export interface FieldUpdate {
  id: string;
  fieldId: string;
  stage: FieldStage;
  notes: string;
  agentId: string;
  timestamp: string;
}
