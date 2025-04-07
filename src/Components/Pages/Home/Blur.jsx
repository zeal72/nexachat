// components/BlurLoader.js
import React from "react";

const BlurLoader = () => {
	return (
		<div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[9999]">
			<div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
		</div>
	);
};

export default BlurLoader;
