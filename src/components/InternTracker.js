const React = require('react');
const { useState, useEffect, useMemo, useCallback } = React;
const { createClient } = require('@supabase/supabase-js');

// ── Supabase Client ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || '';
const supabase = (SUPABASE_URL && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// ── Kanban Column Definitions ────────────────────────────────────────────────
const COLUMNS = [
  { key: 'pending',   label: 'Shortlisted',  emoji: '⭐' },
  { key: 'applied',   label: 'Applied',       emoji: '📨' },
  { key: 'replied',   label: 'Replied',       emoji: '💬' },
  { key: 'interview', label: 'Interview',     emoji: '🎤' }
];

const STATUS_OPTIONS = ['pending', 'applied', 'replied', 'interview', 'rejected'];

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  app: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: '#0f1729',
    color: '#e2e8f0',
    minHeight: '100vh',
    padding: '0'
  },
  header: {
    background: 'linear-gradient(135deg, #1a2744 0%, #0f1729 100%)',
    borderBottom: '1px solid #2d3a50',
    padding: '20px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
    letterSpacing: '-0.5px'
  },
  titleAccent: {
    color: '#60a5fa'
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  searchInput: {
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid #2d3a50',
    backgroundColor: '#1a2744',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    width: '220px',
    transition: 'border-color 0.2s'
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#94a3b8',
    userSelect: 'none'
  },
  toggleCheckbox: {
    accentColor: '#60a5fa',
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  },
  selectSort: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #2d3a50',
    backgroundColor: '#1a2744',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer'
  },
  boardContainer: {
    display: 'flex',
    gap: '16px',
    padding: '24px',
    overflowX: 'auto',
    minHeight: 'calc(100vh - 100px)',
    alignItems: 'flex-start'
  },
  column: {
    flex: '1',
    minWidth: '280px',
    maxWidth: '340px',
    backgroundColor: '#131d30',
    borderRadius: '12px',
    border: '1px solid #1e2d44',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 140px)',
    overflow: 'hidden'
  },
  columnHeader: {
    padding: '16px',
    borderBottom: '1px solid #1e2d44',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  columnTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#e2e8f0'
  },
  columnCount: {
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#1a2744',
    color: '#60a5fa',
    borderRadius: '10px',
    padding: '2px 8px',
    minWidth: '24px',
    textAlign: 'center'
  },
  columnBody: {
    padding: '12px',
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  card: {
    backgroundColor: '#1a2744',
    borderRadius: '10px',
    padding: '14px',
    border: '1px solid #2d3a50',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    cursor: 'default'
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: '4px',
    lineHeight: '1.3'
  },
  cardCompany: {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '10px'
  },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  stipendText: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#e2e8f0'
  },
  scoreBadge: (score) => ({
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '6px',
    color: '#fff',
    backgroundColor: score >= 8 ? '#16a34a' : score >= 6 ? '#ca8a04' : '#64748b'
  }),
  skillsRow: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
    marginBottom: '10px'
  },
  skillTag: {
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: '#0f1729',
    color: '#94a3b8',
    border: '1px solid #2d3a50'
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  applyButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    textDecoration: 'none',
    display: 'inline-block'
  },
  statusSelect: {
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #2d3a50',
    backgroundColor: '#0f1729',
    color: '#e2e8f0',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
    flex: 1
  },
  emptyColumn: {
    textAlign: 'center',
    color: '#475569',
    fontSize: '13px',
    padding: '24px 16px'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#60a5fa'
  },
  error: {
    textAlign: 'center',
    color: '#ef4444',
    padding: '40px',
    fontSize: '16px'
  }
};

// ── Card Component ───────────────────────────────────────────────────────────
function ListingCard({ listing, onStatusChange }) {
  const stipendDisplay = listing.stipend > 0
    ? `₹${listing.stipend.toLocaleString('en-IN')}/month`
    : 'Not listed';

  const displaySkills = (listing.skills || []).slice(0, 3);

  // Determine current status from the application record or fallback
  const currentStatus = listing.application_status || 'pending';

  return React.createElement('div', {
    style: styles.card,
    onMouseEnter: (e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }
  },
    // Title
    React.createElement('div', { style: styles.cardTitle }, listing.title),
    // Company
    React.createElement('div', { style: styles.cardCompany }, listing.company),
    // Stipend + Score row
    React.createElement('div', { style: styles.cardRow },
      React.createElement('span', { style: styles.stipendText }, stipendDisplay),
      React.createElement('span', { style: styles.scoreBadge(listing.score) }, `${listing.score}/10`)
    ),
    // Skills tags
    displaySkills.length > 0
      ? React.createElement('div', { style: styles.skillsRow },
          ...displaySkills.map((skill, i) =>
            React.createElement('span', { key: i, style: styles.skillTag }, skill)
          )
        )
      : null,
    // Actions row
    React.createElement('div', { style: styles.cardActions },
      // Apply button
      React.createElement('a', {
        href: listing.apply_url || listing.applyUrl || '#',
        target: '_blank',
        rel: 'noopener noreferrer',
        style: styles.applyButton,
        onMouseEnter: (e) => { e.target.style.backgroundColor = '#1d4ed8'; },
        onMouseLeave: (e) => { e.target.style.backgroundColor = '#2563eb'; }
      }, 'Apply'),
      // Status dropdown
      React.createElement('select', {
        style: styles.statusSelect,
        value: currentStatus,
        onChange: (e) => onStatusChange(listing.id, e.target.value)
      },
        ...STATUS_OPTIONS.map(status =>
          React.createElement('option', { key: status, value: status },
            status.charAt(0).toUpperCase() + status.slice(1)
          )
        )
      )
    )
  );
}

