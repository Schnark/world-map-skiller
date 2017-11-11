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
        '#E74C3C', // ALIZARIN: India, Australia
        '#E26A6A', // SUNGLO: Russia
        '#2ECC71', // EMERALD: Argentina, Mongolia
        '#95A5A6', // CONCRETE: USA, China, Greenland, Antartica
        '#F1C40F', // SUN FLOWER: Brazil, Algeria
        '#E67E22', // CARROT: Canada, Mexico
        '#4183D7'  // ROYAL BLUE: France
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
            {zoomControl: false, attributionControl: false,
                worldCopyJump: false, maxBoundsViscosity: 0.5,
                minZoom: 1, maxZoom: 8} // TODO maxBounds: [[-180, 100], [210, -90]], update leaflet library first
        );
        map.doubleClickZoom.disable();

        mainLayer = L.geoJson(
            App.countries,
            // NOTE the alphabetical order by code coincides with the desired order for overlapping countries
            {
                style: function(feature) {
                    return {
                        color: 'white',
                        fillColor: feature.properties.mapcolor7 ? colors[feature.properties.mapcolor7 - 1] : '#e2f7fb',
                        fillOpacity: feature.properties.mapcolor7 ? 1 : 0.5,
                        opacity: 1,
                        weight: 1,
                        stroke: !!feature.properties.mapcolor7
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
        return document.webL10n.get(msg, {name: data.grammarVariant || data.name});
    }

    function checkAnswer(layer) {
        var min = Infinity;
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
                    if (latlng1.distanceTo(latlng2) < min) {
                        min = latlng1.distanceTo(latlng2);
                    }
                });
            });
            distance = min / 1000;
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

        message = '';
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
            message += question.continent + ', ' + question.population;
            if (App.store.settings.capital && App.store.settings.name) {
                message += ', ' + document.webL10n.get('capital', {capital: question.capital});
            }
        } else if (App.store.settings.capital && App.store.settings.name) {
            message += document.webL10n.get('capital', {capital: question.capital})
        } else {
            message += '&nbsp;';
        }
        message += '</p>';

        showMapBoxTop(message);
        hideMapBoxBottom();
    }

    function endOfPile() {
        var message;
        if (drawPile && drawPile.length === 0) {
            startOrStop();

            message = document.webL10n.get('end-of-countries', {icon: '<span class="icon-play-arrow"></span>'});
            showMapBoxTop(message);

            return true;
        }
        return false;
    }

    function endOfMission() {
        var message;

        if (validatedCounter === App.countries.length) { // TODO - shouldOmit
            startOrStop();

            message = '<p>' + document.webL10n.get('end-of-mission-1') + '</p>';
            message += '<p>' + document.webL10n.get('end-of-mission-2') + '</p>';
            message += '<p>' + document.webL10n.get('end-of-mission-3', {icon: '<span class="icon-stats2"></span>'}) + '</p>';
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
        highlightedCountryLayer.setStyle({
            fillColor: '#22313F'
        });

        info = App.getCountryInfo(highlightedCountryLayer.feature.properties);
        if (!started) {
            message = App.formatFlag(info.flag);
            message += '<p><b>' + info.name + '</b><br>';
            message += info.continent + ', ' +
                info.population + ', ' +
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

            message = document.webL10n.get('answer-right', {tries: question.tries});
            if (validated) {
                validatedCounter += 1;
                message += ' <span class="badge">';
                message += '<span class="icon-checkmark"></span> ';
                message += document.webL10n.get('validated');
                message += '</span>';
            }
            showMapBoxBottom(message);

            message = document.webL10n.get(validated ? 'answer-right-splash-validated' : 'answer-right-splash');
            App.showSplashMessage(message, null, drawQuestion);
        }
        else {
            if (result.distance <= 100) {
                message = document.webL10n.get('answer-wrong-1-close');
            }
            else {
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
                    flag: App.formatFlag(info.flag, true)
                });
            } else {
                message += document.webL10n.get('answer-wrong-2-none', {is: formatIs(info)});
            }
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
            else { // TODO if (!shouldOmit)
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

                message = document.webL10n.get('start-splash-1');
                if (validatedCounter > 0) {
                    message += '<br>';
                    message += document.webL10n.get('start-splash-2', {nb: drawPile.length});
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
        }
    }

    init();

    return {
    };
}
