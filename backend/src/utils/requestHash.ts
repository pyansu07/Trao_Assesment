import { createHash } from "node:crypto";

export function computeRequestHash(ownerId: string, jd: string, companyUrl: string, days: number): string {
  return createHash("sha256").update(`${ownerId}::${jd}::${companyUrl}::${days}`).digest("hex");
}
