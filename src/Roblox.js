var request = require('request');
const RobloxException = require('./errors/RobloxError');
const _ = require('lodash');

module.exports = class Roblox {

	constructor(obj) {
		let defaults = Roblox.defaults();
		if(_.isUndefined(obj.username) || _.isUndefined(obj.password)) throw new TypeError('Username or password undefined.');
		if(obj.fetchProxy && !(obj.fetchProxy instanceof Function)) throw new TypeError('fetchProxy not an instanceof function.');

		this.username 	= obj.username;
		this.password 	= obj.password;
		this.jar	= obj.jar 	|| defaults.jar;
		this.proxy 	= obj.proxy 	|| defaults.proxy;
		this.retries 	= obj.retries 	|| defaults.retries;
		this.logged_in 	= undefined;

		request = request.defaults({
			jar: this.jar,
			proxy: this.proxy,
			timeout: 4000
		});

		if(!_.isUndefined(obj.cookie)) {
			let cookie = request.cookie(`.ROBLOSECURITY=${obj.cookie}`);
			this.jar.setCookie(cookie, 'https://roblox.com/');
		}
	}

	static defaults() {
		return {
			jar: request.jar(),
			proxy: undefined,
			token: undefined,
			retries: 1,
			fetchProxy: () => {
				throw new RobloxError('fetchProxy not defined within constructor.');
			}
		}
	}

	// Object get/set methods

	get cookie() {
		return (this.jar._jar.store.idx["roblox.com"] &&
				this.jar._jar.store.idx["roblox.com"]["/"] &&
				this.jar._jar.store.idx["roblox.com"]["/"][".ROBLOSECURITY"]
				) ? this.jar._jar.store.idx["roblox.com"]["/"][".ROBLOSECURITY"].value
				  : "";
	}

	/*
	*	ROBLOX-interfacing code.
	*/

	// account functions

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
					return true;
				}
			}, (err, resp, body) => {
				if(err) return reject(err);

				if(redirects[0] == "/home?nl=true" || redirects[0] == "/home") {
					this.token = Roblox.parseTokenFromHtml(body);
					this.logged_in = true;
					return resolve(true);
				}

				return resolve(false);
			});
		});
	}

	fetchLoggedIn() {
		return new Promise((resolve, reject) => {
			request({
				url: 'https://www.roblox.com/my/account/json',
				jar: this.jar,
				followRedirect: false
			}, (err, resp, body) => {
				if(err) reject(err);

			});
		});
	}

	fetchSettings() {
		return new Promise((resolve, reject) => {
			request({
				url: "https://www.roblox.com/my/settings/json"
			}, (err, resp, body) => {
				if(err) reject(err);
				console.log(body);
				resolve(body);
			});
		});
	}

	// Helper functions

	static parseTokenFromHtml(html) {
		let matches = html.match(/\.setToken\('(.*?)'\);/);
		return (matches && matches[1]) ? matches[1] : false;
	}



}
