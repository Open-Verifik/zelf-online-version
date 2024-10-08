const mongoose = require('mongoose');

const mongooseStringQuery = require('mongoose-string-query');

const timestamps = require('mongoose-timestamp');

const mongoosePaginate = require('mongoose-paginate');

const Schema = mongoose.Schema;

//####################################################//

const ScrapingSchema = new Schema({
    isExist: {
        type: Boolean,
        default: false,
    },
    isScrapingInProcuradoria: {
        type: Boolean,
        default: false,
    },
    existInProcuradoria: {
        type: Boolean,
    },
    documentNumber: {
        type: String,
        required: true,
        unique: true,
        index: {
            unique: true
        },
    },
    documentType: {
        type: mongoose.Schema.Types.String,
        enum: [
            'CC',
            'CE',
            'PA',
            'RC',
            'TI',
            'PEP',
        ],
        default: 'CC',
        required: true,
    },
});

ScrapingSchema.pre('save', async (next) => {
    const _this = this;
});

ScrapingSchema.post('save', async (next) => {
    const _this = this;
});


ScrapingSchema.pre('save', async function (next) {

});

/**
 * #model methods
 */
ScrapingSchema.methods = {
};

ScrapingSchema.plugin(timestamps);

ScrapingSchema.plugin(mongooseStringQuery);

ScrapingSchema.plugin(mongoosePaginate);

const Scraping = mongoose.model('scraping', ScrapingSchema);

module.exports = Scraping;