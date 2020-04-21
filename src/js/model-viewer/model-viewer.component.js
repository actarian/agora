import { Component, getContext } from 'rxcomp';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoughnessMipmapper } from 'three/examples/jsm/utils/RoughnessMipmapper.js';
import { BASE_HREF } from '../data/data';

export class ModelViewerComponent extends Component {

	onInit() {
		console.log('ModelViewerComponent.onInit');
		this.createScene();
		this.loadAssets();
		this.addListeners();
		// this.animate(); // !!! no
	}

	// onView() { const context = getContext(this); }

	// onChanges() {}

	onDestroy() {
		this.removeListeners();
		const renderer = this.renderer;
		renderer.setAnimationLoop(() => {});
		renderer.destroy();
	}

	createScene() {
		const { node } = getContext(this);
		this.size = { width: 0, height: 0, aspect: 0 };

		const container = this.container = node.querySelector('.model-viewer__view');
		const info = this.info = node.querySelector('.model-viewer__info');

		const camera = this.camera = new THREE.PerspectiveCamera(45, container.offsetWidth / container.offsetHeight, 0.1, 1000);
		camera.position.set(-1.8, 0.6, 2.7);
		camera.target = new THREE.Vector3();

		console.log(container.offsetWidth, container.offsetHeight);

		const renderer = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setClearColor(0x000000, 0);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(container.offsetWidth, container.offsetHeight);
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 0.8;
		renderer.outputEncoding = THREE.sRGBEncoding;
		container.appendChild(renderer.domElement);

		const controls = this.controls = new OrbitControls(camera, renderer.domElement);
		controls.enablePan = false;
		controls.enableKeys = false;
		controls.minDistance = 2;
		controls.maxDistance = 10;
		controls.target.set(0, 0, -0.2);
		controls.update();

		const scene = this.scene = new THREE.Scene();
		const pivot = this.pivot = new THREE.Group();
		this.scene.add(pivot);
	}

	loadAssets() {
		this.loadRgbeBackground(BASE_HREF + 'models/textures/equirectangular/', 'leadenhall_market_2k.hdr', (envMap) => {
			this.render();
			this.loadGltfModel(BASE_HREF + 'models/gltf/model/gltf/', 'boot.gltf', (model) => {
				const pivot = this.pivot;
				pivot.scale.set(0.1, 0.1, 0.1);
				pivot.position.set(0, 0, 0); //-0.5
				pivot.add(model);
				this.render();
			});
		});
	}

	loadRgbeBackground(path, file, callback) {
		const scene = this.scene;
		const renderer = this.renderer;
		const pmremGenerator = new THREE.PMREMGenerator(renderer);
		pmremGenerator.compileEquirectangularShader();
		const loader = new RGBELoader();
		loader
			.setDataType(THREE.UnsignedByteType)
			.setPath(path)
			.load(file, function(texture) {
				const envMap = pmremGenerator.fromEquirectangular(texture).texture;
				// scene.background = envMap;
				scene.environment = envMap;
				texture.dispose();
				pmremGenerator.dispose();
				if (typeof callback === 'function') {
					callback(envMap);
				}
			});
		return loader;
	}

	loadGltfModel(path, file, callback) {
		const renderer = this.renderer;
		const roughnessMipmapper = new RoughnessMipmapper(renderer); // optional
		const loader = new GLTFLoader().setPath(path);
		loader.load(file, function(gltf) {
			gltf.scene.traverse(function(child) {
				if (child.isMesh) {
					roughnessMipmapper.generateMipmaps(child.material);
				}
			});
			if (typeof callback === 'function') {
				callback(gltf.scene);
			}
			roughnessMipmapper.dispose();
		});
	}

	updateRaycaster() {
		try {
			/*
			const controllers = this.controllers;
			const controller = controllers.controller;
			if (controller) {
				const raycaster = this.raycaster;
				const position = controller.position;
				const rotation = controller.getWorldDirection(controllers.controllerDirection).multiplyScalar(-1);
				raycaster.set(position, rotation);
				const hit = InteractiveMesh.hittest(raycaster, controllers.gamepads.button);
			}
			*/
		} catch (error) {
			this.info.innerHTML = error;
		}
	}

	render(delta) {
		try {
			// this.updateOld();
			const renderer = this.renderer;
			renderer.render(this.scene, this.camera);
		} catch (error) {
			this.info.innerHTML = error;
		}
	}

	animate() {
		const renderer = this.renderer;
		renderer.setAnimationLoop(this.render);
	}

	resize() {
		try {
			const container = this.container,
				renderer = this.renderer,
				camera = this.camera;
			const size = this.size;
			size.width = container.offsetWidth;
			size.height = container.offsetHeight;
			size.aspect = size.width / size.height;
			if (renderer) {
				renderer.setSize(size.width, size.height);
			}
			if (camera) {
				camera.aspect = size.width / size.height;
				camera.updateProjectionMatrix();
			}
			this.render();
		} catch (error) {
			this.info.innerHTML = error;
		}
	}

	addListeners() {
		this.resize = this.resize.bind(this);
		this.render = this.render.bind(this);
		this.controls.addEventListener('change', this.render); // use if there is no animation loop
		window.addEventListener('resize', this.resize, false);
	}

	removeListeners() {
		window.removeEventListener('resize', this.resize, false);
		this.controls.removeEventListener('change', this.render);
	}

}

ModelViewerComponent.meta = {
	selector: '[model-viewer]',
};
