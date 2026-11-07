import { useEffect, useRef, useState, type ReactNode } from 'react';

export function AvatarCarousel({ label, slides, slideLabels, className = '' }: { label: string; slides: ReactNode[]; slideLabels: string[]; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const n = slides.length;

  const show = (i: number) => { activeRef.current = i; setActive(i); };
  const realIndex = (pos: number) => (pos <= 0 ? n - 1 : pos >= n + 1 ? 0 : pos - 1);

  useEffect(() => {
    const el = track.current;
    if (!el || n < 2) return;
    const place = () => { if (el.clientWidth) el.scrollLeft = (activeRef.current + 1) * el.clientWidth; };
    const settle = () => {
      const w = el.clientWidth; if (!w) return;
      const pos = Math.round(el.scrollLeft / w);
      show(realIndex(pos));
      if (pos === 0 || pos === n + 1) el.scrollLeft = (realIndex(pos) + 1) * w;
    };
    let timer = 0;
    const onScroll = () => {
      const w = el.clientWidth; if (!w) return;
      show(realIndex(Math.round(el.scrollLeft / w)));
      window.clearTimeout(timer); timer = window.setTimeout(settle, 140);
    };

    const resize = new ResizeObserver(place);
    resize.observe(el);
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('scrollend', settle);
    return () => { resize.disconnect(); el.removeEventListener('scroll', onScroll); el.removeEventListener('scrollend', settle); window.clearTimeout(timer); };
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps

  if (n < 2) return <>{slides}</>;
  const go = (i: number) => { const el = track.current; if (el) el.scrollTo({ left: (i + 1) * el.clientWidth, behavior: 'smooth' }); };
  const withCopies = [slides[n - 1], ...slides, slides[0]];

  return <div className={`avatar-carousel ${className}`}>
    <div className="avatar-carousel__track" ref={track} aria-label={label}>
      {withCopies.map((slide, i) => {
        const copy = i === 0 || i === n + 1;
        return <div className="avatar-carousel__slide" key={i} aria-hidden={copy || realIndex(i) !== active} inert={copy || undefined}>{slide}</div>;
      })}
    </div>
    <div className="avatar-carousel__dots">
      {slideLabels.map((text, i) => <button key={text} type="button" aria-label={text} aria-current={active === i} onClick={() => go(i)} />)}
    </div>
  </div>;
}