// ── Main InternTracker Component ─────────────────────────────────────────────
function InternTracker() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [shortlistedOnly, setShortlistedOnly] = useState(true);
  const [sortBy, setSortBy] = useState('score');

  // Fetch shortlisted listings on mount
  useEffect(() => {
    async function fetchListings() {
      if (!supabase) {
        setError('Supabase not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.');
        setLoading(false);
        return;
      }

      try {
        // Fetch listings with shortlisted = true
        const { data: listingsData, error: listingsErr } = await supabase
          .from('listings')
          .select('*')
          .eq('shortlisted', true)
          .order('score', { ascending: false });

        if (listingsErr) throw listingsErr;

        // Fetch all application records to merge status
        const { data: appsData, error: appsErr } = await supabase
          .from('applications')
          .select('listing_id, status');

        // Build a map of listing_id -> status
        const statusMap = {};
        if (!appsErr && appsData) {
          appsData.forEach(app => {
            statusMap[app.listing_id] = app.status;
          });
        }

        // Merge application status into listings
        const merged = (listingsData || []).map(listing => ({
          ...listing,
          application_status: statusMap[listing.id] || 'pending'
        }));

        setListings(merged);
      } catch (err) {
        setError(err.message || 'Failed to fetch listings.');
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, []);

  // Handle status changes
  const handleStatusChange = useCallback(async (listingId, newStatus) => {
    // Optimistic UI update
    setListings(prev => prev.map(l =>
      l.id === listingId ? { ...l, application_status: newStatus } : l
    ));

    if (!supabase) return;

    try {
      // Check if application record exists
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
      console.error('Failed to update status:', err);
      // Revert on error
      setListings(prev => prev.map(l =>
        l.id === listingId ? { ...l, application_status: 'pending' } : l
      ));
    }
  }, []);

  // Filter & Sort
  const processedListings = useMemo(() => {
    let filtered = [...listings];

    // Search filter (title or company)
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q)
      );
    }

    // Shortlisted only toggle
    if (shortlistedOnly) {
      filtered = filtered.filter(l => l.shortlisted);
    }

    // Sort
    if (sortBy === 'score') {
      filtered.sort((a, b) => b.score - a.score);
    } else if (sortBy === 'stipend') {
      filtered.sort((a, b) => b.stipend - a.stipend);
    } else if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.scraped_at) - new Date(a.scraped_at));
    }

    return filtered;
  }, [listings, search, shortlistedOnly, sortBy]);

  // Group by application status for Kanban columns
  const columnData = useMemo(() => {
    const groups = {};
    COLUMNS.forEach(col => { groups[col.key] = []; });

    processedListings.forEach(listing => {
      const status = listing.application_status || 'pending';
      if (groups[status]) {
        groups[status].push(listing);
      }
      // 'rejected' items are not shown on the board
    });

    return groups;
  }, [processedListings]);

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return React.createElement('div', { style: styles.loading }, '⏳ Loading internships...');
  }

  if (error) {
    return React.createElement('div', { style: { ...styles.app, ...styles.error } },
      React.createElement('p', null, '❌ ', error)
    );
  }

  return React.createElement('div', { style: styles.app },
    // Header / Filter Bar
    React.createElement('header', { style: styles.header },
      React.createElement('h1', { style: styles.title },
        React.createElement('span', { style: styles.titleAccent }, 'Intern'),
        'Tracker'
      ),
      React.createElement('div', { style: styles.filterBar },
        // Search
        React.createElement('input', {
          id: 'search-input',
          type: 'text',
          placeholder: '🔍 Search title or company...',
          style: styles.searchInput,
          value: search,
          onChange: (e) => setSearch(e.target.value),
          onFocus: (e) => { e.target.style.borderColor = '#60a5fa'; },
          onBlur: (e) => { e.target.style.borderColor = '#2d3a50'; }
        }),
        // Shortlisted toggle
        React.createElement('label', { style: styles.toggle },
          React.createElement('input', {
            id: 'shortlisted-toggle',
            type: 'checkbox',
            checked: shortlistedOnly,
            onChange: (e) => setShortlistedOnly(e.target.checked),
            style: styles.toggleCheckbox
          }),
          'Shortlisted only'
        ),
        // Sort selector
        React.createElement('select', {
          id: 'sort-select',
          style: styles.selectSort,
          value: sortBy,
          onChange: (e) => setSortBy(e.target.value)
        },
          React.createElement('option', { value: 'score' }, 'Sort by: Score'),
          React.createElement('option', { value: 'stipend' }, 'Sort by: Stipend'),
          React.createElement('option', { value: 'date' }, 'Sort by: Date')
        )
      )
    ),

    // Kanban Board
    React.createElement('div', { style: styles.boardContainer },
      ...COLUMNS.map(col =>
        React.createElement('div', { key: col.key, style: styles.column },
          // Column header
          React.createElement('div', { style: styles.columnHeader },
            React.createElement('span', { style: styles.columnTitle },
              `${col.emoji} ${col.label}`
            ),
            React.createElement('span', { style: styles.columnCount },
              (columnData[col.key] || []).length
            )
          ),
          // Column body
          React.createElement('div', { style: styles.columnBody },
            (columnData[col.key] || []).length === 0
              ? React.createElement('div', { style: styles.emptyColumn }, 'No listings here yet')
              : (columnData[col.key] || []).map(listing =>
                  React.createElement(ListingCard, {
                    key: listing.id,
                    listing,
                    onStatusChange: handleStatusChange
                  })
                )
          )
        )
      )
    )
  );
}

module.exports = InternTracker;
