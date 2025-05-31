import React, { useState } from 'react';
import './Auth.css';

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirmPassword: false
  });

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      if (!formData.email || !formData.password) {
        setError('Proszę wypełnić wszystkie pola');
        return;
      }
    } else {
      if (!formData.email || !formData.username || !formData.password || !formData.confirmPassword) {
        setError('Proszę wypełnić wszystkie pola');
        return;
      }
    }

    if (!validateEmail(formData.email)) {
      setError('Nieprawidłowy format emaila (przykład: nazwa@domena.com)');
      return;
    }

    if (formData.password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków');
      return;
    }

    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        setError('Hasła nie są takie same');
        return;
      }

      if (formData.username.length < 3) {
        setError('Nazwa użytkownika musi mieć co najmniej 3 znaki');
        return;
      }
    }

    // In a real application, you would make an API call here
    // For now, we'll simulate authentication with localStorage
    if (isLogin) {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find(u => u.email === formData.email && u.password === formData.password);
      
      if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        onLogin(user);
      } else {
        setError('Nieprawidłowy email lub hasło');
      }
    } else {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      
      if (users.some(u => u.email === formData.email)) {
        setError('Użytkownik z tym emailem już istnieje');
        return;
      }

      if (users.some(u => u.username === formData.username)) {
        setError('Ta nazwa użytkownika jest już zajęta');
        return;
      }

      const newUser = {
        id: Date.now(),
        email: formData.email,
        username: formData.username,
        password: formData.password
      };

      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      onLogin(newUser);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) setError('');
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>{isLogin ? 'Logowanie' : 'Rejestracja'}</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <div className="input-container">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>
          {!isLogin && (
            <div className="form-group">
              <div className="input-container">
                <input
                  type="text"
                  name="username"
                  placeholder="Nazwa użytkownika"
                  value={formData.username}
                  onChange={handleChange}
                  minLength={3}
                />
              </div>
            </div>
          )}
          <div className="form-group">
            <div className="input-container">
              <input
                type={showPasswords.password ? "text" : "password"}
                name="password"
                placeholder="Hasło"
                value={formData.password}
                onChange={handleChange}
                minLength={6}
              />
              <button
                type="button"
                className="show-password-button"
                onClick={() => togglePasswordVisibility('password')}
              >
                {showPasswords.password ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>
          {!isLogin && (
            <div className="form-group">
              <div className="input-container">
                <input
                  type={showPasswords.confirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Potwierdź hasło"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  minLength={6}
                />
                <button
                  type="button"
                  className="show-password-button"
                  onClick={() => togglePasswordVisibility('confirmPassword')}
                >
                  {showPasswords.confirmPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>
          )}
          <button type="submit" className="auth-button">
            {isLogin ? 'Zaloguj się' : 'Zarejestruj się'}
          </button>
        </form>
        <button
          className="switch-auth-mode"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? 'Nie masz konta? Zarejestruj się' : 'Masz już konto? Zaloguj się'}
        </button>
      </div>
    </div>
  );
};

export default Auth; 