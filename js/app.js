/**
 * WorldMapSkiller
 *
 * originally written by Valéry Febvre
 * vfebvre@aester-eggs.com
 *
 * Copyright 2015 Valéry Febvre, 2017 Michael Müller
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*global App: true, $*/
/*jshint camelcase: false*/
//jscs:disable requireCamelCaseOrUpperCaseIdentifiers

App =
(function () {
"use strict";

var App = {
	countries: null,
	store: null,

	worldMap: null,
	stats: null,

	$splashMessage: $('#splash-message'),
	$splashMessageContent: $('#splash-message span'),

	animations: [
		'bounceInDown',
		'lightSpeedIn',
		'tada',
		'rubberBand',
		'flip',
		'rotateIn',
		'zoomInDown'
	],

	initPersistent: function () {
		try {
			App.store = JSON.parse(localStorage.getItem('world-map-skiller-persistent') || 'x');
			//if Kosovo gets an ISO code different from KOS, rename it here:
			/*if (App.store.stats.KOS) {
				App.store.stats.XXX = App.store.stats.KOS;
				delete App.store.stats.KOS;
			}*/
			//and rename gu_a3 to iso_a3
		} catch (e) {
			App.store = {
				stats: {},
				settings: {
					name: true,
					flag: true,
					capital: true,
					details: true,
					group: '',
					colors: false
				}
			};
			App.storePersistent();
		}
		//TODO remove the following code once rhaboo has been removed long enough
		var i, key, keys = [];
		for (i = 0; i < localStorage.length; i++) {
			key = localStorage.key(i);
			if (key.toLowerCase().slice(0, 7) === '_rhaboo') {
				keys.push(key);
			}
		}
		for (i = 0; i < keys.length; i++) {
			try {
				localStorage.removeItem(keys[i]);
			} catch (e) {
			}
		}
	},
	storePersistent: function () {
		try {
			localStorage.setItem('world-map-skiller-persistent', JSON.stringify(App.store));
		} catch (e) {
		}
	},

	//Initialize and start app
	start: function () {
		document.documentElement.lang = document.webL10n.getLanguage();
		document.documentElement.dir = document.webL10n.getDirection();

		//about
		$('#about-open').on('click', function () {
			$('#about').attr('class', 'leftToCurrent');
			$('#world-map').attr('class', 'currentToRight');
		});
		$('#about-close').on('click', function () {
			$('#world-map').attr('class', 'rightToCurrent');
			$('#about').attr('class', 'currentToLeft');
		});

		//init localStorage
		App.initPersistent();

		//init settings
		$('#settings-name').prop('checked', App.store.settings.name);
		$('#settings-flag').prop('checked', App.store.settings.flag);
		$('#settings-capital').prop('checked', App.store.settings.capital);
		$('#settings-details').prop('checked', App.store.settings.details);
		$('#settings-group').val(App.store.settings.group);
		$('#settings-colors').prop('checked', App.store.settings.colors);
		$('#settings-name').on('change', function () {
			App.store.settings.name = $('#settings-name').prop('checked');
			App.storePersistent();
			document.documentElement.scrollTop = 0; //don't know why it sometimes jumps
		});
		$('#settings-flag').on('change', function () {
			App.store.settings.flag = $('#settings-flag').prop('checked');
			App.storePersistent();
			document.documentElement.scrollTop = 0;
		});
		$('#settings-capital').on('change', function () {
			App.store.settings.capital = $('#settings-capital').prop('checked');
			App.storePersistent();
			document.documentElement.scrollTop = 0;
		});
		$('#settings-details').on('change', function () {
			App.store.settings.details = $('#settings-details').prop('checked');
			App.storePersistent();
			document.documentElement.scrollTop = 0;
		});
		$('#settings-group').on('change', function () {
			App.store.settings.group = $('#settings-group').val();
			App.storePersistent();
		});
		$('#settings-colors').on('change', function () {
			App.store.settings.colors = $('#settings-colors').prop('checked');
			App.storePersistent();
			document.documentElement.scrollTop = 0;
		});

		//init map overlay: set line-height CSS property
		App.$splashMessage.css('line-height', (window.innerHeight - 95) + 'px');

		App.showSplashMessage(document.webL10n.get('loading'), 'none');

		//load countries GeoJSON data and start app
		var xhr = new XMLHttpRequest();
		xhr.open('GET', 'data/geo.json');
		xhr.responseType = 'json';
		xhr.onload = function () {
			var data = xhr.response;
			App.countries = data.features;
			App.worldMap = new App.WorldMap();
			App.stats = new App.Stats();
			App.hideSplashMessage();
		};
		xhr.send();
	},

	formatNumber: function (number, decimal) {
		var str;
		if (decimal) {
			number = Math.round(number * 10) / 10;
			str = number.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1});
			if (/^\d+$/.test(str)) { //fooFractionDigits not supported, missing ".0"
				str = (number + 0.5).toLocaleString().replace(/5$/, '0');
			}
			return str;
		} else {
			number = Math.round(number);
			return number.toLocaleString();
		}
	},

	formatFlag: function (code) {
		return '<span class="f32"><span class="flag ' + code + '"></span></span>';
	},

	getCountryInfo: function (properties) {
		var name = document.webL10n.get(properties.gu_a3 + '-name'),
			isVariant = document.webL10n.get(properties.gu_a3 + '-is', {}, 'x'),
			grammarVariant = document.webL10n.get(properties.gu_a3 + '-grammar', {}, 'x'),
			continent = document.webL10n.get(properties.continent.replace(/ /g, '')),
			subregion = document.webL10n.get(properties.subregion.replace(/ /g, ''));

		return {
			code: properties.gu_a3,
			name: properties.dependent ?
				document.webL10n.get('dependent-format', {
					name: name, dependent: document.webL10n.get(properties.dependent + '-name')
				}) :
				name,
			nameSimple: name,
			isVariant: isVariant === 'x' ? '' : isVariant,
			grammarVariant: grammarVariant === 'x' ? '' : grammarVariant,
			continent: properties.continent !== properties.subregion ?
				document.webL10n.get('slash', {a: continent, b: subregion}) :
				continent,
			population: properties.pop_est >= 1e5 ?
				document.webL10n.get('nb-people-e6', {population: App.formatNumber(properties.pop_est / 1e6, true)}) :
				document.webL10n.get('nb-people', {population: App.formatNumber(properties.pop_est)}),
			capital: document.webL10n.get(properties.gu_a3 + '-capital'),
			flag: properties.iso_a2.toLowerCase(),
			dependent: !!properties.dependent,
			disputed: properties.disputed
		};
	},

	hideSplashMessage: function () {
		App.$splashMessageContent.removeClass().empty();
		App.$splashMessage.hide();
	},

	showSplashMessage: function (message, animation, animationendCb) {
		if (!animation) {
			animation = App.animations[Math.floor(Math.random() * App.animations.length)];
		}

		App.$splashMessageContent.html(message);
		App.$splashMessage.show();
		if (animation === 'none') {
			return;
		}

		App.$splashMessageContent
			.removeClass()
			.addClass(animation + ' animated')
			.one('webkitAnimationEnd animationend', function () {
				window.setTimeout(function () {
					App.hideSplashMessage();
					if (animationendCb) {
						animationendCb();
					}
				}, 1500);
			});
	}
};

window.addEventListener('localized', App.start, false);

return App;
})();