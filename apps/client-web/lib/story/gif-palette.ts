// Transparent, route crimson, white casing, and the pink that their anti-aliased
// edge blends into. A blue entry here used to win those edge pixels.
export const stickerPalette=[[0,0,0],[227,59,99],[255,255,255],[241,157,177]];
export function stickerIndices(rgba:Uint8ClampedArray){
  const indexed=new Uint8Array(rgba.length/4);
  for(let p=0,i=0;p<rgba.length;p+=4,i++){
    if(rgba[p+3]<128)continue;
    let distance=Infinity,best=1;
    for(let j=1;j<stickerPalette.length;j++){
      const c=stickerPalette[j],d=(rgba[p]-c[0])**2+(rgba[p+1]-c[1])**2+(rgba[p+2]-c[2])**2;
      if(d<distance){distance=d;best=j;}
    }
    indexed[i]=best;
  }
  return indexed;
}
