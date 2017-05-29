const request = require('request')
const _ = require('lodash')

const GroupAPI = {
	fetchInfo: (group_id) => {
		return new Promise((resolve, reject) => {
			request({
				url: `https://api.roblox.com/groups/${group_id}`
			}, (err, resp, body) => {
				if(err) return reject(err)

				if(resp.statusCode != 200) return reject(new Error('Group invalid.'))

				resolve(JSON.parse(body))
			})
		})
	},
	fetchOwner: (group_id) => {
		return new Promise((resolve, reject) => {
			this.fetchInfo()
			.then(info => {
				resolve(info.Owner)
			})
			.catch(err => {
				reject(err)
			})
		})
	},
	fetchUserIsInGroup: (userId, groupId) => {
		return new Promise((resolve, reject) => {
			request({
				url: `https://www.roblox.com/Game/LuaWebService/HandleSocialRequest.ashx?method=IsInGroup&playerid=${userId}&groupid=${groupId}`
			}, (err, resp, body) => {
				if(err) return reject(err)

				resolve(body === '<Value Type="boolean">true</Value>')
			})
		})
	}
}

module.exports = GroupAPI