/**
 * WorldMapSkiller
 *
 * written by Valéry Febvre
 * vfebvre@aester-eggs.com
 *
 * Copyright 2015 Valéry Febvre
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

function Stats() {
    var $page = $('#stats');
    var $clearDialog = $('#stats-clear-dialog', $page);

    function init() {
        $('#stats-open').on('click', function() {
            refresh();
            open();
        });
        $('#stats-back').on('click', function() {
            close();
        });
        $('#stats-clear').on('click', function() {
            $clearDialog.removeClass('hide').addClass('show');
        });
        $('#stats-clear-cancel').on('click', function(e) {
            e.preventDefault();
            $clearDialog.removeClass('show').addClass('hide');
        });
        $('#stats-clear-validate').on('click', function(e) {
            e.preventDefault();
            clear();
        });

        $.each(App.countries, function(i, country) {
            var $li;
            var info = App.getCountryInfo(country.properties);

            $li = $([
                '<li id="score-' + info.code + '">',
                '<aside class="pack-start">',
                '<span class="f32"><span class="flag ' + info.flag + '"></span></span>',
                '</aside>',
                '<aside class="pack-end">',
                '</aside>',
                '<p>' + info.name + '</p>',
                '<p>' + info.continent + ' (' + document.webL10n.get('nb-people', {population: info.population}) + ')</p>',
                '</li>'
            ].join(''));
            $('#stats-list', $page).append($li);
        });
    }

    function addCountryScore(code, score) {
        if (App.store.stats[code]) {
            App.store.stats[code].push(score);
        }
        else {
            App.store.stats.write(code, [score]);
        }
    }

    function clear() {
        App.store.write('stats', {});

        $('#overall-score-avg', $page).html('-');
        $('#overall-score-min', $page).html('-');
        $('#overall-score-last', $page).html('-');

        $.each(App.countries, function(i, country) {
            $('#score-' + country.properties.gu_a3 + ' .pack-end', $page).html('');
        });

        $clearDialog.removeClass('show').addClass('hide');
    }

    function close() {
        $('#stats').attr('class', 'currentToRight');
        $('#world-map').attr('class', 'leftToCurrent');
    }

    function isCountryValidated(code) {
        if (App.store.stats[code]) {
            return $.grep(App.store.stats[code], function(score) {return score === 1;}).length >= 2;
        }
        else {
            return false;
        }
    }

    function open() {
        $('#world-map').attr('class', 'currentToLeft');
        $('#stats').attr('class', 'rightToCurrent');
    }

    function refresh() {
        var overallScoreAvg = 0, overallScoreMin = 0, overallScoreLast = 0;
        var validatedCounter = 0;
        var statsSize = 0;

        $.each(App.store.stats, function(code, scores) {
            var html;
            var scoreAvg, scoreMin, scoreMax, scoreLast;
            var validated = isCountryValidated(code);

            scoreAvg = scores.reduce(function(sum, v) { return sum + v; }, 0) / scores.length;
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
            }
            else {
                html  = '<p>' + document.webL10n.get('score-best', {value: scoreMin ? App.formatNumber(scoreMin) : document.webL10n.get('no-value')}) + '</p>';
                html += '<p>' + document.webL10n.get('score-last', {value: scoreLast ? App.formatNumber(scoreLast) : document.webL10n.get('no-value')}) + '</p>';
                html += '<p>' + document.webL10n.get('score-worst', {value: scoreMax ? App.formatNumber(scoreMax) : document.webL10n.get('no-value')}) + '</p>';
                html += '<p>' + document.webL10n.get('score-average', {value: scoreAvg ? App.formatNumber(scoreAvg, true) : document.webL10n.get('no-value')}) + '</p>';
            }
            $('#score-' + code + ' .pack-end', $page).html(html);
        });
        if (statsSize) {
            overallScoreAvg = App.formatNumber(overallScoreAvg / statsSize, true);
            overallScoreMin = App.formatNumber(overallScoreMin / statsSize, true);
            overallScoreLast = App.formatNumber(overallScoreLast / statsSize, true);
        }

        $('#stats-list-header h2', $page).html(
            document.webL10n.get('scores-by-country', {nb: App.formatNumber(validatedCounter), total: App.formatNumber(App.countries.length)})
        );
        $('#overall-score-avg', $page).html(overallScoreAvg ? overallScoreAvg : document.webL10n.get('no-value'));
        $('#overall-score-min', $page).html(overallScoreMin ? overallScoreMin : document.webL10n.get('no-value'));
        $('#overall-score-last', $page).html(overallScoreLast ? overallScoreLast : document.webL10n.get('no-value'));
    }

    init();

    return {
        addCountryScore: addCountryScore,
        isCountryValidated: isCountryValidated
    };
}
