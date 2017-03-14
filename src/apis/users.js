const request = require('request');
const _ = require('lodash');

var UserAPI = {
	fetchUsername: (user_id) => {
		return new Promise((resolve, reject) => {
			request({
				url: `https://api.roblox.com/Users/${user_id}`,
			}, (err, resp, body) => {
				if(err) return reject(err);

				json = JSON.parse(body);
				if(!_.isUndefined(json.errors)) return reject(new Error('UserID not valid'));

				resolve(json.Username);
			});
		});
	},
	fetchId: (username) => {
		return new Promise((resolve, reject) => {
			request({
				url: `https://api.roblox.com/users/get-by-username?username=${username}`
			}, (err, resp, body) => {
				if(err) return reject(err);

				json = JSON.parse(body);
				//console.log(json);
				if(!json.Id) return reject(new Error('Username invalid.'));

				resolve(json.Id);
			});
		});
	}
}

module.exports = UserAPI;