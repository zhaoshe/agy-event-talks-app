/**
 * BigQuery Release Notes Viewer & Tweet Sharer
 * Vanilla JavaScript implementation
 */

(() => {
  // Application State
  const state = {
    feedData: null,
    allUpdates: [],
    selectedUpdate: null,
    activeCategory: 'ALL',
    searchQuery: '',
    isRefreshing: false
  };

  // DOM Elements
  const refreshBtn = document.getElementById('refreshBtn');
  const refreshSpinner = document.getElementById('refreshSpinner');
  const refreshBtnText = document.getElementById('refreshBtnText');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');

  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const categoryFilters = document.getElementById('categoryFilters');

  const feedList = document.getElementById('feedList');
  const skeletonLoader = document.getElementById('skeletonLoader');
  const emptyState = document.getElementById('emptyState');
  const resetFilterBtn = document.getElementById('resetFilterBtn');

  const selectionBanner = document.getElementById('selectionBanner');
  const selectedTitle = document.getElementById('selectedTitle');
  const openTweetBtn = document.getElementById('openTweetBtn');
  const clearSelectionBtn = document.getElementById('clearSelectionBtn');

  // Modal Elements
  const tweetModal = document.getElementById('tweetModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalUpdateType = document.getElementById('modalUpdateType');
  const modalUpdateDate = document.getElementById('modalUpdateDate');
  const modalDocLink = document.getElementById('modalDocLink');
  const tweetContentInput = document.getElementById('tweetContentInput');
  const charCount = document.getElementById('charCount');
  const charCountWarning = document.getElementById('charCountWarning');
  const sendTweetBtn = document.getElementById('sendTweetBtn');
  const copyTweetBtn = document.getElementById('copyTweetBtn');
  const copyBtnText = document.getElementById('copyBtnText');
  const copyBtnIcon = document.getElementById('copyBtnIcon');

  // Floating Selection Tooltip
  const floatingShareBtn = document.getElementById('floatingShareBtn');
  const tweetHighlightedTextBtn = document.getElementById('tweetHighlightedTextBtn');

  // Counts Elements
  const totalUpdatesCount = document.getElementById('totalUpdatesCount');
  const countFeature = document.getElementById('countFeature');
  const countChange = document.getElementById('countChange');
  const countFixed = document.getElementById('countFixed');
  const countAnnouncement = document.getElementById('countAnnouncement');

  const toastContainer = document.getElementById('toastContainer');

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    fetchReleaseNotes(false);
  });

  function initEvents() {
    // Refresh button with spinner
    refreshBtn.addEventListener('click', () => {
      fetchReleaseNotes(true);
    });

    // Search input
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      state.searchQuery = e.target.value.trim().toLowerCase();
      clearSearchBtn.classList.toggle('hidden', state.searchQuery.length === 0);
      debounceTimer = setTimeout(renderFeed, 180);
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      renderFeed();
      searchInput.focus();
    });

    // Category pills filter
    categoryFilters.addEventListener('click', (e) => {
      const pill = e.target.closest('.pill');
      if (!pill) return;
      document.querySelectorAll('.filter-pills .pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeCategory = pill.dataset.type;
      renderFeed();
    });

    // Reset filters
    resetFilterBtn.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      state.activeCategory = 'ALL';
      document.querySelectorAll('.filter-pills .pill').forEach(p => {
        p.classList.toggle('active', p.dataset.type === 'ALL');
      });
      renderFeed();
    });

    // Selection banner actions
    openTweetBtn.addEventListener('click', () => {
      if (state.selectedUpdate) {
        openTweetModal(state.selectedUpdate);
      }
    });

    clearSelectionBtn.addEventListener('click', () => {
      clearSelectedUpdate();
    });

    // Tweet Modal controls
    closeModalBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
      if (e.target === tweetModal) closeTweetModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !tweetModal.classList.contains('hidden')) {
        closeTweetModal();
      }
    });

    // Character counter
    tweetContentInput.addEventListener('input', updateCharCount);

    // Quick tag pills
    document.querySelectorAll('.tag-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        if (!tweetContentInput.value.includes(tag)) {
          tweetContentInput.value = (tweetContentInput.value.trim() + ' ' + tag).trim();
          updateCharCount();
        }
      });
    });

    // Send Tweet via Web Intent
    sendTweetBtn.addEventListener('click', () => {
      const text = tweetContentInput.value.trim();
      if (!text) {
        showToast('Please enter tweet content first', 'error');
        return;
      }
      const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
      window.open(tweetUrl, '_blank', 'noopener,noreferrer');
      showToast('Opening Twitter / 𝕏 to post!', 'success');
    });

    // Copy Tweet text
    copyTweetBtn.addEventListener('click', () => {
      const text = tweetContentInput.value.trim();
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        copyBtnText.textContent = 'Copied!';
        copyBtnIcon.textContent = '✓';
        showToast('Tweet copied to clipboard', 'info');
        setTimeout(() => {
          copyBtnText.textContent = 'Copy to Clipboard';
          copyBtnIcon.textContent = '📋';
        }, 2000);
      }).catch(err => {
        showToast('Failed to copy text', 'error');
      });
    });

    // Floating Highlighted Text listener
    document.addEventListener('mouseup', handleTextSelection);
    tweetHighlightedTextBtn.addEventListener('click', () => {
      const selection = window.getSelection().toString().trim();
      if (selection) {
        openCustomTweetModal(selection);
        hideFloatingShare();
      }
    });
  }

  // Fetch release notes from backend
  async function fetchReleaseNotes(forceRefresh = false) {
    if (state.isRefreshing) return;
    setRefreshingState(true);

    try {
      const url = forceRefresh ? '/api/releases?refresh=true' : '/api/releases';
      statusText.textContent = forceRefresh ? 'Refreshing feed...' : 'Fetching release notes...';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const resData = await response.json();
      if (!resData.success || !resData.feed) {
        throw new Error(resData.error || 'Invalid feed response');
      }

      state.feedData = resData.feed;

      // Flatten updates for quick indexing & counting
      const all = [];
      state.feedData.entries.forEach(entry => {
        entry.updates.forEach(up => {
          all.push({
            ...up,
            entryDate: entry.date,
            entryLink: entry.link
          });
        });
      });
      state.allUpdates = all;

      updateCategoryCounts();
      renderFeed();

      const lastFetchedStr = resData.last_fetched || new Date().toLocaleTimeString();
      statusText.textContent = `Updated: ${lastFetchedStr}`;
      statusIndicator.querySelector('.status-dot').classList.remove('error');

      if (forceRefresh) {
        showToast(`Feed refreshed! Loaded ${state.allUpdates.length} updates.`, 'success');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      statusText.textContent = 'Failed to load feed';
      statusIndicator.querySelector('.status-dot').classList.add('error');
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setRefreshingState(false);
    }
  }

  function setRefreshingState(isRefreshing) {
    state.isRefreshing = isRefreshing;
    if (isRefreshing) {
      refreshSpinner.classList.add('spinning');
      refreshBtn.disabled = true;
      refreshBtnText.textContent = 'Refreshing...';
    } else {
      refreshSpinner.classList.remove('spinning');
      refreshBtn.disabled = false;
      refreshBtnText.textContent = 'Refresh Feed';
      if (skeletonLoader) {
        skeletonLoader.remove();
      }
    }
  }

  function updateCategoryCounts() {
    totalUpdatesCount.textContent = state.allUpdates.length;

    let featureCount = 0;
    let changeCount = 0;
    let fixedCount = 0;
    let announcementCount = 0;

    state.allUpdates.forEach(item => {
      const t = (item.type || '').toLowerCase();
      if (t.includes('feature')) featureCount++;
      else if (t.includes('change')) changeCount++;
      else if (t.includes('fixed') || t.includes('fix') || t.includes('issue')) fixedCount++;
      else if (t.includes('announcement')) announcementCount++;
    });

    countFeature.textContent = featureCount;
    countChange.textContent = changeCount;
    countFixed.textContent = fixedCount;
    countAnnouncement.textContent = announcementCount;
  }

  // Render the release notes list
  function renderFeed() {
    if (!state.feedData || !state.feedData.entries) return;

    feedList.innerHTML = '';
    let totalVisible = 0;

    state.feedData.entries.forEach(entry => {
      // Filter updates inside this entry
      const matchingUpdates = entry.updates.filter(item => {
        // Category filter
        if (state.activeCategory !== 'ALL') {
          const itemType = (item.type || '').toLowerCase();
          const target = state.activeCategory.toLowerCase();
          if (target === 'fixed') {
            if (!itemType.includes('fix') && !itemType.includes('issue')) return false;
          } else if (!itemType.includes(target)) {
            return false;
          }
        }

        // Search keyword filter
        if (state.searchQuery) {
          const combined = `${item.type} ${item.headline} ${item.plain_text} ${entry.date}`.toLowerCase();
          if (!combined.includes(state.searchQuery)) return false;
        }

        return true;
      });

      if (matchingUpdates.length === 0) return;

      totalVisible += matchingUpdates.length;

      // Create Date Group
      const dateGroup = document.createElement('section');
      dateGroup.className = 'date-group';

      dateGroup.innerHTML = `
        <div class="date-group-header">
          <div class="date-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>${entry.date}</span>
          </div>
          <a href="${entry.link}" target="_blank" rel="noopener noreferrer" class="date-link" title="Open official release notes for ${entry.date}">
            Official Documentation ↗
          </a>
        </div>
        <div class="updates-grid"></div>
      `;

      const grid = dateGroup.querySelector('.updates-grid');

      matchingUpdates.forEach(update => {
        const isSelected = state.selectedUpdate && state.selectedUpdate.id === update.id;
        const card = document.createElement('article');
        card.className = `update-card ${isSelected ? 'selected' : ''}`;
        card.id = `card-${update.id}`;

        const badgeClass = getBadgeClass(update.type);

        card.innerHTML = `
          <div class="card-top-row">
            <div class="card-badges">
              <span class="badge ${badgeClass}">${escapeHtml(update.type)}</span>
              ${isSelected ? '<span class="badge badge-selected">✓ Selected</span>' : ''}
            </div>
            <div class="card-selection-check">
              <label>
                <input type="radio" name="selectedReleaseRadio" value="${update.id}" ${isSelected ? 'checked' : ''} />
                <span>Select</span>
              </label>
            </div>
          </div>

          <div class="card-headline">${escapeHtml(update.headline || update.type)}</div>
          <div class="card-body">${update.html}</div>

          <div class="card-footer">
            <span class="card-meta-left">${entry.date}</span>
            <div class="card-actions">
              <button class="btn btn-card-tweet select-and-tweet-btn" type="button">
                <svg class="x-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span>Tweet this</span>
              </button>
            </div>
          </div>
        `;

        // Card click triggers select
        card.addEventListener('click', (e) => {
          // If clicked a link inside card body, allow default navigation
          if (e.target.tagName === 'A') return;

          selectUpdate(update, entry);

          // If clicked the specific "Tweet this" button, open modal right away
          if (e.target.closest('.select-and-tweet-btn')) {
            openTweetModal(state.selectedUpdate);
          }
        });

        grid.appendChild(card);
      });

      feedList.appendChild(dateGroup);
    });

    emptyState.classList.toggle('hidden', totalVisible > 0);
  }

  function getBadgeClass(typeStr) {
    const t = (typeStr || '').toLowerCase();
    if (t.includes('feature')) return 'badge-feature';
    if (t.includes('change')) return 'badge-change';
    if (t.includes('fixed') || t.includes('fix') || t.includes('issue')) return 'badge-fixed';
    if (t.includes('announcement')) return 'badge-announcement';
    return 'badge-update';
  }

  // Update selection
  function selectUpdate(update, entry) {
    const item = {
      ...update,
      entryDate: entry.date,
      entryLink: entry.link
    };
    state.selectedUpdate = item;

    // Update radio buttons and card styles
    document.querySelectorAll('.update-card').forEach(card => {
      card.classList.remove('selected');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = false;
      const selBadge = card.querySelector('.badge-selected');
      if (selBadge) selBadge.remove();
    });

    const activeCard = document.getElementById(`card-${update.id}`);
    if (activeCard) {
      activeCard.classList.add('selected');
      const radio = activeCard.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      const badgesContainer = activeCard.querySelector('.card-badges');
      if (badgesContainer && !badgesContainer.querySelector('.badge-selected')) {
        const badge = document.createElement('span');
        badge.className = 'badge badge-selected';
        badge.textContent = '✓ Selected';
        badgesContainer.appendChild(badge);
      }
    }

    // Show sticky banner
    selectedTitle.textContent = `${entry.date} - ${update.headline || update.type}`;
    selectionBanner.classList.remove('hidden');
  }

  function clearSelectedUpdate() {
    state.selectedUpdate = null;
    selectionBanner.classList.add('hidden');
    document.querySelectorAll('.update-card').forEach(card => {
      card.classList.remove('selected');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = false;
      const selBadge = card.querySelector('.badge-selected');
      if (selBadge) selBadge.remove();
    });
  }

  // Open Tweet Modal with populated content
  function openTweetModal(item) {
    modalUpdateType.textContent = item.type;
    modalUpdateType.className = `badge ${getBadgeClass(item.type)}`;
    modalUpdateDate.textContent = item.entryDate;
    modalDocLink.href = item.entryLink;

    tweetContentInput.value = item.tweet_draft || generateTweetText(item);
    updateCharCount();

    tweetModal.classList.remove('hidden');
    tweetContentInput.focus();
  }

  function openCustomTweetModal(quoteText) {
    modalUpdateType.textContent = 'Snippet';
    modalUpdateType.className = 'badge badge-selected';
    modalUpdateDate.textContent = 'Selection';
    modalDocLink.href = 'https://docs.cloud.google.com/bigquery/docs/release-notes';

    const shortQuote = quoteText.length > 140 ? quoteText.substring(0, 137) + '...' : quoteText;
    const tweetText = `"${shortQuote}"\n\nLatest from Google BigQuery:\nhttps://docs.cloud.google.com/bigquery/docs/release-notes\n#BigQuery #GoogleCloud`;
    tweetContentInput.value = tweetText;
    updateCharCount();

    tweetModal.classList.remove('hidden');
    tweetContentInput.focus();
  }

  function closeTweetModal() {
    tweetModal.classList.add('hidden');
  }

  function generateTweetText(item) {
    const intro = `🚀 BigQuery ${item.type} (${item.entryDate}): ${item.headline}`;
    return `${intro}\n\nCheck release notes: ${item.entryLink}\n#BigQuery #GoogleCloud #DataEngineering`;
  }

  function updateCharCount() {
    const text = tweetContentInput.value;
    const count = text.length;
    charCount.textContent = count;

    if (count > 280) {
      charCount.style.color = 'var(--accent-red)';
      charCountWarning.classList.remove('hidden');
      sendTweetBtn.disabled = true;
    } else {
      charCount.style.color = count > 240 ? 'var(--accent-amber)' : 'var(--text-secondary)';
      charCountWarning.classList.add('hidden');
      sendTweetBtn.disabled = false;
    }
  }

  // Floating text selection handling
  function handleTextSelection(e) {
    // If inside modal, do nothing
    if (e.target.closest('#tweetModal')) return;

    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length >= 10 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      floatingShareBtn.style.top = `${rect.top + window.scrollY - 8}px`;
      floatingShareBtn.style.left = `${rect.left + window.scrollX + rect.width / 2}px`;
      floatingShareBtn.classList.remove('hidden');
    } else {
      hideFloatingShare();
    }
  }

  function hideFloatingShare() {
    floatingShareBtn.classList.add('hidden');
  }

  // Toast Notification System
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
