/**
 * Persistent footer with required credit line.
 */
export default function Footer() {
    return (
        <footer className="app-footer">
            <p>
                Built for{' '}
                <a
                    href="https://digitalheroesco.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                >
                    Digital Heroes Training Task
                </a>
            </p>
        </footer>
    );
}
