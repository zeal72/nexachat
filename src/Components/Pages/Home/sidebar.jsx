import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	HomeIcon,
	ChatBubbleLeftEllipsisIcon,
	UsersIcon,
	Cog6ToothIcon,
	Bars3Icon,
	XMarkIcon
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const Sidebar = ({ onScreenChange, activeScreen }) => {
	const [isOpen, setIsOpen] = useState(false);

	// Function to handle restricted routes
	const handleRestrictedRoute = (e, routeName) => {
		e.preventDefault(); // Prevent navigation
		toast.error(`${routeName} is currently not accessible`, {
			position: "bottom-center",
			style: {
				background: '#333',
				color: '#fff',
			}
		});
	};

	return (
		<>
			{/* Desktop Sidebar */}
			<div className="hidden lg:flex lg:w-24 xl:w-32 h-screen bg-glass-bg backdrop-blur-lg rounded-lg shadow-lg">
				<div className="flex flex-col h-full items-center space-y-8 p-4">
					<Link to="/" className="hover:text-highlight flex flex-col items-center">
						<HomeIcon className="w-6 h-6 text-white" />
						<span className="text-xs text-white pt-1">Home</span>
					</Link>
					<Link
						to="/messages"
						className="hover:text-highlight flex flex-col items-center"
						onClick={(e) => handleRestrictedRoute(e, "Messages")}
					>
						<ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-white" />
						<span className="text-xs text-white pt-1">Messages</span>
					</Link>
					<Link
						to="/directory"
						className="hover:text-highlight flex flex-col items-center"
						onClick={(e) => handleRestrictedRoute(e, "Contacts")}
					>
						<UsersIcon className="w-6 h-6 text-white" />
						<span className="text-xs text-white pt-1">Contacts</span>
					</Link>
					<Link
						to="/more"
						className="hover:text-highlight flex flex-col items-center"
						onClick={(e) => handleRestrictedRoute(e, "More settings")}
					>
						<Cog6ToothIcon className="w-6 h-6 text-white" />
						<span className="text-xs text-white pt-1">More</span>
					</Link>
				</div>
			</div>

			{/* Mobile Bottom Bar */}
			<div className="lg:hidden flex justify-around fixed bottom-1 left-0 w-[95%] p-2 bg-glass-bg backdrop-blur-lg rounded-lg shadow-lg z-50">
				<Link
					to="/"
					className={`flex flex-col items-center hover:text-highlight ${activeScreen === "home" ? "text-highlight" : ""}`}
					onClick={() => {
						onScreenChange("home");
						setIsOpen(false);
					}}
				>
					<HomeIcon className="w-6 h-6 text-white" />
					<span className="text-xs text-white pt-1">Home</span>
				</Link>
				<Link
					to="/messages"
					className={`flex flex-col items-center hover:text-highlight ${activeScreen === "messages" ? "text-highlight" : ""}`}
					onClick={(e) => {
						e.preventDefault();
						onScreenChange("messages");
						toast.error("Messages is currently not accessible", {
							position: "bottom-center",
							style: {
								background: '#333',
								color: '#fff',
							}
						});
					}}
				>
					<ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-white" />
					<span className="text-xs text-white pt-1">Messages</span>
				</Link>
				<Link
					to="/directory"
					className={`flex flex-col items-center hover:text-highlight ${activeScreen === "contacts" ? "text-highlight" : ""}`}
					onClick={(e) => {
						e.preventDefault();
						onScreenChange("contacts");
						toast.error("Contacts is currently not accessible", {
							position: "bottom-center",
							style: {
								background: '#333',
								color: '#fff',
							}
						});
					}}
				>
					<UsersIcon className="w-6 h-6 text-white" />
					<span className="text-xs text-white pt-1">Contacts</span>
				</Link>
				<Link
					to="/more"
					className={`flex flex-col items-center hover:text-highlight ${activeScreen === "more" ? "text-highlight" : ""}`}
					onClick={(e) => {
						e.preventDefault();
						onScreenChange("more");
						toast.error("More settings is currently not accessible", {
							position: "bottom-center",
							style: {
								background: '#333',
								color: '#fff',
							}
						});
					}}
				>
					<Cog6ToothIcon className="w-6 h-6 text-white" />
					<span className="text-xs text-white pt-1">More</span>
				</Link>
			</div>

			{/* Tablet Menu Button */}
			<button
				className="hidden sm:flex md:hidden fixed top-4 left-4 z-50 p-2 bg-glass-bg backdrop-blur-lg rounded-lg shadow-lg"
				onClick={() => setIsOpen(true)}
			>
				<Bars3Icon className="w-6 h-6 text-white" />
			</button>

			{/* Mobile/Tablet Sidebar Drawer */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ x: -250 }}
						animate={{ x: 0 }}
						exit={{ x: -250 }}
						transition={{ type: "spring", stiffness: 120 }}
						className="hidden fixed top-0 left-0 h-full w-64 bg-glass-bg backdrop-blur-lg rounded-lg shadow-lg z-50"
					>
						{/* Close Button */}
						<button
							className="absolute top-4 right-4 p-2 bg-glass-bg backdrop-blur-lg rounded-lg shadow-lg"
							onClick={() => setIsOpen(false)}
						>
							<XMarkIcon className="w-6 h-6 text-white" />
						</button>

						{/* Drawer Menu Items */}
						<div className="mt-10 flex flex-col space-y-6 p-4">
							<Link
								to="/"
								className="flex items-center space-x-3 hover:text-highlight"
								onClick={() => setIsOpen(false)}
							>
								<HomeIcon className="w-6 h-6 text-white" />
								<span className="text-lg text-white">Home</span>
							</Link>
							<Link
								to="/messages"
								className="flex items-center space-x-3 hover:text-highlight"
								onClick={(e) => {
									e.preventDefault();
									setIsOpen(false);
									toast.error("Messages is currently not accessible", {
										position: "bottom-center",
										style: {
											background: '#333',
											color: '#fff',
										}
									});
								}}
							>
								<ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-white" />
								<span className="text-lg text-white">Messages</span>
							</Link>
							<Link
								to="/directory"
								className="flex items-center space-x-3 hover:text-highlight"
								onClick={(e) => {
									e.preventDefault();
									setIsOpen(false);
									toast.error("Contacts is currently not accessible", {
										position: "bottom-center",
										style: {
											background: '#333',
											color: '#fff',
										}
									});
								}}
							>
								<UsersIcon className="w-6 h-6 text-white" />
								<span className="text-lg text-white">Contacts</span>
							</Link>
							<Link
								to="/more"
								className="flex items-center space-x-3 hover:text-highlight"
								onClick={(e) => {
									e.preventDefault();
									setIsOpen(false);
									toast.error("More settings is currently not accessible", {
										position: "bottom-center",
										style: {
											background: '#333',
											color: '#fff',
										}
									});
								}}
							>
								<Cog6ToothIcon className="w-6 h-6 text-white" />
								<span className="text-lg text-white">More</span>
							</Link>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
};

export default Sidebar;