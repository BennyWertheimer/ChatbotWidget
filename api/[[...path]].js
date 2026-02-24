export default async function handler(req, res) {
  const { default: app } = await import("../backend/dist/server.js");
  req.url = (req.url || "/").replace(/^\/api/, "") || "/";
  return app(req, res);
}
