import api from "@/lib/axios";

export type StudentInvitation = {
  id: string;
  email: string | null;
  token: string;
  invite_url: string;
  expires_at: string | null;
  used_at?: string | null;
  created_at?: string | null;
};

export type StudentInvitationCreatePayload = {
  email?: string;
  expires_in_days?: number;
};

export type StudentInvitationVerifyResult = {
  valid: boolean;
  invitation: StudentInvitation | null;
  message: string | null;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function unwrapData(payload: unknown) {
  const record = asRecord(payload);
  return record.data ?? payload;
}

function normalizeInvitation(value: unknown): StudentInvitation {
  const record = asRecord(value);
  return {
    id: String(record.id ?? ""),
    email: typeof record.email === "string" ? record.email : null,
    token: String(record.token ?? ""),
    invite_url: String(record.invite_url ?? record.inviteUrl ?? ""),
    expires_at: typeof record.expires_at === "string" ? record.expires_at : null,
    used_at: typeof record.used_at === "string" ? record.used_at : null,
    created_at: typeof record.created_at === "string" ? record.created_at : null,
  };
}

export async function createStudentInvitation(payload: StudentInvitationCreatePayload) {
  const response = await api.post("/v1/auth/student-invitations", payload);
  const data = unwrapData(response.data);
  const record = asRecord(data);
  return normalizeInvitation(record.invitation ?? data);
}

export async function verifyStudentInvitation(
  token: string,
): Promise<StudentInvitationVerifyResult> {
  const response = await api.get(`/v1/auth/student-invitations/${encodeURIComponent(token)}`);
  const data = unwrapData(response.data);
  const record = asRecord(data);

  return {
    valid: record.valid !== false,
    invitation: record.invitation ? normalizeInvitation(record.invitation) : null,
    message: typeof record.message === "string" ? record.message : null,
  };
}
