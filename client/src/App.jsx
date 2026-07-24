import { useState } from 'react';
import axios from 'axios';
import AuditForm from './components/AuditForm';
import ReportCard from './components/ReportCard';
import ErrorMessage from './components/ErrorMessage';
import Spinner from './components/Spinner';
import Footer from './components/Footer';
import './index.css';

/**
 * Root application component.
 * Manages top-level state: the URL input, loading flag, report data,
 * and any error message.
 */
export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [auditedUrl, setAuditedUrl] = useState('');
  const [error, setError] = useState(null);

  /**
   * Submit handler — POSTs to the Express API and updates state.
   */
  async function handleAudit(submittedUrl) {
    setLoading(true);
    setReport(null);
    setError(null);
    setAuditedUrl('');

    // In production, VITE_API_URL points to the deployed server.
    // In dev, Vite's proxy forwards /api/* to localhost:5000.
    const apiBase = import.meta.env.VITE_API_URL || '';

    try {
      const { data } = await axios.post(`${apiBase}/api/audit`, { url: submittedUrl });
      setReport(data.report);
      setAuditedUrl(data.url);
    } catch (err) {
      if (err.response) {
        // Server responded with a non-2xx status
        setError({ status: err.response.status, message: err.response.data.error || 'Something went wrong.' });
      } else {
        // Network error — server unreachable
        setError({ status: 0, message: 'Could not reach the Page Pulse server. Make sure it is running.' });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-wrapper">
      <header className="app-header">
        <div className="logo-row">
          {/* Pulse icon */}
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M2 12h3l2-7 4 14 3-10 2 3h6" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="app-title">Page Pulse</h1>
        </div>
        <p className="app-subtitle">Instant website audits — performance, SEO &amp; accessibility at a glance</p>
      </header>

      <main className="app-main">
        <AuditForm
          url={url}
          setUrl={setUrl}
          onSubmit={handleAudit}
          loading={loading}
        />

        {loading && <Spinner />}

        {error && !loading && (
          <ErrorMessage status={error.status} message={error.message} />
        )}

        {report && !loading && (
          <ReportCard report={report} url={auditedUrl} />
        )}
      </main>

      <Footer />
    </div>
  );
}
