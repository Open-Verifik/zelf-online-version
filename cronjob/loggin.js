const MESSAGE = Object.freeze({
    cronjob: "\n================================ CRONJOB ================================\n",
    cronjobEnd: "\n================================ ====== ================================\n",
    scraping: "SCRAPING"
})
const cronjobLog = (...args) => {
    console.info(MESSAGE.cronjob, args, MESSAGE.cronjobEnd)
}

const cronjobError = (...args) => {
    console.error(MESSAGE.cronjob, args, MESSAGE.cronjobEnd)
}

const scrapingLog = (...args) => {
    console.info(MESSAGE.scraping, args)
}

const scrapingError = (...args) => {
    console.error(MESSAGE.scraping, args)
}


module.exports = {
    scrapingLog,
    scrapingError,
    cronjobLog,
    cronjobError
}