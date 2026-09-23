import * as THREE from 'three';

/** A depth-aware viewing window. Only geometry in front of the runner is cut away. */
export function createRunnerCutaway(){
  const uniforms={keeperCenter:{value:new THREE.Vector3()},keeperRadius:{value:new THREE.Vector2(80,130)},keeperEnabled:{value:0}};
  const attach=(material:THREE.Material)=>{
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.fragmentShader='uniform vec3 keeperCenter; uniform vec2 keeperRadius; uniform float keeperEnabled;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`
        if(keeperEnabled>0.5 && gl_FragCoord.z<keeperCenter.z){
          float radius=length((gl_FragCoord.xy-keeperCenter.xy)/keeperRadius);
          if(radius<1.0)discard;
        }
        #include <dithering_fragment>
      `);
    };
    material.customProgramCacheKey=()=> 'keepleft-runner-cutaway-v1';
  };
  return {uniforms,attach};
}
