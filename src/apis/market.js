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
	},

	fetchAssetThumbnail: (asset_id) => {
		return new Promise((resolve, reject) => {
			request({
				url: `https://www.roblox.com/Thumbs/Asset.ashx?width=420&height=420&assetId=${asset_id}`
			}, function (err, resp, body) {
				if(err) return reject(err)

				resolve({
					url: resp.request.uri.href,
					base64: new Buffer(body).toString('base64')
				})

				// console.log(string)
			})
		})
	}
}

module.exports = API