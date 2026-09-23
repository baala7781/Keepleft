import type {CapacitorConfig} from '@capacitor/cli';
const config:CapacitorConfig={
  appId:'app.keepleft.mobile',appName:'Keepleft',webDir:'dist-mobile',
  android:{backgroundColor:'#0b0c0e',allowMixedContent:false,webContentsDebuggingEnabled:false},
  server:{androidScheme:'https'},
};
export default config;
