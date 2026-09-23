import {NativeRun,type NativeBridge} from './bridge';
import type {ActivityStore,SavedActivity} from '../tracking/storage';
import type {ActivityDraft} from '../tracking/recovery';
export class AndroidActivityStore implements ActivityStore {
  constructor(private bridge:NativeBridge=NativeRun){}
  save(activity:SavedActivity){return this.bridge.save({activity});}
  async list(){return (await this.bridge.list()).activities;}
  async get(id:string){return (await this.bridge.get({id})).activity;}
  remove(id:string){return this.bridge.remove({id});}
  async checkpoint(){}
  async drafts(){return [];}
  async claim(_draft:ActivityDraft):Promise<ActivityDraft>{throw new Error('Android resumes its saved recording automatically.');}
}
