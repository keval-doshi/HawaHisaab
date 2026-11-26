import { useState, type SyntheticEvent } from 'react';
import type { GeocodeResult } from '@hawahisaab/engine';
import { searchCities, type SelectedLocation } from '../api/client.js';
import { useI18n } from '../i18n/useI18n.js';

interface LocationPickerProps {
  selectedLocation: SelectedLocation | null;
  onSelectLocation: (location: SelectedLocation) => void;
}

export function LocationPicker({
  selectedLocation,
  onSelectLocation,
}: LocationPickerProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchedEmpty, setSearchedEmpty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setError(t.location.tooShort);
      return;
    }

    setError(null);
    setSearching(true);
    setSearchedEmpty(false);
    try {
      const cities = await searchCities(trimmed);
      setResults(cities);
      setSearchedEmpty(cities.length === 0);
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : t.location.geoFailed);
    } finally {
      setSearching(false);
    }
  }

  function handleSearchSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSearch();
  }

  function handleUseMyLocation() {
    if (!('geolocation' in navigator)) {
      setError(t.location.geoUnsupported);
      return;
    }

    setError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const lat = Number(position.coords.latitude.toFixed(4));
        const lon = Number(position.coords.longitude.toFixed(4));
        onSelectLocation({
          label: `${String(lat)}, ${String(lon)}`,
          lat,
          lon,
        });
      },
      (geoError) => {
        setLocating(false);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError(t.location.geoDenied);
        } else {
          setError(t.location.geoFailed);
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  function handlePickCity(city: GeocodeResult) {
    const label = city.state ? `${city.name}, ${city.state}` : city.name;
    setResults([]);
    setSearchedEmpty(false);
    setError(null);
    onSelectLocation({ label, lat: city.lat, lon: city.lon });
  }

  return (
    <div className="location-box">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={handleUseMyLocation}
        disabled={locating}
      >
        {locating ? t.location.locating : t.location.useMyLocation}
      </button>

      <div className="divider-or" aria-hidden="true">
        {t.location.orSearch}
      </div>

      <form onSubmit={handleSearchSubmit} noValidate>
        <label className="field-label" htmlFor="city-search-input">
          {t.location.cityLabel}
        </label>
        <div className="search-row">
          <input
            id="city-search-input"
            type="search"
            className="text-input"
            placeholder={t.location.cityPlaceholder}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            autoComplete="address-level2"
          />
          <button type="submit" className="btn btn-primary" disabled={searching}>
            {searching ? t.location.searching : t.location.search}
          </button>
        </div>
      </form>

      {error ? (
        <p className="status-error" role="alert">
          {error}
        </p>
      ) : null}

      {searchedEmpty ? (
        <p className="meta-line" role="status">
          {t.location.noResults}
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul className="results-list" aria-label={t.location.cityLabel}>
          {results.map((city) => (
            <li key={city.id}>
              <button
                type="button"
                className="btn result-btn"
                onClick={() => {
                  handlePickCity(city);
                }}
              >
                <span>{city.name}</span>
                <span className="result-meta">{city.state ?? 'India'}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selectedLocation && selectedLocation.label ? (
        <p className="meta-line" data-testid="selected-location">
          {t.location.selected}: <strong>{selectedLocation.label}</strong>
        </p>
      ) : null}
    </div>
  );
}
