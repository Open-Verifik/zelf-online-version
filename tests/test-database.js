const Sequelize = require('sequelize');
const config = require('./test-config');
// Option 1: Passing parameters separately
let sequelize = null;

const initDB = () => {
    sequelize = new Sequelize(config.mysql.database, config.mysql.username, config.mysql.password, {
        host: config.mysql.host,
        dialect: 'mysql',
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
    });
};

/**
 * @return {Object} The sequelize DB instance
 */
const getDB = () => {
    return sequelize;
};


/**
 * Disconnects from the DB gracefully
 * @return {Promise}
 */
const disconnect = () => {
    return sequelize.close();
};


module.exports = {
    getDB,
    initDB,
    Sequelize,
    disconnect,
};