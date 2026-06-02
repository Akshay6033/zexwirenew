import { useEffect, useRef, useState } from "react";

/**
 * Thumbnail with skeleton loader; loads src only when near viewport.
 */
export default function GalleryThumb({ src, href }) {
  const wrapRef = useRef(null);
  const [activeSrc, setActiveSrc] = useState("");
  const [phase, setPhase] = useState("idle");

  useEffect(() => {
    setActiveSrc("");
    setPhase("idle");
    const el = wrapRef.current;
    if (!src || !el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActiveSrc(src);
          setPhase("loading");
          observer.disconnect();
        }
      },
      { rootMargin: "120px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  if (!src) return "—";

  const body = (
    <span ref={wrapRef} className="gallery-thumb-wrap">
      {(phase === "idle" || phase === "loading") && (
        <span className="gallery-thumb-skeleton" aria-hidden="true">
          <span className="gallery-thumb-spinner" />
        </span>
      )}
      {activeSrc ? (
        <img
          src={activeSrc}
          alt=""
          width={80}
          height={50}
          decoding="async"
          fetchPriority="low"
          className={`gallery-thumb-img ${phase === "loaded" ? "gallery-thumb-img--visible" : ""}`}
          onLoad={() => setPhase("loaded")}
          onError={() => setPhase("error")}
        />
      ) : null}
      {phase === "error" && <span className="gallery-thumb-fallback">No preview</span>}
    </span>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="gallery-thumb-link">
        {body}
      </a>
    );
  }
  return body;
}
