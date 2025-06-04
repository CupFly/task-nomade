/**
 * Authentication Component
 * Handles user registration and login functionality
 * Features:
 * - User registration with optional username
 * - Email format validation
 * - Password requirements (min 6 characters)
 * - Show/hide password toggle
 * - Error handling and user feedback
 * - Local storage persistence
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

const Auth = ({ onLogin }) => {
  const navigate = useNavigate();
  // State management for form fields and UI
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  /**
   * Validates email format using regex
   * @param {string} email - Email to validate
   * @returns {boolean} - True if email is valid
   */
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Handles form submission for both login and registration
   * @param {Event} e - Form submission event
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      // Login logic - only check if fields are not empty
      if (!email.trim() || !password.trim()) {
        setError('Wszystkie pola są wymagane');
        return;
      }

      // Get existing users and check credentials without any format validation
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find(u => u.email === email && u.password === password);
      if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        onLogin(user);
        navigate('/'); // Navigate to main menu after login
      } else {
        setError('Nieprawidłowy email lub hasło');
      }
    } else {
      // Registration logic - full validation
      if (!email || !password) {
        setError('Wszystkie pola są wymagane');
        return;
      }

      if (!isValidEmail(email)) {
        setError('Nieprawidłowy format adresu email');
        return;
      }

      if (password.length < 6) {
        setError('Hasło musi mieć co najmniej 6 znaków');
        return;
      }

      // Get existing users from localStorage
      const users = JSON.parse(localStorage.getItem('users') || '[]');

      if (users.some(u => u.email === email)) {
        setError('Użytkownik z tym adresem email już istnieje');
        return;
      }

      if (username) {
        if (username.length < 3) {
          setError('Nazwa użytkownika musi mieć co najmniej 3 znaki');
          return;
        }
        if (username.length > 10) {
          setError('Nazwa użytkownika może mieć maksymalnie 10 znaków');
          return;
        }
        if (users.some(u => u.username === username)) {
          setError('Ta nazwa użytkownika jest już zajęta');
          return;
        }
      }

      // Create new user
      const newUser = {
        id: Date.now().toString(),
        email,
        password,
        username: username || null
      };

      // Update localStorage and log in
      localStorage.setItem('users', JSON.stringify([...users, newUser]));
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      onLogin(newUser);
      navigate('/'); // Navigate to main menu after registration
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="app-title">Task Nomade</div>
        <h2>{isLogin ? 'Logowanie' : 'Rejestracja'}</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          {/* Email input */}
          <div className="form-group">
            <input
              type="text"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Optional username field for registration */}
          {!isLogin && (
            <div className="form-group">
              <input
                type="text"
                placeholder="Nazwa użytkownika (opcjonalnie)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={10}
              />
            </div>
          )}

          {/* Password input with show/hide toggle */}
          <div className="form-group password-group">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Hasło"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>

          {/* Submit button */}
          <button type="submit" className="submit-button">
            {isLogin ? 'Zaloguj się' : 'Zarejestruj się'}
          </button>
        </form>

        {/* Toggle between login and registration */}
        <button
          className="toggle-auth-mode"
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
        >
          {isLogin ? 'Nie masz konta? Zarejestruj się' : 'Masz już konto? Zaloguj się'}
        </button>
      </div>
    </div>
  );
};

export default Auth; 