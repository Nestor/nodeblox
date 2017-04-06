const request = require('request')
const _ = require('lodash')

const GroupAPI = {
	fetchInfo: (group_id) => {
		return new Promise((resolve, reject) => {
			request({
				url: `https://api.roblox.com/groups/${group_id}`
			}, (err, body, resp) => {
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
	}
}

module.exports = GroupAPI