import markdownIt from "markdown-it";

const md = markdownIt({ html: true, linkify: true, typographer: true });

export default function (c) {
  ["src/images", "src/media", "src/fonts", "src/styles.css", "src/site.js", "src/melissa.js", "src/vapi-sdk.js", "src/robots.txt", "src/_headers", "src/_redirects"].forEach((p) =>
    c.addPassthroughCopy(p)
  );
  c.addGlobalData("callPhone", async () => {
    const s = JSON.parse((await import("node:fs")).readFileSync("src/_data/site.json", "utf8"));
    return s.showMelissa && s.melissaPhone ? s.melissaPhone : s.phone;
  });
  c.setLibrary("md", md);
  c.addFilter("md", (s) => (s ? md.render(String(s)) : ""));
  c.addFilter("mdi", (s) => (s ? md.renderInline(String(s)) : ""));
  c.addFilter("tel", (s) => "+1" + String(s || "").replace(/\D/g, ""));
  c.addFilter("year", () => new Date().getFullYear());
  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "md"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
