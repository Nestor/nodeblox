'use strict'

const request = require('request')
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

class UploadManager {
	constructor(r, filepath) {
		this.ROBLOX = r
	}

    _handle(asset_id, group_id) {
        return new Promise((resolve, reject) => {
            this._download(asset_id).then(filename => {
                console.log(filename)
                this._parseDecal(filename).then(decalId => {
                    console.log(decalId)
                    this._download(decalId).then(filename => {
                        console.log(filename)
                        this._upload(filename, group_id).then(success => {

                            console.log(success)
                        })
                    })
                })
            })
        })
    }

    _download(asset_id) {
        return new Promise((resolve, reject) => {
            var file = fs.createWriteStream(path.dirname(require.main.filename) + `/clothes/${asset_id}.png`)

            request({
                url: `https://www.roblox.com/asset/?id=${asset_id}`,
                gzip: true,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:49.0) Gecko/20100101 Firefox/49.0',
                    'Host': 'www.roblox.com',
                    'Upgrade-Insecure-Requests': "1",
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': "gzip",
                    'Connection': "keep-alive"
                }
            }).pipe(file)

            file.on('finish', () => {
                resolve(`${asset_id}.png`)
            })
        })
    }

    _upload(filename, group_id) {
        return new Promise((resolve, reject) => {
            request({
                url: "https://www.roblox.com/my/groups.aspx",
                jar: this.ROBLOX.jar
            }, (err, resp, body) => {
                var RequestVerificationToken = body.split('name="__RequestVerificationToken" type="hidden" value="')[1].split('"')[0];

                var data = {
                    file: fs.createReadStream(path.dirname(require.main.filename) + `/clothes/${filename}`),
                    __RequestVerificationToken: RequestVerificationToken,
                    assetTypeId: 11,
                    isOggUploadEnabled: 'True',
                    isTgaUploadEnabled: 'False',
                    groupId: group_id,
                    onVerificationPage: 'False',
                    name: 'here\'s the name'
                }

                request({
                    url: 'https://www.roblox.com/build/upload',
                    method: 'post',
                    formData: data,
                    jar: this.ROBLOX.jar,
                    followRedirect: false
                }, (err, resp, body) => {
                    console.log(body)
                    console.log(resp.headers)
                })
            })
        })
    }

    _parseDecal(filename) {
        return new Promise((resolve, reject) => {
            var file = fs.createReadStream(path.dirname(require.main.filename) + `/clothes/${filename}`)
            var buffer = []
            file.on('data', data => {
                    buffer.push(data.toString())
                })
                .on('end', () => {
                    var data = buffer.join('')
                    var matches = data.match(/\?id=(\d+?)<\/url>/)
                    if(matches) {
                        resolve(matches[1])
                    } else {
                        reject('Failed parsing file')
                    }
                })
        })
    }

	get_decal(asset_id) {
        return new Promise((resolve, reject) => {
            var gunzip = zlib.createGunzip();
            var buffer = [];
            var stream = request.get(`https://www.roblox.com/asset/?id=${asset_id}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:49.0) Gecko/20100101 Firefox/49.0',
                    'Host': 'www.roblox.com',
                    'Cookie': 'RBXEventTrackerV2=CreateDate=1/1/2017 5:34:23 PM&rbxid=183092079&browserid=5755051723; GuestData=UserID=-368115110; RBXMarketing=FirstHomePageVisit=1; __utma=200924205.549727097.1480054580.1483308015.1483310135.11; __utmz=200924205.1483297425.9.6.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); __gads=ID=3484ca990ebe0c35:T=1480054786:S=ALNI_MZ5Uhqli20zqKRH9cp_9cmWDhZFGw; RBXSource=rbx_acquisition_time=12/27/2016 4:13:48 PM&rbx_acquisition_referrer=&rbx_medium=Direct&rbx_source=&rbx_campaign=&rbx_adgroup=&rbx_keyword=&rbx_matchtype=&rbx_send_info=1;',
                    'Upgrade-Insecure-Requests': "1",
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': "gzip, deflate, br",
                    'Connection': "keep-alive"
                }
            }).pipe( gunzip );

            gunzip.on('data', (data) => {
                buffer.push(data.toString());
            });
            gunzip.on('end', () => {
                var string = buffer.join('');
                var id = string.split('?id=')[1].split('</url>')[0];
                resolve(id);
            });
        });
    }
}

module.exports = UploadManager;