import { fieldUpdates, fields, users } from "@/lib/mock-data";
import type { FieldStage, FieldStatus, Role } from "@/types/models";

export function getFieldById(fieldId: string) {
  return fields.find((field) => field.id === fieldId) ?? null;
}

export function getAgentById(agentId: string) {
  return users.find((user) => user.id === agentId) ?? null;
}

export function getUpdatesForField(fieldId: string) {
  return fieldUpdates
    .filter((update) => update.fieldId === fieldId)
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

export function getFieldsForAgent(agentId: string) {
  return fields.filter((field) => field.assignedAgentId === agentId);
}

export function getUpdatesForAgent(agentId: string) {
  return fieldUpdates
    .filter((update) => update.agentId === agentId)
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

export function getRecentUpdates(limit = 8) {
  return [...fieldUpdates]
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, limit);
}

export function getDashboardStats() {
  return {
    totalFields: fields.length,
    totalAgents: users.filter((u) => u.role === "agent").length,
    updatesThisWeek: fieldUpdates.length,
    atRiskFields: fields.filter((f) => f.status === "at-risk").length,
  };
}

export function getFieldsByStageChartData() {
  const stageCount = new Map<FieldStage, number>();
  for (const field of fields) {
    stageCount.set(field.currentStage, (stageCount.get(field.currentStage) ?? 0) + 1);
  }

  return Array.from(stageCount.entries()).map(([stage, total]) => ({
    stage,
    total,
  }));
}

export function getUpdatesTrendChartData() {
  return fieldUpdates
    .slice()
    .sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1))
    .map((update) => ({
      date: update.timestamp.slice(5, 10),
      updates: 1,
      fieldId: update.fieldId,
    }));
}

export function filterFields(filters: {
  query?: string;
  status?: FieldStatus | "all";
  stage?: FieldStage | "all";
}) {
  const query = filters.query?.trim().toLowerCase() ?? "";
  return fields.filter((field) => {
    const matchesQuery =
      query.length === 0 ||
      field.name.toLowerCase().includes(query) ||
      field.cropType.toLowerCase().includes(query);
    const matchesStatus =
      !filters.status || filters.status === "all" || field.status === filters.status;
    const matchesStage =
      !filters.stage || filters.stage === "all" || field.currentStage === filters.stage;
    return matchesQuery && matchesStatus && matchesStage;
  });
}

export function getUsersByRole(role: Role | "all") {
  return role === "all" ? users : users.filter((u) => u.role === role);
}
