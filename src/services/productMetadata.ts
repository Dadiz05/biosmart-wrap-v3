export type ProductMetadata = {
  id: string;
  deployment: string;
  production_date: string;
  indicator_ink: string;
  certifications: string[];
  scanning_logic: string;
};

export type QrStateMetadata = {
  state: "fresh" | "degraded" | "spoiled" | "critical";
  label: string;
  file: string;
  color: string;
  ph_range: [number, number];
};

export type ProductMetadataCatalog = {
  qr_text: string;
  generated_at: string;
  product_metadata: ProductMetadata;
  qr_states: QrStateMetadata[];
};

let cachedCatalog: ProductMetadataCatalog | null = null;
let pendingCatalog: Promise<ProductMetadataCatalog> | null = null;

async function loadCatalog() {
  if (cachedCatalog) return cachedCatalog;
  if (!pendingCatalog) {
    pendingCatalog = fetch("/qr/metadata.json")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Không tải được metadata (${response.status})`);
        }
        return (await response.json()) as ProductMetadataCatalog;
      })
      .then((catalog) => {
        cachedCatalog = catalog;
        return catalog;
      })
      .finally(() => {
        pendingCatalog = null;
      });
  }

  return pendingCatalog;
}

export async function getQrCatalog() {
  return loadCatalog();
}

export async function getProductMetadataByQrId(qrId: string) {
  const catalog = await loadCatalog();
  return catalog.product_metadata.id === qrId ? catalog.product_metadata : null;
}