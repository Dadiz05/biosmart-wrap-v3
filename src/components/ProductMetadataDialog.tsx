import { useEffect, useState } from "react";
import { getProductMetadataByQrId, type ProductMetadata } from "../services/productMetadata";
import { IconX } from "./Icons";

type Props = {
  open: boolean;
  qrId: string | null;
  onClose: () => void;
  lightMode?: boolean;
};

export default function ProductMetadataDialog({ open, qrId, onClose, lightMode = false }: Props) {
  const [metadata, setMetadata] = useState<ProductMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !qrId) return;

    let active = true;

    getProductMetadataByQrId(qrId)
      .then((result) => {
        if (!active) return;
        if (!result) {
          setMetadata(null);
          setError("Không tìm thấy dữ liệu metadata cho QR này.");
          return;
        }
        setMetadata(result);
      })
      .catch((fetchError) => {
        if (!active) return;
        setMetadata(null);
        setError(fetchError instanceof Error ? fetchError.message : "Không tải được metadata.");
      })
      .finally(() => {
        return;
      });

    return () => {
      active = false;
    };
  }, [open, qrId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10020] grid place-items-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-3xl p-5 ring-1 ${lightMode ? "bg-white text-slate-900 ring-slate-200" : "bg-slate-900 text-white ring-white/10"}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Truy xuất metadata</div>
            <h3 className="mt-1 text-xl font-black">Thông tin sản phẩm</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl p-2 ring-1 ${lightMode ? "bg-slate-100 text-slate-600 ring-slate-200" : "bg-white/10 text-white ring-white/10"}`}
            aria-label="Đóng thông tin sản phẩm"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className={`mt-4 space-y-3 text-sm leading-6 ${lightMode ? "text-slate-700" : "text-white/80"}`}>
          <p>Dữ liệu này được tải từ file JSON sau khi đã có kết quả quét, không suy diễn từ mã QR hiển thị.</p>

          {!metadata && !error ? <p>Đang tải metadata...</p> : null}

          {error ? <p className="font-semibold text-rose-500">{error}</p> : null}

          {metadata ? (
            <div className={`rounded-2xl p-4 ring-1 ${lightMode ? "bg-slate-50 ring-slate-200" : "bg-white/5 ring-white/10"}`}>
              <div className="grid gap-3 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wide opacity-70">ID sản phẩm</div>
                  <div className="font-semibold">{metadata.id}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide opacity-70">Ngày sản xuất</div>
                  <div className="font-semibold">{metadata.production_date}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide opacity-70">Loại mực</div>
                  <div className="font-semibold">{metadata.indicator_ink}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide opacity-70">Tiêu chuẩn chất lượng</div>
                  <div className="font-semibold">{metadata.certifications.join(" • ")}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide opacity-70">Cơ chế quét</div>
                  <div className="font-semibold">{metadata.scanning_logic}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide opacity-70">Mã QR</div>
                  <div className="font-semibold break-all">{qrId}</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${lightMode ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-900 ring-white/15"}`}
        >
          Đóng
        </button>
      </div>
    </div>
  );
}