import React, { useState, useEffect } from 'react';
import { MapPin, Search, Loader2, X } from 'lucide-react';

const LocationPicker = ({
  value = '',
  onChange,
  disabled = false,
  error = null,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const searchLocation = async query => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      // Usar Nominatim (OpenStreetMap) - API gratuita para geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=8&addressdetails=1&accept-language=pt-BR,pt,en`
      );

      if (!response.ok) throw new Error('Erro na busca');

      const data = await response.json();

      const formattedSuggestions = data
        .map(item => ({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          type: item.type,
          importance: item.importance || 0,
          place_id: item.place_id,
          // Extrair nome principal e país
          name: item.display_name.split(',')[0].trim(),
          country: item.display_name.split(',').pop().trim(),
        }))
        .sort((a, b) => b.importance - a.importance); // Ordenar por relevância

      setSuggestions(formattedSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Geocoding error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = e => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);

    // Debounce para evitar muitas requisições
    clearTimeout(window.locationSearchTimeout);
    window.locationSearchTimeout = setTimeout(() => {
      searchLocation(newValue);
    }, 300);
  };

  const selectSuggestion = suggestion => {
    setInputValue(suggestion.display_name);
    onChange(suggestion.display_name);
    setSuggestions([]);
    setShowSuggestions(false);

    // Opcional: salvar coordenadas para uso posterior
    if (window.selectedLocationCoords) {
      window.selectedLocationCoords = {
        lat: suggestion.lat,
        lon: suggestion.lon,
        name: suggestion.display_name,
      };
    }
  };

  const clearInput = () => {
    setInputValue('');
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    if (suggestions.length > 0 && inputValue.length >= 3) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay para permitir click nas sugestões
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div className='relative'>
      <div className='relative'>
        <input
          type='text'
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`w-full pl-10 pr-20 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
          placeholder='Digite uma cidade, país ou ponto turístico...'
          disabled={disabled}
          autoComplete='off'
        />

        <MapPin className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />

        <div className='absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1'>
          {loading && (
            <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
          )}

          {inputValue && !loading && (
            <button
              type='button'
              onClick={clearInput}
              className='p-1 hover:bg-gray-100 rounded-full transition-colors'
              disabled={disabled}
            >
              <X className='h-3 w-3 text-gray-400' />
            </button>
          )}
        </div>
      </div>

      {error && <p className='mt-1 text-sm text-red-600'>{error}</p>}

      {/* Sugestões Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className='absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto'>
          <div className='py-1'>
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.place_id}-${index}`}
                type='button'
                className='w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0'
                onClick={() => selectSuggestion(suggestion)}
              >
                <div className='flex items-start space-x-3'>
                  <MapPin className='h-4 w-4 text-gray-400 mt-1 flex-shrink-0' />
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium text-gray-900 truncate'>
                      {suggestion.name}
                    </p>
                    <p className='text-xs text-gray-500 truncate'>
                      {suggestion.display_name}
                    </p>
                  </div>
                  <div className='text-xs text-gray-400 flex-shrink-0'>
                    {suggestion.type}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className='px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500'>
            💡 Dica: Seja específico (ex: "Torre Eiffel, Paris" ou "Cristo
            Redentor, Rio")
          </div>
        </div>
      )}

      {/* Loading state quando há input mas ainda não terminou a busca */}
      {showSuggestions &&
        suggestions.length === 0 &&
        !loading &&
        inputValue.length >= 3 && (
          <div className='absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg'>
            <div className='px-4 py-3 text-sm text-gray-500 text-center'>
              Nenhuma localização encontrada. Tente ser mais específico.
            </div>
          </div>
        )}
    </div>
  );
};

export default LocationPicker;
