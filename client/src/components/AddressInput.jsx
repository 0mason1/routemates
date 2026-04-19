import { useState, useRef, useEffect } from 'react';
import { geocode } from '../lib/mapbox';

export default function AddressInput({ label, value, onChange, onSelect, placeholder }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!value || value.length < 3) { setResults([]); setOpen(false); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const features = await geocode(value);
      if (features && features.length) { setResults(features); setOpen(true); }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [value]);

  function pick(feature) {
    const [lng, lat] = feature.center;
    onChange(feature.place_name);
    onSelect({ name: feature.place_name, lat, lng });
    setOpen(false);
    setResults([]);
  }

  return (
    <div className="field autocomplete-wrap">
      {label && <label>{label}</label>}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <div className="autocomplete-list">
          {results.map((f) => (
            <div key={f.id} className="autocomplete-item" onMouseDown={() => pick(f)}>
              {f.place_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
