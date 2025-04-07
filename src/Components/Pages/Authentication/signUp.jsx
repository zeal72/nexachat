import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { FaFacebook } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { RiAppleFill } from "react-icons/ri";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { auth, database, googleProvider } from "../../../../firebaseConfig";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { set, ref, get } from "firebase/database";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import zxcvbn from "zxcvbn";

const CloudinaryUploadWidget = ({ onImageUpload }) => {
	const cloudinaryRef = useRef();
	const widgetRef = useRef();
	useEffect(() => {
		cloudinaryRef.current = window.cloudinary;
		widgetRef.current = cloudinaryRef.current.createUploadWidget(
			{
				cloudName: 'dx1vcdlqs',
				uploadPreset: 'Nexachat',
				cropping: true,
				croppingAspectRatio: 1,
				showPoweredBy: false,
				multiple: false, // Ensure single image upload
				defaultSource: 'local' // Prefer local files
			},
			(error, result) => {
				if (!error && result && result.event === 'success') {
					const secureUrl = result.info.secure_url;
					if (secureUrl) {
						onImageUpload(secureUrl);
					}
				}
			}
		);
	}, [onImageUpload]);

	return (
		<motion.button
			type="button"
			whileHover={{ scale: 1.05 }}
			className="p-2 bg-white/20 rounded-full text-white text-sm"
			onClick={() => widgetRef.current.open()}
		>
			Upload Photo
		</motion.button>
	);
};

const SignUp = () => {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [passwordStrength, setPasswordStrength] = useState(0);
	const [loading, setLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [profileImage, setProfileImage] = useState("");
	const navigate = useNavigate();

	const handleImageUpload = (url) => {
		setProfileImage(url);
	};

	const handlePasswordChange = (e) => {
		const value = e.target.value;
		setPassword(value);
		const evaluation = zxcvbn(value);
		setPasswordStrength(evaluation.score);
	};

	const togglePasswordVisibility = () => {
		setShowPassword(!showPassword);
	};

	const handleSignUp = async (e) => {
		e.preventDefault();
		if (loading) return;

		setLoading(true);

		if (!name || !email || !password || !confirmPassword) {
			toast.error("Please fill in all fields.");
			setLoading(false);
			return;
		}

		if (password !== confirmPassword) {
			toast.error("Passwords do not match.");
			setLoading(false);
			return;
		}

		if (passwordStrength < 2) {
			toast.error("Password is too weak. Try adding uppercase, numbers, or symbols.");
			setLoading(false);
			return;
		}

		try {
			const userCredential = await createUserWithEmailAndPassword(auth, email, password);
			const user = userCredential.user;

			await set(ref(database, `users/${user.uid}`), {
				name,
				email,
				photoURL: profileImage || "",
				createdAt: new Date().toISOString(),
				uid: user.uid,
			});

			// Store user data in localStorage
			localStorage.setItem("profileImage", profileImage || "");
			localStorage.setItem("userName", name);

			toast.success("Account created successfully!");
			setTimeout(() => navigate("/Home"), 500);
		} catch (error) {
			handleAuthError(error);
		} finally {
			setLoading(false);
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
				// Create user profile if it doesn't exist
				await set(ref(database, `users/${user.uid}`), {
					name: user.displayName || "",
					email: user.email || "",
					photoURL: user.photoURL || "",
					createdAt: new Date().toISOString(),
					uid: user.uid,
				});
			}

			// Store user data in localStorage
			localStorage.setItem("profileImage", user.photoURL || "");
			localStorage.setItem("userName", user.displayName || "");

			toast.success("Google login successful!");
			setTimeout(() => navigate("/Home"), 1000);
		} catch (error) {
			handleAuthError(error);
		} finally {
			setLoading(false);
		}
	};

	const handleAuthError = (error) => {
		switch (error.code) {
			case "auth/email-already-in-use":
				toast.error("Email is already in use.");
				break;
			case "auth/weak-password":
				toast.error("Password should be at least 6 characters.");
				break;
			case "auth/invalid-email":
				toast.error("Invalid email address.");
				break;
			case "auth/popup-closed-by-user":
				toast.info("Sign in cancelled.");
				break;
			default:
				toast.error("An error occurred: " + error.message);
				console.error("Auth error:", error);
		}
	};

	const getPasswordStrengthColor = () => {
		switch (passwordStrength) {
			case 0: return "bg-red-500";
			case 1: return "bg-orange-500";
			case 2: return "bg-yellow-500";
			case 3: return "bg-blue-500";
			case 4: return "bg-green-500";
			default: return "bg-gray-500";
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
					<h2 className="text-3xl font-bold text-white mb-1">
						Join <span className="text-blue-300">NexaChat</span>
					</h2>
					<p className="text-gray-300">Create your account to get started</p>
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
						<span className="px-2 bg-transparent text-gray-300 text-sm">or sign up with email</span>
					</div>
				</div>

				<form onSubmit={handleSignUp} className="space-y-4">
					<div className="flex flex-col items-center mb-4">
						<div className="relative w-24 h-24 mb-3">
							{profileImage ? (
								<img
									src={profileImage}
									alt="Profile Preview"
									className="w-full h-full rounded-full object-cover border-2 border-blue-400 cursor-pointer"
									onClick={() => widgetRef.current.open()}
								/>
							) : (
								<div
									className="w-full h-full rounded-full bg-gray-700 flex items-center justify-center cursor-pointer"
									onClick={() => widgetRef.current.open()}
								>
									<span className="text-4xl text-gray-400">+</span>
								</div>
							)}
						</div>
						<CloudinaryUploadWidget onImageUpload={handleImageUpload} />
					</div>

					<div className="space-y-1">
						<label className="text-gray-300 text-sm font-medium">Full Name</label>
						<input
							type="text"
							placeholder="Your full name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-gray-400 transition"
							required
						/>
					</div>

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
								onChange={handlePasswordChange}
								className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-gray-400 transition pr-10"
								required
								minLength={6}
							/>
							<button
								type="button"
								className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition"
								onClick={togglePasswordVisibility}
							>
								{showPassword ? <FaEyeSlash /> : <FaEye />}
							</button>
						</div>
						{password && (
							<div className="w-full bg-gray-700 rounded-full h-2 mt-1">
								<div
									className={`h-2 rounded-full ${getPasswordStrengthColor()}`}
									style={{ width: `${(passwordStrength + 1) * 25}%` }}
								></div>
							</div>
						)}
					</div>

					<div className="space-y-1">
						<label className="text-gray-300 text-sm font-medium">Confirm Password</label>
						<input
							type="password"
							placeholder="••••••••"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-gray-400 transition"
							required
							minLength={6}
						/>
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
								Creating account...
							</>
						) : (
							"Sign Up"
						)}
					</motion.button>
				</form>

				<div className="mt-6 text-center text-sm text-gray-300">
					Already have an account?{" "}
					<Link
						to="/sign-in"
						className="font-medium text-blue-300 hover:text-blue-200 hover:underline"
					>
						Sign in
					</Link>
				</div>
			</motion.div>
		</div>
	);
};

export default SignUp;