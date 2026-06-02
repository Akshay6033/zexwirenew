import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { publicApi } from "../services/publicApi";
import { isUserLoggedIn } from "../services/publicAuthApi";

const PR_PORTAL = "https://pr.zexprwire.com";

const SECTION_NAV = [
  { key: "", label: "PR Distribution", path: "/pricing" },
  { key: "reseller", label: "Reseller", path: "/pricing/reseller" },
  { key: "crypto", label: "Crypto", path: "/pricing/crypto" },
  { key: "indian", label: "Indian PR", path: "/pricing/indian" },
  { key: "whitelabel", label: "White Label", path: "/pricing/whitelabel" }
];

const SECTION_DEFAULT_CATEGORY = {
  "": "online",
  reseller: "reseller",
  crypto: "crypto",
  indian: "indian",
  whitelabel: "whitelabel"
};

const SECTION_META = {
  "": {
    title: "Packages and Pricing for PR Distribution",
    paragraphs: []
  },
  reseller: {
    title: "Reseller Press Release Ecosystem For Bulk Buying",
    paragraphs: [
      "Enjoy Discounted Prices on Bulk Buying.",
      "Choose a Press Release package to get started. Reseller Packages come with a validity of 1 Year from the date of purchase."
    ],
    showVolumeTabs: true
  },
  crypto: {
    title: "Packages and Pricing for PR Distribution",
    paragraphs: [],
    variant: "crypto"
  },
  indian: {
    title: "Indian Press Release Publication Service",
    paragraphs: ["Choose any Package from below to Publish your Press Release in Indian Origin Media Publication."]
  },
  whitelabel: {
    title: "White Label Press Release Ecosystem For SEO & PR Agencies",
    paragraphs: [
      "Credible Media Placements using our White Label Services. Our White Label PR distribution service allows you to offer press release distribution to your clients using unbranded press releases.",
      "Choose a Press Release package to get started. White Label Packages come with a validity of 1 Year from the date of purchase."
    ],
    showVolumeTabs: true
  }
};

const CATEGORY_CHIPS = [
  { key: "all", label: "All" },
  { key: "crypto", label: "Crypto" },
  { key: "indian", label: "Indian PR" },
  { key: "online", label: "Online" },
  { key: "offline", label: "Offline" },
  { key: "reseller", label: "Reseller" },
  { key: "whitelabel", label: "White Label" }
];

const VOLUME_TABS = [
  { key: "all", label: "All", badge: null },
  { key: "5", label: "5 PRs", badge: 3 },
  { key: "20", label: "20 PRs", badge: 1 },
  { key: "50", label: "50 PRs", badge: 2 }
];

function normalizeSection(raw) {
  const key = String(raw || "").trim().toLowerCase();
  if (!key || key === "normal") return "";
  if (["reseller", "crypto", "indian", "whitelabel", "whitelable"].includes(key)) {
    return key === "whitelable" ? "whitelabel" : key;
  }
  return "";
}

function packageMatchesSearch(pkg, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (String(pkg.pname || "").toLowerCase().includes(q)) return true;
  if (String(pkg.categoryLabel || "").toLowerCase().includes(q)) return true;
  return (pkg.descriptions || []).some((d) => String(d.des || "").toLowerCase().includes(q));
}

function PricingCard({ pkg, featured, variant }) {
  const userId = localStorage.getItem("userId");
  const buyHref =
    isUserLoggedIn() && userId
      ? `${PR_PORTAL}/payment_page/${pkg.id}/${userId}`
      : "/sign_in";

  return (
    <div className={`pricing-card-col ${featured ? "pricing-card-col--featured" : ""}`}>
      <article className={`pricing-card ${variant === "crypto" ? "pricing-card--crypto" : ""}`}>
        {featured && <span className="pricing-card__ribbon">Popular</span>}
        <header className="pricing-card__head">
          <h2 className="pricing-card__title">{pkg.pname}</h2>
        </header>
        <div className="pricing-card__body">
          <ul className="pricing-card__features">
            {(pkg.descriptions || []).map((item, idx) => (
              <li key={`${pkg.id}-${idx}`} className={item.included ? "is-included" : "is-excluded"}>
                <span className="pricing-card__icon" aria-hidden="true">
                  {item.included ? "✓" : "×"}
                </span>
                <span>{item.des}</span>
              </li>
            ))}
          </ul>
          <div className="pricing-card__footer">
            <div className="pricing-card__price">
              <sup>$</sup>
              {pkg.price}
            </div>
            <a href={buyHref} className={`pricing-card__buy ${featured ? "pricing-card__buy--primary" : ""}`}>
              Buy Now
            </a>
          </div>
        </div>
      </article>
    </div>
  );
}

