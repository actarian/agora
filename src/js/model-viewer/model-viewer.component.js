import { Component, getContext } from 'rxcomp';
import { takeUntil, tap } from 'rxjs/operators';
import * as THREE from 'three';
import AgoraService, { MessageType } from '../agora/agora.service';
import { DEBUG } from '../const';
import { DragDownEvent, DragMoveEvent, DragService, DragUpEvent } from '../drag/drag.service';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Rect } from '../rect/rect';
import { RgbeLoader } from './rgbe.loader';

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
	vUv = uv;
	// gl_PointSize = 8.0;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
varying vec2 vUv;
uniform vec2 resolution;
uniform sampler2D texture;

vec3 ACESFilmicToneMapping_( vec3 color ) {
	color *= 1.8;
	return saturate( ( color * ( 2.51 * color + 0.03 ) ) / ( color * ( 2.43 * color + 0.59 ) + 0.14 ) );
}

vec4 getColor(vec2 p) {
	return texture2D(texture, p);
}

vec3 encodeColor(vec4 color) {
	return ACESFilmicToneMapping_(RGBEToLinear(color).rgb);
}

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec4 Blur(vec2 st, vec4 color) {
	const float directions = 16.0;
	const float quality = 3.0;
	float size = 16.0;
	const float PI2 = 6.28318530718;
	const float qq = 1.0;
	const float q = 1.0 / quality;
	vec2 radius = size / resolution.xy;
	for (float d = 0.0; d < PI2; d += PI2 / directions) {
		for (float i = q; i <= qq; i += q) {
			vec2 dUv = vec2(cos(d), sin(d)) * radius * i;
			color += getColor(st + dUv);
        }
	}
	return color /= quality * directions - 15.0 + rand(st) * 4.0;
}

void main() {
	vec4 color = getColor(vUv);
	// color = Blur(vUv, color);
	color = vec4(encodeColor(color) + rand(vUv) * 0.1, 1.0);
	gl_FragColor = color;
}
`;

export class ModelViewerComponent extends Component {

	set item(item) {
		if (this.item_ !== item) {
			this.item_ = item;
			if (item && this.renderer) {
				this.loadRgbe(item);
			}
		}
	}

	get item() {
		return this.item_;
	}

	onInit() {
		// console.log('ModelViewerComponent.onInit');
		this.items = [];
		this.index = 0;
		this.createScene();
		this.addListeners();
		if (this.item) {
			this.loadRgbe(this.item);
		}
		// this.animate(); // !!! no
	}

	// onView() { const context = getContext(this); }

	// onChanges() {}

	onDestroy() {
		this.removeListeners();
		const renderer = this.renderer;
		renderer.setAnimationLoop(() => {});
	}

	loadRgbe(item) {
		RgbeLoader.load(item, this.renderer, (envMap, texture) => {
			// this.scene.background = envMap;
			this.scene.environment = envMap;
			texture.magFilter = THREE.LinearFilter;
			texture.needsUpdate = true;
			this.panorama.material.map = texture;
			this.panorama.material.uniforms.texture.value = texture;
			this.panorama.material.uniforms.resolution.value = new THREE.Vector2(texture.width, texture.height);
			// console.log(texture.width, texture.height);
			this.panorama.material.needsUpdate = true;
			this.render();
			// console.log(this.panorama.material);
		});
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

		const geometry = new THREE.SphereBufferGeometry(500, 60, 40);
		// invert the geometry on the x-axis so that all of the faces point inward
		geometry.scale(-1, 1, 1);
		// const material = new THREE.MeshBasicMaterial();
		const material = new THREE.ShaderMaterial({
			vertexShader: VERTEX_SHADER,
			fragmentShader: FRAGMENT_SHADER,
			uniforms: {
				texture: { type: "t", value: null },
				resolution: { value: new THREE.Vector2() }
			},
		});
		const panorama = this.panorama = new THREE.Mesh(geometry, material);
		scene.add(panorama);

		const objects = this.objects = new THREE.Group();
		scene.add(objects);

		/*
		const light = new THREE.DirectionalLight(0xffffff, 0.5);
		light.position.set(0, 2, 2);
		light.target.position.set(0, 0, 0);
		scene.add(light);
		*/

		this.resize();
	}

	drag$() {
		let rotation;
		return DragService.events$(this.node).pipe(
			tap((event) => {
				const group = this.objects.children[this.index];
				if (event instanceof DragDownEvent) {
					rotation = group.rotation.clone();
				} else if (event instanceof DragMoveEvent) {
					group.rotation.set(rotation.x + event.distance.y * 0.01, rotation.y + event.distance.x * 0.01, 0);
					this.panorama.rotation.set(rotation.x + event.distance.y * 0.01, rotation.y + event.distance.x * 0.01 + Math.PI, 0);
					this.render();
					// this.rotate.next([group.rotation.x, group.rotation.y, group.rotation.z]);
					agora.sendMessage({
						type: MessageType.SlideRotate,
						coords: [group.rotation.x, group.rotation.y, group.rotation.z]
					});
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
		this.change.next(index);
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
		if (!DEBUG) {
			const agora = this.agora = AgoraService.getSingleton();
			agora.message$.pipe(
				takeUntil(this.unsubscribe$)
			).subscribe(message => {
				switch (message.type) {
					case MessageType.SlideRotate:
						console.log(message);
						if (agora.state.locked && message.coords) {
							const group = this.objects.children[this.index];
							group.rotation.set(message.coords[0], message.coords[1], message.coords[2]);
							this.panorama.rotation.set(message.coords[0], message.coords[1] + Math.PI, message.coords[2]);
						}
						/*
						const group = this.objects.children[this.index];
						if (event instanceof DragDownEvent) {
							rotation = group.rotation.clone();
						} else if (event instanceof DragMoveEvent) {
							group.rotation.set(rotation.x + event.distance.y * 0.01, rotation.y + event.distance.x * 0.01, 0);
							this.panorama.rotation.set(rotation.x + event.distance.y * 0.01, rotation.y + event.distance.x * 0.01 + Math.PI, 0);
							this.render();
							this.rotate.next([group.rotation.x, group.rotation.y, group.rotation.z]);
						} else if (event instanceof DragUpEvent) {

						}
						*/
						break;
				}
			});
			/*
			agora.state$.pipe(
				takeUntil(this.unsubscribe$)
			).subscribe(state => {
				this.state = state;
				this.pushChanges();
			});
			*/
		}
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
		// console.log(tx);
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
	inputs: ['items', 'item'],
	outputs: ['change', 'rotate'],
};
