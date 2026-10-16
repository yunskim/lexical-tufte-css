/** Portable storage keys: document IDs, never user-editable slugs, own paths. */
const identifier=/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const slugPattern=/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;
const windowsDevice=/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
export function assertStorageId(id:string):string{
 if(typeof id!=='string'||!identifier.test(id)||windowsDevice.test(id))throw new Error('INVALID_STORAGE_ID');
 return id;
}
/** Relative POSIX path. The adapter must resolve beneath its trusted root and reject symlinks. */
export function postStorageKey(id:string):string{
 return `posts/${assertStorageId(id)}/post.json`;
}
export function slugCollisionKey(slug:string):string{
 if(typeof slug!=='string'||slug.length>160||slug!==slug.normalize('NFC')||!slugPattern.test(slug)||windowsDevice.test(slug))throw new Error('INVALID_SLUG_KEY');
 return slug.toLowerCase().normalize('NFC');
}
export function assertUniqueSlugs(slugs:readonly string[]):void{
 const seen=new Set<string>();
 for(const slug of slugs){
  const key=slugCollisionKey(slug);
  if(seen.has(key))throw new Error('DUPLICATE_SLUG');
  seen.add(key);
 }
}
