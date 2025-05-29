import React, { useState } from 'react';
import './Auth.css';

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Proszę wypełnić wszystkie pola');
      return;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Hasła nie są takie same');
      return;
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

      const newUser = {
        id: Date.now(),
        email: formData.email,
        password: formData.password
      };

      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      onLogin(newUser);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>{isLogin ? 'Logowanie' : 'Rejestracja'}</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              name="password"
              placeholder="Hasło"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          {!isLogin && (
            <div className="form-group">
              <input
                type="password"
                name="confirmPassword"
                placeholder="Potwierdź hasło"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
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