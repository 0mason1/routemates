const WMO = {
  0:  { icon: '☀️', label: 'Clear' },
  1:  { icon: '🌤️', label: 'Mostly clear' },
  2:  { icon: '⛅', label: 'Partly cloudy' },
  3:  { icon: '☁️', label: 'Overcast' },
  45: { icon: '🌫️', label: 'Fog' },
  48: { icon: '🌫️', label: 'Fog' },
  51: { icon: '🌦️', label: 'Drizzle' },
  53: { icon: '🌦️', label: 'Drizzle' },
  55: { icon: '🌧️', label: 'Drizzle' },
  61: { icon: '🌧️', label: 'Rain' },
  63: { icon: '🌧️', label: 'Rain' },
  65: { icon: '🌧️', label: 'Heavy rain' },
  71: { icon: '🌨️', label: 'Snow' },
  73: { icon: '🌨️', label: 'Snow' },
  75: { icon: '❄️', label: 'Heavy snow' },
  80: { icon: '🌦️', label: 'Showers' },
  81: { icon: '🌧️', label: 'Showers' },
  82: { icon: '⛈️', label: 'Showers' },
  95: { icon: '⛈️', label: 'Thunderstorm' },
  99: { icon: '⛈️', label: 'Thunderstorm' },
};

function decode(code) {
  return WMO[code] || WMO[Math.floor(code / 10) * 10] || { icon: '🌡️', label: 'Weather' };
}

// Only available within 16-day forecast window
function withinForecast(dateStr) {
  const diff = (new Date(dateStr + 'T12:00:00') - new Date()) / 86400000;
  return diff >= -1 && diff <= 15;
}

export async function getTripWeather(lat, lng, date) {
  if (!lat || !lng || !date || !withinForecast(date)) return null;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&daily=weathercode,temperature_2m_max&timezone=auto&start_date=${date}&end_date=${date}&temperature_unit=fahrenheit`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.daily?.weathercode?.length) {
      const code = data.daily.weathercode[0];
      const temp = Math.round(data.daily.temperature_2m_max[0]);
      return { ...decode(code), temp };
    }
  } catch {}
  return null;
}
