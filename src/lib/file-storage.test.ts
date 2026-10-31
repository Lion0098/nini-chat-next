import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, test } from "node:test";
import { detectFileType, storeFile, getStoredFilePath, deleteStoredFile } from "./file-storage.ts";
const previousRoot=process.env.NINI_STORAGE_ROOT;
const root=await mkdtemp(join(tmpdir(),"nini-storage-test-"));
process.env.NINI_STORAGE_ROOT=root;
after(async()=>{if(previousRoot===undefined)delete process.env.NINI_STORAGE_ROOT;else process.env.NINI_STORAGE_ROOT=previousRoot;await rm(root,{recursive:true,force:true});});
test("detects known signatures and rejects unknown bytes",()=>{
 assert.equal(detectFileType(Buffer.from([0xff,0xd8,0xff,0x00]))?.mime,"image/jpeg");
 assert.equal(detectFileType(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))?.extension,"png");
 assert.equal(detectFileType(Buffer.from("%PDF-1.7"))?.category,"documents");
 assert.equal(detectFileType(Buffer.from("MZ executable")),null);
 assert.equal(detectFileType(Buffer.from("<html>bad</html>")),null);
});
test("stores opaque files outside webroot and supports lookup/deletion",async()=>{
 const bytes=Buffer.from([0xff,0xd8,0xff,1,2]),stored=await storeFile({buffer:bytes,category:"images",maxBytes:100});
 assert.equal(stored.sizeBytes,bytes.length);assert.match(stored.sha256,/^[a-f0-9]{64}$/);
 assert.equal(resolve(stored.absolutePath).startsWith(resolve(process.cwd(),"public")+"/"),false);
 const found=await getStoredFilePath(stored.id,"images");assert.equal(found,stored.absolutePath);assert.deepEqual(await readFile(found!),bytes);
 await deleteStoredFile(stored.id,"images");assert.equal(await getStoredFilePath(stored.id,"images"),null);
});
test("rejects empty and oversized uploads",async()=>{
 await assert.rejects(()=>storeFile({buffer:Buffer.alloc(0),category:"images",maxBytes:10}));
 await assert.rejects(()=>storeFile({buffer:Buffer.alloc(11),category:"images",maxBytes:10}));
});
