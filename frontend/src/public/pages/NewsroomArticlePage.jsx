import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ArticleLink from "../components/ArticleLink";
import { publicApi } from "../services/publicApi";
import { getCachedArticle, setCachedArticle } from "../utils/publicCache";

function formatPublishDate(value) {
  if (!value) return "";
  return String(value).trim();
}

function NewsroomBackLink() {
  return (
    <Link to="/" className="newsroom-back-link">
      <span className="newsroom-back-link__icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M15 18l-6-6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>Back to Newsroom</span>
    </Link>
  );
}

function ArticleSkeleton() {
  return (
    <div className="newsroom-page newsroom-article py-4">
      <div className="container newsroom-container">
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="skeleton-line skeleton-back" />
            <div className="skeleton-line skeleton-article-title" />
            <div className="article-body news-card-skeleton">
              <div className="skeleton-line" />
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
          </div>
          <div className="col-lg-4 newsroom-sidebar">
            <aside className="sidebar-panel">
              <h4 className="sidebar-panel__title">Related Company PR</h4>
              <div className="sidebar-panel__body news-card-skeleton">
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line short" />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewsroomArticlePage() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState(null);
  const [company, setCompany] = useState(null);
  const [related, setRelated] = useState([]);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!slug) return;

    const cached = getCachedArticle(slug);
    if (cached) {
      setArticle(cached.article);
      setCompany(cached.company);
      setRelated(cached.related || []);
      setLoading(false);
      return;
    }

    const reqId = ++requestIdRef.current;
    setLoading(true);
    setArticle(null);
    setCompany(null);
    setRelated([]);

    (async () => {
      try {
        const res = await publicApi.getNewsroomArticle(slug);
        if (reqId !== requestIdRef.current) return;

        const data = res.data?.data || {};
        const payload = {
          article: data.article || null,
          company: data.company || null,
          related: data.related || []
        };

        if (payload.article) {
          setCachedArticle(slug, payload);
        }
        setArticle(payload.article);
        setCompany(payload.company);
        setRelated(payload.related);
      } catch {
        if (reqId !== requestIdRef.current) return;
        setArticle(null);
        setCompany(null);
        setRelated([]);
      } finally {
        if (reqId === requestIdRef.current) setLoading(false);
      }
    })();
  }, [slug]);

  useEffect(() => {
    if (!article?.description) return;

    const timer = window.setTimeout(() => {
      const loadEmbed = (src, id) => {
        if (document.getElementById(id)) return;
        const s = document.createElement("script");
        s.id = id;
        s.async = true;
        s.src = src;
        document.body.appendChild(s);
      };
      loadEmbed("https://platform.twitter.com/widgets.js", "twitter-wjs");
      loadEmbed("https://www.instagram.com/embed.js", "instagram-wjs");
      window.instgrm?.Embeds?.process?.();
      window.twttr?.widgets?.load?.();
    }, 100);

    return () => window.clearTimeout(timer);
  }, [article?.description]);

  useEffect(() => {
    if (article?.title) {
      document.title = `${article.title} | ZEXPRWIRE`;
    }
  }, [article?.title]);

  if (loading && !article) {
    return <ArticleSkeleton />;
  }

  if (!article) {
    return (
      <div className="container py-5">
        <p className="text-muted">Article not found.</p>
        <NewsroomBackLink />
      </div>
    );
  }

  return (
    <div className="newsroom-page newsroom-article py-4">
      <div className="container newsroom-container">
        <div className="row g-4">
          <div className="col-lg-8">
            <NewsroomBackLink />
            <h1 className="article-title">{article.title}</h1>
            <div
              className="article-body newsroom_news"
              dangerouslySetInnerHTML={{ __html: article.description || "" }}
            />
            <p className="text-muted mt-3 small">{formatPublishDate(article.publish_date)}</p>

            {article.show_contact_details && company && (
              <div className="media-contact">
                <strong>Media Contact</strong>
                <div className="mt-2">
                  <div>
                    <b>Company Name:</b> {company.cname}
                  </div>
                  {company.email ? (
                    <div>
                      <b>Email:</b>{" "}
                      <a href={`mailto:${company.email}`}>{company.email}</a>
                    </div>
                  ) : null}
                  {company.website ? (
                    <div>
                      <b>Website:</b>{" "}
                      <a href={company.website} target="_blank" rel="noreferrer">
                        {company.website}
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <div className="col-lg-4 newsroom-sidebar">
            <aside className="sidebar-panel">
              <h4 className="sidebar-panel__title">Related Company PR</h4>
              <div className="sidebar-panel__body">
                {related.length === 0 && (
                  <p className="sidebar-empty text-muted small mb-0">No related releases.</p>
                )}
                {related.length > 0 && (
                  <ul className="sidebar-list">
                    {related.map((row) => (
                      <li key={row.id}>
                        <ArticleLink url={row.url}>{row.title}</ArticleLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
