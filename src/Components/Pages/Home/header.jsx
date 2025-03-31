import React, { useState } from "react";
import { VideoCameraIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { app, auth } from "../../../../firebaseConfig";
import { toast } from "react-toastify";

const db = getFirestore(app);

const Header = ({ onStartChat }) => {
	return (
		<div className="relative flex items-center justify-between px-4 py-3 mb-4 rounded-lg bg-white/10 backdrop-blur-lg border-b border-gray-700/50">
			{/* Logo */}
			<h1 className="text-xl font-bold text-white">NexaChat</h1>

			{/* Dropdown Menu */}
			<div className="relative flex">
				<button className="p-2 rounded-full hover:bg-white/10 transition">
					<VideoCameraIcon className="w-6 h-6 text-white" />
				</button>
				<button className="p-2 rounded-full hover:bg-white/10 transition">
					<Cog6ToothIcon className="w-6 h-6 text-white" />
				</button>
			</div>
		</div>
	);
};

export default Header;
