import { useState } from "react";

/**
 * Logo thương hiệu — đặt file tại: public/brand/logo.png
 * (có thể đổi PNG → SVG: sửa hằng LOGO_SRC bên dưới cho khớp tên file.)
 */
export const BRAND_LOGO_SRC = "/brand/logo.png";

type Props = {
  /** Class cho cụm logo + tiêu đề (flex container) */
  className?: string;
  /** Class cho dòng chữ "BioSmart Wrap" */
  titleClassName?: string;
};

export default function BrandMark({ className, titleClassName }: Props) {
  const [logoOk, setLogoOk] = useState(true);

  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${className ?? ""}`}>
      <div className="shrink-0 rounded-2xl bg-white/90 px-2 py-1 ring-1 ring-emerald-200/70 shadow-sm">
        {logoOk ? (
          <img
            src={BRAND_LOGO_SRC}
            alt=""
            width={120}
            height={36}
            className="h-8 w-auto max-w-[110px] rounded-lg object-contain object-left"
            onError={() => setLogoOk(false)}
            decoding="async"
          />
        ) : (
          <span className="inline-block h-8 w-8 rounded-lg bg-emerald-100 ring-1 ring-emerald-300" aria-hidden />
        )}
      </div>
      <span
        className={`inline-flex items-center gap-1 rounded-2xl bg-white/95 px-3 py-1.5 text-sm font-extrabold uppercase tracking-wide shadow-sm ring-1 ring-emerald-200/80 ${
          titleClassName ?? ""
        }`}
      >
        <span className="text-emerald-900">BioSmart</span>
        <span className="text-emerald-500">Wrap</span>
      </span>
    </div>
  );
}
