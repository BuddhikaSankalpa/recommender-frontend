import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Film, Loader2, Search } from 'lucide-react';
import './App.css';
import TitleSearch from './TitleSearch';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const API_URL = 'http://127.0.0.1:8000/recommend';
const heroImages = [
  '/images/hero-image-1.webp',
  '/images/hero-image-2.webp',
  '/images/hero-image-3.webp',
];

// Editorial homepage selection from the existing movies_data.csv and tv_data.csv.
// There is no catalogue endpoint, so this is presentation data only.
const titles = [
  { id: 329865, title: 'Arrival', type: 'movie', genres: 'Drama · Science Fiction · Mystery', poster: '/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg' },
  { id: 666277, title: 'Past Lives', type: 'movie', genres: 'Drama · Romance', poster: '/rzO71VFu7CpJMfF5TQNMj0d1lSV.jpg' },
  { id: 414906, title: 'The Batman', type: 'movie', genres: 'Crime · Mystery · Thriller', poster: '/74xTEgt7R36Fpooo50r9T25onhq.jpg' },
  { id: 545611, title: 'Everything Everywhere All at Once', type: 'movie', genres: 'Action · Adventure · Science Fiction', poster: '/rKvCys0fMIIi1X9rmJBxTPLAtoU.jpg' },
  { id: 120467, title: 'The Grand Budapest Hotel', type: 'movie', genres: 'Comedy · Drama', poster: '/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg' },
  { id: 70523, title: 'Dark', type: 'tv', genres: 'Drama · Sci-Fi & Fantasy · Mystery', poster: '/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg' },
  { id: 95396, title: 'Severance', type: 'tv', genres: 'Drama · Mystery · Sci-Fi & Fantasy', poster: '/lFf6LLrQjYldcZItzOkGmMMigP7.jpg' },
  { id: 66732, title: 'Stranger Things', type: 'tv', genres: 'Drama · Sci-Fi & Fantasy · Mystery', poster: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg' },
  { id: 100088, title: 'The Last of Us', type: 'tv', genres: 'Drama', poster: '/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg' },
];

const collections = [
  { title: 'Beautifully strange', caption: 'Stories that take the unexpected road.', style: 'strange', posters: [titles[3], titles[4]] },
  { title: 'Beyond our world', caption: 'The great unknown, a little closer.', style: 'beyond', posters: [titles[0], titles[6]] },
  { title: 'One more episode', caption: 'Mysteries worth staying up for.', style: 'episode', posters: [titles[5], titles[7]] },
];

function Poster({ title, path }) {
  const [failed, setFailed] = useState(false);
  return <div className="poster">{path && !failed
    ? <img src={`${TMDB_IMAGE_BASE}${path}`} alt={`${title} poster`} loading="lazy" onError={() => setFailed(true)} />
    : <div className="poster-fallback" role="img" aria-label={`${title} poster unavailable`}><Film size={28} aria-hidden="true" /><span>{title}</span></div>}
  </div>;
}

export default function App() {
  const resultsRef = useRef(null);
  const searchControllerRef = useRef(null);
  const searchRequestRef = useRef(0);
  const lastScrolledOutcomeRef = useRef(null);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [heroTimerReset, setHeroTimerReset] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState('movie');
  const [shelfFilter, setShelfFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastSearched, setLastSearched] = useState(null);
  const [lastSearchedType, setLastSearchedType] = useState('movie');
  const [completedOutcomeId, setCompletedOutcomeId] = useState(null);
  const suggestions = [
    { title: 'Inception', type: 'movie' },
    { title: 'Interstellar', type: 'movie' },
    { title: 'Dark', type: 'tv' },
  ];

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;
    const timer = window.setTimeout(() => {
      setActiveHeroSlide((currentSlide) => (currentSlide + 1) % heroImages.length);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [activeHeroSlide, heroTimerReset, prefersReducedMotion]);

  useEffect(() => {
    if (completedOutcomeId === null || lastScrolledOutcomeRef.current === completedOutcomeId || !resultsRef.current) return;
    lastScrolledOutcomeRef.current = completedOutcomeId;
    resultsRef.current.scrollIntoView({ behavior: prefersReducedMotion ? 'instant' : 'smooth', block: 'start' });
  }, [completedOutcomeId, prefersReducedMotion]);

  useEffect(() => () => searchControllerRef.current?.abort(), []);

  const selectHeroSlide = (index) => {
    setActiveHeroSlide(index);
    setHeroTimerReset((reset) => reset + 1);
  };

  const selectMediaType = (type) => {
    searchRequestRef.current += 1;
    searchControllerRef.current?.abort();
    setMediaType(type);
    setResults([]);
    setError('');
    setIsLoading(false);
  };

  const handleSearch = async (searchTitle = query, searchType = mediaType) => {
    const requestId = ++searchRequestRef.current;
    searchControllerRef.current?.abort();
    const trimmed = (typeof searchTitle === 'string' ? searchTitle : query).trim();
    setResults([]);
    setError('');
    if (!trimmed) {
      setIsLoading(false);
      setError('Please enter a title to get recommendations.');
      setCompletedOutcomeId(requestId);
      return;
    }
    const controller = new AbortController();
    searchControllerRef.current = controller;
    setIsLoading(true);
    setLastSearched(trimmed);
    setLastSearchedType(searchType);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed, media_type: searchType, top_k: 5 }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (requestId !== searchRequestRef.current) return;
      if (!response.ok) throw new Error(data.detail || `Error ${response.status}: Failed to fetch recommendations.`);
      setResults(data.results || []);
      if (!data.results || data.results.length === 0) setError(`No recommendations found for "${trimmed}". Try another title.`);
    } catch (err) {
      if (requestId !== searchRequestRef.current || err.name === 'AbortError') return;
      console.error('Recommendation fetch error:', err);
      setResults([]);
      setError(err.message || 'Unable to connect to the backend server. Make sure FastAPI is running on port 8000.');
    } finally {
      if (requestId === searchRequestRef.current) {
        setIsLoading(false);
        setCompletedOutcomeId(requestId);
      }
    }
  };

  const searchForTitle = (title, type) => {
    setQuery(title);
    setMediaType(type);
    handleSearch(title, type);
  };

  const visibleTitles = titles.filter((item) => shelfFilter === 'all' || item.type === shelfFilter).slice(0, 5);

  return <div className="site-shell" id="top">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><div className="header-inner page-width">
      <a className="brand" href="#top" aria-label="Frame home"><span className="brand-corner">⌜</span><span>FRAME</span><span className="brand-corner">⌝</span></a>
      <nav className="main-nav" aria-label="Main navigation">
        <a href="#discovery">Discover</a>
        <a href="#discovery" onClick={() => setShelfFilter('movie')}>Movies</a>
        <a href="#discovery" onClick={() => setShelfFilter('tv')}>TV Series</a>
        <a href="#story-finder">Find Similar</a>
        <a href="#title-search">Title Search</a>
      </nav>
      <a className="header-search" href="#story-finder" aria-label="Go to search"><Search size={19} aria-hidden="true" /></a>
    </div></header>

    <main id="main">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-carousel" aria-hidden="true">
          {heroImages.map((image, index) => <img
            className={`hero-slide${index === activeHeroSlide ? ' active' : ''}`}
            src={image}
            alt=""
            key={image}
            loading="eager"
            fetchPriority={index === 0 ? 'high' : 'auto'}
          />)}
        </div>
        <div className="hero-shade" />
        <div className="page-width hero-content">
          <p className="eyebrow">STORY BASED FILM & TV DISCOVERY</p>
          <h1 id="hero-title">FIND MORE<br />FILMS & TV<br />MATCHING <br />YOURS </h1>
          <br></br>
          <p className="hero-copy">Enter a film or TV series you love. Discover movies and shows with similar storylines.</p>
          <br></br>
          <div className="hero-actions"><a className="button button-lime" href="#discovery">Explore films <ArrowUpRight size={17} aria-hidden="true" /></a><a className="text-link" href="#story-finder">Find a similar story <ArrowRight size={17} aria-hidden="true" /></a></div>
        </div>
        <div className="hero-pagination" aria-label="Hero slides">
          <span className="hero-slide-count" aria-live="polite">{String(activeHeroSlide + 1).padStart(2, '0')} / {String(heroImages.length).padStart(2, '0')}</span>
          <div className="hero-slide-buttons">
            {heroImages.map((image, index) => <button
              type="button"
              className={index === activeHeroSlide ? 'active' : ''}
              key={image}
              onClick={() => selectHeroSlide(index)}
              aria-label={`Show hero slide ${index + 1} of ${heroImages.length}`}
              aria-current={index === activeHeroSlide ? 'true' : undefined}
            />)}
          </div>
        </div>
        <div className="hero-caption"><span>EXPLORE BY STORY</span><strong>STORY FINDER</strong><small>SIMILAR FILMS · SERIES</small></div>
      </section>

      <section className="finder-section" id="story-finder" aria-labelledby="finder-title"><div className="page-width finder-layout">
        <div className="finder-intro"><p className="eyebrow dark-eyebrow">01 / THE STORY FINDER </p><h2 id="finder-title" className="display-heading">Loved a film<br />Follow the story</h2><p>Discover movies and series with similar stories.</p></div>
        <div className="finder-panel">
          <div className="media-toggle" role="group" aria-label="Choose a title type">
            <button type="button" className={mediaType === 'movie' ? 'active' : ''} aria-pressed={mediaType === 'movie'} onClick={() => selectMediaType('movie')}>Movies</button>
            <button type="button" className={mediaType === 'tv' ? 'active' : ''} aria-pressed={mediaType === 'tv'} onClick={() => selectMediaType('tv')}>TV Series</button>
          </div>
          <form className="finder-form" onSubmit={(event) => { event.preventDefault(); handleSearch(); }}>
            <label className="sr-only" htmlFor="story-title-input">Enter a movie or TV series title</label><Search size={20} aria-hidden="true" />
            <input id="story-title-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter a movie or series..." />
            <button type="submit" disabled={isLoading}>{isLoading ? 'Finding stories...' : 'Find similar'} <ArrowUpRight size={16} aria-hidden="true" /></button>
          </form>
          <div className="suggestions"><span>Try:</span>{suggestions.map(({ title, type }) => <button type="button" key={title} onClick={() => searchForTitle(title, type)}>{title}</button>)}</div>
          <div className="finder-art"><div className="finder-collage" aria-hidden="true"><img src="/images/story-city.webp" alt="" /><img src="/images/story-astronaut.webp" alt="" /><img src="/images/story-forest.webp" alt="" /></div><div className="finder-art-caption"><p>A new direction<br />for your next watch.</p><span aria-hidden="true" /></div></div>
        </div>
      </div></section>

      {(error || isLoading || results.length > 0) && <section className="results-section" id="recommendations" ref={resultsRef} aria-labelledby="results-title"><div className="page-width">
        <p className="eyebrow">Your next chapter</p><h2 id="results-title" className="display-heading">Stories to follow.</h2>
        {error && <p className="status-message" role="alert">{error}</p>}
        {isLoading && <p className="status-message" role="status"><Loader2 className="spin" size={20} aria-hidden="true" /> Finding related stories...</p>}
        {!isLoading && results.length > 0 && <><p className="results-context">Based on <strong>{lastSearched}</strong> · {lastSearchedType === 'movie' ? 'Movies' : 'TV Series'}</p><div className="poster-grid results-grid">{results.map((item, index) => <article className="title-card" key={`${item.id}-${index}`}><Poster title={item.title} path={item.poster_path} /><div className="card-copy"><h3>{item.title}</h3><p>{item.genres?.split(',').slice(0, 3).join(' · ')}</p><p className="card-overview">{item.overview || 'No synopsis available.'}</p></div></article>)}</div></>}
      </div></section>}

      <TitleSearch />

      <section className="discovery-section" id="discovery" aria-labelledby="discovery-title"><div className="page-width">
        <div className="section-heading-row"><div><p className="eyebrow">03 / The discovery shelf</p><h2 id="discovery-title" className="display-heading">Worth your evening.</h2></div><div className="shelf-tabs" role="group" aria-label="Filter discovery titles">
          <button className={shelfFilter === 'all' ? 'active' : ''} aria-pressed={shelfFilter === 'all'} onClick={() => setShelfFilter('all')}>All</button>
          <button className={shelfFilter === 'movie' ? 'active' : ''} aria-pressed={shelfFilter === 'movie'} onClick={() => setShelfFilter('movie')}>Movies</button>
          <button className={shelfFilter === 'tv' ? 'active' : ''} aria-pressed={shelfFilter === 'tv'} onClick={() => setShelfFilter('tv')}>TV Series</button>
        </div></div>
        <div className="poster-grid shelf-grid">{visibleTitles.map((item) => <button className="title-card shelf-card" type="button" key={item.id} onClick={() => searchForTitle(item.title, item.type)} aria-label={`Find stories similar to ${item.title}`}><Poster title={item.title} path={item.poster} /><span className="card-copy"><strong>{item.title}</strong><span>{item.type === 'movie' ? 'Film' : 'TV Series'} · {item.genres}</span></span></button>)}</div>
      </div></section>

      <section className="collections-section" aria-labelledby="collections-title"><div className="page-width"><p className="eyebrow">04 / Curated worlds</p><h2 id="collections-title" className="display-heading">Choose your kind of escape.</h2><div className="collection-grid">{collections.map((collection) => <article className={`collection-card ${collection.style}`} key={collection.title}><div className="collection-images" aria-hidden="true">{collection.posters.map((poster) => <Poster key={poster.id} title={poster.title} path={poster.poster} />)}</div><div className="collection-copy"><h3>{collection.title}</h3><p>{collection.caption}</p></div></article>)}</div></div></section>

      <section className="spotlight-section" aria-labelledby="spotlight-title"><div className="spotlight-art"><Poster title="Dark" path={titles[5].poster} /><span>DARK</span></div><div className="spotlight-copy"><p className="eyebrow dark-eyebrow">05 / Series spotlight</p><h2 id="spotlight-title" className="display-heading">Some stories<br />take their time.</h2><p className="spotlight-name">Dark</p><p>A missing child. Four families. A mystery across generations.</p><button type="button" className="button button-lime" onClick={() => searchForTitle('Dark', 'tv')}>Find stories like Dark <ArrowUpRight size={17} aria-hidden="true" /></button></div></section>
    </main>

    <footer className="site-footer"><div className="page-width"><div className="footer-main"><a className="brand" href="#top" aria-label="Frame home"><span className="brand-corner">⌜</span><span>FRAME</span><span className="brand-corner">⌝</span></a><p>Good stories are worth finding.</p><nav aria-label="Footer navigation"><a href="#top">Home</a><a href="#discovery" onClick={() => setShelfFilter('movie')}>Movies</a><a href="#discovery" onClick={() => setShelfFilter('tv')}>TV Series</a><a href="#story-finder">Find Similar</a></nav></div><div className="footer-bottom"><span>A place for people who love cinema.</span><span>Frame · Discovery journal</span></div></div></footer>
  </div>;
}
