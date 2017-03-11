const request = require('request');
const RobloxException = require('./errors/RobloxError');
const _ = require('lodash');

module.exports = class Roblox {

	constructor(obj) {
		let defaults = Roblox.defaults();
		if(_.isUndefined(obj.username) || _.isUndefined(obj.password)) throw new TypeError('Username or password undefined.');
		if(obj.fetchProxy && !(obj.fetchProxy instanceof Function)) throw new TypeError('fetchProxy not an instanceof function.');

		this.username 	= obj.username;
		this.password 	= obj.password;
		this.jar		= obj.jar 		|| defaults.jar;
		this.proxy 		= obj.proxy 	|| defaults.proxy;
		this.retries 	= obj.retries 	|| defaults.retries;
		this.logged_in 	= undefined;

		console.log(this);

		if(!_.isUndefined(obj.cookie)) {
			let cookie = request.cookie(`.ROBLOSECURITY=${obj.cookie}`);
			this.jar.setCookie(cookie, 'https://roblox.com/');
		}
	}

	static defaults() {
		return {
			jar: request.jar(),
			proxy: null,
			token: null,
			retries: 1,
			fetchProxy: () => {
				throw new RobloxError('fetchProxy not defined within constructor.');
			}
		}
	}

	get cookie() {
		return (this.jar._jar.store.idx["roblox.com"] &&
				this.jar._jar.store.idx["roblox.com"]["/"] &&
				this.jar._jar.store.idx["roblox.com"]["/"][".ROBLOSECURITY"]
				) ? this.jar._jar.store.idx["roblox.com"]["/"][".ROBLOSECURITY"].value
				  : "";
	}

	login() {
		return new Promise((resolve, reject) => {
			let redirects = [];

			request({
				url: "https://www.roblox.com/newlogin",
				jar: this.jar,
				method: 'POST',
				form: {
					'Username': this.username,
					'Password': this.password,
					'ReturnUrl': ''
				},
				followAllRedirects: true,
				followRedirect: (resp) => {
					if(resp.headers.location) redirects.push(resp.headers.location);
					console.log(redirects);
					return true;
				}
			}, (err, resp, body) => {
				if(err) return reject(err);

				if(redirects[0] == "/home?nl=true" || redirects[0] == "/home") {
					this.token = Roblox.parseTokenFromHtml(body);
					this.logged_in = true;
					return resolve(this);
				}

				return reject(false);
			});
		});
	}

	// Helper functions

	static parseTokenFromHtml(html) {
		let matches = html.match(/\.setToken\('(.*?)'\);/);
		return (matches && matches[1]) ? matches[1] : false;
	}



}