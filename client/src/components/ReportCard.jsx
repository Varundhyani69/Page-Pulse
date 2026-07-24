/**
 * Displays the audit report in a structured card layout.
 * Each metric gets its own tile so the layout is easy to scan.
 */

/** Map HTTP status codes to human-friendly labels and colour classes. */
function statusMeta(code) {
    if (code >= 200 && code < 300) return { label: 'OK', cls: 'status-ok' };
    if (code >= 300 && code < 400) return { label: 'Redirect', cls: 'status-warn' };
    if (code >= 400 && code < 500) return { label: 'Client Error', cls: 'status-error' };
    if (code >= 500) return { label: 'Server Error', cls: 'status-error' };
    return { label: 'Unknown', cls: 'status-warn' };
}

function MetricTile({ icon, label, value, note, highlight }) {
    return (
        <div className={`metric-tile ${highlight ? 'metric-tile--highlight' : ''}`}>
            <span className="metric-icon" aria-hidden="true">{icon}</span>
            <span className="metric-label">{label}</span>
            <span className="metric-value">{value}</span>
            {note && <span className="metric-note">{note}</span>}
        </div>
    );
}

export default function ReportCard({ report, url }) {
    const {
        statusCode,
        responseTimeMs,
        title,
        metaDescription,
        h1Count,
        missingAltCount,
        wordCount,
    } = report;

    const { label: statusLabel, cls: statusCls } = statusMeta(statusCode);

    // Flag metrics that indicate potential problems so they stand out.
    const h1Problem = h1Count !== 1;
    const altProblem = missingAltCount > 0;

    return (
        <section className="report-card" aria-label="Audit report">
            <div className="report-header">
                <h2 className="report-title">Audit Report</h2>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="report-url"
                    title={url}
                >
                    {url.length > 60 ? url.slice(0, 60) + '…' : url}
                </a>
            </div>

            {/* Page identity */}
            <div className="report-section">
                <h3 className="section-label">Page Identity</h3>
                <div className="identity-block">
                    <div className="identity-row">
                        <span className="identity-key">Title</span>
                        <span className="identity-val">{title || <em className="missing">Not found</em>}</span>
                    </div>
                    <div className="identity-row">
                        <span className="identity-key">Meta Description</span>
                        <span className="identity-val">
                            {metaDescription || <em className="missing">Not found</em>}
                        </span>
                    </div>
                </div>
            </div>

            {/* Metric tiles */}
            <div className="report-section">
                <h3 className="section-label">Metrics</h3>
                <div className="metrics-grid">
                    <MetricTile
                        icon="🌐"
                        label="HTTP Status"
                        value={`${statusCode} ${statusLabel}`}
                        highlight={statusCode >= 400}
                    />
                    <MetricTile
                        icon="⚡"
                        label="Response Time"
                        value={`${responseTimeMs} ms`}
                        note={responseTimeMs > 3000 ? 'Consider optimising TTFB' : undefined}
                        highlight={responseTimeMs > 3000}
                    />
                    <MetricTile
                        icon="📝"
                        label="Word Count"
                        value={wordCount.toLocaleString()}
                    />
                    <MetricTile
                        icon="🔤"
                        label="H1 Tags"
                        value={h1Count}
                        note={
                            h1Count === 0
                                ? 'Missing H1 — bad for SEO'
                                : h1Count > 1
                                    ? 'Multiple H1s — consider fixing'
                                    : undefined
                        }
                        highlight={h1Problem}
                    />
                    <MetricTile
                        icon="🖼️"
                        label="Images Missing Alt"
                        value={missingAltCount}
                        note={missingAltCount > 0 ? 'Accessibility issue' : undefined}
                        highlight={altProblem}
                    />
                </div>
            </div>
        </section>
    );
}
