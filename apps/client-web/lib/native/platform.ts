import {isAndroid,isIOS} from './bridge';
import {IOSActivityRuntime} from './ios-location';
import {ActivityRuntime} from '../tracking/activity';
import {IndexedDBActivityStore} from '../tracking/storage';
import {AndroidActivityRuntime} from './runtime';
import {AndroidActivityStore} from './storage';
export const createActivityRuntime=()=>isAndroid()?new AndroidActivityRuntime():isIOS()?new IOSActivityRuntime():new ActivityRuntime();
export const createActivityStore=()=>isAndroid()?new AndroidActivityStore():new IndexedDBActivityStore();
