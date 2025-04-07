import React, { useState } from "react";
import { motion } from "framer-motion";
import { FaFacebook, FaEye, FaEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { RiAppleFill } from "react-icons/ri";
import { Link, useNavigate } from "react-router-dom";
import { auth, database, googleProvider } from "../../../../firebaseConfig";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { get, ref } from "firebase/database";
import { toast } from "react-toastify";

const SignIn = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const togglePasswordVisibility = () => {
		setShowPassword(!showPassword);
	};

	const handleGoogleSignIn = async () => {
		if (loading) return;
		setLoading(true);

		try {
			const result = await signInWithPopup(auth, googleProvider);
			const user = result.user;

			const userRef = ref(database, `users/${user.uid}`);
			const snapshot = await get(userRef);

			if (!snapshot.exists()) {
				// Create user profile if not found (fallback)
				await set(userRef, {
					name: user.displayName || "",
					email: user.email || "",
					photoURL: user.photoURL || "",
					createdAt: new Date().toISOString(),
					uid: user.uid,
				});
			}

			localStorage.setItem("profileImage", user.photoURL || "");
			localStorage.setItem("userName", user.displayName || "");

			toast.success("Google login successful!");
			setTimeout(() => navigate("/Home"), 800);
		} catch (error) {
			handleAuthError(error);
		} finally {
			setLoading(false);
		}
	};

	const handleSignIn = async (e) => {
		e.preventDefault();
		if (loading) return;

		setLoading(true);

		if (!email || !password) {
			toast.error("Please enter both email and password.");
			setLoading(false);
			return;
		}

		try {
			const userCredential = await signInWithEmailAndPassword(auth, email, password);
			const user = userCredential.user;

			const snapshot = await get(ref(database, `users/${user.uid}`));
			const userData = snapshot.val();

			localStorage.setItem("profileImage", userData?.photoURL || "");
			localStorage.setItem("userName", userData?.name || "");

			toast.success("Logged in successfully!");
			setTimeout(() => navigate("/Home"), 500);
		} catch (error) {
			handleAuthError(error);
		} finally {
			setLoading(false);
		}
	};

	const handleAuthError = (error) => {
		switch (error.code) {
			case "auth/user-not-found":
				toast.error("No account found with this email.");
				break;
			case "auth/wrong-password":
				toast.error("Incorrect password.");
				break;
			case "auth/invalid-email":
				toast.error("Invalid email address.");
				break;
			default:
				toast.error("Login failed: " + error.message);
				console.error(error);
		}
	};

	return (
		<div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-blue-900 to-purple-900 p-4">
			<motion.div
				className="w-full max-w-md p-8 bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20"
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.3 }}
			>
				<div className="text-center mb-8">
					<h2 className="text-3xl font-bold text-white mb-1">Welcome Back</h2>
					<p className="text-gray-300">Sign in to continue using NexaChat</p>
				</div>

				<div className="flex justify-center gap-4 mb-6">
					<motion.button
						onClick={handleGoogleSignIn}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						className="p-3 bg-white rounded-full shadow-md hover:shadow-lg transition"
						disabled={loading}
					>
						<FcGoogle className="w-6 h-6" />
					</motion.button>

					<motion.button
						onClick={() => toast.info("Facebook login coming soon!")}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						className="p-3 bg-blue-600 text-white rounded-full shadow-md hover:shadow-lg transition"
						disabled={loading}
					>
						<FaFacebook className="w-6 h-6" />
					</motion.button>

					<motion.button
						onClick={() => toast.info("Apple login coming soon!")}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						className="p-3 bg-black text-white rounded-full shadow-md hover:shadow-lg transition"
						disabled={loading}
					>
						<RiAppleFill className="w-6 h-6" />
					</motion.button>
				</div>

				<div className="relative my-6">
					<div className="absolute inset-0 flex items-center">
						<div className="w-full border-t border-gray-400/50"></div>
					</div>
					<div className="relative flex justify-center">
						<span className="px-2 bg-transparent text-gray-300 text-sm">or sign in with email</span>
					</div>
				</div>

				<form onSubmit={handleSignIn} className="space-y-4">
					<div className="space-y-1">
						<label className="text-gray-300 text-sm font-medium">Email Address</label>
						<input
							type="email"
							placeholder="you@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-gray-400 transition"
							required
						/>
					</div>

					<div className="space-y-1">
						<label className="text-gray-300 text-sm font-medium">Password</label>
						<div className="relative">
							<input
								type={showPassword ? "text" : "password"}
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-gray-400 transition pr-10"
								required
							/>
							<button
								type="button"
								className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition"
								onClick={togglePasswordVisibility}
							>
								{showPassword ? <FaEyeSlash /> : <FaEye />}
							</button>
						</div>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition duration-200"
					>
						{loading ? "Signing In..." : "Sign In"}
					</button>
				</form>

				<p className="text-gray-400 text-sm mt-6 text-center">
					Don't have an account?{" "}
					<Link to="/SignUp" className="text-blue-300 hover:underline">
						Sign Up
					</Link>
				</p>
			</motion.div>
		</div>
	);
};

export default SignIn;
