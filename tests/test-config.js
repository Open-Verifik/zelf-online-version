require('dotenv').config();

const API_ROOT = '/api';

const configuration = {
    name: 'API',
    env: process.env.NODE_ENV || 'test',
    port: process.env.PORT || '3000',
    base_url: process.env.BASE_URL,
    db: {
        uri: process.env.MONGODB_URI,
        user: process.env.MONGO_USER,
        password: process.env.MONGO_PASSWORD,
        test_uri: 'mongodb://127.0.0.1:27017/testdb'
    },
    mysql: {
        database: process.env.MYSQL_TEST_DATABASE || 'mat_web_test',
        username: process.env.MYSQL_TEST_USERNAME || 'root',
        password: process.env.MYSQL_TEST_PASSWORD || 'secret',
        host: process.env.MYSQL_TEST_HOST || '127.0.0.1',
    },
    // key to generate/verify JWT
    JWT_SECRET: process.env.CONNECTION_KEY,
    encryptionSecret: process.env.CONNECTION_KEY, // @note: you can change it to something different
    // will be used to building route paths
    basePath: (path) => {
        return API_ROOT.replace(/\/$/, '') + '/' + path.replace(/^\//, '')
    },
    full_url: process.env.BASE_URL + ':' + process.env.PORT,
    strings: {
        slogan: 'Comida que inspira'
    },
    email_providers: {
        mailgun: {
            user: process.env.MAILGUN_USER,
            password: process.env.MAILGUN_PASS,
            host: process.env.MAILGUN_HOST,
            port: process.env.MAILGUN_PORT,
            from: process.env.MAILGUN_DEFAULT_FROM
        }
    },
    twilio: {
        accountSID: process.env.TWILIO_ACCOUNT_SID,
        token: process.env.TWILIO_AUTH_TOKEN,
    },
    google: {
        recaptchaSecret: process.env.RECAPTCHA_SECRET_KEY,
    }
};

module.exports = configuration;