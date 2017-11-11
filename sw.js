/*global caches, fetch, Promise */
(function (worker) {
"use strict";

var VERSION = 'v3.0',
	FILES = [
		'index.html',
		'css/style.css',
		'data/geo.json',
		'js/app.js',
		'js/stats.js',
		'js/world-map.js',
		'lib/animate.css',
		'lib/jquery-2.1.3.min.js',
		'lib/l10n.js',
		'lib/rhaboo.min.js',
		'lib/bb/transitions.css',
		'lib/bb/util.css',
		'lib/bb/style/buttons.css',
		'lib/bb/style/confirm.css',
		'lib/bb/style/headers.css',
		'lib/bb/style/lists.css',
		'lib/bb/style/toolbars.css',
		'lib/bb/style/headers/images/icons/organic/back.png',
		'lib/icomoon/style.css',
		'lib/icomoon/fonts/icomoon.woff',
		'lib/leaflet-0.7.3/leaflet.css',
		'lib/leaflet-0.7.3/leaflet.js',
		'lib/world-flags-sprite/images/flags32.png',
		'lib/world-flags-sprite/stylesheets/flags32.css',
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