function PricingSkeleton() {
  return (
    <div className="pricing-grid">
      {[1, 2, 3].map((n) => (
        <div key={n} className="pricing-card-col">
          <div className="pricing-card pricing-card--skeleton" aria-hidden="true">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-price" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PricingPage() {
  const { section: sectionParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = normalizeSection(sectionParam);

  const [packages, setPackages] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const searchInput = searchParams.get("q") || "";
  const categoryFromUrl = searchParams.get("category");
  const defaultCategory = SECTION_DEFAULT_CATEGORY[section] ?? "all";
  const categoryChip = categoryFromUrl || defaultCategory;
  const volumeTab = searchParams.get("volume") || "all";

  const meta = SECTION_META[section] || SECTION_META[""];
  const showVolumeTabs = Boolean(meta.showVolumeTabs);

  const updateParams = useCallback(
    (updates) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "" || value === "all") {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    publicApi
      .getPricing()
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data || {};
        setPackages(data.packages || []);
        setAvailableCategories(data.categories || []);
        setBanner(data.banner || null);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load pricing packages. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleChips = useMemo(() => {
    const cats = new Set(availableCategories);
    return CATEGORY_CHIPS.filter((chip) => chip.key === "all" || cats.has(chip.key));
  }, [availableCategories]);

  const filteredPackages = useMemo(() => {
    let list = packages;
    if (categoryChip && categoryChip !== "all") {
      list = list.filter((pkg) => pkg.categoryKey === categoryChip);
    }

    if (showVolumeTabs && volumeTab !== "all") {
      const tab = VOLUME_TABS.find((t) => t.key === volumeTab);
      if (tab?.badge) {
        list = list.filter((pkg) => Number(pkg.badge) === tab.badge);
      }
    }

    if (searchInput.trim()) {
      list = list.filter((pkg) => packageMatchesSearch(pkg, searchInput));
    }

    return list;
  }, [packages, categoryChip, volumeTab, searchInput, showVolumeTabs]);

  const isCatalogEmpty = !loading && !error && packages.length === 0;
  const isFilteredEmpty = !loading && !error && packages.length > 0 && filteredPackages.length === 0;

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const bannerSrc = banner?.image
    ? banner.image.startsWith("http")
      ? banner.image
      : banner.image
    : null;

  return (
    <div className={`pricing-page ${meta.variant === "crypto" ? "pricing-page--crypto" : ""}`}>
      <div className="container newsroom-container">
        {bannerSrc && !section && (
          <div className="pricing-banner mb-4">
            {banner.link ? (
              <a href={banner.link} target="_blank" rel="noreferrer">
                <img src={bannerSrc} alt={banner.alt || "Pricing promotion"} className="pricing-banner__img" />
              </a>
            ) : (
              <img src={bannerSrc} alt={banner.alt || "Pricing promotion"} className="pricing-banner__img" />
            )}
          </div>
        )}

        <nav className="pricing-section-nav" aria-label="Pricing categories">
          {SECTION_NAV.map((item) => (
            <Link
              key={item.key || "all"}
              to={item.path}
              className={`pricing-section-nav__link ${section === item.key ? "is-active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <header className="pricing-hero">
          <h1 className="pricing-hero__title">{meta.title}</h1>
          {meta.paragraphs?.map((text) => (
            <p key={text} className="pricing-hero__text">
              {text}
            </p>
          ))}
        </header>

        <div className="pricing-toolbar">
          <label className="pricing-search">
            <span className="visually-hidden">Search packages</span>
            <input
              type="search"
              className="form-control pricing-search__input"
              placeholder="Search by package name, description, or category…"
              value={searchInput}
              onChange={(e) => updateParams({ q: e.target.value.trim() ? e.target.value : null })}
              autoComplete="off"
            />
          </label>

          <div className="pricing-chips" role="group" aria-label="Filter by category">
            {visibleChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className={`pricing-chip ${categoryChip === chip.key ? "is-active" : ""}`}
                onClick={() => updateParams({ category: chip.key === "all" ? null : chip.key })}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {showVolumeTabs && (
            <div className="pricing-volume-tabs" role="tablist" aria-label="Filter by volume">
              {VOLUME_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  className={`pricing-volume-tab ${volumeTab === tab.key || (tab.key === "all" && volumeTab === "all") ? "is-active" : ""}`}
                  onClick={() => updateParams({ volume: tab.key === "all" ? null : tab.key })}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {loading && <PricingSkeleton />}

        {isCatalogEmpty && (
          <div className="pricing-empty">
            <p>No packages are currently available. Please check back later.</p>
          </div>
        )}

        {isFilteredEmpty && (
          <div className="pricing-empty">
            <p>No packages found matching your search. Try a different keyword or clear the filters.</p>
            <button type="button" className="btn btn-primary pricing-empty__btn" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        )}

        {!loading && !error && filteredPackages.length > 0 && (
          <div className="pricing-grid">
            {filteredPackages.map((pkg) => (
              <PricingCard
                key={pkg.id}
                pkg={pkg}
                featured={Number(pkg.badge) === 1}
                variant={meta.variant === "crypto" || pkg.categoryKey === "crypto" ? "crypto" : ""}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
