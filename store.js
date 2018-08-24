const bluebird = require('bluebird');
const knex = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: "./pixiv.db"
    },
    useNullAsDefault: true
});

const insert = (item) => {
    console.log(item);

    const artist = {...item.artist};
    const illust = {...item, artist_id: item.artist.artist_id};
    const categories = [...item.categories];

    delete illust.artist;
    delete illust.categories;

    return bluebird.all([
            knex('illusts').insert(illust).catch(() => {}),
            knex('artists').insert(artist).catch(() => {}),
        ])
        .spread(() =>
            bluebird.resolve(categories)
                .each(category =>
                    console.log(category) ||
                    knex('categories').insert({category, illust_id: illust.illust_id})
                        .catch(() => {})))
        .then(() => knex.destroy());
};

function setup() {
    return knex.schema
        .createTable('artists', table => {
            table.integer('artist_id').primary().unique();
            table.string('name');
            table.string('email');
            table.string('instagram');
            table.string('facebook');
            table.string('twitter');
        })
        .createTable('illusts', table => {
            table.integer('illust_id').primary().unique();
            table.string('title');
            table.integer('width');
            table.integer('height');
            table.integer('pages');
            table.integer('artist_id');
        })
        .createTable('categories', table => {
            table.unique(['category', 'illust_id']);
            table.string('category');
            table.integer('illust_id');
        })
        .then(console.log)
        .catch(console.error);
}

module.exports = {
    insert,
    setup
};
