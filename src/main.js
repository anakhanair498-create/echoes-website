import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

window.THREE = THREE;
window.GLTFLoader = GLTFLoader;
window.MeshoptDecoder = MeshoptDecoder;

const gameScript = document.createElement("script");
gameScript.src = "/game.js";
document.body.appendChild(gameScript);
