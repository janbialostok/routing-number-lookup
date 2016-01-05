'use strict';
var http = require('http'),
	Bluebird = require('bluebird'),
	merge = require('util-extend'),
	cheerio = require('cheerio');

var RoutingNumberLookup = function (options) {
	this.disableParsing = options.disableParsing;
	this.routingNumber = options.routingNumber;
	this.html = undefined;
	this.parseOptions = options.parseOptions;
	this.parseData = undefined;
	this.htmlRaw = '';
	this.url = 'http://www.usbanklocations.com/crn.php?q=';
	return this;
};

RoutingNumberLookup.prototype.setRoutingNumber = function (rn) {
	if (typeof rn === 'string') {
		this.routingNumber = rn;
	}
	return this;
};

RoutingNumberLookup.prototype.lookup = function (callback) {
	var url = this.url + this.routingNumber,
		data = '';
	var lookup = function (cb) {
		http.get(url, function (res) {
			res.on('data', function (chunk) {
				data += chunk;
			});
			res.on('error', function (err) {
				cb(err);
			});
			res.on('end', function () {
				cb(null, data);
			});
		}).on('error', function (err) {
			cb(err);
		});
	};
	var _this = this;
	if (typeof callback === 'function') {
		lookup(function (err, res) {
			_this.htmlRaw = res;
			if (!this.disableParsing) {
				_this.html = cheerio.load(res);
			}
			callback(err, _this);
		});
	}
	else {
		return new Bluebird(function (resolve, reject) {
			lookup(function (err, res) {
				if (err) {
					reject(err);
				}
				else {
					_this.htmlRaw = res;
					if (!_this.disableParsing) {
						_this.html = cheerio.load(res);
					}
					resolve(_this);
				}
			});
		});
	}
};

RoutingNumberLookup.prototype.parse = function (options) {
	var _this  = this,
		document = _this.html;
	options = options || {};
	var parseRules = merge(_this.parseOptions, options),
		parsed = parseRules.map(function (rule) {
			var selected = document(rule.selector);
			return selected[rule.get]();
		});
	this.parseOptions = parseRules;
	this.parseData = parsed;
	return this;
};

//Example
// var test = new RoutingNumberLookup({
// 	routingNumber: '021000021',
// 	parseOptions: [
// 		{
// 			selector: '.ublcrnright',
// 			get: 'html'
// 		},
// 		{
// 			selector: '.ublcrndetail tr',
// 			get: 'html'
// 		}
// 	]
// }).lookup()
// 	.then(function (self) {
// 		self.parse();
// 		var isValid = (/\d+\s?\w+\s?valid/gi.test(self.parseData[0])) ? true : false,
// 			bankName;
// 		(function () {
// 			var str = self.parseData[1],
// 				start = str.indexOf('<a') + 1;
// 			while (str[start] !== '>') {
// 				start++;
// 			}
// 			str = str.substring(start + 1, str.length);
// 			var end = str.indexOf('</a');
// 			bankName = str.substring(0, end);
// 		})();
// 		console.log({
// 			valid: isValid,
// 			name: bankName
// 		});
// 	})
// 	.catch(function (err) {
// 		console.log(err);
// 	});

module.exports = RoutingNumberLookup;