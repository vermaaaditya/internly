import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// ── Supabase Client Initialization ───────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = (SUPABASE_URL && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// ── Kanban Column Definitions ────────────────────────────────────────────────
const COLUMNS = [
  { key: 'pending',   label: 'Shortlisted', emoji: '⭐', color: 'var(--brutal-yellow)' },
  { key: 'applied',   label: 'Applied',      emoji: '📨', color: 'var(--brutal-purple)' },
  { key: 'replied',   label: 'Replied',      emoji: '💬', color: 'var(--brutal-mint)' },
  { key: 'interview', label: 'Interview',    emoji: '🎤', color: 'var(--brutal-pink)' },
  { key: 'rejected',  label: 'Rejected',     emoji: '❌', color: 'var(--brutal-red)' }
];

const STATUS_OPTIONS = ['pending', 'applied', 'replied', 'interview', 'rejected'];

// ── High Quality Mock Data for Offline Demo Mode ─────────────────────────────
const MOCK_LISTINGS = [
  {
    id: 'mock-1',
    title: 'Frontend React Engineer Intern',
    company: 'RetroPixel Labs',
    stipend: 15000,
    score: 9,
    skills: ['React', 'JavaScript', 'CSS Grid', 'Tailwind'],
    apply_url: 'https://internshala.com',
    scraped_at: new Date().toISOString(),
    shortlisted: true,
    application_status: 'pending'
  },
  {
    id: 'mock-2',
    title: 'Python Backend developer',
    company: 'NeoSystems Corp',
    stipend: 12000,
    score: 8,
    skills: ['Python', 'Django', 'PostgreSQL'],
    apply_url: 'https://internshala.com',
    scraped_at: new Date(Date.now() - 86400000).toISOString(),
    shortlisted: true,
    application_status: 'applied'
  },
  {
    id: 'mock-3',
    title: 'Fullstack Next.js Specialist',
    company: 'BrutalWeb Agency',
    stipend: 25000,
    score: 10,
    skills: ['Next.js', 'React', 'Supabase', 'Node.js'],
    apply_url: 'https://wellfound.com',
    scraped_at: new Date(Date.now() - 172800000).toISOString(),
    shortlisted: true,
    application_status: 'replied'
  },
  {
    id: 'mock-4',
    title: 'Machine Learning Research Intern',
    company: 'AlphaTensor AI',
    stipend: 30000,
    score: 9,
    skills: ['PyTorch', 'Python', 'Scikit-Learn', 'Transformers'],
    apply_url: 'https://linkedin.com',
    scraped_at: new Date(Date.now() - 259200000).toISOString(),
    shortlisted: true,
    application_status: 'interview'
  },
  {
    id: 'mock-5',
    title: 'Node.js Backend Developer',
    company: 'ChunkyCode Studio',
    stipend: 8000,
    score: 7,
    skills: ['Node.js', 'Express', 'MongoDB'],
    apply_url: 'https://internshala.com',
    scraped_at: new Date(Date.now() - 345600000).toISOString(),
    shortlisted: true,
    application_status: 'pending'
  }
];

