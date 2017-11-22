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

/*global App, $*/
/*jshint camelcase: false*/
//jscs:disable requireCamelCaseOrUpperCaseIdentifiers

App.Stats = function () {
	"use strict";

	var $clearDialog = $('#stats-clear-dialog');

	function open () {
		$('#world-map').attr('class', 'currentToLeft');
		$('#stats').attr('class', 'rightToCurrent');
	}

	function close () {
		$('#stats').attr('class', 'currentToRight');
		$('#world-map').attr('class', 'leftToCurrent');
	}

	function init () {
		$('#stats-open').on('click', function () {
			refresh();
			open();
		});
		$('#stats-back').on('click', function () {
			close();
		});
		$('#stats-clear').on('click', function () {
			$clearDialog.removeClass('hide').addClass('show');
		});
		$('#stats-clear-cancel').on('click', function (e) {
			e.preventDefault();
			$clearDialog.removeClass('show').addClass('hide');
		});
		$('#stats-clear-validate').on('click', function (e) {
			e.preventDefault();
			clear();
		});

		$('#stats-list').html(App.countries.map(function (country) {
			var info = App.getCountryInfo(country.properties);

			return [
				'<li id="score-' + info.code + '"' + (info.dependent ? ' class="dependent"' : '') + '>',
				'<aside class="pack-start">',
				App.formatFlag(info.flag),
				'</aside>',
				'<aside class="pack-end">',
				'</aside>',
				'<p style="padding-top: 0.5rem;">' + info.nameSimple + '</p>', //TODO move to stylesheet
				'<p style="line-height: 1.3rem;">',
				info.continent,
				'<br>',
				info.population,
				', ', //TODO l10n ?
				document.webL10n.get('capital', {capital: info.capital}),
				'</p>',
				'</li>'
			].join('');
		}).join(''));
	}

	function addCountryScore (code, score) {
		if (App.store.stats[code]) {
			App.store.stats[code].push(score);
		} else {
			App.store.stats.write(code, [score]);
		}
	}

	function clear () {
		App.store.write('stats', {});

		$('#overall-score-avg').html(document.webL10n.get('no-value'));
		$('#overall-score-min').html(document.webL10n.get('no-value'));
		$('#overall-score-last').html(document.webL10n.get('no-value'));

		App.countries.forEach(function (country) {
			$('#score-' + country.properties.gu_a3 + ' .pack-end').html('');
		});

		$clearDialog.removeClass('show').addClass('hide');
	}

	function isCountryValidated (code) {
		if (App.store.stats[code]) {
			return App.store.stats[code].filter(function (score) {
				return score === 1;
			}).length >= 2;
		} else {
			return false;
		}
	}

	function refresh () {
		var overallScoreAvg = 0, overallScoreMin = 0, overallScoreLast = 0,
			validatedCounter = 0,
			statsSize = 0;

		$.each(App.store.stats, function (code, scores) {
			var html,
				scoreAvg, scoreMin, scoreMax, scoreLast,
				validated = isCountryValidated(code);

			scoreAvg = scores.reduce(function (sum, v) {
				return sum + v;
			}, 0) / scores.length;
			scoreMin = Math.min.apply(Math, scores);
			scoreMax = Math.max.apply(Math, scores);
			scoreLast = scores[scores.length - 1];
			overallScoreAvg += scoreAvg;
			overallScoreMin += scoreMin;
			overallScoreLast += scoreLast;
			statsSize += 1;

			if (validated) {
				validatedCounter += 1;
				html = '<span class="icon-checkmark"></span>';
			} else {
				html = '<p>' + document.webL10n.get('score-best', {
					value: scoreMin ? App.formatNumber(scoreMin) : document.webL10n.get('no-value')
				}) + '</p>';
				html += '<p>' + document.webL10n.get('score-last', {
					value: scoreLast ? App.formatNumber(scoreLast) : document.webL10n.get('no-value')
				}) + '</p>';
				html += '<p>' + document.webL10n.get('score-worst', {
					value: scoreMax ? App.formatNumber(scoreMax) : document.webL10n.get('no-value')
				}) + '</p>';
				html += '<p>' + document.webL10n.get('score-average', {
					value: scoreAvg ? App.formatNumber(scoreAvg, true) : document.webL10n.get('no-value')
				}) + '</p>';
			}
			$('#score-' + code + ' .pack-end').html(html);
		});
		if (statsSize) {
			overallScoreAvg = App.formatNumber(overallScoreAvg / statsSize, true);
			overallScoreMin = App.formatNumber(overallScoreMin / statsSize, true);
			overallScoreLast = App.formatNumber(overallScoreLast / statsSize, true);
		}

		$('#stats-list-header h2').html(
			document.webL10n.get('scores-by-country', {
				nb: App.formatNumber(validatedCounter),
				total: App.formatNumber(App.countries.length)
			})
		);
		$('#overall-score-avg').html(overallScoreAvg ? overallScoreAvg : document.webL10n.get('no-value'));
		$('#overall-score-min').html(overallScoreMin ? overallScoreMin : document.webL10n.get('no-value'));
		$('#overall-score-last').html(overallScoreLast ? overallScoreLast : document.webL10n.get('no-value'));
	}

	init();

	return {
		addCountryScore: addCountryScore,
		isCountryValidated: isCountryValidated
	};
};