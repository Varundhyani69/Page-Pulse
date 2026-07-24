/**
 * Accessible loading spinner shown while the audit is in progress.
 */
export default function Spinner() {
    return (
        <div className="spinner-wrapper" role="status" aria-label="Auditing page, please wait…">
            <div className="spinner" aria-hidden="true" />
            <p className="spinner-text">Auditing page…</p>
        </div>
    );
}
