document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const addBtn = document.getElementById('add-btn');
    const modal = document.getElementById('add-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const form = document.getElementById('add-form');
    const watchlistGrid = document.getElementById('watchlist-grid');
    const emptyState = document.getElementById('empty-state');
    const filterBtns = document.querySelectorAll('.filter-btn');

    // Stats Elements
    const totalCountEl = document.getElementById('total-count');
    const watchedCountEl = document.getElementById('watched-count');
    const watchingCountEl = document.getElementById('watching-count');

    // State
    let watchlist = JSON.parse(localStorage.getItem('stellarWatchlist')) || [];
    let currentFilter = 'all';

    // SVG Icons
    const icons = {
        trash: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
        play: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
        check: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    };

    // Initialize App
    function init() {
        renderList();
        updateStats();

        // Event Listeners for Filtering
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active class
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Keep track of current filter
                currentFilter = btn.dataset.filter;
                renderList();
            });
        });

        // Event Listeners for Modal
        addBtn.addEventListener('click', openModal);
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        // Close modal on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Form Submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            addItem();
        });
    }

    // Modal Functions
    function openModal() {
        modal.classList.add('active');
    }

    function closeModal() {
        modal.classList.remove('active');
        form.reset();
        document.getElementById('selected-movie-info').style.display = 'none';
        document.getElementById('poster-preview').src = '';
        document.getElementById('poster-url').value = '';
        document.getElementById('runtime-val').value = '';
        document.getElementById('year-val').value = '';
        document.getElementById('autocomplete-list').style.display = 'none';
    }

    // Data Management
    function saveToLocalStorage() {
        localStorage.setItem('stellarWatchlist', JSON.stringify(watchlist));
    }

    // Debounce function to limit API calls
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Auto-fetch poster from TVMaze API
    const titleInput = document.getElementById('title');
    const autocompleteList = document.getElementById('autocomplete-list');
    const selectedMovieInfo = document.getElementById('selected-movie-info');
    const posterPreview = document.getElementById('poster-preview');
    const movieTitleDisplay = document.getElementById('movie-title-display');
    const movieRuntimeDisplay = document.getElementById('movie-runtime-display');
    const posterUrlInput = document.getElementById('poster-url');
    const runtimeInput = document.getElementById('runtime-val');
    const yearInput = document.getElementById('year-val');
    const movieYearDisplay = document.getElementById('movie-year-display');
    const typeInput = document.getElementById('type');

    titleInput.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
            autocompleteList.style.display = 'none';
            return;
        }

        try {
            const apiKey = 'b9a5e69d';
            // Search all types first to get broader suggestions
            const response = await fetch(`https://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(query)}`);
            const data = await response.json();

            autocompleteList.innerHTML = '';
            if (data.Response === 'True' && data.Search && data.Search.length > 0) {
                data.Search.slice(0, 5).forEach(item => {
                    const div = document.createElement('div');
                    const title = item.Title;
                    const year = item.Year;
                    const imgUrl = (item.Poster && item.Poster !== 'N/A') ? item.Poster : '';
                    const thumbHtml = imgUrl ? `<img src="${imgUrl}" class="autocomplete-thumb">` : `<div class="autocomplete-thumb" style="background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:12px;">?</div>`;

                    div.innerHTML = `${thumbHtml} <div style="display:flex; flex-direction:column;"><span style="font-weight: 500;">${title}</span><span style="font-size:0.8rem; color:var(--text-secondary);">${year}</span></div>`;

                    div.addEventListener('click', () => {
                        titleInput.value = title;
                        autocompleteList.style.display = 'none';
                        showSelectedMovie(item, title, year);
                    });

                    autocompleteList.appendChild(div);
                });
                autocompleteList.style.display = 'block';
            } else {
                autocompleteList.style.display = 'none';
            }
        } catch (err) {
            console.error('Error fetching suggestions:', err);
            autocompleteList.style.display = 'none';
        }
    }, 400));

    // Hide autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== titleInput && e.target !== autocompleteList) {
            autocompleteList.style.display = 'none';
        }
    });

    async function showSelectedMovie(item, titleText, yearText) {
        selectedMovieInfo.style.display = 'flex';
        movieTitleDisplay.textContent = titleText;

        if (yearText) {
            movieYearDisplay.textContent = yearText;
            movieYearDisplay.style.display = 'inline-block';
            yearInput.value = yearText;
        } else {
            movieYearDisplay.style.display = 'none';
            yearInput.value = '';
        }

        const imgUrl = (item.Poster && item.Poster !== 'N/A') ? item.Poster : '';
        if (imgUrl) {
            posterPreview.src = imgUrl;
            posterUrlInput.value = imgUrl;
        } else {
            posterPreview.src = '';
            posterUrlInput.value = '';
        }

        // Fetch runtime details separately from OMDb
        movieRuntimeDisplay.innerHTML = 'Loading runtime...';
        try {
            const apiKey = 'b9a5e69d';
            const detailRes = await fetch(`https://www.omdbapi.com/?apikey=${apiKey}&i=${item.imdbID || item.id}`);
            const detailData = await detailRes.json();

            if (detailData.Response === 'True' && detailData.Runtime && detailData.Runtime !== 'N/A') {
                const runtimeStr = detailData.Runtime;
                const runtimeMins = parseInt(runtimeStr.replace(/[^0-9]/g, ''));

                if (!isNaN(runtimeMins)) {
                    const hours = Math.floor(runtimeMins / 60);
                    const mins = runtimeMins % 60;
                    const formatted = hours > 0 ? (mins > 0 ? `${hours}h ${mins}m` : `${hours}h`) : `${mins}m`;
                    movieRuntimeDisplay.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${formatted}`;
                    runtimeInput.value = runtimeMins;
                    return;
                }
            }
        } catch (err) {
            console.error('Error fetching details:', err);
        }

        movieRuntimeDisplay.textContent = 'Runtime: N/A';
        runtimeInput.value = '';
    }

    function addItem() {
        const typeInput = document.getElementById('type');
        const statusInput = document.getElementById('status');
        const ratingInput = document.getElementById('rating');

        const newItem = {
            id: Date.now().toString(),
            title: titleInput.value.trim(),
            poster: posterUrlInput.value || null,
            runtime: runtimeInput.value ? parseInt(runtimeInput.value) : null,
            year: yearInput.value || null,
            type: typeInput.value,
            status: statusInput.value,
            rating: ratingInput.value || null,
            dateAdded: new Date().toISOString()
        };

        watchlist.push(newItem);
        saveToLocalStorage();
        closeModal();

        // Reset to All filter when adding
        if (currentFilter !== 'all') {
            document.querySelector('.filter-btn[data-filter="all"]').click();
        } else {
            renderList();
            updateStats();
        }
    }

    window.deleteItem = function (id) {
        if (confirm('Are you sure you want to remove this title?')) {
            watchlist = watchlist.filter(item => item.id !== id);
            saveToLocalStorage();
            renderList();
            updateStats();
        }
    };

    window.updateStatus = function (id, newStatus) {
        const item = watchlist.find(item => item.id === id);
        if (item) {
            item.status = newStatus;
            saveToLocalStorage();
            renderList();
            updateStats();
        }
    };

    // UI Updates
    function updateStats() {
        const total = watchlist.length;
        const watched = watchlist.filter(i => i.status === 'completed').length;
        const watching = watchlist.filter(i => i.status === 'watching').length;

        // Counter Animation
        animateValue(totalCountEl, parseInt(totalCountEl.innerText), total, 800);
        animateValue(watchedCountEl, parseInt(watchedCountEl.innerText), watched, 800);
        animateValue(watchingCountEl, parseInt(watchingCountEl.innerText), watching, 800);
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    function renderList() {
        watchlistGrid.innerHTML = '';

        let filteredList = watchlist;
        if (currentFilter !== 'all') {
            filteredList = watchlist.filter(item => item.status === currentFilter);
        }

        if (filteredList.length === 0) {
            emptyState.style.display = 'block';
            if (currentFilter === 'all' && watchlist.length === 0) {
                emptyState.querySelector('h3').textContent = 'Your watchlist is empty';
                emptyState.querySelector('p').textContent = 'Start building your collection by adding your first title.';
            } else {
                emptyState.querySelector('h3').textContent = `No ${currentFilter} titles found`;
                emptyState.querySelector('p').textContent = 'Try changing your filter. ';
            }
            return;
        }

        emptyState.style.display = 'none';

        filteredList.forEach((item, index) => {
            const card = document.createElement('div');
            card.classList.add('watch-card');
            card.style.animationDelay = `${index * 0.05}s`;

            // Badge styles
            let badgeClass = 'badge-movie';
            if (item.type === 'TV Show') badgeClass = 'badge-tv';
            if (item.type === 'Anime') badgeClass = 'badge-anime';

            // Status Map
            const statusMap = {
                'plan': { label: 'Plan to Watch', dot: 'dot-plan' },
                'watching': { label: 'Watching', dot: 'dot-watching' },
                'completed': { label: 'Completed', dot: 'dot-completed' }
            };

            const sInfo = statusMap[item.status];

            // Generate poster HTML or placeholder
            const placeholderColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
            const randomColor = placeholderColors[item.title.length % placeholderColors.length];
            const posterHTML = item.poster
                ? `<div class="card-poster-container"><img src="${item.poster}" alt="${item.title} Poster" class="card-poster" loading="lazy"></div>`
                : `<div class="card-poster-container" style="background: ${randomColor};"><div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 5rem; font-weight: bold; opacity: 0.2;">${item.title.charAt(0).toUpperCase()}</div></div>`;

            let formattedRuntime = '';
            if (item.runtime) {
                const hours = Math.floor(item.runtime / 60);
                const mins = item.runtime % 60;
                const runtimeStr = hours > 0 ? (mins > 0 ? `${hours}h ${mins}m` : `${hours}h`) : `${mins}m`;
                formattedRuntime = `<span style="color:var(--text-secondary);font-size:0.85rem;margin-left:0.5rem;display:flex;align-items:center;gap:0.25rem;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${runtimeStr}</span>`;
            }

            card.innerHTML = `
                ${posterHTML}
                <div class="card-content-wrapper">
                    <div class="card-header">
                        <h3 class="card-title">${item.title} ${item.year ? `<span style="font-weight:400;color:var(--text-secondary);font-size:0.9rem;">(${item.year})</span>` : ''}</h3>
                        <span class="card-badge ${badgeClass}">${item.type}</span>
                    </div>
                    
                    <div class="card-status">
                        <span class="status-dot ${sInfo.dot}"></span>
                        ${sInfo.label}
                    </div>

                    <div class="card-footer">
                        <div class="card-rating">
                            ${item.rating ? `
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                ${item.rating}/10
                            ` : '<span style="color:var(--text-secondary);font-size:0.85rem;font-weight:normal">Unrated</span>'}
                            ${formattedRuntime}
                        </div>
                        
                        <div class="card-actions">
                            ${item.status !== 'watching' ? `<button class="icon-btn" onclick="updateStatus('${item.id}', 'watching')" title="Mark as Watching">${icons.play}</button>` : ''}
                            ${item.status !== 'completed' ? `<button class="icon-btn" onclick="updateStatus('${item.id}', 'completed')" title="Mark as Completed">${icons.check}</button>` : ''}
                            ${item.status !== 'plan' ? `<button class="icon-btn" onclick="updateStatus('${item.id}', 'plan')" title="Plan to Watch"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></button>` : ''}
                            <button class="icon-btn delete" onclick="deleteItem('${item.id}')" title="Delete">${icons.trash}</button>
                        </div>
                    </div>
                </div>
            `;
            watchlistGrid.appendChild(card);
        });
    }

    // Login Logic - Removed as per user request


    // Start App
    init();
});