// ── Card Component ───────────────────────────────────────────────────────────
function ListingCard({ listing, onStatusChange, onDelete, matchData }) {
  const stipendDisplay = listing.stipend > 0
    ? `₹${listing.stipend.toLocaleString('en-IN')}/month`
    : 'Stipend Not Listed';

  const displaySkills = (listing.skills || []).slice(0, 3);
  const currentStatus = listing.application_status || 'pending';

  // Format score pill background color
  const getScoreBg = (score) => {
    if (score >= 8) return 'var(--brutal-mint)';
    if (score >= 6) return 'var(--brutal-yellow)';
    return '#e5e7eb';
  };

  return (
    <div className="brutal-card">
      {/* Title & Delete Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
        <h3 className="brutal-card-title" style={{ flex: 1, margin: 0 }}>{listing.title}</h3>
        <button 
          onClick={() => onDelete(listing.id)}
          style={{
            background: 'var(--brutal-pink)',
            border: 'var(--brutal-border-thin)',
            boxShadow: '2px 2px 0px #000',
            cursor: 'pointer',
            padding: '4px 6px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'translateY(-2px)'
          }}
          title="Delete Listing"
          className="brutal-btn-delete"
        >
          🗑️
        </button>
      </div>
      
      {/* Company Name */}
      <div>
        <span className="brutal-card-company">{listing.company}</span>
      </div>
      
      {/* Stipend + Score Row */}
      <div className="brutal-card-row">
        <span className="brutal-card-stipend">💸 {stipendDisplay}</span>
        <span 
          className="brutal-card-score"
          style={{ backgroundColor: getScoreBg(listing.score) }}
        >
          SCORE: {listing.score}/10
        </span>
      </div>
      
      {/* Skill Tags */}
      {displaySkills.length > 0 && (
        <div className="brutal-skills-row">
          {displaySkills.map((skill, i) => (
            <span key={i} className="brutal-skill-tag">
              #{skill}
            </span>
          ))}
        </div>
      )}

      {/* ATS Match Score Badge with Hover Tooltip */}
      {matchData && (
        <div 
          className="brutal-match-badge"
          style={{
            backgroundColor: matchData.score >= 70 ? 'var(--brutal-green)' : matchData.score >= 40 ? 'var(--brutal-yellow)' : 'var(--brutal-red)',
            marginTop: '8px'
          }}
        >
          🎯 MATCH: {matchData.score}%
          <div className="brutal-match-tooltip">
            <p style={{ fontWeight: '900', borderBottom: '2px solid #000', paddingBottom: '4px', marginBottom: '8px', textTransform: 'uppercase' }}>🎯 ATS MATCH REPORT</p>
            <p style={{ marginBottom: '6px' }}>✅ <strong>MATCHING:</strong> {matchData.gapAnalysis.matchingSkills.join(', ') || 'None'}</p>
            <p style={{ marginBottom: '8px' }}>❌ <strong>MISSING:</strong> {matchData.gapAnalysis.missingSkills.join(', ') || 'None'}</p>
            <p style={{ fontWeight: '800', borderTop: '1px dashed #000', paddingTop: '6px', marginTop: '6px', fontStyle: 'italic' }}>💬 {matchData.gapAnalysis.verdict}</p>
          </div>
        </div>
      )}
      
      {/* Actions (Apply + Status Selector) */}
      <div className="brutal-card-actions">
        <a 
          href={listing.apply_url || listing.applyUrl || '#'} 
          target="_blank" 
          rel="noopener noreferrer"
          className="brutal-btn brutal-btn-apply"
          onClick={() => {
            if (currentStatus === 'pending') {
              onStatusChange(listing.id, 'applied');
            }
          }}
        >
          Apply ↗
        </a>
        <select 
          className="brutal-card-select"
          value={currentStatus}
          onChange={(e) => onStatusChange(listing.id, e.target.value)}
        >
          {STATUS_OPTIONS.map(status => (
            <option key={status} value={status}>
              {status.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Main InternTracker Component ─────────────────────────────────────────────
export default function InternTracker() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [search, setSearch] = useState('');
  const [shortlistedOnly, setShortlistedOnly] = useState(true);
  const [sortBy, setSortBy] = useState('score');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // AI, ATS and Navigation State Variables
  const [currentTab, setCurrentTab] = useState('board'); // 'board' or 'ats'
  const [documentJar, setDocumentJar] = useState(() => {
    try {
      const cached = localStorage.getItem('document_jar');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error(e);
    }
    // Default fallback resumes to seed the jar
    return [
      { 
        id: 'doc-1', 
        title: 'React Developer Resume', 
        content: `Aaditya Verma\nSoftware Engineering Intern\nSkills: React, JavaScript, TypeScript, CSS Grid, Tailwind, HTML, Node.js, Express, MongoDB, Git`
      },
      { 
        id: 'doc-2', 
        title: 'Python Backend Resume', 
        content: `Aaditya Verma\nBackend Developer Intern\nSkills: Python, Django, Flask, FastAPI, PostgreSQL, SQL, MongoDB, AWS, Docker, Kubernetes, Git`
      }
    ];
  });
  const [activeDocId, setActiveDocId] = useState(() => {
    return localStorage.getItem('active_doc_id') || 'doc-1';
  });
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [editingDocId, setEditingDocId] = useState(null);
  const [editDocTitle, setEditDocTitle] = useState('');
  const [editDocContent, setEditDocContent] = useState('');

  const [matchScores, setMatchScores] = useState(() => {
    try {
      const cached = localStorage.getItem('match_scores');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [isBatchScoring, setIsBatchScoring] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [semanticResults, setSemanticResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Sync document jar and active document to localStorage
  useEffect(() => {
    localStorage.setItem('document_jar', JSON.stringify(documentJar));
  }, [documentJar]);

  useEffect(() => {
    localStorage.setItem('active_doc_id', activeDocId);
  }, [activeDocId]);

  // Sync match scores to localStorage
  useEffect(() => {
    localStorage.setItem('match_scores', JSON.stringify(matchScores));
  }, [matchScores]);

  // Dynamically compute active resume text from selected jar item
  const activeResumeText = useMemo(() => {
    const doc = documentJar.find(d => d.id === activeDocId);
    return doc ? doc.content : '';
  }, [documentJar, activeDocId]);

  // Debounced Semantic Search Hook (400ms)
  useEffect(() => {
    if (!search.trim()) {
      setSemanticResults(null);
      return;
    }

    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiURL}/api/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: search })
        });
        if (response.ok) {
          const data = await response.json();
          setSemanticResults(data.results || []);
        } else {
          console.error("Semantic search failed with status:", response.status);
          setSemanticResults([]);
        }
      } catch (err) {
        console.error("Semantic search failed:", err);
        setSemanticResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  // Fetch listings from Supabase on mount
  const fetchListings = useCallback(async () => {
    setError(null);
    if (!supabase) {
      console.warn('Supabase credentials missing. Booting in interactive offline demo mode.');
      setListings(MOCK_LISTINGS);
      setIsDemoMode(true);
      setLoading(false);
      return;
    }

    try {
      setIsRefreshing(true);
      // 1. Fetch listings
      const { data: listingsData, error: listingsErr } = await supabase
        .from('listings')
        .select('*')
        .order('score', { ascending: false });

      if (listingsErr) throw listingsErr;

      // 2. Fetch applications
      const { data: appsData, error: appsErr } = await supabase
        .from('applications')
        .select('listing_id, status');

      const statusMap = {};
      if (!appsErr && appsData) {
        appsData.forEach(app => {
          statusMap[app.listing_id] = app.status;
        });
      }

      // 3. Merge data
      const merged = (listingsData || []).map(listing => ({
        ...listing,
        application_status: statusMap[listing.id] || 'pending'
      }));

      setListings(merged);
      setIsDemoMode(false);
    } catch (err) {
      console.error('Failed to load real data. Falling back to demo mode:', err);
      setError(err.message || 'Failed to connect to Supabase.');
      setListings(MOCK_LISTINGS);
      setIsDemoMode(true);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Handle status update
  const handleStatusChange = useCallback(async (listingId, newStatus) => {
    // Optimistic UI Update
    setListings(prev => prev.map(l => 
      l.id === listingId ? { ...l, application_status: newStatus } : l
    ));

    if (isDemoMode || !supabase) {
      console.log(`Demo Mode: Listing ${listingId} application status updated to "${newStatus}"`);
      return;
    }

    try {
      // Upsert into applications table
      const { data: existing } = await supabase
        .from('applications')
        .select('id')
        .eq('listing_id', listingId)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase
          .from('applications')
          .update({
            status: newStatus,
            applied_at: newStatus === 'applied' ? new Date().toISOString() : undefined,
            updated_at: new Date().toISOString()
          })
          .eq('listing_id', listingId);
      } else {
        await supabase
          .from('applications')
          .insert({
            listing_id: listingId,
            status: newStatus,
            applied_at: newStatus === 'applied' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          });
      }
    } catch (err) {
      console.error('DB Sync failed, reverting to pending status:', err);
      // Revert optimistic update
      setListings(prev => prev.map(l => 
        l.id === listingId ? { ...l, application_status: 'pending' } : l
      ));
    }
  }, [isDemoMode]);

  // Handle delete listing
  const handleDeleteListing = useCallback(async (listingId) => {
    if (!window.confirm("Are you sure you want to delete this listing permanently?")) {
      return;
    }

    // Optimistic UI Update
    setListings(prev => prev.filter(l => l.id !== listingId));

    if (isDemoMode || !supabase) {
      console.log(`Demo Mode: Deleted listing ${listingId}`);
      return;
    }

    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to delete listing:', err);
      fetchListings();
    }
  }, [isDemoMode, fetchListings]);

  // Filter & Sort Pipeline
  const filteredListings = useMemo(() => {
    let result = [];

    if (search.trim() && semanticResults !== null) {
      // Use semantic search results merged with local application status
      result = semanticResults.map(l => ({
        ...l,
        application_status: listings.find(orig => orig.id === l.id)?.application_status || 'pending'
      }));
    } else {
      // Use local state listings
      result = [...listings];
      if (search.trim()) {
        const q = search.toLowerCase();
        result = result.filter(l => 
          l.title.toLowerCase().includes(q) ||
          l.company.toLowerCase().includes(q) ||
          (l.skills || []).some(s => s.toLowerCase().includes(q))
        );
      }
    }

    // Shortlisted toggle filter
    if (shortlistedOnly) {
      result = result.filter(l => l.shortlisted);
    }

    // Sorting
    if (sortBy === 'stipend') {
      result.sort((a, b) => (b.stipend || 0) - (a.stipend || 0));
    } else if (sortBy === 'date') {
      result.sort((a, b) => new Date(b.scraped_at) - new Date(a.scraped_at));
    } else if (sortBy === 'score') {
      // If semanticResults are active, they are already ranked by similarity.
      // We only sort by listing.score if we are NOT in active semantic search.
      if (!search.trim() || semanticResults === null) {
        result.sort((a, b) => b.score - a.score);
      }
    }

    return result;
  }, [listings, search, semanticResults, shortlistedOnly, sortBy]);

  // Batch scoring logic for ATS compatibility match
  const handleBatchScore = useCallback(async () => {
    if (!activeResumeText.trim()) return;
    setIsBatchScoring(true);
    
    // Score the listings currently visible on the board
    const listingsToScore = filteredListings;
    
    if (listingsToScore.length === 0) {
      setIsBatchScoring(false);
      return;
    }

    const delay = (ms) => new Promise(r => setTimeout(r, ms));
    const BATCH_SIZE = 3;
    const newScores = {};

    try {
      for (let i = 0; i < listingsToScore.length; i += BATCH_SIZE) {
        const batch = listingsToScore.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (l) => {
          try {
            const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const textToScore = l.description || `${l.title} at ${l.company}. Skills required: ${(l.skills || []).join(', ')}`;
            
            const response = await fetch(`${apiURL}/api/match`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                resume: activeResumeText,
                description: textToScore
              })
            });

            if (response.ok) {
              const data = await response.json();
              newScores[l.id] = data;
            }
          } catch (err) {
            console.error(`Error scoring listing ${l.id}:`, err);
          }
        }));

        if (i + BATCH_SIZE < listingsToScore.length) {
          await delay(500); // 500ms delay between batches to respect free tier rate limit
        }
      }

      setMatchScores(prev => ({
        ...prev,
        ...newScores
      }));
    } catch (err) {
      console.error("Batch scoring encountered an error:", err);
    } finally {
      setIsBatchScoring(false);
    }
  }, [filteredListings, activeResumeText]);

  // Grouped columns for Kanban
  const kanbanGroups = useMemo(() => {
    const groups = {};
    COLUMNS.forEach(col => { groups[col.key] = []; });

    filteredListings.forEach(listing => {
      const status = listing.application_status || 'pending';
      if (groups[status]) {
        groups[status].push(listing);
      }
    });

    return groups;
  }, [filteredListings]);

  // Dynamic Dashboard Stats Calculations
  const stats = useMemo(() => {
    const totalCount = listings.length;
    const shortlistedCount = listings.filter(l => l.shortlisted).length;
    const activeApps = listings.filter(l => ['applied', 'replied', 'interview'].includes(l.application_status)).length;
    
    // Average stipend of listed items
    const stipendList = listings.filter(l => l.stipend > 0).map(l => l.stipend);
    const avgStipend = stipendList.length > 0
      ? Math.round(stipendList.reduce((acc, curr) => acc + curr, 0) / stipendList.length)
      : 0;

    return { totalCount, shortlistedCount, activeApps, avgStipend };
  }, [listings]);

  if (loading) {
    return (
      <div className="brutal-loader">
        ⚡ SCRAPING & LOADING INTERNSHIPS... PLEASE STAND BY ⚡
      </div>
    );
  }

  return (
    <div>
      {/* Demo Warning Header Banner */}
      {isDemoMode && (
        <div style={{
          backgroundColor: 'var(--brutal-yellow)',
          border: 'var(--brutal-border)',
          boxShadow: 'var(--brutal-shadow)',
          padding: '12px',
          marginBottom: '24px',
          fontWeight: '800',
          textAlign: 'center',
          textTransform: 'uppercase',
          fontSize: '13px',
          fontFamily: 'var(--font-mono)'
        }}>
          ⚠️ OFFLINE INTERACTIVE DEMO MODE // SUPABASE NOT DETECTED // PREVIEWING CHUNKY DUMMY DATA // ⚠️
        </div>
      )}

      {/* Header Banner */}
      <header className="brutal-header">
        <div>
          <h1 className="brutal-header-logo">💥 INTERNLY // 💥</h1>
          <p style={{ fontWeight: '800', textTransform: 'uppercase', fontSize: '14px', marginTop: '4px' }}>
            The Ultimate No-Bullshit Dev Internship Tracker
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={fetchListings}
            className="brutal-btn brutal-btn-sync"
            disabled={isRefreshing}
            id="sync-pipeline-btn"
          >
            {isRefreshing ? '🔄 FETCHING...' : '🔄 REFRESH STATS'}
          </button>
        </div>
      </header>

      {/* Neo-Brutalist Navigation Bar */}
      <nav style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setCurrentTab('board')}
          className="brutal-btn"
          style={{ 
            backgroundColor: currentTab === 'board' ? 'var(--brutal-yellow)' : '#fff',
            boxShadow: currentTab === 'board' ? 'var(--brutal-shadow-active)' : 'var(--brutal-shadow)',
            transform: currentTab === 'board' ? 'translate(2px, 2px)' : 'none',
            fontSize: '14px',
            padding: '10px 20px'
          }}
        >
          📋 BOARD TRACKER
        </button>
        <button 
          onClick={() => setCurrentTab('ats')}
          className="brutal-btn"
          style={{ 
            backgroundColor: currentTab === 'ats' ? 'var(--brutal-yellow)' : '#fff',
            boxShadow: currentTab === 'ats' ? 'var(--brutal-shadow-active)' : 'var(--brutal-shadow)',
            transform: currentTab === 'ats' ? 'translate(2px, 2px)' : 'none',
            fontSize: '14px',
            padding: '10px 20px'
          }}
          id="ats-tab-btn"
        >
          🎯 ATS RESUME MATCHER & DOCUMENT JAR
        </button>
      </nav>

      {currentTab === 'board' ? (
        <>
          {/* Metrics Row */}
          <section className="brutal-stats-grid">
            <div className="brutal-stat-card" style={{ backgroundColor: 'var(--brutal-sky)' }}>
              <span className="brutal-stat-label">📁 TOTAL SCRAPED</span>
              <span className="brutal-stat-value">{stats.totalCount}</span>
            </div>
            <div className="brutal-stat-card" style={{ backgroundColor: 'var(--brutal-yellow)' }}>
              <span className="brutal-stat-label">⭐ SHORTLISTED</span>
              <span className="brutal-stat-value">{stats.shortlistedCount}</span>
            </div>
            <div className="brutal-stat-card" style={{ backgroundColor: 'var(--brutal-purple)' }}>
              <span className="brutal-stat-label">✉️ ACTIVE APPS</span>
              <span className="brutal-stat-value">{stats.activeApps}</span>
            </div>
            <div className="brutal-stat-card" style={{ backgroundColor: 'var(--brutal-mint)' }}>
              <span className="brutal-stat-label">💰 AVG STIPEND</span>
              <span className="brutal-stat-value">₹{stats.avgStipend.toLocaleString('en-IN')}/m</span>
            </div>
          </section>

          {/* Filters Bar */}
          <section className="brutal-controls-bar">
            <div className="brutal-search-wrapper">
              <input 
                type="text" 
                placeholder={isSearching ? "⏳ SEARCHING SEMANTICALLY..." : "🔍 SEARCH ROLES, COMPANIES, OR KEYWORD TAGS..."} 
                className="brutal-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                id="search-input"
                style={{ border: isSearching ? '4px solid var(--brutal-yellow)' : 'var(--brutal-border)' }}
              />
            </div>
            <div className="brutal-filters">
              <label className="brutal-checkbox-label" id="shortlist-toggle-label">
                <input 
                  type="checkbox" 
                  className="brutal-checkbox" 
                  checked={shortlistedOnly}
                  onChange={(e) => setShortlistedOnly(e.target.checked)}
                  id="shortlist-toggle"
                />
                Shortlisted Only
              </label>
              <div className="brutal-select-wrapper">
                <select 
                  className="brutal-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  id="sort-select"
                >
                  <option value="score">SORT BY SCORE (MAX)</option>
                  <option value="stipend">SORT BY STIPEND (MAX)</option>
                  <option value="date">SORT BY DATE SCRAPED</option>
                </select>
              </div>
            </div>
          </section>

          {/* Kanban Board Container (Full Width) */}
          <main className="brutal-board-container" style={{ width: '100%' }}>
            {COLUMNS.map(col => {
              const colListings = kanbanGroups[col.key] || [];
              return (
                <div 
                  key={col.key} 
                  className="brutal-column"
                  style={{ borderTop: `16px solid ${col.color}` }}
                >
                  {/* Column Header */}
                  <div className="brutal-column-header">
                    <span className="brutal-column-title">
                      {col.emoji} {col.label}
                    </span>
                    <span className="brutal-column-count">
                      {colListings.length}
                    </span>
                  </div>
                  
                  {/* Column Body */}
                  <div className="brutal-column-body">
                    {colListings.length === 0 ? (
                      <div className="brutal-empty-state">
                        ⛔ COLUMN IS EMPTY // GET SCRAPING OR ADJUST FILTERS ⛔
                      </div>
                    ) : (
                      colListings.map(listing => (
                        <ListingCard 
                          key={listing.id}
                          listing={listing}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDeleteListing}
                          matchData={matchScores[listing.id]}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </main>
        </>
      ) : (
        /* 🎯 ATS Resume Matcher & Document Jar Page */
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap', width: '100%', marginBottom: '40px' }}>
          
          {/* 🫙 Left Column: Document Jar */}
          <div style={{ flex: '1', minWidth: '350px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="brutal-card" style={{ backgroundColor: 'var(--brutal-mint)' }}>
              <h2 style={{ fontSize: '22px', marginBottom: '8px', textShadow: '1px 1px 0px #fff' }}>🫙 THE DOCUMENT JAR</h2>
              <p style={{ fontSize: '13px', fontWeight: '800', fontStyle: 'italic', marginBottom: '16px', lineHeight: '1.4' }}>
                Store multiple resumes or profiles. Switch between them instantly to score compatibility across all roles!
              </p>

              {/* Add New Document Form / Trigger */}
              {isAddingDoc ? (
                <div style={{ border: 'var(--brutal-border-thin)', padding: '16px', backgroundColor: '#fff', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>➕ NEW RESUME PROFILE</h3>
                  
                  {/* Drag & Drop Upload Container */}
                  <div 
                    style={{
                      border: '2px dashed #000',
                      padding: '18px 10px',
                      textAlign: 'center',
                      backgroundColor: '#f9f9f9',
                      cursor: 'pointer',
                      marginBottom: '16px',
                      transition: 'all 0.1s'
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.backgroundColor = 'var(--brutal-sky)';
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.backgroundColor = '#f9f9f9';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.backgroundColor = '#f9f9f9';
                      const file = e.dataTransfer.files[0];
                      if (file && (file.type === "text/plain" || file.name.endsWith(".txt"))) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setNewDocTitle(file.name.replace(/\.[^/.]+$/, ""));
                          setNewDocContent(event.target.result);
                        };
                        reader.readAsText(file);
                      } else {
                        alert("Please upload a plain text (.txt) resume file.");
                      }
                    }}
                    onClick={() => {
                      document.getElementById('brutal-file-input').click();
                    }}
                  >
                    <span style={{ fontSize: '24px', display: 'block', marginBottom: '4px' }}>📤</span>
                    <span style={{ fontWeight: '900', fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>
                      Drag & Drop Resume (.txt)
                    </span>
                    <span style={{ fontSize: '9px', color: '#666', fontWeight: '800' }}>
                      or click to browse files
                    </span>
                    <input 
                      type="file" 
                      id="brutal-file-input" 
                      accept=".txt" 
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setNewDocTitle(file.name.replace(/\.[^/.]+$/, ""));
                            setNewDocContent(event.target.result);
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </div>

                  <input 
                    type="text"
                    placeholder="Profile Name (e.g. ML Resume)"
                    className="brutal-input"
                    style={{ marginBottom: '12px', padding: '8px', fontSize: '12px' }}
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                  />
                  <textarea 
                    className="brutal-resume-textarea"
                    placeholder="Paste plain text resume content here..."
                    style={{ height: '140px', marginBottom: '12px', fontSize: '11px' }}
                    value={newDocContent}
                    onChange={(e) => setNewDocContent(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => {
                        if (!newDocTitle.trim() || !newDocContent.trim()) return;
                        const newDoc = {
                          id: 'doc-' + Date.now(),
                          title: newDocTitle.trim(),
                          content: newDocContent.trim()
                        };
                        setDocumentJar(prev => [...prev, newDoc]);
                        setActiveDocId(newDoc.id);
                        setNewDocTitle('');
                        setNewDocContent('');
                        setIsAddingDoc(false);
                      }}
                      className="brutal-btn"
                      style={{ backgroundColor: 'var(--brutal-green)', flex: 1, fontSize: '11px', padding: '6px' }}
                    >
                      💾 SAVE TO JAR
                    </button>
                    <button 
                      onClick={() => setIsAddingDoc(false)}
                      className="brutal-btn"
                      style={{ backgroundColor: 'var(--brutal-red)', flex: 1, fontSize: '11px', padding: '6px' }}
                    >
                      ❌ CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingDoc(true)}
                  className="brutal-btn"
                  style={{ width: '100%', backgroundColor: '#fff', marginBottom: '16px', fontSize: '12px', padding: '10px' }}
                >
                  ➕ ADD NEW DOCUMENT TO JAR
                </button>
              )}

              {/* Document List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {documentJar.map((doc) => {
                  const isActive = doc.id === activeDocId;
                  return (
                    <div 
                      key={doc.id}
                      className="brutal-card"
                      style={{ 
                        backgroundColor: isActive ? '#ffffff' : '#f9f9f9',
                        border: isActive ? '4px solid #000' : '2px solid #000',
                        boxShadow: isActive ? '4px 4px 0px #000' : 'none',
                        cursor: 'pointer',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'all 0.1s'
                      }}
                      onClick={() => setActiveDocId(doc.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '900', fontSize: '13px', textTransform: 'uppercase' }}>
                          📄 {doc.title}
                        </span>
                        {isActive && (
                          <span style={{ 
                            backgroundColor: 'var(--brutal-yellow)', 
                            border: '1px solid #000', 
                            fontSize: '8px', 
                            fontWeight: '900', 
                            padding: '2px 6px',
                            textTransform: 'uppercase'
                          }}>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDocId(doc.id);
                            setEditDocTitle(doc.title);
                            setEditDocContent(doc.content);
                          }}
                          className="brutal-btn"
                          style={{ padding: '3px 8px', fontSize: '10px', backgroundColor: 'var(--brutal-sky)' }}
                        >
                          ✏️ EDIT
                        </button>
                        {documentJar.length > 1 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete "${doc.title}" from the jar?`)) {
                                const remaining = documentJar.filter(d => d.id !== doc.id);
                                setDocumentJar(remaining);
                                if (isActive) {
                                  setActiveDocId(remaining[0].id);
                                }
                              }
                            }}
                            className="brutal-btn"
                            style={{ padding: '3px 8px', fontSize: '10px', backgroundColor: 'var(--brutal-red)' }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Document Editor (if a document is active & being edited) */}
            {editingDocId && (
              <div className="brutal-card" style={{ backgroundColor: '#fff' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>✏️ EDIT PROFILE: {editDocTitle}</h3>
                <input 
                  type="text"
                  className="brutal-input"
                  style={{ marginBottom: '12px', padding: '8px', fontSize: '12px' }}
                  value={editDocTitle}
                  onChange={(e) => setEditDocTitle(e.target.value)}
                />
                <textarea 
                  className="brutal-resume-textarea"
                  style={{ height: '200px', marginBottom: '12px', fontSize: '11px' }}
                  value={editDocContent}
                  onChange={(e) => setEditDocContent(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => {
                      if (!editDocTitle.trim() || !editDocContent.trim()) return;
                      setDocumentJar(prev => prev.map(d => 
                        d.id === editingDocId ? { ...d, title: editDocTitle.trim(), content: editDocContent.trim() } : d
                      ));
                      setEditingDocId(null);
                    }}
                    className="brutal-btn"
                    style={{ backgroundColor: 'var(--brutal-green)', flex: 1, fontSize: '12px' }}
                  >
                    💾 UPDATE
                  </button>
                  <button 
                    onClick={() => setEditingDocId(null)}
                    className="brutal-btn"
                    style={{ backgroundColor: 'var(--brutal-orange)', flex: 1, fontSize: '12px' }}
                  >
                    ❌ CANCEL
                  </button>
                </div>
              </div>
            )}

            {/* Active Document Full Preview (if not editing) */}
            {!editingDocId && activeResumeText && (
              <div className="brutal-card" style={{ backgroundColor: '#fff' }}>
                <h3 style={{ fontSize: '14px', borderBottom: '2px solid #000', paddingBottom: '6px', marginBottom: '12px' }}>
                  🔍 ACTIVE RESUME TEXT PREVIEW
                </h3>
                <pre style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: '11px', 
                  backgroundColor: '#f5f5f5', 
                  padding: '12px', 
                  border: '1px solid #000', 
                  maxHeight: '180px', 
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  {activeResumeText}
                </pre>
              </div>
            )}
          </div>

          {/* ⚡ Right Column: ATS Match Score Board */}
          <div style={{ flex: '2', minWidth: '450px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="brutal-card" style={{ backgroundColor: 'var(--brutal-sky)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', textShadow: '1px 1px 0px #fff' }}>⚡ ATS COMPATIBILITY LEADERBOARD</h2>
                  <p style={{ fontWeight: '800', marginTop: '4px', textTransform: 'uppercase', fontSize: '12px' }}>
                    Active Profile: <span style={{ textDecoration: 'underline' }}>{documentJar.find(d => d.id === activeDocId)?.title}</span>
                  </p>
                </div>
                <button 
                  onClick={handleBatchScore}
                  className="brutal-btn"
                  style={{ backgroundColor: 'var(--brutal-yellow)', fontSize: '13px', padding: '8px 16px' }}
                  disabled={isBatchScoring || !activeResumeText.trim()}
                >
                  {isBatchScoring ? '⚡ BATCH SCORING BOARD...' : '⚡ BATCH SCORE BOARD'}
                </button>
              </div>

              {/* stats row */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '120px', backgroundColor: '#fff', border: 'var(--brutal-border-thin)', padding: '8px 12px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '900', color: '#666' }}>ROLES SCORABLE</div>
                  <div style={{ fontSize: '22px', fontWeight: '900' }}>{filteredListings.length}</div>
                </div>
                <div style={{ flex: 1, minWidth: '120px', backgroundColor: '#fff', border: 'var(--brutal-border-thin)', padding: '8px 12px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '900', color: '#666' }}>SCORED</div>
                  <div style={{ fontSize: '22px', fontWeight: '900' }}>
                    {filteredListings.filter(l => matchScores[l.id]).length}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '120px', backgroundColor: '#fff', border: 'var(--brutal-border-thin)', padding: '8px 12px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '900', color: '#666' }}>STRONG MATCHES (70%+)</div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: '#16a34a' }}>
                    {filteredListings.filter(l => matchScores[l.id] && matchScores[l.id].score >= 70).length}
                  </div>
                </div>
              </div>
            </div>

            {/* List of Scored Listings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredListings.length === 0 ? (
                <div className="brutal-empty-state">
                  ⛔ NO ROLES MATCHING ACTIVE FILTERS OR SEARCH TERMS ⛔
                </div>
              ) : (
                filteredListings.map(listing => {
                  const match = matchScores[listing.id];
                  return (
                    <div 
                      key={listing.id}
                      className="brutal-card"
                      style={{ 
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        padding: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                        <div>
                          <h3 style={{ fontSize: '16px', margin: 0 }}>{listing.title}</h3>
                          <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: '#666' }}>
                            🏢 {listing.company} • 💸 {listing.stipend > 0 ? `₹${listing.stipend.toLocaleString('en-IN')}/m` : 'Stipend Not Listed'}
                          </span>
                        </div>
                        
                        {/* Score Pill */}
                        {match ? (
                          <div 
                            style={{ 
                              backgroundColor: match.score >= 70 ? 'var(--brutal-green)' : match.score >= 40 ? 'var(--brutal-yellow)' : 'var(--brutal-red)',
                              border: 'var(--brutal-border-thin)',
                              padding: '6px 12px',
                              fontWeight: '900',
                              fontSize: '12px',
                              fontFamily: 'var(--font-mono)',
                              boxShadow: '2px 2px 0px #000'
                            }}
                          >
                            🎯 MATCH: {match.score}%
                          </div>
                        ) : (
                          <div 
                            style={{ 
                              backgroundColor: '#e5e7eb',
                              border: 'var(--brutal-border-thin)',
                              padding: '6px 12px',
                              fontWeight: '800',
                              fontSize: '11px',
                              color: '#666'
                            }}
                          >
                            NOT ANALYZED
                          </div>
                        )}
                      </div>

                      {/* Matching breakdown details */}
                      {match ? (
                        <div style={{ 
                          backgroundColor: '#fafafa', 
                          border: '1px dashed #000', 
                          padding: '12px', 
                          fontSize: '11px', 
                          fontFamily: 'var(--font-mono)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          lineHeight: '1.4'
                        }}>
                          <div>✅ <strong>MATCHING SKILLS:</strong> {match.gapAnalysis.matchingSkills.join(', ') || 'None identified'}</div>
                          <div>❌ <strong>MISSING SKILLS:</strong> {match.gapAnalysis.missingSkills.join(', ') || 'None identified'}</div>
                          <div style={{ fontWeight: '800', borderTop: '1px solid #ddd', paddingTop: '6px', marginTop: '4px', fontStyle: 'italic' }}>
                            💬 VERDICT: {match.gapAnalysis.verdict}
                          </div>
                        </div>
                      ) : (
                        <p style={{ fontSize: '11px', fontStyle: 'italic', color: '#777', margin: 0 }}>
                          Click the "Batch Score Board" button above to run compatibility analysis against your active resume.
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <a 
                          href={listing.apply_url || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="brutal-btn"
                          style={{ padding: '6px 12px', fontSize: '10px', backgroundColor: 'var(--brutal-orange)' }}
                        >
                          Apply ↗
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

