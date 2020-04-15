import { Component, getContext } from 'rxcomp';
import { takeUntil } from 'rxjs/operators';
import NaturalFormService from './natural-form.service';

export default class NaturalFormSearchComponent extends Component {

	onInit() {
		// console.log('NaturalFormSearchComponent.onInit');
		const { node } = getContext(this);
		node.classList.add('natural-form-search');
		NaturalFormService.form$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(form => {
			this.naturalForm = form;
			this.phrase = NaturalFormService.phrase;
		});
	}

	set phrase(phrase) {
		if (this.phrase_ !== phrase) {
			this.phrase_ = phrase;
			const { node, module } = getContext(this);
			const contentNode = node.querySelector('.content');
			if (this.instances_) {
				module.remove(contentNode);
			}
			this.instances_ = [];
			// const form = NaturalFormService.form;
			// console.log('NaturalFormSearchComponent.initControls', form);
			let html = phrase;
			const keys = Object.keys(this.naturalForm);
			keys.forEach(key => {
				// console.log(key);
				html = html.replace(`$${key}$`, () => {
					const item = this.naturalForm[key];
					if (item.options) {
						return /* html */ `
							<span class="natural-form__control" natural-form-control [filter]="naturalForm.${key}" [label]="naturalForm.${key}.label" (change)="onNaturalForm($event)"></span>
						`;
					} else {
						return /* html */ `<button type="button" class="btn--club-form" (click)="onClub($event)"><span>Tiemme Club</span></button>`;
					}
				});
			});
			// console.log('MoodboardSearchDirective', html);
			contentNode.innerHTML = html;
			Array.from(contentNode.childNodes).forEach(node => {
				this.instances_ = this.instances_.concat(module.compile(node, this));
			});
			/*
			const hasFilter = Object.keys(scope.naturalForm).map(x => scope.naturalForm[x]).find(x => x.value !== null) !== undefined;
			if (!hasFilter) {
				this.animateUnderlines_(node);
			}
			scope.animateOff_ = () => {
				this.animateOff_(node);
			};
			*/
		}
	}

	onNaturalForm(event) {
		const form = NaturalFormService.next();
		this.change.next(form);
	}

	onClub(event) {
		this.club.next(event);
	}

	animateUnderlines_(node) {
		this.animated = true;
		const values = [...node.querySelectorAll('.moodboard__underline')];
		values.forEach(x => {
			gsap.set(x, { transformOrigin: '0 50%', scaleX: 0 });
		});
		let i = -1;
		const animate = () => {
			i++;
			i = i % values.length;
			const u = values[i];
			gsap.set(u, { transformOrigin: '0 50%', scaleX: 0 });
			gsap.to(u, 0.50, {
				scaleX: 1,
				transformOrigin: '0 50%',
				delay: 0,
				ease: Power3.easeInOut,
				overwrite: 'all',
				onComplete: () => {
					gsap.set(u, { transformOrigin: '100% 50%', scaleX: 1 });
					gsap.to(u, 0.50, {
						scaleX: 0,
						transformOrigin: '100% 50%',
						delay: 1.0,
						ease: Power3.easeInOut,
						overwrite: 'all',
						onComplete: () => {
							animate();
						}
					});
				}
			});
		};
		animate();
	}

	animateOff_(node) {
		if (this.animated) {
			this.animated = false;
			// console.log('animateOff_');
			// gsap.killAll();
			const values = [...node.querySelectorAll('.moodboard__underline')];
			gsap.set(values, { transformOrigin: '0 50%', scaleX: 0 });
			gsap.to(values, 0.50, {
				scaleX: 1,
				transformOrigin: '0 50%',
				delay: 0,
				ease: Power3.easeInOut,
				overwrite: 'all',
			});
		}
	}

}

NaturalFormSearchComponent.meta = {
	selector: '[natural-form-search]',
	inputs: ['naturalForm'],
	outputs: ['change', 'club']
};
