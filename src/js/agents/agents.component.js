import { Component } from 'rxcomp';
import { takeUntil } from 'rxjs/operators';
import { FilterMode } from '../filter/filter-item';
import FilterService from '../filter/filter.service';

export default class AgentsComponent extends Component {

	onInit() {
		const items = window.agents || [];
		const filters = window.filters || {};
		const initialParams = window.params || {};
		filters.countries.mode = FilterMode.SELECT;
		filters.regions.mode = FilterMode.SELECT;
		// filters.provinces.mode = FilterMode.SELECT;
		filters.categories.mode = FilterMode.SELECT;
		const filterService = new FilterService(filters, initialParams, (key, filter) => {
			switch (key) {
				case 'countries':
					filter.filter = (item, value) => {
						return item.idCountry && item.idCountry.indexOf(value) !== -1;
					};
					break;
				case 'regions':
					filter.filter = (item, value) => {
						return item.idsRegions && item.idsRegions.indexOf(value) !== -1;
					};
					break;
					/*
					case 'provinces':
						filter.filter = (item, value) => {
							return item.provinces && item.provinces.indexOf(value) !== -1;
						};
					break;
					*/
				case 'categories':
					filter.filter = (item, value) => {
						return item.categories && item.categories.indexOf(value) !== -1;
					};
					break;
				default:
					filter.filter = (item, value) => {
						return true;
					};
			}
		});

		filterService.items$(items).pipe(
			takeUntil(this.unsubscribe$),
		).subscribe(items => {
			this.items = items;
			this.pushChanges();
			/*
			setTimeout(() => {
				this.items = items;
				this.pushChanges();
			}, 50);
			*/
			// console.log('AgentsComponent.items', items.length);
		});

		this.filterService = filterService;
		this.filters = filterService.filters;

	}

	hasCategory(item, id) {
		return item.categories && item.categories.indexOf(id) !== -1;
	}

	/*
	collect() {
		let provinces = [];
		items.forEach(x => {
			if (x.provinces) {
				x.provinces.forEach(province => {
					if (provinces.indexOf(province) === -1) {
						provinces.push(province);
					}
				})
			}
		});
		provinces = provinces.sort().map(x => {
			return {
				value: x,
				label: x,
			}
		});
		// console.log(JSON.stringify(provinces));
	}
	*/

}

AgentsComponent.meta = {
	selector: '[agents]',
};
