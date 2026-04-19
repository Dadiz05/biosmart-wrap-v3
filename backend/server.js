const express = require("express");
const cors = require("cors");
const neo4j = require("neo4j-driver");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 5000;

const mockDB = {
  "123": {
    name: "Cá hồi",
    supplier: "ABC Farm",
    packDate: "2026-04-01",
  },
  "456": {
    name: "Thịt bò",
    supplier: "XYZ Meat",
    packDate: "2026-04-02",
  },
  "789": {
    name: "Gà phi lê",
    supplier: "Green Farm",
    packDate: "2026-04-03",
  },
  "999": {
    name: "Tôm sú",
    supplier: "Ocean Fresh",
    packDate: "2026-04-04",
  },
};

function createNeo4jDriver() {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER;
  const pass = process.env.NEO4J_PASSWORD;
  if (!uri || !user || !pass) return null;
  return neo4j.driver(uri, neo4j.auth.basic(user, pass));
}

const driver = createNeo4jDriver();

async function getProductFromNeo4j(qrId) {
  if (!driver) return null;
  const session = driver.session();
  try {
    // Expected graph:
    // (Product {qrId})-[:SUPPLIED_BY]->(Supplier {name})
    // (Product)-[:HAS_STATUS]->(Freshness {status})
    const result = await session.run(
      `
      MATCH (p:Product {qrId: $qrId})
      OPTIONAL MATCH (p)-[:SUPPLIED_BY]->(s:Supplier)
      RETURN p{ .name, .packDate, supplier: coalesce(s.name, p.supplier) } AS product
      LIMIT 1
      `,
      { qrId }
    );
    const record = result.records[0];
    if (!record) return null;
    const product = record.get("product");
    if (!product) return null;
    // Ensure shape matches frontend expectation
    return {
      name: product.name,
      supplier: product.supplier,
      packDate: product.packDate,
    };
  } finally {
    await session.close();
  }
}

function getProduct(req, res) {
  const { id } = req.params;
  Promise.resolve()
    .then(async () => {
      const neo = await getProductFromNeo4j(id);
      if (neo) return neo;
      return mockDB[id] || null;
    })
    .then((product) => {
      if (!product) return res.status(404).json({ error: "Not found" });
      res.json(product);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Internal error" });
    });
}

// Gốc (local, Vercel proxy gọi …/product/:id)
app.get("/product/:id", getProduct);

// Tiền tố /api (một số gateway hoặc khi test tay URL …/api/product/:id)
const apiRouter = express.Router();
apiRouter.get("/product/:id", getProduct);
app.use("/api", apiRouter);

function health(_req, res) {
  res.json({ ok: true, neo4j: !!driver });
}

app.get("/health", health);
app.get("/api/health", health);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("GET /product/:id, GET /api/product/:id, GET /health, GET /api/health");
});