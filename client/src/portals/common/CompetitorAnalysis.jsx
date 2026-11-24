/**
 * CompetitorAnalysis.jsx — Competitor Trend & Product Analyzer Dashboard.
 * Accessible to Admin and Social Media Manager / Inventory Manager employees.
 * Features:
 * 1. Competitor URL Manager (Add up to 5 brands, URL preview, delete)
 * 2. Action Trigger (Runs parallel Jina Reader scraping + Groq AI analysis)
 * 3. Persistent Report Dashboard (Auto-loads latest report, Executive Takeaway,
 *    New Products, Trending Angles, Interactive Hashtags with individual & bulk copy,
 *    and Caption Ideas with dedicated copy buttons).
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

// Safe clipboard copy utility with fallback for cross-browser reliability
async function copyToClipboard(text) {
  if (!text) return false;
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {}
  }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Failed to copy text:', err);
    return false;
  }
}

const CompetitorAnalysis = () => {
  // State: Competitors
  const [competitors, setCompetitors] = useState([]);
  const [loadingCompetitors, setLoadingCompetitors] = useState(true);
  const [newBrandName, setNewBrandName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [addingCompetitor, setAddingCompetitor] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // State: Latest Report & Analysis
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // State: Copy feedback
  const [copiedHashtagIndex, setCopiedHashtagIndex] = useState(null);
  const [copiedAllHashtags, setCopiedAllHashtags] = useState(false);
  const [copiedCaptionIndex, setCopiedCaptionIndex] = useState(null);

  const { showSuccess, showError } = useToast();

  // 1. Fetch saved competitors
  const fetchCompetitors = useCallback(async () => {
    try {
      setLoadingCompetitors(true);
      const res = await api.get('/competitors');
      if (res.data.success) {
        setCompetitors(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch competitors:', err);
    } finally {
      setLoadingCompetitors(false);
    }
  }, []);

  // 2. Fetch latest saved report
  const fetchLatestReport = useCallback(async () => {
    try {
      setLoadingReport(true);
      const res = await api.get('/competitors/reports/latest');
      if (res.data.success && res.data.data) {
        setReport(res.data.data);
      } else {
        setReport(null);
      }
    } catch (err) {
      console.error('Failed to fetch latest report:', err);
    } finally {
      setLoadingReport(false);
    }
  }, []);

  useEffect(() => {
    fetchCompetitors();
    fetchLatestReport();
  }, [fetchCompetitors, fetchLatestReport]);

  // Handle Add Competitor
  const handleAddCompetitor = async (e) => {
    e.preventDefault();
    const brand = newBrandName.trim();
    let url = newUrl.trim();

    if (!brand || !url) {
      showError('Please provide both Brand Name and Collection URL.');
      return;
    }

    if (competitors.length >= 5) {
      showError('Maximum limit of 5 competitors reached. Please remove one first.');
      return;
    }

    setAddingCompetitor(true);
    try {
      const res = await api.post('/competitors', { brand_name: brand, url });
      if (res.data.success) {
        showSuccess(`"${brand}" added to monitored competitors.`);
        setNewBrandName('');
        setNewUrl('');
        fetchCompetitors();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to add competitor.');
    } finally {
      setAddingCompetitor(false);
    }
  };

  // Handle Delete Competitor
  const handleDeleteCompetitor = async (id, brandName) => {
    if (!window.confirm(`Are you sure you want to remove "${brandName}" from competitor tracking?`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await api.delete(`/competitors/${id}`);
      if (res.data.success) {
        showSuccess(`Removed "${brandName}".`);
        setCompetitors((prev) => prev.filter((c) => c.competitor_id !== id));
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to remove competitor.');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle Run AI Analysis
  const handleRunAnalysis = async () => {
    if (competitors.length === 0) {
      showError('Please add at least one competitor URL before running analysis.');
      return;
    }

    setAnalyzing(true);
    setErrorMsg('');

    try {
      const res = await api.post('/competitors/analyze');
      if (res.data.success && res.data.data) {
        setReport(res.data.data);
        showSuccess('Competitor analysis completed & intelligence report updated!');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Analysis pipeline encountered an error.';
      setErrorMsg(msg);
      showError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  // Copy single hashtag
  const handleCopyHashtag = async (tag, index) => {
    const success = await copyToClipboard(tag);
    if (success) {
      setCopiedHashtagIndex(index);
      setTimeout(() => setCopiedHashtagIndex(null), 2000);
    }
  };

  // Copy all hashtags joined by space
  const handleCopyAllHashtags = async (tags) => {
    if (!tags || tags.length === 0) return;
    const allTagsText = tags.join(' ');
    const success = await copyToClipboard(allTagsText);
    if (success) {
      setCopiedAllHashtags(true);
      showSuccess(`Copied ${tags.length} hashtags to clipboard!`);
      setTimeout(() => setCopiedAllHashtags(false), 2500);
    }
  };

  // Copy single caption
  const handleCopyCaption = async (caption, index) => {
    const success = await copyToClipboard(caption);
    if (success) {
      setCopiedCaptionIndex(index);
      showSuccess('Caption copied to clipboard!');
      setTimeout(() => setCopiedCaptionIndex(null), 2500);
    }
  };

  // Format report timestamp
  const formatReportDate = (dt) => {
    if (!dt) return '';
    try {
      const d = new Date(dt);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return String(dt);
    }
  };

  // Parse arrays safely
  const parsedNewProducts = Array.isArray(report?.new_products)
    ? report.new_products
    : Array.isArray(report?.newProducts)
    ? report.newProducts
    : [];

  const parsedHashtags = Array.isArray(report?.trending_hashtags)
    ? report.trending_hashtags
    : Array.isArray(report?.trendingHashtags)
    ? report.trendingHashtags
    : [];

  const parsedCaptions = Array.isArray(report?.caption_ideas)
    ? report.caption_ideas
    : Array.isArray(report?.captionIdeas)
    ? report.captionIdeas
    : [];

  const parsedAngles = Array.isArray(report?.trending_angles)
    ? report.trending_angles
    : Array.isArray(report?.trendingAngles)
    ? report.trendingAngles
    : [];

  const parsedBrands = Array.isArray(report?.analyzed_brands)
    ? report.analyzed_brands
    : Array.isArray(report?.analyzedBrands)
    ? report.analyzedBrands
    : [];

  const executiveSummary = report?.executive_summary || report?.executiveSummary || '';

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* ─────────────────────────────────────────────────────────────────
          1. Header & Action Trigger
          ───────────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.5rem',
          marginBottom: '2rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🔍</span>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
              Competitor Trend & Product Analyzer
            </h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Scrapes live competitor collections via Jina Reader & synthesizes luxury jewelry trends with Groq Qwen AI.
          </p>
        </div>

        {/* Primary Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing || competitors.length === 0}
            style={{
              padding: '0.85rem 1.75rem',
              borderRadius: '8px',
              border: 'none',
              cursor: analyzing || competitors.length === 0 ? 'not-allowed' : 'pointer',
              backgroundColor: competitors.length === 0 ? '#4b5563' : 'var(--accent-primary)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.65rem',
              boxShadow: competitors.length > 0 && !analyzing ? '0 4px 20px rgba(212, 175, 55, 0.35)' : 'none',
              transition: 'all 0.25s ease',
              opacity: analyzing || competitors.length === 0 ? 0.7 : 1,
            }}
          >
            {analyzing ? (
              <>
                <span className="loader" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: '#fff' }} />
                <span>Analyzing Latest Arrivals...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>Run AI Competitor Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          Analyzing Banner Notice
          ───────────────────────────────────────────────────────────────── */}
      {analyzing && (
        <div
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '10px',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div className="loader" style={{ width: '28px', height: '28px', borderWidth: '3px', borderTopColor: '#3b82f6', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, color: '#3b82f6', marginBottom: '0.2rem' }}>
              Real-Time Scraping & AI Synthesis in Progress
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Fetching latest new arrivals from {competitors.length} competitor URL(s) in parallel via Jina Reader, cleaning markdown text, and prompting Groq Qwen AI for product trends and high-converting marketing hooks. This typically takes 5–15 seconds...
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          Error Alert Banner
          ───────────────────────────────────────────────────────────────── */}
      {errorMsg && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem', color: 'var(--error-color)' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--error-color)', marginBottom: '0.25rem' }}>
                Analysis Pipeline Notice
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {errorMsg}
              </div>
            </div>
          </div>
          <button
            onClick={() => setErrorMsg('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '1.2rem',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          2. Competitor URL Manager (Add Form + Saved Competitors List)
          ───────────────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2.5rem', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Monitored Competitor Brands
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Add collection or new-arrivals URLs from rival jewelry stores to automatically analyze.
            </p>
          </div>
          <span
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              backgroundColor: competitors.length >= 5 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(212, 175, 55, 0.15)',
              color: competitors.length >= 5 ? '#ef4444' : 'var(--accent-primary)',
              border: `1px solid ${competitors.length >= 5 ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'}`,
            }}
          >
            {competitors.length} / 5 Monitored Brands
          </span>
        </div>

        {/* Add Competitor Form */}
        <form
          onSubmit={handleAddCompetitor}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr)) auto',
            gap: '1rem',
            alignItems: 'end',
            marginBottom: '1.5rem',
            padding: '1.25rem',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '10px',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
              Brand Name
            </label>
            <input
              type="text"
              placeholder="e.g. Tiffany & Co. or Mejuri"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              disabled={competitors.length >= 5 || addingCompetitor}
              style={{
                width: '100%',
                padding: '0.7rem 0.9rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
              Collection / New Arrivals URL
            </label>
            <input
              type="text"
              placeholder="e.g. https://mejuri.com/collection/new-arrivals"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              disabled={competitors.length >= 5 || addingCompetitor}
              style={{
                width: '100%',
                padding: '0.7rem 0.9rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={competitors.length >= 5 || addingCompetitor || !newBrandName.trim() || !newUrl.trim()}
              style={{
                padding: '0.7rem 1.35rem',
                borderRadius: '6px',
                border: 'none',
                cursor: competitors.length >= 5 || addingCompetitor ? 'not-allowed' : 'pointer',
                backgroundColor: competitors.length >= 5 ? '#6b7280' : 'var(--accent-primary)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                height: '42px',
                whiteSpace: 'nowrap',
                opacity: competitors.length >= 5 ? 0.6 : 1,
              }}
            >
              {addingCompetitor ? 'Adding...' : '+ Add Competitor'}
            </button>
          </div>
        </form>

        {/* Competitor Cards List */}
        {loadingCompetitors ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            <div className="loader" style={{ margin: '0 auto 0.75rem', width: '24px', height: '24px' }} />
            Loading competitors...
          </div>
        ) : competitors.length === 0 ? (
          <div
            style={{
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              border: '1px dashed var(--border-color)',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏷️</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              No Competitors Monitored Yet
            </div>
            <div style={{ fontSize: '0.85rem' }}>
              Add up to 5 luxury jewelry brand collection URLs above to track what rival stores are dropping.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {competitors.map((c) => (
              <div
                key={c.competitor_id}
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.brand_name}
                  </div>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={c.url}
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--accent-primary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      textDecoration: 'none',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>{c.url.replace(/^https?:\/\//i, '').slice(0, 32)}...</span>
                    <span style={{ fontSize: '0.75rem' }}>↗</span>
                  </a>
                </div>

                <button
                  onClick={() => handleDeleteCompetitor(c.competitor_id, c.brand_name)}
                  disabled={deletingId === c.competitor_id}
                  title="Remove competitor"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#ef4444',
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    cursor: deletingId === c.competitor_id ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }}
                >
                  {deletingId === c.competitor_id ? '…' : '×'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          3. Persistent Report Dashboard
          ───────────────────────────────────────────────────────────────── */}
      {loadingReport ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
          <div className="loader" style={{ margin: '0 auto 1rem', width: '36px', height: '36px' }} />
          Loading latest competitor market report...
        </div>
      ) : !report ? (
        <div
          className="card"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            borderRadius: '12px',
            border: '1px dashed var(--border-color)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💎</div>
          <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            No Intelligence Reports Generated Yet
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
            Click <strong>"Run AI Competitor Analysis"</strong> above to scrape your monitored competitor collection pages in parallel and generate real-time product intelligence, trending angles, hashtags, and Instagram caption hooks.
          </p>
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing || competitors.length === 0}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              backgroundColor: 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: competitors.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Run First Analysis
          </button>
        </div>
      ) : (
        <div>
          {/* Report Meta Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.5rem',
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  padding: '0.2rem 0.6rem',
                  backgroundColor: 'rgba(212, 175, 55, 0.15)',
                  color: 'var(--accent-primary)',
                  borderRadius: '4px',
                }}
              >
                {report.report_id || report.reportId}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Generated on: <strong>{formatReportDate(report.created_at || report.createdAt)}</strong>
              </span>
            </div>

            {/* Analyzed Brands Badges */}
            {parsedBrands.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Analyzed Brands:</span>
                {parsedBrands.map((b, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── CARD 1: Executive Takeaway ── */}
          <div
            className="card"
            style={{
              padding: '1.75rem',
              marginBottom: '2rem',
              borderRadius: '12px',
              borderLeft: '5px solid var(--accent-primary)',
              backgroundColor: 'var(--bg-secondary)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🎯</span>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Executive Takeaway
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--text-primary)', fontWeight: 500 }}>
              {executiveSummary || 'No executive summary provided.'}
            </p>
          </div>

          {/* ── CARD 2: New Competitor Products ── */}
          <div className="card" style={{ padding: '1.75rem', marginBottom: '2rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.3rem' }}>💎</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  New Competitor Products & Materials Spotted
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {parsedNewProducts.length} new items, design motifs, and material combinations identified
                </span>
              </div>
            </div>

            {parsedNewProducts.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No new products recorded.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {parsedNewProducts.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '1rem 1.15rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                    }}
                  >
                    <span style={{ color: 'var(--accent-primary)', fontSize: '1rem', marginTop: '0.1rem' }}>✦</span>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 500 }}>
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── CARD 3: Trending Marketing Angles ── */}
          <div className="card" style={{ padding: '1.75rem', marginBottom: '2rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.3rem' }}>📈</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Trending Marketing Angles & Positioning Hooks
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Styling, seasonal gifting, and audience messaging trends
                </span>
              </div>
            </div>

            {parsedAngles.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No trending angles recorded.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {parsedAngles.map((angle, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '1.15rem 1.25rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-tertiary)',
                      borderLeft: '4px solid #3b82f6',
                      borderTop: '1px solid var(--border-color)',
                      borderRight: '1px solid var(--border-color)',
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#3b82f6' }}>
                        Angle #{idx + 1}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.55 }}>
                      {angle}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── CARD 4: Trending Hashtags ── */}
          <div className="card" style={{ padding: '1.75rem', marginBottom: '2rem', borderRadius: '12px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.3rem' }}>#️⃣</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    High-Converting Instagram Hashtags
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Click any tag to copy, or copy all at once
                  </span>
                </div>
              </div>

              {parsedHashtags.length > 0 && (
                <button
                  onClick={() => handleCopyAllHashtags(parsedHashtags)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    backgroundColor: copiedAllHashtags ? '#10b981' : 'var(--bg-tertiary)',
                    color: copiedAllHashtags ? '#fff' : 'var(--text-primary)',
                    border: `1px solid ${copiedAllHashtags ? '#10b981' : 'var(--border-color)'}`,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>{copiedAllHashtags ? '✓' : '📋'}</span>
                  <span>{copiedAllHashtags ? 'All Copied!' : 'Copy All Hashtags'}</span>
                </button>
              )}
            </div>

            {parsedHashtags.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No hashtags recorded.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                {parsedHashtags.map((tag, idx) => {
                  const isCopied = copiedHashtagIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleCopyHashtag(tag, idx)}
                      title="Click to copy hashtag"
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: '20px',
                        backgroundColor: isCopied ? '#10b981' : 'var(--bg-tertiary)',
                        color: isCopied ? '#fff' : 'var(--accent-primary)',
                        border: `1px solid ${isCopied ? '#10b981' : 'var(--border-color)'}`,
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span>{tag.startsWith('#') ? tag : `#${tag}`}</span>
                      {isCopied && <span style={{ fontSize: '0.75rem' }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── CARD 5: Caption Ideas & Hooks ── */}
          <div className="card" style={{ padding: '1.75rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.3rem' }}>✍️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Ready-To-Use Instagram Caption Hooks
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Crafted luxury copywriting hooks ready for social publishing
                </span>
              </div>
            </div>

            {parsedCaptions.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No caption ideas recorded.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {parsedCaptions.map((caption, idx) => {
                  const isCopied = copiedCaptionIndex === idx;
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '1.25rem',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1rem',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.95rem',
                          color: 'var(--text-primary)',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          fontStyle: 'italic',
                        }}
                      >
                        "{caption}"
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleCopyCaption(caption, idx)}
                          style={{
                            padding: '0.45rem 1rem',
                            borderRadius: '6px',
                            backgroundColor: isCopied ? '#10b981' : 'var(--accent-primary)',
                            color: '#fff',
                            border: 'none',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <span>{isCopied ? '✓' : '📋'}</span>
                          <span>{isCopied ? 'Copied to Clipboard!' : 'Copy Caption'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorAnalysis;
