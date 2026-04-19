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
    <div className={`flex items-center gap-2 min-w-0 ${className ?? ""}`}>
      {logoOk ? (
        <img
          src={BRAND_LOGO_SRC}
          alt=""
          width={120}
          height={36}
          className="h-9 w-auto max-w-[120px] shrink-0 object-contain object-left"
          onError={() => setLogoOk(false)}
          decoding="async"
        />
      ) : (
        <span className="inline-block h-9 w-9 shrink-0 rounded-xl bg-white/10 ring-1 ring-white/15" aria-hidden />
      )}
      <span className={`truncate font-semibold ${titleClassName ?? "text-sm text-white/90"}`}>
        BioSmart Wrap
      </span>
    </div>
  );
}
