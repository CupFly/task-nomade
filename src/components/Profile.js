import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

const Profile = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
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
  const [profilePicture, setProfilePicture] = useState(user.profilePicture || null);

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

    if (newUsername.length > 10) {
      setUsernameError('Nazwa użytkownika może mieć maksymalnie 10 znaków');
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

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfilePictureChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Proszę wybrać plik obrazu');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Obraz nie może być większy niż 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Image = e.target?.result;
      if (base64Image) {
        // Update profile picture in state
        setProfilePicture(base64Image);

        // Update user in localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const updatedUsers = users.map(u =>
          u.id === user.id ? { ...u, profilePicture: base64Image } : u
        );
        localStorage.setItem('users', JSON.stringify(updatedUsers));

        // Update current user
        const updatedUser = { ...user, profilePicture: base64Image };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        
        // Refresh the page to update all instances of the profile picture
        window.location.reload();
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div 
            className="profile-avatar"
            onClick={handleProfilePictureClick}
            style={profilePicture ? {
              backgroundImage: `url(${profilePicture})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              fontSize: 0
            } : {}}
          >
            {!profilePicture && (user.username ? user.username[0].toUpperCase() : user.email[0].toUpperCase())}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              style={{ display: 'none' }}
            />
            <div className="profile-avatar-overlay">
              <span>Zmień zdjęcie</span>
            </div>
          </div>
          <div className="profile-header-info">
            <h1>{user.username || user.email}</h1>
            <span className="profile-email">{user.email}</span>
          </div>
        </div>
        
        <div className="profile-section">
          <h2 className="profile-title">Informacje o koncie</h2>
          <ul className="profile-list">
            <li className="profile-list-item">
              <span className="label">Nazwa użytkownika</span>
              <span className="value">{user.username || 'Nie ustawiono'}</span>
              <button 
                className="edit-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUsernameForm(!showUsernameForm);
                }}
              >
                {showUsernameForm ? 'Anuluj' : 'Zmień'}
              </button>
            </li>
            {showUsernameForm && (
              <div className="edit-form">
                <input
                  type="text"
                  placeholder="Nowa nazwa użytkownika"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  minLength={3}
                  maxLength={10}
                  spellCheck="false"
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
                    className="save-button"
                    onClick={handleUsernameChange}
                  >
                    Zapisz
                  </button>
                </div>
              </div>
            )}
            
            <li className="profile-list-item">
              <span className="label">Email</span>
              <span className="value">{user.email}</span>
              <button 
                className="edit-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmailForm(!showEmailForm);
                }}
              >
                {showEmailForm ? 'Anuluj' : 'Zmień'}
              </button>
            </li>
            {showEmailForm && (
              <div className="edit-form">
                <input
                  type="text"
                  placeholder="Nowy email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  spellCheck="false"
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
                    className="save-button"
                    onClick={handleEmailChange}
                  >
                    Zapisz
                  </button>
                </div>
              </div>
            )}
            
            <li className="profile-list-item">
              <span className="label">Hasło</span>
              <span className="value">••••••••</span>
              <button 
                className="edit-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPasswordForm(!showPasswordForm);
                }}
              >
                {showPasswordForm ? 'Anuluj' : 'Zmień'}
              </button>
            </li>
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
                    className="save-button"
                    onClick={handlePasswordChange}
                  >
                    Zapisz
                  </button>
                </div>
              </div>
            )}
          </ul>
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