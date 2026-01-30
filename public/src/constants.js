// IndexedDB
export const DB_NAME = "healthDB";
export const DB_VERSION = 2;
export const STORE_MEASUREMENTS = "measurements";
export const STORE_MEALS = "meals";
export const STORE_SETTINGS = "settings";
export const INDEX_BY_TS = "by_ts";
export const INDEX_BY_TYPE = "by_type";

// Typy wpisów (magic strings)
export const MEASUREMENT_TYPE_BP = "bp";
export const MEASUREMENT_TYPE_WEIGHT = "weight";
export const MEAL_TYPE = "meal";

// Limity list
export const DEFAULT_LIST_LIMIT = 20;
export const MEALS_TODAY_FETCH_LIMIT = 100;
export const DASHBOARD_LATEST_COUNT = 1;

// Kalorie (dashboard, posiłki)
export const CALORIES_TARGET_DEFAULT = 2000;
export const CALORIES_MIN = 1;
export const CALORIES_MAX = 99999;

// Ciśnienie krwi (mmHg)
export const BP_SYS_MIN = 60;
export const BP_SYS_MAX = 250;
export const BP_DIA_MIN = 30;
export const BP_DIA_MAX = 150;

// Waga (kg)
export const WEIGHT_MIN_KG = 1;
export const WEIGHT_MAX_KG = 500;

// Maks. długości tekstów
export const MAX_NOTE_LENGTH = 500;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_LOCATION_LENGTH = 200;

// Router
export const RENDER_DEBOUNCE_MS = 80;

// Cache podsumowania dashboardu (unikanie re-fetch przy szybkiej nawigacji)
export const DASHBOARD_CACHE_TTL_MS = 30_000;

// Geolokacja (timeout w ms)
export const GEOLOCATION_TIMEOUT_MS = 10000;

// Rate-limiting API zewnętrznych (Nominatim: max 1 req/s, wymaga User-Agent)
export const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
export const NOMINATIM_MIN_INTERVAL_MS = 1000;
export const NOMINATIM_USER_AGENT = "PerfectHealth/1.0 (health tracker; contact: local)";

export const MAX_IMAGE_INPUT_SIZE = 10 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 1024;
export const IMAGE_JPEG_QUALITY = 0.82;
export const MAX_IMAGE_OUTPUT_SIZE = 800 * 1024;
