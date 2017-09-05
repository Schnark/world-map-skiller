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

function WorldMap() {
    var $page = $('#world-map');
    var $mapBoxTop = $('#map-box-top', $page).hide();
    var $mapBoxTopContent = $('div', $mapBoxTop);
    var $mapBoxBottom = $('#map-box-bottom', $page).hide();
    var $mapBoxBottomContent = $('div', $mapBoxBottom);

    var started = false;

    var drawPile;
    var question;
    var clickLock = false;
    var validatedCounter;

    var map;
    var mainLayer;
    var countriesLayers = [];
    var highlightedCountryLayer;
    var colors = [ // http://www.flatuicolorpicker.com/
        '#E74C3C', // ALIZARIN : india, australia
        '#E26A6A', // SUNGLO : URSS
        '#2ECC71', // EMERALD : argentina, mongolia
        '#95A5A6', // CONCRETE : USA, chine, groenland, antartica
        '#F1C40F', // SUN FLOWER : brazil, algeria
        '#E67E22', // CARROT : canada, mexico
        '#4183D7'  // ROYAL BLUE: france
    ];

    var animations = [
        'bounceInDown',
        'lightSpeedIn',
        'tada',
        'rubberBand',
        'flip',
        'rotateIn',
        'zoomInDown'
    ];

    function init() {
        // toolbar buttons
        $('#btn-start', $page).on('click', function(e) {
            startOrStop();
        });
        $('#btn-next', $page).on('click', function(e) {
            drawQuestion();
        });
        $('#btn-reset-map-view', $page).on('click', function(e) {
            resetMapView();
        });

        // init map
        $('#map', $page)
            .width(window.innerWidth)
            .height(window.innerHeight);

        map = L.map(
            'map',
            {zoomControl: false, attributionControl: false, worldCopyJump: true, minZoom: 1, maxZoom: 8}
        );
        map.doubleClickZoom.disable();

        mainLayer = L.geoJson(
            App.countries,
            {
                style: function(feature) {
                    return {
                        color: 'white',
                        fillColor: colors[feature.properties.mapcolor7 - 1],
                        fillOpacity: 1,
                        opacity: 1,
                        weight: 1
                    };
                },
                onEachFeature: function(feature, layer) {
                    countriesLayers[feature.properties.gu_a3] = layer;
                    layer.on({
                        click: function(e) {
                            if (clickLock) {
                                return;
                            }
                            clickLock = true;

                            selectCountry(e);

                            window.setTimeout(function() {
                                clickLock = false;
                            }, 100);
                        }
                    });
                }
            }
        ).addTo(map);

        resetMapView();
    }

    function formatIs(data) {
        var msg = 'is';
        if (data.isVariant) {
            msg += '-v' + data.isVariant;
        }
        return navigator.mozL10n.get(msg, {name: data.grammarVariant || data.name});
    }

    function checkAnswer(layer) {
        var min;
        var distance;
        var correct;
        var stats;

        if (question.code === layer.feature.properties.gu_a3) {
            distance = 0;
            correct = true;
        }
        else {
            // compute minimal distance between 2 polygons
            $.each(getCountryBiggestPolygon(countriesLayers[question.code])._latlngs, function(i, latlng1) {
                $.each(getCountryBiggestPolygon(layer)._latlngs, function(j, latlng2) {
                    if (!min || latlng1.distanceTo(latlng2) < min) {
                        min = latlng1.distanceTo(latlng2);
                    }
                });
            });
            distance = (min / 1000).toFixed(0);
            correct = false;
        }

        return {
            correct: correct,
            distance: distance
        };
    }

    function drawQuestion() {
        var rnd;
        var index;
        var country;
        var message;

        resetMapView();

        if (endOfMission()) {
            return;
        }
        if (endOfPile()) {
            return;
        }

        rnd = Math.floor(Math.random() * drawPile.length);
        index = drawPile.splice(rnd, 1);
        country = App.countries[index];

        question = App.getCountryInfo(country.properties);
        question.tries = 0;

        message = '<span class="f32"><span class="flag ' + question.flag + '"></span></span>';
        message += '<p>' + navigator.mozL10n.get('where-is-country', {is: formatIs(question)}) + '<br>';
        message += question.continent + ' (' + navigator.mozL10n.get('nb-people', {population: question.population}) + ')</p>';

        showMapBoxTop(message);
        hideMapBoxBottom();
    }

    function endOfPile() {
        var message;
        if (drawPile && drawPile.length === 0) {
            startOrStop();

            message = navigator.mozL10n.get('end-of-countries', {icon: '<span class="icon-play-arrow"></span>'});
            showMapBoxTop(message);

            return true;
        }
        return false;
    }

    function endOfMission() {
        var message;

        if (validatedCounter === App.countries.length) {
            startOrStop();

            message = '<p>' + navigator.mozL10n.get('end-of-mission-1') + '</p>';
            message += '<p>' + navigator.mozL10n.get('end-of-mission-2') + '</p>';
            message += '<p>' + navigator.mozL10n.get('end-of-mission-3', {icon: '<span class="icon-stats2"></span>'}) + '</p>';
            showMapBoxTop(message);

            return true;
        }
        return false;
    }

    function getCountryBiggestPolygon(layer) {
        var biggest;

        if (layer instanceof L.MultiPolygon) {
            // find biggest polygon
            $.each(layer._layers, function(i, sublayer) {
                if (!biggest || sublayer._latlngs.length > biggest._latlngs.length) {
                    biggest = sublayer;
                }
            });
        }
        else {
            biggest = layer;
        }

        return biggest;
    }

    function hideMapBoxBottom() {
        $mapBoxBottom.hide();
        $mapBoxBottomContent.removeClass().empty();
    }

    function hideMapBoxTop() {
        $mapBoxTop.hide();
        $mapBoxTopContent.empty();
    }

    function resetMapView() {
        map.setView([48.48, 2.2], 1);
    }

    function selectCountry(e) {
        var info;
        var result;
        var message;
        var validated;

        if (highlightedCountryLayer && highlightedCountryLayer.feature.properties.gu_a3 === e.target.feature.properties.gu_a3) {
            return;
        }

        unselectCountry();
        highlightedCountryLayer = e.target;
        //highlightedCountryLayer.bringToFront();
        highlightedCountryLayer.setStyle({
            fillColor: '#22313F'
            //weight: 3,
            //color: '#f33'
        });

        info = App.getCountryInfo(highlightedCountryLayer.feature.properties);
        if (!started) {
            message = '<span class="f32"><span class="flag ' + info.flag + '"></span></span>';
            message += '<p><b>' + info.name + '</b><br>';
            message += info.continent + ' (' + navigator.mozL10n.get('nb-people', {population: info.population}) + ')</p>';

            showMapBoxTop(message);
            return;
        }

        question.tries += 1;
        result = checkAnswer(highlightedCountryLayer);
        if (result.correct) {
            App.stats.addCountryScore(question.code, question.tries);
            validated = App.stats.isCountryValidated(question.code);

            message = navigator.mozL10n.get('answer-right', {tries: question.tries});
            if (validated) {
                validatedCounter += 1;
                message += ' <span class="badge">';
                message += '<span class="icon-checkmark"></span> ';
                message += navigator.mozL10n.get('validated');
                message += '</span>';
            }
            showMapBoxBottom(message);

            message = navigator.mozL10n.get(validated ? 'answer-right-splash-validated' : 'answer-right-splash');
            App.showSplashMessage(message, null, drawQuestion);
        }
        else {
            if (result.distance <= 100) {
                message = navigator.mozL10n.get('answer-wrong-1-close');
            }
            else {
                message = navigator.mozL10n.get('answer-wrong-1-far', {distance: result.distance});
            }
            message += ' ' + navigator.mozL10n.get('answer-wrong-2', {is: formatIs(info)});
            showMapBoxBottom(message, 'wrong');
        }
    }

    function showMapBoxBottom(message, classes) {
        $mapBoxBottomContent.removeClass();
        if (classes) {
            $mapBoxBottomContent.addClass(classes);
        }
        $mapBoxBottomContent.html(message);
        $mapBoxBottom.show();
    }

    function showMapBoxTop(message) {
        $mapBoxTopContent.html(message);
        $mapBoxTop.show();
    }

    function startOrStop() {
        var message;

        drawPile = [];
        validatedCounter = 0;
        $.each(App.countries, function(id, country) {
            if (App.stats.isCountryValidated(country.properties.gu_a3)) {
                validatedCounter += 1;
            }
            else {
                drawPile.push(id);
            }
        });

        if (!started) {
            started = true;
            unselectCountry();

            if (endOfMission()) {
                return;
            }
            else {
                $('#btn-start').removeClass('icon-play-arrow').addClass('icon-stop');
                $('#btn-next').css('visibility', 'visible');

                message = navigator.mozL10n.get('start-splash-1');
                if (validatedCounter > 0) {
                    message += '<br>';
                    message += navigator.mozL10n.get('start-splash-2', {nb: App.countries.length - validatedCounter});
                }
                App.showSplashMessage(message, 'zoomInDown', drawQuestion);
            }
        }
        else {
            started = false;

            $('#btn-start').removeClass('icon-stop').addClass('icon-play-arrow');
            $('#btn-next').css('visibility', 'hidden');

            drawPile = null;

            hideMapBoxTop();
            hideMapBoxBottom();
        }
    }

    function unselectCountry() {
        if (highlightedCountryLayer) {
            mainLayer.resetStyle(highlightedCountryLayer);
            highlightedCountryLayer = null;
            //highlightedCountryLayer.bringToBack();
        }
    }

    init();

    return {
    };
}
