const bluebird = require('bluebird');
const cookies = {PHPSESSID: 'your-phpssid'};
const osmosis = require('osmosis');
const PixivAppApi = new require('pixiv-app-api');
const pixivImg = require('pixiv-img');
const store = require('./store');

const pixiv = new PixivAppApi('username', 'password');

const getArtist = illust =>
    new bluebird(resolve => {
        const details = {};
        osmosis
            .get('https://www.pixiv.net/member.php', {id: illust.artist.artist_id})
            .config({cookies, keep_alive: true})
            .find('table.profile:first-of-type td')
            .set('td')
            .then(({index, last}, {td}) => {
                console.log(index, td);
                if (!(index % 2) || index === 0) {
                    details[td] = undefined;
                } else {
                    Object.keys(details)
                        .forEach(key => {
                            if (!details[key]) {
                                details[key] = td;
                            }
                        });
                }

                if (last) {
                    console.log(details);
                    resolve(details);
                }
            });
    });

const formatImageUrls = ({illust}) => {
    let imgUrls = [];
    /** @property illust.metaPages.imageUrls.original */
    if (illust.metaPages && illust.metaPages.length > 0) {
        imgUrls = illust.metaPages.map((page, index) => ({url: page.imageUrls.original, page: index}))
    } else {
        /** @property illust.metaSinglePage.originalImageUrl */
        imgUrls.push({url: illust.metaSinglePage.originalImageUrl, page: 0})
    }
    return imgUrls;
};

const downloadImages = ({illust_id}) =>
    bluebird.resolve(pixiv.illustDetail(illust_id, {}))
        .then(formatImageUrls)
        .each(({url, page}) =>
            pixivImg(url, `./images/${illust_id}_p${page}.jpg`)
                .then(() => console.log('saved image:', `./images/${illust_id}_p${page}.jpg`))
                .catch((error) => console.error('failed to save:', illust_id, error)));

const formatIllust = illust => ({
    illust_id: illust.illustId,
    title: illust.illustTitle,
    categories: illust.tags,
    width: illust.width,
    height: illust.height,
    pages: illust.pageCount,
    artist: {
        artist_id: illust.userId,
        name: illust.userName
    }
});

const search = (word, page = 1) => {
    osmosis
        .get('https://www.pixiv.net/search.php', {
            word,
            order: 'popular_d',
            type: 'illust',
            wlt: 1920,
            wgt: 1920,
            hlt: 1080,
            hgt: 1080,
            ratio: 0.5,
            p: page
        })
        .config({cookies, keep_alive: true})
        .set({items: '#js-mount-point-search-result-list@data-items'})
        .data(({items}) =>
            bluebird.resolve(JSON.parse(items))
                .map(formatIllust)
                .then(illusts =>
                    bluebird.all([
                        bluebird.resolve(illusts).map(getArtist),
                        bluebird.resolve(illusts).map(store.insert),
                        bluebird.resolve(illusts).map(downloadImages)
                    ]))
                .spread((artist) => {
                    console.log(artist);
                })
        )
        .log(console.log)
        .debug(console.log)
        .error(console.log);
};

// for (let i=1; i < 2; i++) {
//     search('風景', i);
// }

//getArtist({artist: {artist_id: 2799637}});

module.exports = {
    getArtist,
    search
};
