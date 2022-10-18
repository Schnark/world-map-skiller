(function () {
"use strict";

function getData (callback) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'data/geo.json');
	xhr.responseType = 'json';
	xhr.onload = function () {
		callback(xhr.response);
	};
	xhr.send();
}

function extractData (data) {
	var codes = [], population = {}, flag = {};
	data.features.forEach(function (feature) {
		var code = feature.properties.gu_a3;
		codes.push(code);
		population[code] = feature.properties.pop_est;
		flag[code] = feature.properties.iso_a2.toLowerCase();
	});
	return {
		codes: codes,
		population: population,
		flag: flag
	};
}

function getL10n (countries, lang, callback) {
	document.webL10n.setLanguage(lang, function () {
		var data = {};
		countries.forEach(function (code) {
			var key;
			key = code + '-name';
			data[key] = document.webL10n.get(key);
			key = code + '-capital';
			data[key] = document.webL10n.get(key);
			key = code + '-is';
			data[key] = document.webL10n.get(key, {}, 'x');
			key = code + '-grammar';
			data[key] = document.webL10n.get(key, {}, 'x');
		});
		callback(data);
	});
}

function getAllL10n (countries, callback) {
	getL10n(countries, 'de', function (de) {
		getL10n(countries, 'fr', function (fr) {
			getL10n(countries, 'en', function (en) {
				callback(en, de, fr);
			});
		});
	});
}

function formatPopulation (n) {
	if (n >= 1e6) {
		return (n / 1e6) + 'M';
	}
	if (n >= 1e3) {
		return (n / 1e3) + 'k';
	}
	return n;
}

function formatName (code, l10n, isData) {
	var is = l10n[code + '-is'], grammar = l10n[code + '-grammar'];
	if (is === 'x') {
		is = '';
	} else {
		is = isData[is - 1];
	}
	if (grammar !== 'x') {
		is += ' ' + grammar;
	}
	if (is) {
		is = ' (' + is + ')';
	}
	return l10n[code + '-name'] + is + '<br>' + l10n[code + '-capital'];
}

function buildTable (countries, flag, population, en, de, fr) {
	document.getElementById('table').innerHTML =
		'<tr><th>Code</th><th>Flag</th><th>Pop.</th><th>en</th><th>de</th><th>fr</th></tr>' +
		countries.map(function (code) {
			return [
				'<tr>',
				'<th><code>' + code + '</code></th>',
				'<td class="f32"><span class="flag ' + flag[code] + '"></span></td>',
				'<td>' + formatPopulation(population[code]) + '</td>',
				'<td lang="en">' + formatName(code, en, ['is the']) + '</td>',
				'<td lang="de">' + formatName(code, de, ['ist der', 'ist die', 'ist das', 'sind die']) + '</td>',
				'<td lang="fr">' + formatName(code, fr, []) + '</td>',
				'</tr>'
			].join('');
		}).join('');
}

function run () {
	getData(function (data) {
		data = extractData(data);
		getAllL10n(data.codes, function (en, de, fr) {
			buildTable(data.codes, data.flag, data.population, en, de, fr);
		});
	});
}

run();

})();