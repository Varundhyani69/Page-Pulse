/**
 * Renders a user-friendly error message.
 * Different HTTP status codes get different explanatory text so users
 * understand what went wrong without seeing a raw error dump.
 */

const ERROR_COPY = {
    400: {
        heading: 'Invalid URL',
        icon: '⚠️',
        hint: 'Check that the URL includes https:// and points to a real page.',
    },
    422: {
        heading: 'Not an HTML Page',
        icon: '📄',
        hint: 'Page Pulse can only audit HTML pages. This URL returned a different file type (PDF, image, JSON, etc.).',
    },
    504: {
        heading: 'Request Timed Out',
        icon: '⏱️',
        hint: 'The target site took too long to respond. It may be down or very slow.',
    },
    502: {
        heading: 'Unreachable Host',
        icon: '🔌',
        hint: 'The server couldn\'t connect to the URL. Double-check the address.',
    },
    0: {
        heading: 'Connection Error',
        icon: '📡',
        hint: 'Page Pulse server is unreachable. Make sure the backend is running.',
    },
};

const DEFAULT_ERROR = {
    heading: 'Something Went Wrong',
    icon: '❌',
    hint: 'An unexpected error occurred. Please try again.',
};

export default function ErrorMessage({ status, message }) {
    const meta = ERROR_COPY[status] || DEFAULT_ERROR;

    return (
        <div className="error-card" role="alert" aria-live="assertive">
            <span className="error-icon" aria-hidden="true">{meta.icon}</span>
            <div className="error-body">
                <p className="error-heading">{meta.heading}</p>
                {/* Show the server's specific message first, then the contextual hint */}
                <p className="error-message">{message}</p>
                <p className="error-hint">{meta.hint}</p>
            </div>
        </div>
    );
}
