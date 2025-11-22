"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../firebase/config";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  setPersistence,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { useSignInWithEmailAndPassword } from "react-firebase-hooks/auth";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import ErrorDiv from "../../components/ErrorDiv";
import { motion } from "framer-motion";
import ThemeSwitch from "../../components/ThemeSwitch";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [signInWithEmailAndPassword, user, loading, signInError] =
    useSignInWithEmailAndPassword(auth);

  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );
    } catch {
      await setPersistence(auth, inMemoryPersistence);
    }

    await signInWithEmailAndPassword(email, password);
  };

  useEffect(() => {
    if (!signInError) return;

    const firebaseErrors: Record<string, string> = {
      "auth/invalid-email": "Invalid email format",
      "auth/missing-password": "Password is required",
      "auth/too-many-requests": "Too many attempts. Try again later.",
      "auth/network-request-failed": "Network connection failed.",
      "auth/internal-error": "Internal server error.",
      "auth/invalid-credential": "The email or password is incorrect.",
      "auth/user-not-found": "User not found.",
      "auth/wrong-password": "Incorrect password.",
    };

    const fbCode = (signInError as FirebaseError).code;
    setErrorMessage(firebaseErrors[fbCode] || "Login error, please try again");
  }, [signInError]);

  useEffect(() => {
    if (user) router.push("/");
  }, [user]);

  return (
    <div
      className="
        min-h-screen flex items-center justify-center p-4 
        bg-gray-200 dark:bg-gray-900 
        transition-colors duration-500
      "
    >
      {/* Theme Switch */}
      <div className="absolute top-6 right-6">
        <ThemeSwitch />
      </div>

      <div className="flex flex-col md:flex-row gap-10 md:gap-20 max-w-5xl w-full">
        {/* Panel izquierdo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="
            w-full md:w-1/2 rounded-2xl shadow-xl p-8 md:p-10 
            bg-gray-300 dark:bg-gray-800 
            text-gray-900 dark:text-white
            transition-colors
          "
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Welcome To Fayes</h1>
          <p className="mb-8 text-base md:text-lg text-gray-700 dark:text-gray-300">
            Log in to your account<br />Access to the mainpage.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.input
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="
                w-full p-3 rounded-xl shadow-sm outline-none
                bg-white text-gray-600 
                dark:bg-gray-700 dark:text-white
                transition-colors
              "
              required
            />

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative"
            >
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="
                  w-full p-3 rounded-xl shadow-sm outline-none
                  bg-white text-gray-600 
                  dark:bg-gray-700 dark:text-white
                  transition-colors
                "
                required
              />
              <span
                className="
                  absolute right-4 top-3 cursor-pointer
                  text-gray-500 dark:text-gray-300
                "
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEye /> : <FaEyeSlash />}
              </span>
            </motion.div>

            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="cursor-pointer"
              />
              <span>Remember me</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="
                cursor-pointer w-full p-3 rounded-xl 
                bg-gradient-to-r from-orange-400 to-purple-600 
                text-white font-semibold shadow-md
                disabled:opacity-50
              "
            >
              {loading ? "Loading..." : "Continue"}
            </motion.button>
          </form>
        </motion.div>

        {/* Panel derecho */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="
            w-full md:w-1/2 flex flex-col items-center justify-center 
            rounded-2xl shadow-xl 
            bg-gradient-to-b from-blue-200 to-pink-200 
            dark:from-blue-900 dark:to-pink-900
            p-8 md:p-10
            transition-colors
          "
        >
          <img src="/lock.png" className="w-40 md:w-64" />
          <p className="text-gray-600 dark:text-gray-300 text-lg mt-6">
            Unlock your potential.
          </p>
        </motion.div>
      </div>

      {errorMessage && (
        <ErrorDiv message={errorMessage} onClose={() => setErrorMessage("")} />
      )}
    </div>
  );
}
