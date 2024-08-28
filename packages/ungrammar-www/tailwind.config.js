import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
	content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
	daisyui: {
		themes: [
			{
				dark: {
					primary: "#BD93F9",
					secondary: "#FF79C6",
					accent: "#FFB86C",
					neutral: "#F8F8F2",
					"base-100": "#191A21",
					"base-200": "#21222C",
					"base-300": "#282A36",
					info: "#8BE9FD",
					success: "#50FA7B",
					warning: "#F1FA8C",
					error: "#FF5555",
				},
			},
			{
				light: {
					primary: "#8D63D9",
					secondary: "#CF4996",
					accent: "#BF683C",
					neutral: "#282A36",
					"base-100": "#E2E5D9",
					"base-200": "#E9F0E5",
					"base-300": "#F8F8F2",
					info: "#3B89DD",
					success: "#20BA4B",
					warning: "#91890A",
					error: "#EF4545",
				},
			},
		],
	},
	plugins: [daisyui],
};
