import React, { useState, useRef, useEffect } from "react";
import {
	VideoCameraIcon,
	Cog6ToothIcon,
	ArrowRightOnRectangleIcon,
	UserCircleIcon,
	WrenchScrewdriverIcon,
	QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { getFirestore } from "firebase/firestore";
import { app, auth } from "../../../../firebaseConfig";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const db = getFirestore(app);

const Header = ({ onStartChat }) => {
	const [showDropdown, setShowDropdown] = useState(false);
	const dropdownRef = useRef(null);
	const navigate = useNavigate();

	// Close dropdown on outside click
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setShowDropdown(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const handleLogout = async () => {
		try {
			await signOut(auth);
			toast.success("Logged out successfully");
			navigate("/signin");
		} catch (error) {
			toast.error("Failed to log out");
		}
	};

	return (
		<div className="relative flex items-center justify-between px-4 py-3 mb-4 rounded-lg bg-white/10 backdrop-blur-lg border-b border-gray-700/50 z-50">
			{/* Logo */}
			<h1 className="text-xl font-bold text-white">NexaChat</h1>

			{/* Right-side actions */}
			<div className="relative flex items-center gap-2">
				<button className="p-2 rounded-full hover:bg-white/10 transition">
					<VideoCameraIcon className="w-6 h-6 text-white" />
				</button>

				<div className="relative" ref={dropdownRef}>
					<button
						onClick={() => setShowDropdown((prev) => !prev)}
						className="p-2 rounded-full hover:bg-white/10 transition"
					>
						<Cog6ToothIcon className="w-6 h-6 text-white" />
					</button>

					{/* Dropdown Menu */}
					{showDropdown && (
						<div className="absolute right-0 mt-2 w-48 bg-[#0f0f0f]/90 backdrop-blur-3xl rounded-xl shadow-xl border border-white/10 z-50 text-white text-sm overflow-hidden">
							<button
								className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/20 transition"
								onClick={() => {
									setShowDropdown(false);
									toast.info("Settings clicked");
								}}
							>
								<WrenchScrewdriverIcon className="w-5 h-5" />
								<span>Settings</span>
							</button>
							<button
								className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/20 transition"
								onClick={() => {
									setShowDropdown(false);
									toast.info("Profile clicked");
								}}
							>
								<UserCircleIcon className="w-5 h-5" />
								<span>Profile</span>
							</button>
							<button
								className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/20 transition"
								onClick={() => {
									setShowDropdown(false);
									toast.info("Help clicked");
								}}
							>
								<QuestionMarkCircleIcon className="w-5 h-5" />
								<span>Help</span>
							</button>
							<hr className="border-white/20 my-1" />
							<button
								className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-500/40 transition text-red-300"
								onClick={handleLogout}
							>
								<ArrowRightOnRectangleIcon className="w-5 h-5" />
								<span>Log Out</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Header;
