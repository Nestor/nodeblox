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
		this.jar		= obj.jar 		|| defaults.jar;
		this.proxy 		= obj.proxy 	|| defaults.proxy;
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
				url: 'https://www.roblox.com/home',
				followRedirect: (response) => {
					return response.headers.location === "https://web.roblox.com/home"
				}
			}, (err, resp, body) => {
				if(err) reject(err);
				if(resp.statusCode == 200) {
					this.token = Roblox.parseTokenFromHtml(body);
					this.logged_in = true;
				}

				resolve(resp.statusCode == 200);
				
			});
		});
	}

	fetchSettings() {
		return new Promise((resolve, reject) => {
			request({
				url: "https://www.roblox.com/my/settings/json",
				followAllRedirects: true,
				followRedirect: (response) => {
					return response.headers.location === "https://web.roblox.com/my/settings/json";
				}
			}, (err, resp, body) => {
				if(err) reject(err);
				if(resp.statusCode != 200) return reject('Tried to fetch settings while not logged in.');
				
				resolve( JSON.parse(body) );
			});
		});
	}

	// Group functions

	fetchGroupFunds(group_id) {
		return new Promise((resolve, reject) => {
			request({
				url: `https://www.roblox.com/my/groupadmin.aspx?gid=${group_id}`,
				followRedirect: (response) => {
					return response.headers.location === `https://web.roblox.com/my/groupadmin.aspx?gid=${group_id}`;
				},
				followAllRedirects: true
			}, (err, resp, body) => {
				let matches = body.match(/Group Funds:[\s\S]*?<span class=\'robux\'>([\s\S]*?)<\/span>/);
				return (matches && matches[1]) ? resolve(matches[1]) : reject('Group Admin disallowed for given group.');
			});
		});
	}

	fetchGroupJoinRequests(group_id) {
		return new Promise((resolve, reject) => {
			request({
				url: `https://www.roblox.com/my/groupadmin.aspx?gid=${group_id}`,
				followRedirect: (response) => {
					return response.headers.location === `https://web.roblox.com/my/groupadmin.aspx?gid=${group_id}`;
				},
				followAllRedirects: true
			}, (err, resp, body) => {
				if(err) reject(err);
				if(resp.statusCode != 200) return reject('Group Admin disallowed for given group.');

				let regexp = /data-rbx-join-request="(.*?)" class="btn-control btn-control-medium accept-join-request">Accept<\/span>/g;
				let join_requests = [];
				let matches = body.match(regexp);
				for (var i = 0; i < matches.length; i++) {
					join_requests.push(matches[i].replace(/\D/g, ""));
				}

				let roblox_users = [];
				regexp = /<td><a href="https:\/\/(?:web|www)\.roblox\.com\/users\/(.*?)\/.*?<\/td>/g;
				matches = body.match(regexp);
				for (var i = 0; i < matches.length; i++) {
					roblox_users.push(matches[i].replace(/">.*?<\/a/g, "").replace(/\D/g, ""));
				}

				resolve(_.zipObject(roblox_users, join_requests));
			});
		});
	}

	acceptGroupJoinRequest(request_id) {
		return new Promise((resolve, reject) => {
			request({
				url: "https://www.roblox.com/group/handle-join-request",
				method: 'POST',
				headers: {
					'X-CSRF-TOKEN': this.token
				},
				form: {
					groupJoinRequestId: request_id
				}
			}, (err, resp, body) => {
				if(err) return reject(err);
				resolve();
			});
		});
	}

	groupPayout(group_id, user_id, amount) {
		return new Promise((resolve, reject) => {
			let obj = {};
			obj[user_id.toString()] = amount.toString();
			request({
				url: `https://www.roblox.com/groups/${group_id}/one-time-payout/1/false`,
				form: {
					percentages: JSON.stringify(obj)
				},
				headers: {
					'X-CSRF-TOKEN': this.token
				},
				method: 'POST',
				followAllRedirects: false,
				followRedirect: false
			}, (err, resp, body) => {
				if(err) return reject(err);
				resolve(resp.statusCode === 200);
			});
		});
	}

	// Helper functions

	static parseTokenFromHtml(html) {
		let matches = html.match(/\.setToken\('(.*?)'\);/);
		return (matches && matches[1]) ? matches[1] : false;
	}
}
