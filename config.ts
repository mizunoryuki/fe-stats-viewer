export const WEB_LANGUAGES = [
  "TypeScript",
  "JavaScript",
  "Vue",
  "Svelte",
  "Astro",
  "HTML",
  "CSS",
  "SCSS",
];

export const IGNORE_PATH = [
  "node_modules",
  ".git",
  "dist",
  ".next",
  "build",
];

export const FRAMEWORK_DEFINITIONS = [
	{ id: "react",  packages: ["react", "react-dom"] },
	{ id: "next",   packages: ["next"] },
	{ id: "vue",    packages: ["vue", "@vue/runtime-core"] },
	{ id: "nuxt",   packages: ["nuxt", "nuxt3"] },
	{ id: "svelte", packages: ["svelte", "@sveltejs/kit"] },
	{ id: "nitro",  packages: ["nitropack", "nitro", "h3"] },
	{ id: "hono",   packages: ["hono"] },
	{ id: "astro",  packages: ["astro"] },
	{ id: "solid",  packages: ["solid-js", "solid-start"] },
	{ id: "htmx",   packages: ["htmx.org", "htmx"] },
	{ id: "alpine", packages: ["alpinejs", "alpine"] },
  ];