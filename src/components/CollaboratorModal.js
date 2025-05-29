import React, { useState } from 'react';
import './CollaboratorModal.css';

const CollaboratorModal = ({ board, onClose, onAddCollaborator, onRemoveCollaborator, currentUser }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor'); // Default role is editor
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Wprowadź adres email');
      return;
    }

    // Less strict email validation
    if (!email.includes('@')) {
      setError('Wprowadź prawidłowy adres email');
      return;
    }

    // Check if user is trying to share with themselves
    if (email === currentUser.email) {
      setError('Nie możesz udostępnić tablicy samemu sobie');
      return;
    }

    // Check if user is already a collaborator
    if (board.collaborators?.some(c => c.email === email)) {
      setError('Ten użytkownik już ma dostęp do tablicy');
      return;
    }

    // Get user ID from localStorage (simulating a user database)
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const targetUser = users.find(u => u.email === email);

    if (!targetUser) {
      setError('Nie znaleziono użytkownika. Użytkownik musi się najpierw zarejestrować.');
      return;
    }

    onAddCollaborator({
      id: targetUser.id,
      email: targetUser.email,
      role: role // Include the selected role
    });

    setEmail('');
    setRole('editor');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Udostępnij tablicę</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="email"
              placeholder="Email użytkownika"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="role-select"
            >
              <option value="editor">Edytor</option>
              <option value="observer">Obserwator</option>
            </select>
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit">Dodaj</button>
        </form>

        <div className="collaborators-list">
          <h3>Współpracownicy:</h3>
          {board.collaborators?.length > 0 ? (
            <ul>
              {board.collaborators.map((collaborator, index) => (
                <li key={index}>
                  {collaborator.email}
                  <span className="role-badge">
                    {collaborator.role === 'observer' ? 'Obserwator' : 'Edytor'}
                  </span>
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
            <p>Brak współpracowników</p>
          )}
        </div>

        <button onClick={onClose} className="close-btn">Zamknij</button>
      </div>
    </div>
  );
};

export default CollaboratorModal; 