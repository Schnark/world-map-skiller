/**
 * WorldMapSkiller
 *
 * originally written by Valéry Febvre
 * vfebvre@aester-eggs.com
 *
 * Copyright 2015 Valéry Febvre, 2017 Michael M.
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

/*global App, $, L*/
/*jshint camelcase: false*/
//jscs:disable requireCamelCaseOrUpperCaseIdentifiers

App.WorldMap = function () {
	"use strict";

	var $mapBoxTop = $('#map-box-top').hide(),
		$mapBoxTopContent = $mapBoxTop.find('div'),
		$mapBoxBottom = $('#map-box-bottom').hide(),
		$mapBoxBottomContent = $mapBoxBottom.find('div'),

		started = false,

		drawPile,
		question,
		clickLock = false,
		currentValidatedCounter,
		totalValidatedCounter,
		currentCounter,

		map,
		mainLayer,
		countriesLayers = [],
		highlightedCountryLayer,
		colors = [ //http://www.flatuicolorpicker.com/
			'#E74C3C', //ALIZARIN: India, Australia
			'#E26A6A', //SUNGLO: Russia
			'#2ECC71', //EMERALD: Argentina, Mongolia
			'#95A5A6', //CONCRETE: USA, China, Greenland, Antartica
			'#F1C40F', //SUN FLOWER: Brazil, Algeria
			'#E67E22', //CARROT: Canada, Mexico
			'#4183D7' //ROYAL BLUE: France
		];

	function init () {
		//toolbar buttons
		$('#btn-start').on('click', function () {
			startOrStop();
		});
		$('#btn-next').on('click', function () {
			drawQuestion();
		});
		$('#btn-reset-map-view').on('click', function () {
			resetMapView();
		});

		if (App.store.settings.colors) {
			colors = randomize(colors);
		}

		//init map
		$('#map')
			.width(window.innerWidth)
			.height(window.innerHeight);

/*
NOTE: We still use leaflet 0.7.3. Updating to 0.7.7 is possible, but
has a slightly degraded performance for me when zooming in.
Updating to the current branch requires some more work, including
some fiddling with z-index. Since neither version offers apparent
advantages over the old one, let's stay with it for now.
*/
		map = L.map(
			'map',
			{
				//preferCanvas: true, 0.7.x uses global instead
				zoomControl: false, attributionControl: false,
				worldCopyJump: false,
				//maxBounds: [[-180, 120], [210, -90]], maxBoundsViscosity: 0.5, doesn't work properly
				minZoom: 1, maxZoom: 8
			}
		);
		map.doubleClickZoom.disable();

		mainLayer = L.geoJson(
			App.countries,
			//NOTE the alphabetical order by code coincides with the desired order for overlapping countries
			{
				style: function (feature) {
					return {
						color: 'white',
						fillColor: feature.properties.mapcolor7 ? colors[feature.properties.mapcolor7 - 1] : '#e2f7fb',
						fillOpacity: feature.properties.mapcolor7 ? 1 : 0.5,
						opacity: 1,
						weight: 1,
						stroke: !!feature.properties.mapcolor7
					};
				},
				onEachFeature: function (feature, layer) {
					countriesLayers[feature.properties.gu_a3] = layer;
					layer.on({
						click: function (e) {
							if (clickLock) {
								return;
							}

							selectCountry(e);

							clickLock = true;
							window.setTimeout(function () {
								clickLock = false;
							}, 100);
						}
					});
				}
			}
		).addTo(map);

		resetMapView();
	}

	function randomize (array) {
		var order = array.map(function (val) {
			return {
				val: val,
				key: Math.random()
			};
		});
		order.sort(function (a, b) {
			return a.key - b.key;
		});
		return order.map(function (o) {
			return o.val;
		});
	}

	function formatIs (data) {
		var msg = 'is';
		if (data.isVariant) {
			msg += '-v' + data.isVariant;
		}
		return document.webL10n.get(msg, {name: data.grammarVariant || data.name});
	}

	function shouldInclude (country) {
		var group = App.store.settings.group;
		if (!group) {
			return true;
		}
		if (group === 'un') { //UN members + Vatican
			return !(country.dependent || country.disputed);
		}
		return country.continent === group;
	}

	function flatten (array) {
		return Array.isArray(array[0]) ? array.reduce(function (a, b) {
			return a.concat(flatten(b));
		}, []) : array;
	}

	function calcDistance (poly1, poly2) {
		var coords1 = flatten(poly1.getLatLngs()), coords2 = flatten(poly2.getLatLngs()), min = Infinity;
		coords1.forEach(function (latlng1) {
			coords2.forEach(function (latlng2) {
				var dist = latlng1.distanceTo(latlng2);
				if (dist < min) {
					min = dist;
				}
			});
		});
		return min;
	}

	function checkAnswer (layer) {
		var distance, correct;

		if (question.code === layer.feature.properties.gu_a3) {
			distance = 0;
			correct = true;
		} else {
			distance = calcDistance(countriesLayers[question.code], layer) / 1000;
			correct = false;
		}

		return {
			correct: correct,
			distance: distance
		};
	}

	function showMapBoxTop (message) {
		$mapBoxTopContent.html(message);
		$mapBoxTop.show();
	}

	function hideMapBoxTop () {
		$mapBoxTop.hide();
		$mapBoxTopContent.empty();
	}

	function showMapBoxBottom (message, classes) {
		$mapBoxBottomContent.removeClass();
		if (classes) {
			$mapBoxBottomContent.addClass(classes);
		}
		$mapBoxBottomContent.html(message);
		$mapBoxBottom.show();
	}

	function hideMapBoxBottom () {
		$mapBoxBottom.hide();
		$mapBoxBottomContent.removeClass().empty();
	}

	function resetMapView (continent) {
		var center = {
			Africa: [5, 15],
			Americas: [30, -90],
			Asia: [60, 90],
			Europe: [60, 10],
			Oceania: [0, 175]
		}[continent] || [48.48, 2.2],
		zoom = {
			Africa: 3,
			Americas: 2,
			Asia: 2,
			Europe: 3,
			Oceania: 2
		}[continent] || 1;
		map.setView(center, zoom);
	}

	function endOfPile () {
		var message;
		if (drawPile && drawPile.length === 0) {
			startOrStop();
			message = document.webL10n.get('end-of-countries', {icon: '<span class="icon-play-arrow"></span>'});
			showMapBoxTop(message);
			return true;
		}
		return false;
	}

	function endOfMission () {
		var allDone = totalValidatedCounter === App.countries.length,
			currentDone = currentValidatedCounter === currentCounter,
			message;
		if (allDone || currentDone) {
			startOrStop();
			message = '<p>' + document.webL10n.get('end-of-mission-1') + '</p>';
			if (allDone) {
				message += '<p>' + document.webL10n.get('end-of-mission-2') + '</p>';
				message += '<p>' + document.webL10n.get('end-of-mission-3', {icon: '<span class="icon-stats2"></span>'}) + '</p>';
			} else {
				message += '<p>' + document.webL10n.get('end-of-mission-4') + '</p>';
				message += '<p>' + document.webL10n.get('end-of-mission-5', {icon: '<span class="icon-info"></span>'}) + '</p>';
			}
			showMapBoxTop(message);
			return true;
		}
		return false;
	}

	function startOrStop () {
		var message;

		if (!started) {
			drawPile = [];
			currentValidatedCounter = 0;
			totalValidatedCounter = 0;
			currentCounter = 0;
			$.each(App.countries, function (id, country) {
				var include = shouldInclude(country.properties);
				if (App.stats.isCountryValidated(country.properties.gu_a3)) {
					totalValidatedCounter++;
					if (include) {
						currentValidatedCounter++;
						currentCounter++;
					}
				} else {
					if (include) {
						drawPile.push(id);
						currentCounter++;
					}
				}
			});
			started = true;
			unselectCountry();

			if (endOfMission()) {
				return;
			} else {
				$('#btn-start').removeClass('icon-play-arrow').addClass('icon-stop');
				$('#btn-next').css('visibility', 'visible');

				message = document.webL10n.get('start-splash-1');
				if (currentValidatedCounter > 0) {
					message += '<br>';
					message += document.webL10n.get('start-splash-2', {nb: drawPile.length});
				}
				App.showSplashMessage(message, 'zoomInDown', drawQuestion);
			}
		} else {
			drawPile = null;
			started = false;

			$('#btn-start').removeClass('icon-stop').addClass('icon-play-arrow');
			$('#btn-next').css('visibility', 'hidden');

			hideMapBoxTop();
			hideMapBoxBottom();
		}
	}

	function drawQuestion () {
		var rnd, index, country, message = '';

		if (endOfMission()) {
			resetMapView();
			return;
		}
		if (endOfPile()) {
			resetMapView();
			return;
		}
		resetMapView(App.store.settings.group);

		rnd = Math.floor(Math.random() * drawPile.length);
		index = drawPile.splice(rnd, 1);
		country = App.countries[index];

		question = App.getCountryInfo(country.properties);
		question.tries = 0;

		if (App.store.settings.flag) {
			message += App.formatFlag(question.flag);
		}
		message += '<p>';
		if (App.store.settings.name) {
			message += document.webL10n.get('where-is-country', {is: formatIs(question)});
		} else if (App.store.settings.capital) {
			message += document.webL10n.get('where-is-country-capital', {capital: question.capital});
		} else if (App.store.settings.flag) {
			message += document.webL10n.get('where-is-country-flag');
		} else {
			message += document.webL10n.get('where-is-country-none');
		}
		message += '<br>';
		if (App.store.settings.details) {
			message += question.continent + document.webL10n.get('comma') + question.population;
			if (App.store.settings.capital && App.store.settings.name) {
				message += document.webL10n.get('comma') + document.webL10n.get('capital', {capital: question.capital});
			}
		} else if (App.store.settings.capital && App.store.settings.name) {
			message += document.webL10n.get('capital', {capital: question.capital});
		} else {
			message += '&nbsp;';
		}
		message += '</p>';

		showMapBoxTop(message);
		hideMapBoxBottom();
	}

	function selectCountry (e) {
		var info,
			result,
			message,
			validated;

		if (
			highlightedCountryLayer &&
			highlightedCountryLayer.feature.properties.gu_a3 === e.target.feature.properties.gu_a3
		) {
			return;
		}

		unselectCountry();
		highlightedCountryLayer = e.target;
		highlightedCountryLayer.setStyle({
			fillColor: '#22313F'
		});

		info = App.getCountryInfo(highlightedCountryLayer.feature.properties);
		if (!started) {
			message = App.formatFlag(info.flag);
			message += '<p><b>' + info.name + '</b><br>';
			message += info.continent + document.webL10n.get('comma') +
				info.population + document.webL10n.get('comma') +
				document.webL10n.get('capital', {capital: info.capital});
			message += '</p>';

			showMapBoxTop(message);
			return;
		}

		question.tries += 1;
		result = checkAnswer(highlightedCountryLayer);
		if (result.correct) {
			App.stats.addCountryScore(question.code, question.tries);
			validated = App.stats.isCountryValidated(question.code);

			message = document.webL10n.get(App.store.settings.name ? 'answer-right' : 'answer-right-country',
				{country: question.name, tries: question.tries});
			if (validated) {
				totalValidatedCounter++;
				currentValidatedCounter++;
				message += ' <span class="badge">';
				message += '<span class="icon-checkmark"></span> ';
				message += document.webL10n.get('validated');
				message += '</span>';
			}
			showMapBoxBottom(message);

			message = document.webL10n.get(validated ? 'answer-right-splash-validated' : 'answer-right-splash');
			App.showSplashMessage(message, null, drawQuestion);
		} else {
			if (result.distance <= 100) {
				message = document.webL10n.get('answer-wrong-1-close');
			} else {
				message = document.webL10n.get('answer-wrong-1-far', {distance: App.formatNumber(result.distance)});
			}
			message += ' ';
			if (App.store.settings.name) {
				message += document.webL10n.get('answer-wrong-2', {is: formatIs(info)});
			} else if (App.store.settings.capital) {
				message += document.webL10n.get('answer-wrong-2-capital', {is: formatIs(info), capital: info.capital});
			} else if (App.store.settings.flag) {
				message += document.webL10n.get('answer-wrong-2-flag', {
					is: formatIs(info),
					flag: App.formatFlag(info.flag)
				});
			} else {
				message += document.webL10n.get('answer-wrong-2-none', {is: formatIs(info)});
			}
			showMapBoxBottom(message, 'wrong');
		}
	}

	function unselectCountry () {
		if (highlightedCountryLayer) {
			mainLayer.resetStyle(highlightedCountryLayer);
			highlightedCountryLayer = null;
		}
	}

	init();

	return {};
};