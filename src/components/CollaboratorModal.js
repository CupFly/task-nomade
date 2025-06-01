/**
 * CollaboratorModal Component
 * Handles the sharing and collaboration features for boards
 * Features:
 * - Add collaborators by email
 * - Set collaborator roles (editor/observer)
 * - Remove collaborators
 * - Validation and error handling
 * - Real-time updates across users
 */

import React, { useState } from 'react';
import './CollaboratorModal.css';

const CollaboratorModal = ({ board, onClose, onAddCollaborator, onRemoveCollaborator, currentUser }) => {
  // State management for form and UI
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
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
   * Handles the addition of a new collaborator
   * @param {Event} e - Form submission event
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Input validation
    if (!email.trim()) {
      setError('Proszę podać adres email');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Nieprawidłowy format adresu email');
      return;
    }

    // Check if user exists
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email);

    if (!user) {
      setError('Nie znaleziono użytkownika o podanym adresie email');
      return;
    }

    // Prevent self-collaboration
    if (user.id === currentUser.id) {
      setError('Nie możesz dodać siebie jako współpracownika');
      return;
    }

    // Check if already a collaborator
    if (board.collaborators?.some(c => c.id === user.id)) {
      setError('Ten użytkownik jest już współpracownikiem');
      return;
    }

    // Add collaborator
    onAddCollaborator({
      id: user.id,
      email: user.email,
      role: role
    });

    // Reset form
    setEmail('');
    setRole('editor');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="collaborator-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h2>Zarządzaj współpracownikami</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Add Collaborator Form */}
        <form onSubmit={handleSubmit} className="collaborator-form">
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <input
              type="text"
              placeholder="Email współpracownika"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="editor">Edytor</option>
              <option value="observer">Obserwator</option>
            </select>
          </div>
          <button type="submit" className="add-collaborator-btn">
            Dodaj współpracownika
          </button>
        </form>

        {/* Collaborators List */}
        <div className="collaborators-list">
          <h3>Obecni współpracownicy</h3>
          {board.collaborators?.length > 0 ? (
            <ul>
              {board.collaborators.map((collaborator) => (
                <li key={collaborator.id} className="collaborator-item">
                  <div className="collaborator-info">
                    <span className="collaborator-email">{collaborator.email}</span>
                    <span className="collaborator-role">
                      {collaborator.role === 'editor' ? 'Edytor' : 'Obserwator'}
                    </span>
                  </div>
                  <button
                    onClick={() => onRemoveCollaborator(collaborator.id, board.title)}
                    className="remove-collaborator-btn"
                  >
                    Usuń
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-collaborators">Brak współpracowników</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaboratorModal; 