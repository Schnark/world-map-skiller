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

/*global App: true, $, Rhaboo*/
/*jshint camelcase: false*/
//jscs:disable requireCamelCaseOrUpperCaseIdentifiers

App =
(function () {
"use strict";

var App = {
	name: 'WorldMapSkiller',
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
		App.store = Rhaboo.persistent(App.name);
		if (!App.store.stats) {
			App.store.write('stats', {});
		} else {
			//remove countries that have been deleted
			App.store.stats.erase('ATF');
			App.store.stats.erase('FLK');
			App.store.stats.erase('CYN');
			App.store.stats.erase('SOL');
			//rename gu_a3 to ISO codes
			if ('PSX' in App.store.stats) {
				App.store.stats.write('PSE', App.store.stats.PSX);
				App.store.stats.erase('PSX');
			}
			if ('SAH' in App.store.stats) {
				App.store.stats.write('ESH', App.store.stats.SAH);
				App.store.stats.erase('SAH');
			}
			if ('SDS' in App.store.stats) {
				App.store.stats.write('SSD', App.store.stats.SDS);
				App.store.stats.erase('SDS');
			}
			//TODO if Kosovo gets an ISO code different from KOS, rename too
			//and rename gu_a3 to iso_a3
		}
		if (!App.store.settings) {
			App.store.write('settings', {
				name: true,
				flag: true,
				capital: true,
				details: true,
				group: '',
				colors: false
			});
		} else {
			//translate old settings
			if (typeof App.store.settings.flag === 'number') {
				App.store.settings.write('capital', true);
				App.store.settings.write('name', App.store.settings.flag !== 2);
				App.store.settings.write('flag', !!App.store.settings.flag);
			}
			if (!('group' in App.store.settings)) {
				App.store.settings.write('group', '');
			}
			if (App.store.settings.group === 'America') {
				App.store.settings.write('group', 'Americas');
			}
			if (!('colors' in App.store.settings)) {
				App.store.settings.write('colors', false);
			}
		}

		//init settings
		$('#settings-name').prop('checked', App.store.settings.name);
		$('#settings-flag').prop('checked', App.store.settings.flag);
		$('#settings-capital').prop('checked', App.store.settings.capital);
		$('#settings-details').prop('checked', App.store.settings.details);
		$('#settings-group').val(App.store.settings.group);
		$('#settings-colors').prop('checked', App.store.settings.colors);
		$('#settings-name').on('change', function () {
			App.store.settings.write('name', $('#settings-name').prop('checked'));
			document.documentElement.scrollTop = 0; //don't know why it sometimes jumps
		});
		$('#settings-flag').on('change', function () {
			App.store.settings.write('flag', $('#settings-flag').prop('checked'));
			document.documentElement.scrollTop = 0;
		});
		$('#settings-capital').on('change', function () {
			App.store.settings.write('capital', $('#settings-capital').prop('checked'));
			document.documentElement.scrollTop = 0;
		});
		$('#settings-details').on('change', function () {
			App.store.settings.write('details', $('#settings-details').prop('checked'));
			document.documentElement.scrollTop = 0;
		});
		$('#settings-group').on('change', function () {
			App.store.settings.write('group', $('#settings-group').val());
		});
		$('#settings-colors').on('change', function () {
			App.store.settings.write('colors', $('#settings-colors').prop('checked'));
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