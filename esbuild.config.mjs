import esbuild from "esbuild";

const banner = `/* Strength Training Graphs - Obsidian Plugin */`;
const isWatch = process.argv.includes("--watch");

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian"],
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: isWatch ? "inline" : false,
  outfile: "main.js",
  banner: { js: banner },
});

if (isWatch) {
  await context.watch();
  console.log("Watching...");
} else {
  await context.rebuild();
  await context.dispose();
}
