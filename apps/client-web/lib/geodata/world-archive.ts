import type {NeighborhoodWorld} from './service';

function database():Promise<IDBDatabase|undefined>{
  if(typeof indexedDB==='undefined')return Promise.resolve(undefined);
  return new Promise(resolve=>{
    const request=indexedDB.open('keepleft-world-cache',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('areas');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>resolve(undefined);
  });
}

export async function readWorld(key:string):Promise<NeighborhoodWorld|undefined>{
  const db=await database();if(!db)return;
  return new Promise(resolve=>{
    const request=db.transaction('areas','readonly').objectStore('areas').get(key);
    request.onsuccess=()=>{db.close();resolve(request.result as NeighborhoodWorld|undefined);};
    request.onerror=()=>{db.close();resolve(undefined);};
  });
}

export async function saveWorld(world:NeighborhoodWorld):Promise<void>{
  const db=await database();if(!db)return;
  await new Promise<void>(resolve=>{
    const transaction=db.transaction('areas','readwrite');
    transaction.objectStore('areas').put(world,world.key);
    transaction.oncomplete=()=>{db.close();resolve();};
    transaction.onerror=()=>{db.close();resolve();};
    transaction.onabort=()=>{db.close();resolve();};
  });
}
