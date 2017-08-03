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

    // Initialize and start app
    start: function() {
        // about
        $('#about-open').on('click', function() {
            $('#about').attr('class', 'leftToCurrent');
            $('#world-map').attr('class', 'currentToRight');
        });
        $('#about-close').on('click', function() {
            $('#world-map').attr('class', 'rightToCurrent');
            $('#about').attr('class', 'currentToLeft');
        });

        // init localStorage
        App.store = Rhaboo.persistent(App.name);
        if (!App.store.stats) {
            App.store.write('stats', {});
        }

        // init map overlay: set line-height CSS property
        App.$splashMessage.css('line-height', (window.innerHeight - 95) + 'px');

        App.showSplashMessage(navigator.mozL10n.get('loading'), 'none');

        // load countries GeoJSON data and start app
        $.getJSON('data/geo.json', function(data) {
            App.countries = data.features;

            navigator.mozL10n.once(function() {
                App.worldMap = new WorldMap();
                App.stats = new Stats();

                App.hideSplashMessage();
            });
        });
    },

    getCountryInfo: function(properties) {
        var flag;
        var name = navigator.mozL10n.get(properties.name_long.replace(/ /g, '').replace(/\./g, '').replace(/'/g, ''));
        var continent = navigator.mozL10n.get(properties.continent.replace(/ /g, '').replace(/\./g, ''));
        var subregion = navigator.mozL10n.get(properties.subregion.replace(/ /g, '').replace(/\./g, ''));

        if ($.inArray(properties.name_long, ['Kosovo', 'Northern Cyprus', 'Somaliland']) >= 0) {
             flag = '_' + properties.name_long.replace(/ /, '_');
        }
        else {
            flag = properties.iso_a2.toLowerCase();
        }

        return {
            code: properties.gu_a3,
            name: name,
            continent: continent + (properties.continent !== properties.subregion ? ' / ' + subregion : ''),
            population: (properties.pop_est / 1000000).toFixed(1),
            flag: flag
        };

    },

    hideSplashMessage: function() {
        App.$splashMessageContent.removeClass().empty();
        App.$splashMessage.hide();
    },

    showSplashMessage: function(message, animation, animationendCb) {
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
            .one('webkitAnimationEnd oAnimationEnd animationend', function(e) {
                window.setTimeout(function () {
                    App.hideSplashMessage();
                    if (animationendCb) {
                        animationendCb();
                    }
                }, 1500);
            });
    }
};

window.addEventListener('load', App.start, false);
