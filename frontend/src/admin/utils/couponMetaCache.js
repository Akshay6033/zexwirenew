const PACKAGES_TTL_MS = 5 * 60 * 1000;

let packagesCache = null;
let packagesCacheAt = 0;
let packagesPromise = null;

export async function getCachedCouponPackages(fetcher) {
  if (packagesCache && Date.now() - packagesCacheAt < PACKAGES_TTL_MS) {
    return packagesCache;
  }
  if (!packagesPromise) {
    packagesPromise = fetcher()
      .then((list) => {
        packagesCache = list;
        packagesCacheAt = Date.now();
        return list;
      })
      .finally(() => {
        packagesPromise = null;
      });
  }
  return packagesPromise;
}

export function clearCouponMetaCache() {
  packagesCache = null;
  packagesCacheAt = 0;
  packagesPromise = null;
}
