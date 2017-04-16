const request = require('request')

var API = {
	fetchAssetInfo: (asset_id) => {
		return new Promise((resolve, reject) => {
			request({
				url: `https://api.roblox.com/marketplace/productinfo?assetid=${asset_id}`
			}, function (err, resp, body) {
				if(err) return reject(err)

				var json = JSON.parse(body)
				if(json.errors) return reject( new Error("Invalid assetId") )

				resolve(json)
			})
		})
	}
}

module.exports = API