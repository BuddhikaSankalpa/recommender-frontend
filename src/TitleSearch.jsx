import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Film, Loader2, Search } from 'lucide-react';
import './TitleSearch.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const filters = [
  { label: 'All titles', value: '' },
  { label: 'Films', value: 'movie' },
  { label: 'TV series', value: 'series' },
];

function available(value, fallback = 'Not available') {
  return value && value !== 'N/A' ? value : fallback;
}

function TitlePoster({ title, url }) {
  const [failed, setFailed] = useState(false);
  return url && url !== 'N/A' && !failed
    ? <img src={url} alt={`${title} poster`} loading="lazy" onError={() => setFailed(true)} />
    : <div className="title-search-poster-fallback" role="img" aria-label={`${title} poster unavailable`}><Film aria-hidden="true" size={42} /><span>Poster unavailable</span></div>;
}

export default function TitleSearch() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [searched, setSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [detailError, setDetailError] = useState('');
  const searchController = useRef(null);
  const detailController = useRef(null);
  const resultsListRef = useRef(null);

  useEffect(() => () => {
    searchController.current?.abort();
    detailController.current?.abort();
  }, []);

  async function selectTitle(imdbID) {
    detailController.current?.abort();
    const controller = new AbortController();
    detailController.current = controller;
    setSelectedId(imdbID);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const response = await fetch(`${API_BASE}/omdb/title/${encodeURIComponent(imdbID)}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Unable to load this title.');
      setDetail(data);
    } catch (error) {
      if (error.name !== 'AbortError') setDetailError(error.message || 'Unable to load this title.');
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  }

  async function searchTitles(event) {
    event.preventDefault();
    const title = query.trim();
    if (!title) {
      setSearchError('Enter a film or TV series title.');
      return;
    }
    searchController.current?.abort();
    detailController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    setSearched(true);
    setSearchLoading(true);
    setSearchError('');
    setDetailError('');
    setResults([]);
    setTotalResults(null);
    setSelectedId(null);
    setDetail(null);
    setDetailLoading(false);
    const params = new URLSearchParams({ title });
    if (filter) params.set('media_type', filter);
    try {
      const response = await fetch(`${API_BASE}/omdb/search?${params}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Unable to search titles.');
      setResults(data.results || []);
      setTotalResults(Number.isFinite(Number(data.total_results)) ? Number(data.total_results) : null);
    } catch (error) {
      if (error.name !== 'AbortError') setSearchError(error.message || 'Unable to search titles.');
    } finally {
      if (!controller.signal.aborted) setSearchLoading(false);
    }
  }

  function chooseFilter(value) {
    searchController.current?.abort();
    detailController.current?.abort();
    setFilter(value);
    setResults([]);
    setTotalResults(null);
    setSelectedId(null);
    setDetail(null);
    setSearched(false);
    setSearchLoading(false);
    setDetailLoading(false);
    setSearchError('');
    setDetailError('');
  }

  function browseResults(direction) {
    const list = resultsListRef.current;
    const card = list?.querySelector('.title-search-result-card');
    if (!card) return;
    const gap = Number.parseFloat(window.getComputedStyle(list).columnGap) || 0;
    list.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  function moveCardFocus(event) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const next = event.key === 'ArrowRight' ? event.currentTarget.nextElementSibling : event.currentTarget.previousElementSibling;
    if (next instanceof HTMLButtonElement) {
      event.preventDefault();
      next.focus();
    }
  }

  const showContent = Boolean(searched || searchLoading || searchError || results.length || detailLoading || detailError || detail);

  return <section className="title-search-section" id="title-search" aria-labelledby="title-search-heading">
    <div className="title-search-intro"><div className="page-width title-search-intro-grid">
      <div><p className="eyebrow dark-eyebrow">02 / TITLE SEARCH</p><h2 id="title-search-heading" className="display-heading">LOOK BEYOND<br />THE POSTER.</h2><p className="title-search-lead">Find the details behind every film and series.</p></div>
      <div className="title-search-controls">
        <div className="title-search-filters" role="group" aria-label="Filter title search">
          {filters.map(({ label, value }) => <button key={label} type="button" className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => chooseFilter(value)}>{label}</button>)}
        </div>
        <form className="title-search-form" onSubmit={searchTitles}>
          <label htmlFor="omdb-title-input" className="sr-only">Film or TV series title</label><Search size={21} aria-hidden="true" />
          <input id="omdb-title-input" type="search" value={query} maxLength={100} onChange={(event) => setQuery(event.target.value)} placeholder="Search films and TV series" />
          <button type="submit" disabled={searchLoading}>{searchLoading ? 'Searching...' : 'Search title'} <ArrowUpRight size={17} aria-hidden="true" /></button>
        </form>
        <p className="title-search-hint">Search by title, then explore the story.</p>
      </div>
    </div></div>

    {showContent && <div className="title-search-content"><div className="page-width">
      {searchError && <p className="title-search-message" role="alert">{searchError}</p>}
      {searchLoading && <p className="title-search-message" role="status"><Loader2 className="spin" size={20} aria-hidden="true" /> Searching titles...</p>}
      {searched && !searchLoading && !searchError && results.length === 0 && <p className="title-search-message" role="status">No matching titles found. Try another title or filter.</p>}
      {results.length > 0 && <div className="title-search-results" aria-labelledby="title-search-results-heading">
        <div className="title-search-results-heading"><div><h3 id="title-search-results-heading" className="eyebrow">MATCHING TITLES</h3><span className="title-search-count">{totalResults ?? results.length} {(totalResults ?? results.length) === 1 ? 'result' : 'results'}</span></div>
          {results.length > 1 && <div className="title-search-result-controls" role="group" aria-label="Browse matching titles"><button type="button" onClick={() => browseResults(-1)} aria-label="Previous titles"><ChevronLeft aria-hidden="true" size={20} /></button><button type="button" onClick={() => browseResults(1)} aria-label="Next titles"><ChevronRight aria-hidden="true" size={20} /></button></div>}
        </div>
        <div className="title-search-result-list" ref={resultsListRef} aria-label="Search results, scrollable">
          {results.map((item) => {
            const selected = selectedId === item.imdbID;
            return <button key={item.imdbID} type="button" className={`title-search-result-card${selected ? ' selected' : ''}`} onClick={() => selectTitle(item.imdbID)} onKeyDown={moveCardFocus} aria-pressed={selected}>
              <span className="title-search-result-art"><TitlePoster key={item.imdbID} title={item.Title} url={item.Poster} />{selected && <span className="title-search-selected-badge">SELECTED</span>}</span>
              <span className="title-search-result-copy"><strong title={item.Title}>{item.Title}</strong><span>{available(item.Year)} <span aria-hidden="true">·</span> {item.Type === 'series' ? 'TV series' : 'Film'}</span></span>
            </button>;
          })}
        </div>
      </div>}
      {detailLoading && <p className="title-search-message" role="status"><Loader2 className="spin" size={20} aria-hidden="true" /> Loading title details...</p>}
      {detailError && <p className="title-search-message" role="alert">{detailError}</p>}
      {detail && <article className="title-search-profile" aria-label={`${detail.Title} title details`}>
        <div className="title-search-poster"><TitlePoster key={detail.imdbID} title={detail.Title} url={detail.Poster} /></div>
        <div className="title-search-profile-copy"><p className="eyebrow">TITLE PROFILE / {detail.Type === 'series' ? 'TV SERIES' : 'FILM'}</p><h3>{detail.Title}</h3>
          <p className="title-search-meta">{available(detail.Year)} <span>·</span> {available(detail.Genre)} <span>·</span> {available(detail.Runtime)}</p>
          <div className="title-search-rating"><strong>{available(detail.imdbRating, '—')}</strong><span>/ 10<br />IMDb</span></div>
          <h4>THE STORY</h4><p className="title-search-plot">{available(detail.Plot, 'No plot available.')}</p>
          <dl className="title-search-facts"><div><dt>{detail.Type === 'series' ? 'CREATOR / DIRECTOR' : 'DIRECTOR'}</dt><dd>{available(detail.Director)}</dd></div><div><dt>CAST</dt><dd>{available(detail.Actors)}</dd></div><div><dt>RELEASED</dt><dd>{available(detail.Released)}</dd></div></dl>
        </div>
      </article>}
    </div></div>}
  </section>;
}
