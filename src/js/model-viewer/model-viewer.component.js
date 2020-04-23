import { Component, getContext } from 'rxcomp';
import { takeUntil, tap } from 'rxjs/operators';
import * as THREE from 'three';
import { DragDownEvent, DragMoveEvent, DragService, DragUpEvent } from '../drag/drag.service';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Rect } from '../rect/rect';

export class ModelViewerComponent extends Component {

	onInit() {
		console.log('ModelViewerComponent.onInit');
		this.items = [];
		this.createScene();
		// this.loadAssets();
		this.addListeners();
		// this.animate(); // !!! no
	}

	// onView() { const context = getContext(this); }

	// onChanges() {}

	onDestroy() {
		this.removeListeners();
		const renderer = this.renderer;
		renderer.setAnimationLoop(() => {});
	}

	createScene() {
		const { node } = getContext(this);
		this.size = { width: 0, height: 0, aspect: 0 };

		const container = this.container = node.querySelector('.model-viewer__view');
		const info = this.info = node.querySelector('.model-viewer__info');

		const worldRect = this.worldRect = Rect.fromNode(container);
		const cameraRect = this.cameraRect = new Rect();

		const camera = this.camera = new THREE.PerspectiveCamera(45, container.offsetWidth / container.offsetHeight, 0.1, 1000);
		camera.position.set(0, 1, 3);
		camera.target = new THREE.Vector3();
		camera.lookAt(camera.target);

		const renderer = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setClearColor(0x000000, 0);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(container.offsetWidth, container.offsetHeight);
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 0.8;
		renderer.outputEncoding = THREE.sRGBEncoding;
		if (container.childElementCount > 0) {
			container.insertBefore(renderer.domElement, container.children[0]);
		} else {
			container.appendChild(renderer.domElement);
		}

		/*
		const controls = this.controls = new OrbitControls(camera, renderer.domElement);
		controls.enablePan = false;
		controls.enableKeys = false;
		controls.minDistance = 2;
		controls.maxDistance = 10;
		controls.target.set(0, 0, 0);
		controls.update();
		*/

		this.drag$().pipe(
			takeUntil(this.unsubscribe$),
		).subscribe(event => {
			// console.log('dragService', event);
		});

		const scene = this.scene = new THREE.Scene();

		const objects = this.objects = new THREE.Group();
		scene.add(objects);

		const light = new THREE.DirectionalLight(0xffffff, 0.5);
		light.position.set(0, 2, 2);
		light.target.position.set(0, 0, 0);
		scene.add(light);

		this.index = 0;

		this.resize();
	}

	drag$() {
		let rotation;
		return DragService.events$(this.node).pipe(
			tap((event) => {
				if (event instanceof DragDownEvent) {
					rotation = this.objects.children[this.index].rotation.clone();
				} else if (event instanceof DragMoveEvent) {
					this.objects.children[this.index].rotation.set(rotation.x + event.distance.y * 0.01, rotation.y + event.distance.x * 0.01, 0);
					this.render();
				} else if (event instanceof DragUpEvent) {

				}
			})
		);
	}

	onTween() {
		this.render();
	}

	onChange(index) {
		this.index = index;
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
			const time = performance.now();
			const tick = this.tick_ ? ++this.tick_ : this.tick_ = 1;
			const scene = this.scene;
			const objects = this.objects;
			for (let i = 0; i < objects.children.length; i++) {
				const x = objects.children[i];
				if (typeof x.userData.render === 'function') {
					x.userData.render(time, tick);
				}
			}
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
			const worldRect = this.worldRect;
			worldRect.setSize(size.width, size.height);
			if (renderer) {
				renderer.setSize(size.width, size.height);
			}
			if (camera) {
				camera.aspect = size.width / size.height;
				const angle = camera.fov * Math.PI / 180;
				const height = Math.abs(camera.position.z * Math.tan(angle / 2) * 2);
				const cameraRect = this.cameraRect;
				cameraRect.width = height * camera.aspect;
				cameraRect.height = height;
				// console.log('position', camera.position.z, 'angle', angle, 'height', height, 'aspect', camera.aspect, cameraRect);
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
		// this.controls.addEventListener('change', this.render); // use if there is no animation loop
		window.addEventListener('resize', this.resize, false);
	}

	removeListeners() {
		window.removeEventListener('resize', this.resize, false);
		// this.controls.removeEventListener('change', this.render);
	}

	reposPlane(object, rect) {
		const worldRect = this.worldRect;
		const cameraRect = this.cameraRect;
		const sx = rect.width / worldRect.width * cameraRect.width;
		const sy = rect.height / worldRect.height * cameraRect.height;
		object.scale.set(sx, sy, 1);
		const tx = rect.x * cameraRect.width / worldRect.width - cameraRect.width / 2;
		const ty = rect.y * cameraRect.height / worldRect.height - cameraRect.height / 2;
		object.position.set(tx, -ty, 0);
	}

	repos_(object, rect) {
		const worldRect = this.worldRect;
		const cameraRect = this.cameraRect;
		const sx = rect.width / worldRect.width * cameraRect.width;
		const sy = rect.height / worldRect.height * cameraRect.height;
		object.scale.set(sx, sx, sx);
		const tx = rect.x * cameraRect.width / worldRect.width - cameraRect.width / 2;
		const ty = rect.y * cameraRect.height / worldRect.height - cameraRect.height / 2;
		object.position.set(tx, -ty, 0);
		console.log(tx);
	}

	repos(object, rect) {
		const worldRect = this.worldRect;
		const sx = 0.8;
		// const sx = rect.width / worldRect.width;
		// const sy = rect.height / worldRect.height;
		object.scale.set(sx, sx, sx);
		const tx = ((rect.x + rect.width / 2) - worldRect.width / 2) / worldRect.width * 2.0 * this.camera.aspect; // * cameraRect.width / worldRect.width - cameraRect.width / 2;
		const ty = ((rect.y + rect.height / 2) - worldRect.height / 2) / worldRect.height * 2.0 * this.camera.aspect; // * cameraRect.height / worldRect.height - cameraRect.height / 2;
		object.position.set(tx, -ty, 0);
		// console.log(tx, -ty, 0);
	}

}

ModelViewerComponent.meta = {
	selector: '[model-viewer]',
	inputs: ['items'],
};
