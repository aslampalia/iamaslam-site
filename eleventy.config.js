module.exports = function (eleventyConfig) {
  // Static assets — copied verbatim, never processed
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" });
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addPassthroughCopy("src/404.html");

  // Essays collection, oldest → newest
  eleventyConfig.addCollection("essays", function (api) {
    return api.getFilteredByGlob("src/essays/*.md").sort((a, b) => a.date - b.date);
  });

  // Category pill colors (matches the live design)
  eleventyConfig.addNunjucksGlobal("catSoft", {
    "Artificial Intelligence": "var(--cobalt-soft)",
    "Economics": "var(--violet-soft)",
    "Technology": "var(--flame-soft)",
    "Electronics": "var(--teal-soft)",
    "Markets": "var(--sun-soft)"
  });

  eleventyConfig.addFilter("readTime", function (html) {
    var text = String(html || "").replace(/<[^>]*>/g, " ");
    var words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200)) + " min read";
  });

  eleventyConfig.addFilter("humanDate", function (d) {
    var dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  });

  eleventyConfig.addFilter("isoDate", function (d) {
    var dt = d instanceof Date ? d : new Date(d);
    return dt.toISOString().slice(0, 10);
  });

  eleventyConfig.addFilter("shortDate", function (d) {
    var dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  });

  eleventyConfig.addFilter("rssDate", function (d) {
    var dt = d instanceof Date ? d : new Date(d);
    return dt.toUTCString();
  });

  eleventyConfig.addFilter("pubDate", function (d) {
    // "Tue, 15 Sep 2026 00:00:00 +0000" — matches the existing feed exactly
    var dt = d instanceof Date ? d : new Date(d);
    var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return days[dt.getUTCDay()] + ", " + p(dt.getUTCDate()) + " " + mon[dt.getUTCMonth()] +
      " " + dt.getUTCFullYear() + " 00:00:00 +0000";
  });

  eleventyConfig.addFilter("json", function (s) {
    return JSON.stringify(String(s == null ? "" : s));
  });

  // Prev/next essay links (list is newest-first here)
  eleventyConfig.addFilter("neighbors", function (coll, url) {
    var list = Array.prototype.slice.call(coll).reverse();
    var i = list.findIndex(function (e) { return e.page.url === url; });
    if (i === -1) return {};
    return { newer: list[i - 1] || null, older: list[i + 1] || null };
  });

  return {
    dir: { input: "src", output: "_site" },
    templateFormats: ["njk", "md"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
