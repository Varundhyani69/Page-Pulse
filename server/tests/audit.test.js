// Mock mongoose so tests don't need a real DB connection
jest.mock('mongoose', () => {
    const actual = jest.requireActual('mongoose');
    return {
        ...actual,
        connect: jest.fn().mockResolvedValue(true),
        connection: { on: jest.fn(), once: jest.fn() },
        Schema: actual.Schema,
        model: jest.fn().mockReturnValue({
            create: jest.fn().mockResolvedValue({}),
            find: jest.fn().mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            }),
        }),
    };
});

// Mock axios so no real HTTP requests are made during tests
jest.mock('axios');

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const app = require('../src/index');

const FIXTURE_HTML = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.html'), 'utf8');

function mockHtmlResponse(html, status = 200) {
    return {
        status,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        data: html,
    };
}

// --- Happy path ---
describe('POST /api/audit — happy path', () => {
    beforeEach(() => {
        axios.get.mockResolvedValue(mockHtmlResponse(FIXTURE_HTML));
    });

    it('returns 200 with correct report fields', async () => {
        const res = await request(app).post('/api/audit').send({ url: 'https://example.com' });

        expect(res.status).toBe(200);
        expect(res.body.report.title).toBe('Sample Fixture Page');
        expect(res.body.report.metaDescription).toBe('A fixture page used for unit testing the Page Pulse auditor.');
        expect(res.body.report.h1Count).toBe(2);
        expect(res.body.report.missingAltCount).toBe(2);
        expect(res.body.report.wordCount).toBeGreaterThan(0);
        expect(res.body.report.statusCode).toBe(200);
    });
});

// --- Invalid URL ---
describe('POST /api/audit — invalid URL', () => {
    it('returns 400 when url is missing', async () => {
        const res = await request(app).post('/api/audit').send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/url.*required/i);
    });

    it('returns 400 for a malformed URL string', async () => {
        const res = await request(app).post('/api/audit').send({ url: 'not-a-url' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/not a valid url/i);
    });

    it('returns 400 for a URL without http/https', async () => {
        const res = await request(app).post('/api/audit').send({ url: 'ftp://example.com' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/not a valid url/i);
    });
});

// --- Timeout ---
describe('POST /api/audit — timeout', () => {
    it('returns 504 when the fetch times out', async () => {
        const err = new Error('timeout of 8000ms exceeded');
        err.code = 'ECONNABORTED';
        axios.get.mockRejectedValue(err);

        const res = await request(app).post('/api/audit').send({ url: 'https://slow-site.example.com' });
        expect(res.status).toBe(504);
        expect(res.body.error).toMatch(/timed out/i);
    });
});

// --- Non-HTML ---
describe('POST /api/audit — non-HTML content type', () => {
    it('returns 422 for a PDF', async () => {
        axios.get.mockResolvedValue({ status: 200, headers: { 'content-type': 'application/pdf' }, data: '' });
        const res = await request(app).post('/api/audit').send({ url: 'https://example.com/file.pdf' });
        expect(res.status).toBe(422);
        expect(res.body.error).toMatch(/non-html/i);
    });

    it('returns 422 for application/json', async () => {
        axios.get.mockResolvedValue({ status: 200, headers: { 'content-type': 'application/json' }, data: '{}' });
        const res = await request(app).post('/api/audit').send({ url: 'https://api.example.com/data' });
        expect(res.status).toBe(422);
        expect(res.body.error).toMatch(/non-html/i);
    });
});

// --- Network error ---
describe('POST /api/audit — network error', () => {
    it('returns 502 when the host is unreachable', async () => {
        const err = new Error('getaddrinfo ENOTFOUND no-such-host.invalid');
        err.code = 'ENOTFOUND';
        axios.get.mockRejectedValue(err);

        const res = await request(app).post('/api/audit').send({ url: 'https://no-such-host.invalid' });
        expect(res.status).toBe(502);
        expect(res.body.error).toMatch(/could not reach/i);
    });
});

// --- History ---
describe('GET /api/audits', () => {
    it('returns 200 with an array', async () => {
        const res = await request(app).get('/api/audits');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});
