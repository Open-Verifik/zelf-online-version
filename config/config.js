const config = require('../Core/config');

module.exports = {
  "development": {
    "username": config.mysql.username,
    "password": config.mysql.password,
    "database": config.mysql.database,
    "host": config.mysql.host,
    "port": config.mysql.port,
    "dialect": "mysql",
    
  },
  "test": {
    "username": "root",
    "password": "secret",
    "database": "database_test",
    "host": "127.0.0.1",
    "dialect": "mysql"
  },
  "production": {
    "username": config.mysql.username,
    "password": config.mysql.password,
    "database": config.mysql.database,
    "host": config.mysql.host,
    "port": config.mysql.port,
    "dialect": "mysql"
  }
};
