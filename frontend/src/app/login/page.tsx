"use client";

import { useState } from "react";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [message, setMessage] = useState<{
    text: string;
    type: "error" | "success" | "";
  }>({ text: "", type: "" });

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: "Login functionality coming soon...", type: "success" });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({
      text: "Registration functionality coming soon...",
      type: "success",
    });
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Welcome to Navo</h1>
        <p>AI-Powered Website Builder</p>

        <div className="tab-container">
          <button
            className={`tab ${activeTab === "login" ? "active" : ""}`}
            onClick={() => setActiveTab("login")}
          >
            Login
          </button>
          <button
            className={`tab ${activeTab === "register" ? "active" : ""}`}
            onClick={() => setActiveTab("register")}
          >
            Register
          </button>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}

        {activeTab === "login" ? (
          <form onSubmit={handleLogin} className="login-form">
            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
            <button type="submit" className="submit-btn">
              Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="register-form">
            <input
              type="text"
              placeholder="Name"
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              required
            />
            <button type="submit" className="submit-btn">
              Register
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
