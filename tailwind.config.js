module.exports = {
	mode: "jit",
	content: [
		"./index.html",
		"./src/components/**/*.{js,jsx,ts,tsx}",
		"./src/**/*.html",
		"./src/**/*.js",
		"./src/**/*.jsx",
		"./src/**/*.ts",
		"./src/**/*.tsx",
	],
	darkMode: "media",
	theme: {
		extend: {
			colors: {
				primary: "#020659",
				secondary: "#4C5C9A",
				accent: "#B8BCE7",
				highlight: "#00D4FF",
			},
			fontFamily: {
				sans: ["Exo 2", "sans-serif"],
				mono: ["Source Code Pro", "monospace"],
				cursive: ["Leckerli One", "cursive"],
			},

			backgroundImage: {
				'glass-bg': "url('/download.jpg')", // Will update path after receiving the correct image
			},
			backdropFilter: {
				'blur-lg': 'blur(20px)',
			},
		},
		screens: {
			xs: "480px",
			ss: "640px",
			md: "768px",
			lg: "1060px",
			// lg: "1200px",
			// xl: "1700px",
		},
	},
	variants: {
		extend: {
			// Add any custom variants here if needed
		},
	},
	plugins: [
		// Add any custom plugins here if needed
	],
};