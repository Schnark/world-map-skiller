/*global caches, fetch, Promise */
(function (worker) {
"use strict";

var VERSION = 'v3.5',
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
		'lib/rhaboo.min.js',
		'lib/leaflet-0.7.3/leaflet.css',
		'lib/leaflet-0.7.3/leaflet.js',
		'locales/locales.ini',
		'locales/worldmapskiller.de.properties',
		'locales/worldmapskiller.en-US.properties',
		'locales/worldmapskiller.fr.properties'
	];

worker.addEventListener('install', function (e) {
	e.waitUntil(
		caches.open(VERSION).then(function (cache) {
			return cache.addAll(FILES);
		})
	);
});

worker.addEventListener('activate', function (e) {
	e.waitUntil(
		caches.keys().then(function (keys) {
			return Promise.all(keys.map(function (key) {
				if (key !== VERSION) {
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