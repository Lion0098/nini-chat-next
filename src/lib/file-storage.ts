import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, rename, rm, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
export type StorageCategory = "images" | "videos" | "audio" | "documents" | "archives" | "executables" | "other";
export type StoredObject = { id: string; key: string; absolutePath: string; sizeBytes: number; sha256: string };
const CATEGORIES = new Set<StorageCategory>(["images","videos","audio","documents","archives","executables","other"]);
function storageRoot(): string {
 const configured=process.env.NINI_STORAGE_ROOT?.trim();
 const root=resolve(configured || (process.env.NODE_ENV==="production" ? "/var/lib/nini-chat/storage" : join(process.cwd(),".data","nini-chat-storage")));
 const webRoot=resolve(process.cwd(),"public");
 const rel=relative(webRoot,root);
 if(root===resolve("/") || root===webRoot || (!rel.startsWith("..") && !isAbsolute(rel))) throw new Error("Unsafe NINI_STORAGE_ROOT: storage must be outside public web root");
 return root;
}
function objectPath(id:string,category:StorageCategory):string {
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || !CATEGORIES.has(category)) throw new Error("Invalid storage object reference");
 const root=storageRoot(), destination=resolve(root,category,id.slice(0,2),id), rel=relative(root,destination);
 if(!rel || rel.startsWith("..") || isAbsolute(rel)) throw new Error("Storage path escaped root");
 return destination;
}
export function detectFileType(buffer:Buffer):{mime:string;category:StorageCategory;extension:string}|null {
 const starts=(...bytes:number[])=>bytes.every((v,i)=>buffer[i]===v);
 if(starts(0xff,0xd8,0xff)) return {mime:"image/jpeg",category:"images",extension:"jpg"};
 if(starts(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a)) return {mime:"image/png",category:"images",extension:"png"};
 if(buffer.subarray(0,6).toString("ascii").startsWith("GIF8")) return {mime:"image/gif",category:"images",extension:"gif"};
 if(buffer.subarray(0,4).toString("ascii")==="RIFF" && buffer.subarray(8,12).toString("ascii")==="WEBP") return {mime:"image/webp",category:"images",extension:"webp"};
 if(buffer.subarray(0,5).toString("ascii")==="%PDF-") return {mime:"application/pdf",category:"documents",extension:"pdf"};
 if(starts(0x50,0x4b,0x03,0x04)) return {mime:"application/zip",category:"archives",extension:"zip"};
 if(starts(0x1f,0x8b)) return {mime:"application/gzip",category:"archives",extension:"gz"};
 if(buffer.subarray(4,8).toString("ascii")==="ftyp") return {mime:"video/mp4",category:"videos",extension:"mp4"};
 if(starts(0x49,0x44,0x33)||starts(0xff,0xfb)||starts(0xff,0xf3)||starts(0xff,0xf2)) return {mime:"audio/mpeg",category:"audio",extension:"mp3"};
 if(buffer.subarray(0,4).toString("ascii")==="RIFF" && buffer.subarray(8,12).toString("ascii")==="WAVE") return {mime:"audio/wav",category:"audio",extension:"wav"};
 return null;
}
export async function storeFile(input:{buffer:Buffer;category:StorageCategory;maxBytes:number}):Promise<StoredObject>{
 if(!Buffer.isBuffer(input.buffer)||input.buffer.length===0) throw new Error("Empty upload");
 if(!Number.isSafeInteger(input.maxBytes)||input.maxBytes<1||input.buffer.length>input.maxBytes) throw new Error("Upload exceeds configured size limit");
 const id=randomUUID(), destination=objectPath(id,input.category), directory=dirname(destination), temporary=join(directory,"."+id+".partial");
 await mkdir(directory,{recursive:true,mode:0o700});
 const handle=await open(temporary,"wx",0o600);
 try { await handle.writeFile(input.buffer); await handle.sync(); } catch(error) { await handle.close(); await rm(temporary,{force:true}); throw error; }
 await handle.close();
 try { await rename(temporary,destination); const info=await stat(destination); return {id,key:input.category+"/"+id.slice(0,2)+"/"+id,absolutePath:destination,sizeBytes:info.size,sha256:createHash("sha256").update(input.buffer).digest("hex")}; }
 catch(error){await rm(temporary,{force:true});throw error;}
}
export async function getStoredFilePath(id:string,category:StorageCategory):Promise<string|null>{const path=objectPath(id,category);try{const info=await stat(path);return info.isFile()?path:null;}catch{return null;}}
export function openStoredFile(path:string){const root=storageRoot(),rel=relative(root,resolve(path));if(!rel||rel.startsWith("..")||isAbsolute(rel))throw new Error("Storage path escaped root");return createReadStream(resolve(path));}
export async function deleteStoredFile(id:string,category:StorageCategory):Promise<void>{await rm(objectPath(id,category),{force:true});}
