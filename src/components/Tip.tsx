import type { ReactNode } from 'react';

/** Hover-forklaring. Portert fra HTML-appens `<span class="tip" data-tip="...">`-mønster. */
export default function Tip({
  text, children, align = 'center',
}: {
  text: string;
  children?: ReactNode;
  align?: 'center' | 'left' | 'right';
}) {
  const cls = align === 'left' ? 'tip tip-left' : align === 'right' ? 'tip tip-right' : 'tip';
  return (
    <span className={cls} data-tip={text}>
      {children}
      <i className="tip-icon">i</i>
    </span>
  );
}
