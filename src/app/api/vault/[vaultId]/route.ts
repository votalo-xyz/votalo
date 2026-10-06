import { handleVaultGet, handleVaultPut } from "@/lib/vault/handler";
import { getVaultBlob, putVaultBlob } from "@/lib/vault/storage";

export const runtime = "nodejs";

const store = { put: putVaultBlob, get: getVaultBlob };

export async function PUT(req: Request, { params }: { params: Promise<{ vaultId: string }> }) {
  const { vaultId } = await params;
  return handleVaultPut(req, vaultId, store);
}

export async function GET(req: Request, { params }: { params: Promise<{ vaultId: string }> }) {
  const { vaultId } = await params;
  return handleVaultGet(req, vaultId, store);
}
