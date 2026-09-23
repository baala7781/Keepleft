import {it,expect} from 'vitest';
import * as THREE from 'three';
import {createRunnerCutaway} from './cutaway';
it('uses shared bounded uniforms on building and detail materials without adding meshes',()=>{
  const cutaway=createRunnerCutaway(),material=new THREE.MeshBasicMaterial();
  const shader={uniforms:{},fragmentShader:'void main(){ #include <dithering_fragment> }',vertexShader:''};
  cutaway.attach(material);
  material.onBeforeCompile(shader as Parameters<typeof material.onBeforeCompile>[0],{} as THREE.WebGLRenderer);
  expect(shader.uniforms).toMatchObject(cutaway.uniforms);
  expect(shader.fragmentShader).toContain('gl_FragCoord.z<keeperCenter.z');
  expect(shader.fragmentShader).toContain('keeperEnabled>0.5');expect(shader.fragmentShader).toContain('if(radius<1.0)discard');
  expect(material.transparent).toBe(false);expect(material.depthWrite).toBe(true);material.dispose();
});
