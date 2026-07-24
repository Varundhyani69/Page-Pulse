const axios = require('axios');
const cheerio = require('cheerio');
const Audit = require('../models/Audit');

const TIMEOUT = 8000;

// Check that a string is a proper http/https URL
function isValidUrl(str) {
    try {
        const { protocol } = new URL(str);
        return protocol === 'http:' || protocol === 'https:';
    } catch {
        return false;
    }
}

// Fetch a URL and parse it into a report object
async function fetchAndParse(url, httpClient = axios) {
    const start = Date.now();

    let response;
    try {
        response = await httpClient.get(url, {
            timeout: TIMEOUT,
            maxRedirects: 5,
            validateStatus: () => true, // don't throw on 4xx/5xx, we want the status code
            responseType: 'text',
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PagePulseBot/1.0)' },
        });
    } catch (err) {
        if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
            const e = new Error(`The request to "${url}" timed out after ${TIMEOUT / 1000} seconds.`);
            e.code = 'TIMEOUT';
            throw e;
        }
        const e = new Error(`Could not reach "${url}". Check the URL and try again. (${err.message})`);
        e.code = 'NETWORK_ERROR';
        throw e;
    }

    const responseTimeMs = Date.now() - start;

    // Reject non-HTML responses (PDFs, images, JSON APIs, etc.)
    const contentType = (response.headers['content-type'] || '').toLowerCase();
    if (!contentType.includes('text/html')) {
        const e = new Error(
            `The URL returned a non-HTML response (Content-Type: "${contentType}"). Page Pulse can only audit HTML pages.`
        );
        e.code = 'NOT_HTML';
        throw e;
    }

    // Parse HTML with cheerio (server-side jQuery)
    const $ = cheerio.load(response.data);

    const title = $('title').first().text().trim() || null;
    const metaDescription = $('meta[name="description"]').attr('content')?.trim() || null;
    const h1Count = $('h1').length;

    // Images missing an alt attribute or with an empty alt=""
    let missingAltCount = 0;
    $('img').each((_, el) => {
        const alt = $(el).attr('alt');
        if (alt === undefined || alt.trim() === '') missingAltCount++;
    });

    // Word count — strip scripts/styles first so their code isn't included
    $('script, style, noscript').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText ? bodyText.split(' ').filter(Boolean).length : 0;

    return { statusCode: response.status, responseTimeMs, title, metaDescription, h1Count, missingAltCount, wordCount };
}

// POST /api/audit
async function runAudit(req, res, next) {
    const { url } = req.body;

    if (!url || typeof url !== 'string' || !url.trim()) {
        return res.status(400).json({ error: 'A "url" field is required in the request body.' });
    }

    const trimmedUrl = url.trim();

    if (!isValidUrl(trimmedUrl)) {
        return res.status(400).json({
            error: `"${trimmedUrl}" is not a valid URL. Please include the scheme, e.g. https://example.com`,
        });
    }

    let report;
    try {
        report = await fetchAndParse(trimmedUrl);
    } catch (err) {
        if (err.code === 'TIMEOUT') return res.status(504).json({ error: err.message });
        if (err.code === 'NETWORK_ERROR') return res.status(502).json({ error: err.message });
        if (err.code === 'NOT_HTML') return res.status(422).json({ error: err.message });
        return next(err);
    }

    // Save to DB — a failure here won't break the response
    try {
        await Audit.create({ url: trimmedUrl, report });
    } catch (dbErr) {
        console.warn('Could not save audit to DB:', dbErr.message);
    }

    return res.status(200).json({ url: trimmedUrl, report });
}

// GET /api/audits
async function getAudits(req, res, next) {
    try {
        const audits = await Audit.find().sort({ createdAt: -1 }).limit(10).lean();
        return res.status(200).json(audits);
    } catch (err) {
        return next(err);
    }
}

module.exports = { runAudit, getAudits, fetchAndParse }; // fetchAndParse exported for tests
