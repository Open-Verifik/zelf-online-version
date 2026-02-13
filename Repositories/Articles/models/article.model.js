const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { String, Number, Boolean, Date } = mongoose.Schema.Types;

const { requiredField, defaultField, addBasicPlugins } = require("../../../Core/mongoose-utils");

//####################################################//

const ArticleSchema = new Schema({
    slug: { ...requiredField(String), unique: true },
    title: requiredField(String),
    description: { type: String, required: false },
    author: { type: String, required: false },
    date: { type: Date, required: false },
    markdownContent: requiredField(String),
    coverImage: { type: String, required: false },
    tags: [
        {
            type: String,
        },
    ],
    published: defaultField(Boolean, false),
    emailsSent: defaultField(Number, 0),
    emailsOpened: defaultField(Number, 0),
    sentToAllAt: defaultField(Date),
});

ArticleSchema.pre("save", async (next) => {
    const _this = this;
});

ArticleSchema.post("save", async (next) => {
    const _this = this;
});

/**
 * #model methods
 */
ArticleSchema.methods = {};

addBasicPlugins(ArticleSchema);

const Article = mongoose.model("Article", ArticleSchema);

module.exports = Article;
