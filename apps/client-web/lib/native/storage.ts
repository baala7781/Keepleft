import {NativeRun,type NativeBridge} from './bridge';
import type {ActivityStore,SavedActivity} from '../tracking/storage';
import type {ActivityDraft} from '../tracking/recovery';
export class AndroidActivityStore implements ActivityStore {
  constructor(private bridge:NativeBridge=NativeRun){}
  async save(activity:SavedActivity){
    try{
      return await this.bridge.save({activity});
    }catch(e){
      const msg=e instanceof Error?e.message:'Unknown error';
      throw new Error(`Could not save activity: ${msg}`);
    }
  }
  async list(){return (await this.bridge.list()).activities;}
  async get(id:string){return (await this.bridge.get({id})).activity;}
  remove(id:string){return this.bridge.remove({id});}
  clearAll(){return this.bridge.clearData();}
  async checkpoint(){}
  async drafts(){return [];}
  async claim(_draft:ActivityDraft):Promise<ActivityDraft>{throw new Error('Android resumes its saved recording automatically.');}
}
