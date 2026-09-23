import {loadNeighborhood,MapUnavailable} from '@/lib/geodata/service';
import {neighborhood} from '@/lib/geodata/osm';

export async function GET(request:Request) {
  const params=new URL(request.url).searchParams,x=params.get('x'),y=params.get('y');
  if(!x||!y||!/^\d{1,5}$/.test(x)||!/^\d{1,5}$/.test(y))return Response.json({error:'Invalid map area.'},{status:400});
  try{neighborhood(Number(x),Number(y));}catch{return Response.json({error:'Invalid map area.'},{status:400});}
  try{
    const world=await loadNeighborhood(Number(x),Number(y));
    return Response.json(world,{headers:{'Cache-Control':'private, max-age=900'}});
  }catch(error){
    return Response.json({error:error instanceof MapUnavailable?error.message:'Could not load nearby map data. Recording still works; retry when online.'},{status:503,headers:{'Cache-Control':'no-store','Retry-After':'30'}});
  }
}
