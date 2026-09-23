import {isAndroid} from './bridge';
import {ActivityRuntime} from '../tracking/activity';
import {IndexedDBActivityStore} from '../tracking/storage';
import {AndroidActivityRuntime} from './runtime';
import {AndroidActivityStore} from './storage';
export const createActivityRuntime=()=>isAndroid()?new AndroidActivityRuntime():new ActivityRuntime();
export const createActivityStore=()=>isAndroid()?new AndroidActivityStore():new IndexedDBActivityStore();
