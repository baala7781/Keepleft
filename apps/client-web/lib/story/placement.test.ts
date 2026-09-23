import {describe,it,expect} from 'vitest';
import {DEFAULT_PLACEMENT,constrainPlacement,movePlacement,placementRect,previewDelta,resizePlacement,keyboardPlacement} from './placement';
describe('photo route placement',()=>{
  it('preserves the original composition until the user moves it',()=>{expect(placementRect(DEFAULT_PLACEMENT)).toEqual({left:70,top:360,width:580,height:580});});
  it('moves in both directions without changing route scale or input',()=>{const original={...DEFAULT_PLACEMENT};expect(movePlacement(original,30,-100)).toEqual({x:390,y:550,size:580});expect(original).toEqual(DEFAULT_PLACEMENT);});
  it('maps the same fraction of mobile or desktop preview to identical export coordinates',()=>{
    expect(previewDelta(23,-46,{width:230,height:230*1280/720})).toEqual({x:72,y:-144});
    expect(previewDelta(36,-72,{width:360,height:640})).toEqual({x:72,y:-144});
    expect(previewDelta(1,1,{width:0,height:0})).toEqual({x:0,y:0});
  });
  it('keeps the route reachable at all four photo edges',()=>{
    const small={x:360,y:650,size:200};expect(placementRect(movePlacement(small,-10000,-10000))).toEqual({left:16,top:16,width:200,height:200});
    expect(placementRect(movePlacement(small,10000,10000))).toEqual({left:504,top:1064,width:200,height:200});
  });
  it('resizes with a fixed top-left corner',()=>{const p=resizePlacement(DEFAULT_PLACEMENT,-200);expect(p.size).toBe(380);expect(placementRect(p)).toEqual({left:70,top:360,width:380,height:380});});
  it('bounds resize to fit the photo and remain usable',()=>{expect(resizePlacement(DEFAULT_PLACEMENT,-10000).size).toBe(160);expect(resizePlacement(DEFAULT_PLACEMENT,10000).size).toBe(634);expect(resizePlacement({x:580,y:1120,size:200},10000).size).toBe(224);});
  it('supports keyboard movement, resizing and reset without consuming unrelated keys',()=>{
    expect(keyboardPlacement(DEFAULT_PLACEMENT,'ArrowUp',false,true)?.y).toBe(610);
    expect(keyboardPlacement(DEFAULT_PLACEMENT,'ArrowLeft',true)?.size).toBe(570);
    expect(keyboardPlacement({x:200,y:400,size:200},'Home')).toEqual(DEFAULT_PLACEMENT);
    expect(keyboardPlacement(DEFAULT_PLACEMENT,'Tab')).toBeUndefined();
  });
  it('sanitizes invalid dimensions before rendering',()=>{expect(constrainPlacement({x:NaN,y:Infinity,size:NaN})).toEqual(DEFAULT_PLACEMENT);});
});
