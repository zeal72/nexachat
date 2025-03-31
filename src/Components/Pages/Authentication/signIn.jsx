import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaFacebook, FaGoogle, FaApple } from "react-icons/fa";
import { SiGmail } from "react-icons/si";
import { FcGoogle } from "react-icons/fc";
import { RiAppleFill } from "react-icons/ri";
import { auth, googleProvider, database } from "../../../../firebaseConfig";
import { signInWithEmailAndPassword, signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import { get, ref } from "firebase/database";

const SignIn = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [isMounted, setIsMounted] = useState(true);
	const navigate = useNavigate();

	// Cleanup function to prevent memory leaks
	useEffect(() => {
		return () => setIsMounted(false);
	}, []);

	const handleSignIn = async (e) => {
		e.preventDefault();
		if (loading) return;
		setLoading(true);

		const trimmedEmail = email.trim();
		const trimmedPassword = password.trim();

		if (!trimmedEmail || !trimmedPassword) {
			toast.error("Please enter your email and password.");
			setLoading(false);
			return;
		}

		try {
			const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
			const user = userCredential.user;

			// Fetch additional user data from Realtime Database
			const userRef = ref(database, `users/${user.uid}`);
			const snapshot = await get(userRef);

			if (snapshot.exists()) {
				const userData = snapshot.val();
				localStorage.setItem("profileImage", userData.photoURL || "");
				localStorage.setItem("userName", userData.displayName || "");

				toast.success("Login successful!");
				if (isMounted) {
					setTimeout(() => navigate("/Home"), 1000);
				}
			} else {
				toast.error("User data not found. Please complete your profile.");
			}
		} catch (error) {
			handleAuthError(error);
		} finally {
			if (isMounted) setLoading(false);
		}
	};

	const handleGoogleSignIn = async () => {
		if (loading) return;
		setLoading(true);

		try {
			const result = await signInWithPopup(auth, googleProvider);
			const user = result.user;

			// Check if user exists in database
			const userRef = ref(database, `users/${user.uid}`);
			const snapshot = await get(userRef);

			if (!snapshot.exists()) {
				// Optionally create user profile here if needed
				toast.info("Welcome new user! Please complete your profile.");
			}

			localStorage.setItem("profileImage", user.photoURL || "");
			localStorage.setItem("userName", user.displayName || "");

			toast.success("Google login successful!");
			if (isMounted) {
				setTimeout(() => navigate("/Home"), 1000);
			}
		} catch (error) {
			handleAuthError(error);
		} finally {
			if (isMounted) setLoading(false);
		}
	};

	const handleAuthError = (error) => {
		switch (error.code) {
			case "auth/user-not-found":
			case "auth/wrong-password":
				toast.error("Invalid email or password.");
				break;
			case "auth/too-many-requests":
				toast.error("Too many attempts. Try again later or reset your password.");
				break;
			case "auth/popup-closed-by-user":
				toast.info("Sign in cancelled.");
				break;
			default:
				toast.error("An error occurred: " + error.message);
				console.error("Auth error:", error);
		}
	};

	return (
		<div className="h-screen flex justify-center items-center bg-cover bg-center px-4 bg-gradient-to-br from-blue-900 to-purple-900">
			<motion.div
				className="w-full max-w-md p-8 bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20"
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.3 }}
			>
				<div className="text-center mb-8">
					<h2 className="text-3xl font-bold text-white mb-1">
						Welcome to <span className="text-blue-300">NexaChat</span>
					</h2>
					<p className="text-gray-300">Connect with your friends and colleagues</p>
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
						<span className="px-2 bg-transparent text-gray-300 text-sm">or continue with email</span>
					</div>
				</div>

				<form onSubmit={handleSignIn} className="space-y-4">
					<div className="space-y-1">
						<label className="text-gray-300 text-sm font-medium">Email address</label>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-gray-400 transition"
							placeholder="you@example.com"
							required
						/>
					</div>

					<div className="space-y-1">
						<label className="text-gray-300 text-sm font-medium">Password</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-gray-400 transition"
							placeholder="••••••••"
							required
							minLength={6}
						/>
					</div>

					<div className="flex items-center justify-between">
						<div className="flex items-center">
							<input
								type="checkbox"
								id="remember-me"
								className="h-4 w-4 text-blue-500 focus:ring-blue-400 border-white/20 rounded bg-white/10"
							/>
							<label htmlFor="remember-me" className="ml-2 text-sm text-gray-300">
								Remember me
							</label>
						</div>
						<Link
							to="/forgot-password"
							className="text-sm text-blue-300 hover:text-blue-200 hover:underline"
						>
							Forgot password?
						</Link>
					</div>

					<motion.button
						type="submit"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg shadow-md transition flex justify-center items-center"
						disabled={loading}
					>
						{loading ? (
							<>
								<svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Signing in...
							</>
						) : (
							"Sign in"
						)}
					</motion.button>
				</form>

				<div className="mt-6 text-center text-sm text-gray-300">
					Don't have an account?{" "}
					<Link
						to="/signup"
						className="font-medium text-blue-300 hover:text-blue-200 hover:underline"
					>
						Sign up
					</Link>
				</div>
			</motion.div>
		</div>
	);
};

export default SignIn;