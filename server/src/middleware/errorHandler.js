// Catches any error passed to next(err) and returns a clean JSON response.
// The four-parameter signature is required by Express to recognise this as an error handler.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
    console.error('[Error]', err.message);
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Something went wrong. Please try again.';
    res.status(status).json({ error: message });
}

module.exports = errorHandler;
