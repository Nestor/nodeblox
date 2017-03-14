const request = require('request');
const Axios = require('axios');

var API = {
    getInventory: (user_id) => {
        return new Promise((resolve, reject) => {
			var types = [8,18,19,41,42,43,44,45,46,47];
			var left = types.length;
			var inventory = [];
			for (var i = 0; i < types.length; i++) {
				getPage(types[i]);
			}

			function getPage(type, cursor, tries) {
                if(!tries) tries = 1;
				request.get('https://inventory.roblox.com/v1/users/' + roblox_user_id + '/assets/collectibles?limit=100&assetType=' + type.toString() + ((cursor)?'':'&cursor=' + cursor), {timeout:5000}, function(err, resp, body) {
					if(err) { return ((tries == 3)?complete(type):getPage(type, cursor, tries+1)); }
					json = JSON.parse(body);
					if(json.errors) { return complete(type); }
					if(json.nextPageCursor == null) { return push(json.data, () => { complete(type); }) }
						push(json.data, () => { getPage(type, json.nextPageCursor); });
					});
			}

            function push(json, cb) {
                var left_to_process = json.data.InventoryItems.length;
                json.data.InventoryItems.forEach(function(item) {
                    rap += parseInt(item.AveragePrice);
                    inventory.push({
                        name: item.Name,
                        rap: parseInt(item.AveragePrice),
                        uaid: item.UserAssetID,
                        link: item.ItemLink,
                        img: item.ImageLink,
                        serial: item.SerialNumber
                    });
                    if(!--left_to_process) {
                        cb();
                    }
                });
            }

            function complete(type) {
                if(!--left) {
                    resolve({
                        meta: {
                            count: inventory.length,
                            rap: rap
                        },
                        data: inventory
                    });
                }
            }
        })
    },
    getAssetOwners: (asset_id) => {
        return new Promise((resolve, reject) => {
            var owners = [];
            function getPage(asset_id, page_cursor, attempts) {
                console.log(owners.length);
                var url = "https://inventory.roblox.com/v1/assets/"+asset_id.toString()+"/owners?sortOrder=Asc&limit=100" + (page_cursor?"&cursor=" + page_cursor:"");
                Axios.get(url).then((response) => {
                    return (response.data.nextPageCursor == null)
                        ? push(response.data, () => { resolve(owners); })
                        : push(response.data, () => { getPage(asset_id, response.data.nextPageCursor, 1); });
                })
                .catch((err) => {
                    console.log(err);
                    return (attempts == 3) ? resolve(owners) : getPage(asset_id, page_cursor, attempts+1);
                });
            }

            function push(json, callback) {
                var left_to_process = json.data.length;
                json.data.forEach(function(item) {
                    if(item.owner != null)
                        owners.push({
                            uaid: item.userAssetID,
                            serial: item.serialNumber,
                            owner: item.owner.userId
                        });
                    if(!--left_to_process) {
                        callback();
                    }
                });
            }

            getPage(asset_id, undefined, 1);
        });
    },
    getLimiteds: () => {
        return new Promise((resolve, reject) => {
            API.getInventory(1).then((inventory) => {
                for(var i = 0; i < inventory.length; i++)
                    inventory[i].id = parseInt(inventory[i].split('?id=')[1]);
                resolve(inventory);
            });
        });
    }
}

module.exports = API;