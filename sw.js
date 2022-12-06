/*global caches, fetch, Promise */
(function (worker) {
"use strict";

var PREFIX = 'world-map-skiller',
	VERSION = '3.12',
	FILES = [
		'index.html',
		'css/back.png',
		'css/bb.css',
		'css/flags.css',
		'css/flags.png',
		'css/icomoon.css',
		'css/icomoon.woff',
		'css/style.css',
		'data/geo.json',
		'js/app.js',
		'js/stats.js',
		'js/world-map.js',
		'lib/animate.css',
		'lib/jquery-3.2.1.slim.min.js',
		'lib/l10n.js',
		'lib/leaflet-0.7.3/leaflet.css',
		'lib/leaflet-0.7.3/leaflet.js',
		'locales/locales.ini',
		'locales/worldmapskiller.de.properties',
		'locales/worldmapskiller.en.properties',
		'locales/worldmapskiller.en-x-root.properties',
		'locales/worldmapskiller.fr.properties'
	];

worker.addEventListener('install', function (e) {
	e.waitUntil(
		caches.open(PREFIX + ':' + VERSION).then(function (cache) {
			return cache.addAll(FILES);
		})
	);
});

worker.addEventListener('activate', function (e) {
	e.waitUntil(
		caches.keys().then(function (keys) {
			return Promise.all(keys.map(function (key) {
				if (key.indexOf(PREFIX + ':') === 0 && key !== PREFIX + ':' + VERSION) {
					return caches.delete(key);
				}
			}));
		})
	);
});

worker.addEventListener('fetch', function (e) {
	e.respondWith(caches.match(e.request, {ignoreSearch: true})
		.then(function (response) {
			return response || fetch(e.request);
		})
	);
});

})(this);