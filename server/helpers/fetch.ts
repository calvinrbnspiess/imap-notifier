const cache = new Map();
const CACHE_EXPIRATION_TIME = 60 * 1000; // 60 seconds

function normalizeDependency(dependency) {
  if (typeof dependency === "object" && dependency !== null) {
    return JSON.stringify(dependency);
  }
  return String(dependency ?? "");
}

/**
 * Fetch with cache based on URL and dependency.
 * Supports multiple calls to same URL with different dependencies.
 * Handles pending requests properly.
 * @param {string} url - The URL to fetch.
 * @param {object} [options={}] - Fetch options.
 * @param {any} [dependency=null] - Dependency for cache separation.
 * @returns {Promise<any>}
 */
export async function fetchWithCache(url, options = {}, dependency = null) {
  const dependencyKey = normalizeDependency(dependency);

  if (!cache.has(url)) {
    cache.set(url, new Map());
  }

  const urlCache = cache.get(url);

  const entry = urlCache.get(dependencyKey);
  const currentTime = Date.now();

  // If cache exists and is still fresh
  if (entry) {
    const { data, timestamp, promise } = entry;
    if (data && currentTime - timestamp < CACHE_EXPIRATION_TIME) {
      console.log(`Returning Cached response: ${url}`);
      return data;
    }
    if (promise) {
      console.log(`Waiting for pending fetch: ${url}`);
      return promise;
    }
  }

  console.log(`Fetch response: ${url}`);

  const fetchPromise = (async () => {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch: ${response.status} - ${response.statusText}`
        );
      }

      const data = await response.json();

      urlCache.set(dependencyKey, {
        data,
        timestamp: Date.now(),
        promise: null, // Clear promise after fulfilled
      });

      return data;
    } catch (error) {
      // Remove failed promise from cache
      urlCache.delete(dependencyKey);
      throw error;
    }
  })();

  // Store the pending promise immediately
  urlCache.set(dependencyKey, {
    data: null,
    timestamp: 0,
    promise: fetchPromise,
  });

  return fetchPromise;
}

/**
 * Clears cache for a specific URL + dependency
 * @param {string} url
 * @param {any} dependency
 */
export function clearCache(url, dependency = null) {
  const dependencyKey = normalizeDependency(dependency);
  const urlCache = cache.get(url);
  if (urlCache) {
    urlCache.delete(dependencyKey);
    if (urlCache.size === 0) {
      cache.delete(url);
    }
  }
}

/**
 * Clears all cached data
 */
export function clearAllCache() {
  cache.clear();
}
