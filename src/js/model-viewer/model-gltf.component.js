import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
// import { RoughnessMipmapper } from 'three/examples/jsm/utils/RoughnessMipmapper.js';
import { environment } from '../../environment/environment';
import { BASE_HREF } from '../const';
import { ModelViewerComponent } from './model-viewer.component';
import { ModelComponent } from './model.component';

export class ModelGltfComponent extends ModelComponent {

	onInit() {
		super.onInit();
		console.log('ModelGltfComponent.onInit');
	}

	create(callback) {
		this.loadGltfModel(BASE_HREF + environment.paths.models + this.item.gltfFolder, this.item.gltfFile, (mesh) => {
			const box = new THREE.Box3().setFromObject(mesh);
			const center = box.getCenter(new THREE.Vector3());
			mesh.position.x += (mesh.position.x - center.x);
			mesh.position.y += (mesh.position.y - center.y);
			mesh.position.z += (mesh.position.z - center.z);
			const size = box.max.clone().sub(box.min).length();
			const scale = 2.5 / size;
			mesh.scale.set(scale, scale, scale);
			if (typeof callback === 'function') {
				callback(mesh);
			}
		});
		/*
		this.loadRgbeBackground(BASE_HREF + environment.paths.textures + this.item.envMapFolder, this.item.envMapFile, (envMap) => {
			this.loadGltfModel(BASE_HREF + environment.paths.models + this.item.gltfFolder, this.item.gltfFile, (mesh) => {
				const box = new THREE.Box3().setFromObject(mesh);
				const center = box.getCenter(new THREE.Vector3());
				mesh.position.x += (mesh.position.x - center.x);
				mesh.position.y += (mesh.position.y - center.y);
				mesh.position.z += (mesh.position.z - center.z);
				const size = box.max.clone().sub(box.min).length();
				const scale = 2.5 / size;
				mesh.scale.set(scale, scale, scale);
				if (typeof callback === 'function') {
					callback(mesh);
				}
			});
		});
		*/
	}

	// onView() { const context = getContext(this); }

	// onChanges() {}

	/*
	loadAssets() {
		this.loadRgbeBackground(BASE_HREF + environment.paths.textures + this.item.envMapFolder, this.item.envMapFile, (envMap) => {
			this.loadGltfModel(BASE_HREF + environment.paths.models + this.item.gltfFolder, this.item.gltfFile, (model) => {
				const scene = this.host.scene;
				scene.add(model);
				this.host.render();
			});
		});
	}
	*/

	loadRgbeBackground(path, file, callback) {
		const scene = this.host.scene;
		const renderer = this.host.renderer;
		const pmremGenerator = new THREE.PMREMGenerator(renderer);
		pmremGenerator.compileEquirectangularShader();
		const loader = new RGBELoader();
		loader
			.setDataType(THREE.UnsignedByteType)
			.setPath(path)
			.load(file, (texture) => {
				const envMap = pmremGenerator.fromEquirectangular(texture).texture;
				scene.background = envMap;
				scene.environment = envMap;
				this.host.render();
				texture.dispose();
				pmremGenerator.dispose();
				if (typeof callback === 'function') {
					callback(envMap);
				}
			});
		return loader;
	}

	loadGltfModel(path, file, callback) {
		const renderer = this.host.renderer;
		// const roughnessMipmapper = new RoughnessMipmapper(renderer); // optional
		const loader = new GLTFLoader().setPath(path);
		loader.load(file, (gltf) => {
			gltf.scene.traverse((child) => {
				if (child.isMesh) {
					// roughnessMipmapper.generateMipmaps(child.material);
				}
			});
			if (typeof callback === 'function') {
				callback(gltf.scene);
			}
			// roughnessMipmapper.dispose();
		});
	}

}

ModelGltfComponent.meta = {
	selector: '[model-gltf]',
	hosts: { host: ModelViewerComponent },
	inputs: ['item'],
};
