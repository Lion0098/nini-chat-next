import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, rename, rm, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

export type StorageCategory = "images" | "videos" | "audio" | "documents" | "archives" | "executables" | "other";
export type StoredObject = { id: string; key: string; absolutePath: string; sizeBytes: number; sha256: string };

const CATEGORIES = new Set<StorageCategory>(["images", "videos", "audio", "documents", "archives", "executables", "other"]);

function storageRoot(): string {
  const configured = process.env.NINI_STORAGE_ROOT?.trim();
  const root = resolve(configured || (process.env.NODE_ENV === "production"
    ? "/var/lib/nini-chat/storage"
    : join(process.cwd(), ".data", "nini-chat-storage")));
  if (root === resolve("/") || root === resolve(process.cwd(), "public")) throw new Error("Unsafe NINI_STORAGE_ROOT");
  return root;
}

function objectPath(id: string, category: StorageCategory): string {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !CATEGORIES.has(category)) throw new Error("Invalid storage object reference");
  const root = storageRoot();
  const destination = resolve(root, category, id.slice(0, 2), id);
  const rel = relative(root, destination);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("Storage path escaped root");
  return destination;
}

/** Call only after authentication, membership, quota and content validation. */
export async function storeFile(input: { buffer: Buffer; category: StorageCategory; maxBytes: number }): Promise<StoredObject> {
  if (!Buffer.isBuffer(input.buffer) || input.buffer.length === 0) throw new Error("Empty upload");
  if (!Number.isSafeInteger(input.maxBytes) || input.maxBytes < 1 || input.buffer.length > input.maxBytes) throw new Error("Upload exceeds configured size limit");

  const id = randomUUID();
  const destination = objectPath(id, input.category);
  const directory = dirname(destination);
  const temporary = join(directory, `.${id}.partial`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(input.buffer);
    await handle.sync();
  } catch (error) {
    await handle.close();
    await rm(temporary, { force: true });
    throw error;
  }
  await handle.close();
  await rename(temporary, destination);
  const info = await stat(destination);
  return { id, key: `${input.category}/${id.slice(0, 2)}/${id}`, absolutePath: destination, sizeBytes: info.size, sha256: createHash("sha256").update(input.buffer).digest("hex") };
}

export async function getStoredFilePath(id: string, category: StorageCategory): Promise<string | null> {
  const path = objectPath(id, category);
  try { const info = await stat(path); return info.isFile() ? path : null; } catch { return null; }
}

export function openStoredFile(path: string) {
  const root = storageRoot();
  const rel = relative(root, resolve(path));
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw new Error("Storage path escaped root");
  return createReadStream(resolve(path));
}

export async function deleteStoredFile(id: string, category: StorageCategory): Promise<void> {
  await rm(objectPath(id, category), { force: true });
}
