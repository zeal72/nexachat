// components/BlurLoader.js
// import React from "react";

// const BlurLoader = () => {
// 	return (
// 		<div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[9999]">
// 			<div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
// 		</div>
// 	);
// };

// export default BlurLoader;
import React from "react";

const BlurLoader = ({ text = "Loading..." }) => {
	return (
		<div className="fixed inset-0 backdrop-blur-md bg-black/20 flex flex-col items-center justify-center z-[9999]">
			<div className="relative w-16 h-16">
				<div className="absolute inset-0 rounded-full border-4 border-t-transparent border-b-transparent border-l-blue-400 border-r-cyan-400 animate-spin"></div>
				<div className="absolute inset-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full blur-sm opacity-30"></div>
			</div>
			{/* Optional loading text */}
			{/* <p className="mt-4 text-white text-sm font-medium animate-pulse">{text}</p> */}
		</div>
	);
};

export default BlurLoader;
