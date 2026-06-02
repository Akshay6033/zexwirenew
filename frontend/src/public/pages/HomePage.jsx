import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { publicApi } from "../services/publicApi";
import { getCachedFeed, setCachedFeed } from "../utils/publicCache";
import ArticleLink from "../components/ArticleLink";
import NewsroomPagination from "../components/NewsroomPagination";

function formatPublishDate(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}\/\d{2}\/\d{2}/.test(raw)) return raw.slice(0, 16);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${mo}/${da} ${hh}:${mm}`;
}

function FeedSkeleton() {
  return (
    <>
      {[1, 2, 3].map((n) => (
        <div key={n} className="news-card news-card-skeleton" aria-hidden="true">
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-line skeleton-date" />
        </div>
      ))}
    </>
  );
}

function parsePageParam(raw) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageFromUrl = parsePageParam(searchParams.get("page"));
  const [items, setItems] = useState([]);
  const [topPr, setTopPr] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [pageNotice, setPageNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);
  const feedRef = useRef(null);

  const syncPageInUrl = useCallback(
    (actualPage) => {
      if (actualPage === pageFromUrl) return;
      setSearchParams(actualPage > 1 ? { page: String(actualPage) } : {}, { replace: true });
    },
    [pageFromUrl, setSearchParams]
  );

  const applyFeed = useCallback((data, cachePage) => {
    setItems(data.items || []);
    setTopPr(data.topPr || []);
    setPagination(data.pagination || null);
    setPageNotice(data.pageNotice || "");
    setCachedFeed(cachePage, data);
  }, []);

  const loadFeed = useCallback(async (targetPage) => {
    const cached = getCachedFeed(targetPage);
    if (cached) {
      applyFeed(cached, targetPage);
      setLoading(false);
      return;
    }

    const reqId = ++requestIdRef.current;
    setLoading(true);

    try {
      const res = await publicApi.getNewsroomFeed({ page: targetPage, perPage: 10 });
      if (reqId !== requestIdRef.current) return;

      const data = res.data?.data || {};
      const actualPage = data.pagination?.page || targetPage;
      const pageNoticeText =
        data.pageAdjusted && data.requestedPage
          ? `Page ${data.requestedPage} is out of range. Showing page ${actualPage} of ${data.pagination?.totalPages || actualPage}.`
          : "";
      const bundle = {
        items: data.items || [],
        topPr: data.topPr || [],
        pagination: data.pagination || null,
        pageNotice: pageNoticeText
      };
      applyFeed(bundle, actualPage);
      if (data.pageAdjusted) syncPageInUrl(actualPage);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
      setItems([]);
      setTopPr([]);
      setPagination(null);
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [applyFeed, syncPageInUrl]);

  useEffect(() => {
    document.title = "ZEXPRWIRE - Press Release Distribution Services.";
  }, []);

  useEffect(() => {
    loadFeed(pageFromUrl);
  }, [pageFromUrl, loadFeed]);

  const goToPage = (nextPage) => {
    if (nextPage < 1 || (pagination && nextPage > pagination.totalPages)) return;
    setSearchParams(nextPage > 1 ? { page: String(nextPage) } : {});
    feedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const showSkeleton = loading && items.length === 0;

  return (
    <div className="newsroom-page py-4">
      <div className="container newsroom-container">
        <div className="row g-4">
          <div className="col-lg-8">
            <div className={`newsroom-feed${loading && items.length > 0 ? " is-loading" : ""}`} ref={feedRef} id="news">
              <h4 className="newsroom-section-title">Newsrooms</h4>

              {pageNotice && !loading && (
                <p className="newsroom-page-notice text-muted small">{pageNotice}</p>
              )}

              {showSkeleton && <FeedSkeleton />}

              {!loading && items.length === 0 && !pageNotice && (
                <p className="text-muted">Post(s) not found…</p>
              )}

              {items.map((row) => (
                <article key={row.id} className="news-card">
                  <p className="heading mb-0">
                    <ArticleLink url={row.url}>{row.title}</ArticleLink>
                  </p>
                  <div className="divider" />
                  <p className="date">{formatPublishDate(row.publish_date)}</p>
                </article>
              ))}

              <NewsroomPagination pagination={pagination} onPageChange={goToPage} loading={loading} />
            </div>
          </div>

          <div className="col-lg-4 newsroom-sidebar">
            <aside className="sidebar-panel">
              <h4 className="sidebar-panel__title">Top PR</h4>
              <div className="sidebar-panel__body">
                {showSkeleton && topPr.length === 0 && (
                  <div className="news-card-skeleton" aria-hidden="true">
                    <div className="skeleton-line skeleton-title" />
                    <div className="skeleton-line short" />
                  </div>
                )}
                {topPr.length > 0 && (
                  <ul className="sidebar-list">
                    {topPr.map((row) => (
                      <li key={row.id}>
                        <ArticleLink url={row.url}>{row.title}</ArticleLink>
                      </li>
                    ))}
                  </ul>
                )}
                {!loading && topPr.length === 0 && (
                  <p className="sidebar-empty text-muted small mb-0">No featured releases yet.</p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
