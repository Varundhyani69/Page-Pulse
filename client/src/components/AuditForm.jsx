/**
 * URL input form.  Controlled by the parent via `url` / `setUrl` props
 * so App.jsx owns the state (makes it easy to clear after a successful audit
 * or pre-fill from history, if we ever add that).
 */
export default function AuditForm({ url, setUrl, onSubmit, loading }) {
    function handleSubmit(e) {
        e.preventDefault();
        const trimmed = url.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
    }

    return (
        <form className="audit-form" onSubmit={handleSubmit} noValidate>
            <div className="input-row">
                <label htmlFor="url-input" className="sr-only">
                    Website URL
                </label>
                <input
                    id="url-input"
                    type="url"
                    className="url-input"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={loading}
                    autoComplete="url"
                    aria-label="Website URL to audit"
                    required
                />
                <button
                    type="submit"
                    className="audit-btn"
                    disabled={loading || !url.trim()}
                    aria-busy={loading}
                >
                    {loading ? 'Auditing…' : 'Run Audit'}
                </button>
            </div>
            <p className="form-hint">Enter a full URL including https://</p>
        </form>
    );
}
