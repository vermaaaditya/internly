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
  { key: 'interview', label: 'Interview',    emoji: '🎤', color: 'var(--brutal-pink)' }
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
function ListingCard({ listing, onStatusChange }) {
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
      {/* Title */}
      <h3 className="brutal-card-title">{listing.title}</h3>
      
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

  // Filter & Sort Pipeline
  const filteredListings = useMemo(() => {
    let result = [...listings];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l => 
        l.title.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        (l.skills || []).some(s => s.toLowerCase().includes(q))
      );
    }

    // Shortlisted toggle filter
    if (shortlistedOnly) {
      result = result.filter(l => l.shortlisted);
    }

    // Sorting
    if (sortBy === 'score') {
      result.sort((a, b) => b.score - a.score);
    } else if (sortBy === 'stipend') {
      result.sort((a, b) => (b.stipend || 0) - (a.stipend || 0));
    } else if (sortBy === 'date') {
      result.sort((a, b) => new Date(b.scraped_at) - new Date(a.scraped_at));
    }

    return result;
  }, [listings, search, shortlistedOnly, sortBy]);

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
        <button 
          onClick={fetchListings}
          className="brutal-btn brutal-btn-sync"
          disabled={isRefreshing}
          id="sync-pipeline-btn"
        >
          {isRefreshing ? '🔄 FETCHING...' : '🔄 REFRESH STATS'}
        </button>
      </header>

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
            placeholder="🔍 SEARCH ROLES, COMPANIES, OR KEYWORD TAGS..." 
            className="brutal-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="search-input"
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

      {/* Kanban Board Container */}
      <main className="brutal-board-container">
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
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
