'use strict';

var request = require('request');
const _ = require('lodash');

const InventoryAPI = require('./apis/inventory');
const UserAPI = require('./apis/users');
const GroupAPI = require('./apis/groups');
const MarketAPI = require('./apis/market');
exports.UserAPI = UserAPI;
exports.InventoryAPI = InventoryAPI;
exports.GroupAPI = GroupAPI;
exports.MarketAPI = MarketAPI;

const UploadManager = require('./managers/UploadManager')

exports.Roblox = class Roblox {
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
			let cookie = request.cookie(`.ROBLOSECURITY=${obj.cookie}; Domain=.roblox.com; HostOnly=false`);
			this.jar.setCookie(cookie, 'http://roblox.com');
		}

		this.upload = new UploadManager(this)
	}

	static defaults() {
		return {
			jar: request.jar(),
			proxy: undefined,
			token: undefined,
			retries: 1,
			fetchProxy: () => {
				throw new Error('fetchProxy not defined within constructor.');
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

	checkIp() {
		return new Promise((resolve, reject) => {
			request({
				url: 'https://api.ipify.org?format=json'
			}, (err, resp, body) => {
				console.log(body)
			})
		})
	}

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
				if(resp.statusCode != 200) return reject(new Error('Tried to fetch settings while not logged in.'));

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
				return (matches && matches[1]) ? resolve(matches[1]) : reject(new Error('Group Admin disallowed for given group.'));
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
				if(resp.statusCode != 200) return reject(new Error('Group Admin disallowed for given group.'));

				let regexp = /data-rbx-join-request="(.*?)" class="btn-control btn-control-medium accept-join-request">Accept<\/span>/g;
				let join_requests = [];
				let matches = body.match(regexp);
				if(!matches) return resolve({}) // if no matches, then there's no requests

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
				resolve(body === '{"success":true}');
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

	// Trading functions -- REEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE

	getTrades(type, user_id, index) {
		if(!type) type = 'inbound';

		return new Promise((resolve, reject) => {
			request({
				url: "https://www.roblox.com/my/money.aspx/getmyitemtrades",
				method: 'POST',
				headers: {
					'X-CSRF-TOKEN': this.token
				},
				json: {
					statustype: type,
					startindex: (index)?index:0
				},
				followRedirect: false
			}, (err, resp, body) => {
				if(err) return reject(err);
				if(resp.statusCode != 200) return reject(new Error('Error getting trades.'));

				let trade_strings = JSON.parse(body['d'])['Data'];
				let trades = _.map(trade_strings, val => { return JSON.parse(val) });
				return resolve((user_id)
					   ? _.filter(trades, { TradePartnerID: user_id.toString() })
					   : trades);
			});
		});
	}

	tradeAction(cmd, trade_session, json) {
		return new Promise((resolve, reject) => {
			request({
				url: "https://www.roblox.com/trade/tradehandler.ashx",
				method: 'POST',
				headers: {
					'X-CSRF-TOKEN': this.token
				},
				form: {
					cmd: cmd,
					TradeID: trade_session,
					TradeJSON: json
				}
			}, (err, resp, body) => {
				if(err) return reject(err);
				if(resp.statusCode != 200) return reject(new Error(`Error ${cmd}ing trade`));
				// do separate commands have separate responses?
				if(cmd == 'pull') return resolve( JSON.parse(JSON.parse(body)['data']) );
				if(cmd == 'maketrade') return resolve( JSON.parse(body)["msg"] == "Trade completed!" );
			});
		});
	}

	sendTrade(participants, uaids) {
		return new Promise((resolve, reject) => {
			let json = {
				AgentOfferList: [
					{
						AgentID: participants[0],
						OfferList: [
							{
								UserAssetID: uaids[0]
							}
						],
						OfferRobux: 0,
						OfferValue: 1
					},
					{
						AgentID: participants[1],
						OfferList: [
							{
								UserAssetID: uaids[1]
							}
						],
						OfferRobux: 0,
						OfferValue: 1
					}
				],
				isActive: false,
				TradeStatus: "Open"
			}

			request({
				url: "https://www.roblox.com/Trade/tradehandler.ashx",
				method: 'POST',
				headers: {
					'X-CSRF-TOKEN': this.token
				},
				form: {
					cmd: 'send',
					TradeJSON: JSON.stringify(json)
				}
			}, (err, resp, body) => {
				if(err) return reject(err);
				if(resp.statusCode != 200) return reject(new Error('Request failed.'));
				resolve(JSON.parse(body)['msg'] == "Trade sent!");
			});
		});
	}

	fetchAuditKicks(group_id) {
		return new Promise((resolve, reject) => {
			request({
				url: `https://www.roblox.com/Groups/Audit.aspx?groupid=${group_id}`
			}, (err, resp, body) => {
				let matches = body.match(/<td class="Description"><a href="\/User\.aspx\?ID=(\d+)">(\w+)<\/a> kicked user <a href="\/User\.aspx\?ID=(\d+)">(\w+)<\/a>\.<\/td>/g)
				let ret = _.map(matches, match => {
					let regex = match.match(/<td class="Description"><a href="\/User\.aspx\?ID=(\d+)">(\w+)<\/a> kicked user <a href="\/User\.aspx\?ID=(\d+)">(\w+)<\/a>\.<\/td>/)
					return {
						admin: {
							username: regex[2],
							userId: Number(regex[1])
						},
						user: {
							username: regex[4],
							userId: Number(regex[3])
						}
					}
				})

				resolve(ret)
			})
		})
	}

	joinGroup(groupId) {
		return new Promise((resolve, reject) => {
			request({
				url: `https://www.roblox.com/My/Groups.aspx?gid=${groupId}`,
				jar: this.jar
			}, (err, resp, body) => {
				let keys = [
					'__VIEWSTATE',
					'__VIEWSTATEGENERATOR',
					'__EVENTVALIDATION',
				]

				let data = Roblox.parseValuesFromHtml(body, keys)
				data = _.extend(data, {
					__EVENTTARGET: 'JoinGroupDiv',
					__EVENTARGUMENT: 'Click',
					__LASTFOCUS: ''
				})

				request({
					url: `https://www.roblox.com/groups/group.aspx?gid=${groupId}`,
					method: 'post',
					jar: this.jar,
					form: data,
					followRedirect: false
				}, (err, resp, body) => {
					resolve( resp.headers.location === `https://www.roblox.com/My/Groups.aspx?gid=${groupId}` )
				})
			})
		})
	}

	leaveGroup(groupId) {
		return new Promise((resolve, reject) => {
			request({
				url: `https://www.roblox.com/My/Groups.aspx?gid=${groupId}`,
				jar: this.jar
			}, (err, resp, body) => {
				let keys = [
					'__VIEWSTATE',
					'__VIEWSTATEGENERATOR',
					'__EVENTVALIDATION',
					'__RequestVerificationToken'
				]

				let data = Roblox.parseValuesFromHtml(body, keys)
				data = _.extend(data, {
					__EVENTTARGET: '',
					__EVENTARGUMENT: '',
					__LASTFOCUS: '',
					ctl00$cphRoblox$GroupSearchBar$SearchKeyword: 'Search all groups',
					ctl00$cphRoblox$rbxGroupRoleSetMembersPane$dlRolesetList: 21153668,
					ctl00$cphRoblox$rbxGroupRoleSetMembersPane$RolesetCountHidden: 19,
					ctl00$cphRoblox$rbxGroupRoleSetMembersPane$dlUsers_Footer$ctl01$PageTextBox: 1,
					ctl00$cphRoblox$rbxGroupRoleSetMembersPane$currentRoleSetID: 21153668,
					ctl00$cphRoblox$ctl01: ''
				})

				request({
					url: `https://www.roblox.com/My/Groups.aspx?gid=${groupId}`,
					method: 'post',
					jar: this.jar,
					form: data,
					followRedirect: false
				}, (err, resp, body) => {
					resolve( resp.headers.location === `https://www.roblox.com/My/Groups.aspx` )
				})

			})
		})
	}

	checkIp() {
		request({
			url: "https://api.ipify.org/?format=json"
		}, function(err, resp, body) {
			console.log(body)
		})
	}

	fetchRobux() {
		return new Promise((resolve, reject) => {
			request({
				url: "https://www.roblox.com/navigation/userdata"
			}, (err, resp, body) => {
				if(err) return reject(err)

				try {
					resolve( Number(JSON.parse(body)['CurrencyBalancesDisplay']['RobuxText']) )
				} catch(e) {
					reject(new Error('Not logged in'))
				}
			})
		})
	}

	// Helper functions

	static parseTokenFromHtml(html) {
		let matches = html.match(/\.setToken\('(.*?)'\);/);
		return (matches && matches[1]) ? matches[1] : false;
	}

	static parseValuesFromHtml(html, keys) {
		let obj = _.zipObject(keys, _.map(keys, key => {
			let matches = html.match(`name="${key}" id="${key}" value="(.*?)"`)
			return (matches && matches[1]) ? matches[1] : false
		}))

		return obj
	}
}


