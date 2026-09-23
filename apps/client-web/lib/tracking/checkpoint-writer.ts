import type {ActivityRuntime} from './activity';
import type {ActivityStore} from './storage';
import {RecoveryConflict,type ActivityDraft} from './recovery';

/** One write in flight, at most one latest pending snapshot. Independent of rendering. */
export class CheckpointWriter {
  private pending?:ActivityDraft;
  private running?:Promise<void>;
  private conflicted=false;
  constructor(private runtime:ActivityRuntime,private store:ActivityStore,private report:(message:string,conflict:boolean)=>void){}
  flush() {
    if(this.conflicted)return Promise.resolve();
    const draft=this.runtime.checkpoint();if(!draft)return Promise.resolve();
    this.pending=draft;
    if(!this.running)this.running=this.drain().finally(()=>{this.running=undefined;});
    return this.running;
  }
  private async drain() {
    while(this.pending){
      const draft=this.pending;this.pending=undefined;
      if(!this.runtime.needsCheckpoint(draft.activity.id))continue;
      try{await this.store.checkpoint(draft);this.report('Recovery progress saved on this device. Keep the page active while recording.',false);}
      catch(error){
        this.conflicted=error instanceof RecoveryConflict;
        if(this.conflicted){this.pending=undefined;this.runtime.pause();}
        this.report(this.conflicted?'This run was recovered in another tab. Recording is paused here. Use the other tab or export a backup.':'Recovery save failed. Keep this page open; progress since the last successful save may be lost.',this.conflicted);
      }
    }
  }
}
