import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

const Profile = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
    emailPassword: false
  });
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const handleUsernameChange = () => {
    setUsernameError('');
    
    // Validate empty fields
    if (!newUsername || !password) {
      setUsernameError('Wszystkie pola muszą być wypełnione');
      return;
    }

    // Validate username length
    if (newUsername.length < 3) {
      setUsernameError('Nazwa użytkownika musi mieć co najmniej 3 znaki');
      return;
    }
    
    // Get all users and verify password
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const currentUser = users.find(u => u.id === user.id);
    
    if (!currentUser || currentUser.password !== password) {
      setUsernameError('Nieprawidłowe hasło');
      return;
    }

    // Check if username already exists
    if (users.some(u => u.username === newUsername && u.id !== user.id)) {
      setUsernameError('Ta nazwa użytkownika jest już zajęta');
      return;
    }

    // Update username in users array
    const updatedUsers = users.map(u => 
      u.id === user.id ? { ...u, username: newUsername } : u
    );
    localStorage.setItem('users', JSON.stringify(updatedUsers));

    // Update current user
    const updatedUser = { ...user, username: newUsername };
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));

    // Reset form
    setNewUsername('');
    setPassword('');
    setShowUsernameForm(false);
    window.location.reload(); // Reload to update all references to username
  };

  const handleEmailChange = () => {
    setEmailError('');
    
    // Validate empty fields
    if (!newEmail || !password) {
      setEmailError('Wszystkie pola muszą być wypełnione');
      return;
    }

    // Validate email format
    if (!/\S+@\S+\.\S+/.test(newEmail)) {
      setEmailError('Nieprawidłowy format emaila');
      return;
    }
    
    // Get all users and verify password
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const currentUser = users.find(u => u.id === user.id);
    
    if (!currentUser || currentUser.password !== password) {
      setEmailError('Nieprawidłowe hasło');
      return;
    }

    // Check if new email already exists
    if (users.some(u => u.email === newEmail && u.id !== user.id)) {
      setEmailError('Ten email jest już zajęty');
      return;
    }

    // Update email in users array
    const updatedUsers = users.map(u => 
      u.id === user.id ? { ...u, email: newEmail } : u
    );
    localStorage.setItem('users', JSON.stringify(updatedUsers));

    // Update current user
    const updatedUser = { ...user, email: newEmail };
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));

    // Reset form
    setNewEmail('');
    setPassword('');
    setShowEmailForm(false);
    window.location.reload(); // Reload to update all references to user email
  };

  const handlePasswordChange = () => {
    setPasswordError('');
    
    // Validate empty fields
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmNewPassword) {
      setPasswordError('Wszystkie pola muszą być wypełnione');
      return;
    }

    // Validate new password length
    if (passwordData.newPassword.length < 6) {
      setPasswordError('Nowe hasło musi mieć co najmniej 6 znaków');
      return;
    }

    // Validate password match
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setPasswordError('Nowe hasła nie są takie same');
      return;
    }

    // Get all users and verify current password
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const currentUser = users.find(u => u.id === user.id);
    
    if (!currentUser || currentUser.password !== passwordData.currentPassword) {
      setPasswordError('Nieprawidłowe obecne hasło');
      return;
    }

    // Update password in users array
    const updatedUsers = users.map(u => 
      u.id === user.id ? { ...u, password: passwordData.newPassword } : u
    );
    localStorage.setItem('users', JSON.stringify(updatedUsers));

    // Update current user
    const updatedUser = { ...user, password: passwordData.newPassword };
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));

    // Reset form
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    });
    setShowPasswordForm(false);
  };

  const handlePasswordDataChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handleCancel = () => {
    setNewEmail('');
    setPassword('');
    setEmailError('');
    setShowEmailForm(false);
  };

  const handlePasswordCancel = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    });
    setPasswordError('');
    setShowPasswordForm(false);
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleDeleteAccount = () => {
    setDeleteError('');

    // Verify password
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const currentUser = users.find(u => u.id === user.id);
    
    if (!currentUser || currentUser.password !== deletePassword) {
      setDeleteError('Nieprawidłowe hasło');
      return;
    }

    // Remove user from users array
    const updatedUsers = users.filter(u => u.id !== user.id);
    localStorage.setItem('users', JSON.stringify(updatedUsers));

    // Remove current user from localStorage
    localStorage.removeItem('currentUser');

    // Remove user's boards
    const allBoards = JSON.parse(localStorage.getItem('boards') || '[]');
    const updatedBoards = allBoards.filter(board => board.userId !== user.id);
    localStorage.setItem('boards', JSON.stringify(updatedBoards));

    // Logout user
    onLogout();
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            {user.username ? user.username[0].toUpperCase() : user.email[0].toUpperCase()}
          </div>
          <div className="profile-header-info">
            <h1>{user.username || user.email}</h1>
            <span className="profile-email">{user.email}</span>
          </div>
        </div>
        
        <div className="profile-section">
          <h2>Informacje o koncie</h2>
          <div className="profile-info">
            <div className="info-item">
              <label>Nazwa użytkownika:</label>
              <span>{user.username || 'Nie ustawiono'}</span>
              <button 
                className="edit-button"
                onClick={() => setShowUsernameForm(!showUsernameForm)}
              >
                {showUsernameForm ? 'Anuluj' : 'Zmień'}
              </button>
            </div>
            {showUsernameForm && (
              <div className="edit-form">
                <input
                  type="text"
                  placeholder="Nowa nazwa użytkownika"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  minLength={3}
                />
                <div className="password-input-container">
                  <input
                    type={showPasswords.emailPassword ? "text" : "password"}
                    placeholder="Potwierdź hasło"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="show-password-button"
                    onClick={() => togglePasswordVisibility('emailPassword')}
                  >
                    {showPasswords.emailPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                {usernameError && <div className="error-message">{usernameError}</div>}
                <div className="form-buttons">
                  <button 
                    className="cancel-button"
                    onClick={() => {
                      setShowUsernameForm(false);
                      setNewUsername('');
                      setPassword('');
                      setUsernameError('');
                    }}
                  >
                    Anuluj
                  </button>
                  <button 
                    className="save-button"
                    onClick={handleUsernameChange}
                  >
                    Zapisz
                  </button>
                </div>
              </div>
            )}
            <div className="info-item">
              <label>Email:</label>
              <span>{user.email}</span>
              <button 
                className="edit-button"
                onClick={() => setShowEmailForm(!showEmailForm)}
              >
                {showEmailForm ? 'Anuluj' : 'Zmień'}
              </button>
            </div>
            {showEmailForm && (
              <div className="edit-form">
                <input
                  type="email"
                  placeholder="Nowy email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <div className="password-input-container">
                  <input
                    type={showPasswords.emailPassword ? "text" : "password"}
                    placeholder="Potwierdź hasło"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="show-password-button"
                    onClick={() => togglePasswordVisibility('emailPassword')}
                  >
                    {showPasswords.emailPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                {emailError && <div className="error-message">{emailError}</div>}
                <div className="form-buttons">
                  <button 
                    className="cancel-button"
                    onClick={handleCancel}
                  >
                    Anuluj
                  </button>
                  <button 
                    className="save-button"
                    onClick={handleEmailChange}
                  >
                    Zapisz
                  </button>
                </div>
              </div>
            )}
            <div className="info-item">
              <label>ID użytkownika:</label>
              <span>{user.id}</span>
            </div>
            <div className="info-item">
              <label>Hasło:</label>
              <span>••••••••</span>
              <button 
                className="edit-button"
                onClick={() => setShowPasswordForm(!showPasswordForm)}
              >
                {showPasswordForm ? 'Anuluj' : 'Zmień'}
              </button>
            </div>
            {showPasswordForm && (
              <div className="edit-form">
                <div className="password-input-container">
                  <input
                    type={showPasswords.currentPassword ? "text" : "password"}
                    name="currentPassword"
                    placeholder="Obecne hasło"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordDataChange}
                  />
                  <button
                    type="button"
                    className="show-password-button"
                    onClick={() => togglePasswordVisibility('currentPassword')}
                  >
                    {showPasswords.currentPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                <div className="password-input-container">
                  <input
                    type={showPasswords.newPassword ? "text" : "password"}
                    name="newPassword"
                    placeholder="Nowe hasło"
                    value={passwordData.newPassword}
                    onChange={handlePasswordDataChange}
                  />
                  <button
                    type="button"
                    className="show-password-button"
                    onClick={() => togglePasswordVisibility('newPassword')}
                  >
                    {showPasswords.newPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                <div className="password-input-container">
                  <input
                    type={showPasswords.confirmNewPassword ? "text" : "password"}
                    name="confirmNewPassword"
                    placeholder="Potwierdź nowe hasło"
                    value={passwordData.confirmNewPassword}
                    onChange={handlePasswordDataChange}
                  />
                  <button
                    type="button"
                    className="show-password-button"
                    onClick={() => togglePasswordVisibility('confirmNewPassword')}
                  >
                    {showPasswords.confirmNewPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                {passwordError && <div className="error-message">{passwordError}</div>}
                <div className="form-buttons">
                  <button 
                    className="cancel-button"
                    onClick={handlePasswordCancel}
                  >
                    Anuluj
                  </button>
                  <button 
                    className="save-button"
                    onClick={handlePasswordChange}
                  >
                    Zapisz
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="profile-section danger-zone">
          <h2>Strefa niebezpieczna</h2>
          <div className="profile-info">
            <div className="info-item danger">
              <label>Usuń konto:</label>
              <span>Ta operacja jest nieodwracalna</span>
              <button 
                className="delete-button"
                onClick={() => setShowDeleteForm(!showDeleteForm)}
              >
                {showDeleteForm ? 'Anuluj' : 'Usuń konto'}
              </button>
            </div>
            {showDeleteForm && (
              <div className="edit-form delete-form">
                <p className="delete-warning">
                  Czy na pewno chcesz usunąć swoje konto? Ta operacja jest nieodwracalna i spowoduje utratę wszystkich danych.
                </p>
                <input
                  type="password"
                  placeholder="Potwierdź hasło"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
                {deleteError && <div className="error-message">{deleteError}</div>}
                <div className="form-buttons">
                  <button 
                    className="cancel-button"
                    onClick={() => {
                      setShowDeleteForm(false);
                      setDeletePassword('');
                      setDeleteError('');
                    }}
                  >
                    Anuluj
                  </button>
                  <button 
                    className="confirm-delete-button"
                    onClick={handleDeleteAccount}
                  >
                    Potwierdzam usunięcie konta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="profile-actions">
          <button 
            className="return-button"
            onClick={() => navigate('/')}
          >
            Powrót do strony głównej
          </button>
          <button 
            className="logout-button" 
            onClick={onLogout}
          >
            Wyloguj się
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile; 