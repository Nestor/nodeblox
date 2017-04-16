const request = require('request')

var API = {
	fetchAssetInfo: (asset_id) => {
		return new Promise((resolve, reject) => {
			request({
				url: `https://api.roblox.com/marketplace/productinfo?assetid=${asset_id}`
			}, function (err, resp, body) {
				if(err) reject(err)

				let json = JSON.parse(body)
				if(json.errors) reject( new Error("Invalid assetId") )

				return json
			})
		})
	}
}

module.exports = API