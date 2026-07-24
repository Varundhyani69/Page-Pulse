const mongoose = require('mongoose');

// The shape of the report object stored inside each audit
const reportSchema = new mongoose.Schema(
    {
        statusCode: { type: Number, required: true },
        responseTimeMs: { type: Number, required: true },
        title: { type: String, default: null },
        metaDescription: { type: String, default: null },
        h1Count: { type: Number, required: true },
        missingAltCount: { type: Number, required: true },
        wordCount: { type: Number, required: true },
    },
    { _id: false }
);

const auditSchema = new mongoose.Schema({
    url: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    report: { type: reportSchema, required: true },
});

module.exports = mongoose.model('Audit', auditSchema);
