import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaFacebook, FaApple } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { auth, googleProvider, database } from "../../../../firebaseConfig";
import { signInWithPopup } from "firebase/auth";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ref, set, get } from "firebase/database";
import { motion } from "framer-motion";

const Onboarding = () => {
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const handleGoogleSignIn = async () => {
		if (loading) return;
		setLoading(true);

		try {
			const result = await signInWithPopup(auth, googleProvider);
			const user = result.user;

			// Check if user already exists in database
			const userRef = ref(database, `users/${user.uid}`);
			const snapshot = await get(userRef);

			if (!snapshot.exists()) {
				// Create new user if they don't exist
				await set(ref(database, `users/${user.uid}`), {
					name: user.displayName || "User",
					email: user.email || "",
					photoURL: user.photoURL || "",
					createdAt: new Date().toISOString(),
					uid: user.uid,
				});
			}

			// Store user data in localStorage
			localStorage.setItem("profileImage", user.photoURL || "");
			localStorage.setItem("userName", user.displayName || "");

			toast.success(`Welcome, ${user.displayName || "User"}!`);
			setTimeout(() => navigate("/Home"), 1000);
		} catch (error) {
			handleAuthError(error);
		} finally {
			setLoading(false);
		}
	};

	const handleAuthError = (error) => {
		switch (error.code) {
			case "auth/popup-closed-by-user":
				toast.info("Sign in cancelled.");
				break;
			case "auth/network-request-failed":
				toast.error("Network error. Please check your connection.");
				break;
			default:
				toast.error("Sign in failed: " + error.message);
				console.error("Auth error:", error);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900 relative overflow-hidden">
			{/* Background pattern */}
			<div className="absolute inset-0 bg-[url('/download.jpg')] bg-cover bg-center opacity-20"></div>

			{/* Content */}
			<div className="relative text-white text-center px-6 md:px-12 max-w-lg z-10">
				<motion.h1
					className="text-4xl md:text-5xl font-bold leading-tight mb-4"
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
				>
					Connect friends easily & quickly
				</motion.h1>

				<motion.p
					className="text-lg md:text-xl mb-8 text-gray-300"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.2, duration: 0.5 }}
				>
					Our chat app is the perfect way to stay connected with friends and family.
				</motion.p>

				{/* Social Login Buttons */}
				<motion.div
					className="flex justify-center gap-6 mt-8"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.4, duration: 0.5 }}
				>
					<motion.button
						whileHover={{ scale: 1.1 }}
						whileTap={{ scale: 0.9 }}
						className="p-4 bg-white/10 backdrop-blur-lg rounded-full hover:bg-white/20 transition"
						onClick={() => toast.info("Facebook login coming soon!")}
					>
						<FaFacebook className="w-6 h-6 text-blue-500" />
					</motion.button>

					<motion.button
						whileHover={{ scale: 1.1 }}
						whileTap={{ scale: 0.9 }}
						className="p-4 bg-white/10 backdrop-blur-lg rounded-full hover:bg-white/20 transition"
						onClick={handleGoogleSignIn}
						disabled={loading}
					>
						<FcGoogle className="w-6 h-6" />
					</motion.button>

					<motion.button
						whileHover={{ scale: 1.1 }}
						whileTap={{ scale: 0.9 }}
						className="p-4 bg-white/10 backdrop-blur-lg rounded-full hover:bg-white/20 transition"
						onClick={() => toast.info("Apple login coming soon!")}
					>
						<FaApple className="w-6 h-6 text-gray-200" />
					</motion.button>
				</motion.div>

				{/* Divider */}
				<motion.div
					className="flex items-center justify-center my-8"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.6, duration: 0.5 }}
				>
					<div className="h-px w-20 bg-white/40"></div>
					<span className="mx-4 text-white/70">OR</span>
					<div className="h-px w-20 bg-white/40"></div>
				</motion.div>

				{/* Signup Button */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.8, duration: 0.5 }}
				>
					<Link to="/signUp">
						<motion.button
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							className="w-full md:w-3/4 bg-white text-black font-medium py-3 rounded-lg hover:bg-gray-200 transition shadow-lg"
						>
							Sign up with Email
						</motion.button>
					</Link>
				</motion.div>

				{/* Login Text */}
				<motion.div
					className="mt-6"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 1, duration: 0.5 }}
				>
					<Link to="/signin">
						<p className="text-white/70 hover:text-white transition">
							Existing account?{" "}
							<span className="text-white font-semibold underline">Log in</span>
						</p>
					</Link>
				</motion.div>
			</div>
		</div>
	);
};

export default Onboarding;