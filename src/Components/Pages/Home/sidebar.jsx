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

const Sidebar = ({ onScreenChange, activeScreen }) => {
	const [isOpen, setIsOpen] = useState(false);

	const menuItems = [
		{ name: "Home", icon: <HomeIcon className="w-6 h-6 text-white" />, path: "/" },
		{ name: "Messages", icon: <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-white" />, path: "/messages" },
		{ name: "Contacts", icon: <UsersIcon className="w-6 h-6 text-white" />, path: "/directory" },
		{ name: "More", icon: <Cog6ToothIcon className="w-6 h-6 text-white" />, path: "/more" },
	];

	return (
		<>
			{/* Desktop Sidebar */}
			<div className="hidden lg:flex lg:w-24 xl:w-32 h-screen bg-glass-bg backdrop-blur-lg rounded-lg shadow-lg">
				<div className="flex flex-col h-full items-center space-y-8 p-4">
					{menuItems.map((item, index) => (
						<Link
							key={index}
							to={item.path}
							className="hover:text-highlight flex flex-col items-center"
						>
							{item.icon}
							<span className="text-xs text-white">{item.name}</span>
						</Link>
					))}
				</div>
			</div>

			{/* Mobile Bottom Bar */}
			<div className="lg:hidden flex justify-around fixed bottom-1.5 left-0 w-[95%] m-2 bg-glass-bg backdrop-blur-lg rounded-lg shadow-lg z-50">
				{menuItems.map((item, index) => (
					<Link
						key={index}
						to={item.path}
						className={`flex flex-col items-center hover:text-highlight ${activeScreen === item.name.toLowerCase() ? 'text-highlight' : ''
							}`}
						onClick={() => {
							onScreenChange(item.name.toLowerCase());
							setIsOpen(false);
						}}
					>
						{item.icon}
						<span className=" text-xs text-white">{item.name}</span>
					</Link>
				))}
			</div>


			{/* Tablet Menu Button */}
			<button
				className="hidden md:hidden lg:hidden fixed top-4 left-4 z-50 p-2 bg-glass-bg backdrop-blur-lg rounded-lg shadow-lg"
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
						className="fixed top-0 left-0 h-full w-64 bg-glass-bg backdrop-blur-lg rounded-lg shadow-lg z-50"
					>
						{/* Close Button */}
						<button
							className="absolute top-4 right-4 p-2 bg-glass-bg backdrop-blur-lg rounded-lg shadow-lg"
							onClick={() => setIsOpen(false)}
						>
							<XMarkIcon className="w-6 h-6 text-white" />
						</button>

						{/* Menu Items */}
						<div className="mt-10 flex flex-col space-y-6 p-4">
							{menuItems.map((item, index) => (
								<Link
									key={index}
									to={item.path}
									className="flex items-center space-x-3 hover:text-highlight"
									onClick={() => setIsOpen(false)}
								>
									{item.icon}
									<span className="text-lg text-white">{item.name}</span>
								</Link>
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
};

export default Sidebar;
