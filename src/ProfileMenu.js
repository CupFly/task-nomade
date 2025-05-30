import React, { useState, useRef, useEffect } from 'react';
import './ProfileMenu.css';

const ProfileMenu = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="profile-menu-container" ref={menuRef}>
      <div 
        className="profile-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="profile-avatar">
          {user.email[0].toUpperCase()}
        </div>
        <span className="profile-email">{user.email}</span>
      </div>
      
      {isOpen && (
        <div className="profile-dropdown">
          <div className="profile-header">
            <div className="profile-avatar large">
              {user.email[0].toUpperCase()}
            </div>
            <div className="profile-info">
              <span className="profile-email">{user.email}</span>
              <span className="profile-id">ID: {user.id}</span>
            </div>
          </div>
          <div className="profile-menu-items">
            <button className="menu-item" onClick={onLogout}>
              <span className="menu-icon">🚪</span>
              Wyloguj się
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu; 