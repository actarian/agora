export const STATIC = window.location.port === '41999' || window.location.host === 'actarian.github.io';
export const DEVELOPMENT = ['localhost', '127.0.0.1', '0.0.0.0'].indexOf(window.location.host.split(':')[0]) !== -1;
export const PRODUCTION = !DEVELOPMENT;
export const ENV = {
	STATIC,
	DEVELOPMENT,
	PRODUCTION
};

export const environment = {
	appKey: 'ab4289a46cd34da6a61fd8d66774b65f',
	appCertificate: '',
	channelName: 'Channel',
	port: 5000,
	apiEnabled: false,
	paths: {
		models: 'models/',
		textures: 'textures/',
	}
};
