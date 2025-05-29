import React, { useState, useEffect } from "react";
import "./App.css";
import Auth from "./components/Auth";
import CollaboratorModal from "./components/CollaboratorModal";

const TaskBoard = ({ user }) => {
  const [boards, setBoards] = useState([]);
  const [sharedBoards, setSharedBoards] = useState([]);
  const [currentBoardIndex, setCurrentBoardIndex] = useState(0);
  const [newListTitle, setNewListTitle] = useState("");
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [showCollaboratorModal, setShowCollaboratorModal] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Load user's own boards
  useEffect(() => {
    const savedBoards = localStorage.getItem(`boards_${user.id}`);
    if (savedBoards) {
      setBoards(JSON.parse(savedBoards));
    } else {
      const defaultBoards = [
        {
          title: "Moja pierwsza tablica",
          lists: [
            { title: "Do zrobienia", tasks: ["Zadanie 1", "Zadanie 2"] },
            { title: "W toku", tasks: [] },
            { title: "Zrobione", tasks: [] },
          ],
          collaborators: [],
          lastModified: Date.now()
        }
      ];
      setBoards(defaultBoards);
      localStorage.setItem(`boards_${user.id}`, JSON.stringify(defaultBoards));
    }
  }, [user.id]);

  // Poll for updates to shared boards and owned boards that are shared
  useEffect(() => {
    const pollInterval = setInterval(() => {
      // Check for updates to shared boards
      const savedSharedBoards = localStorage.getItem(`shared_boards_${user.id}`);
      if (savedSharedBoards) {
        const parsedSharedBoards = JSON.parse(savedSharedBoards);
        setSharedBoards(currentSharedBoards => {
          if (JSON.stringify(currentSharedBoards) !== JSON.stringify(parsedSharedBoards)) {
            return parsedSharedBoards;
          }
          return currentSharedBoards;
        });
      }

      // Check for updates to owned boards that are shared
      boards.forEach(board => {
        if (board.collaborators?.length > 0) {
          board.collaborators.forEach(collaborator => {
            const collaboratorBoards = JSON.parse(localStorage.getItem(`shared_boards_${collaborator.id}`) || '[]');
            const sharedBoard = collaboratorBoards.find(b => b.title === board.title);
            if (sharedBoard && sharedBoard.lastModified > (board.lastModified || 0)) {
              // Update the owner's board with collaborator's changes
              setBoards(currentBoards => 
                currentBoards.map(b => 
                  b.title === board.title 
                    ? { ...b, lists: sharedBoard.lists, lastModified: sharedBoard.lastModified }
                    : b
                )
              );
            }
          });
        }
      });
    }, 1000); // Poll every second

    return () => clearInterval(pollInterval);
  }, [boards, user.id]);

  // Save boards whenever they change
  useEffect(() => {
    if (boards.length > 0) {
      localStorage.setItem(`boards_${user.id}`, JSON.stringify(boards));
      setLastUpdate(Date.now());
    }
  }, [boards, user.id]);

  // Save shared boards whenever they change
  useEffect(() => {
    if (sharedBoards.length > 0) {
      localStorage.setItem(`shared_boards_${user.id}`, JSON.stringify(sharedBoards));
      setLastUpdate(Date.now());
    }
  }, [sharedBoards, user.id]);

  const handleLogout = () => {
    // Save current state before logging out
    if (boards.length > 0) {
      localStorage.setItem(`boards_${user.id}`, JSON.stringify(boards));
    }
    if (sharedBoards.length > 0) {
      localStorage.setItem(`shared_boards_${user.id}`, JSON.stringify(sharedBoards));
    }
    // Remove only the current user session
    localStorage.removeItem('currentUser');
    window.location.reload();
  };

  const allBoards = [...boards, ...sharedBoards];
  const currentBoard = allBoards[currentBoardIndex];
  const isSharedBoard = currentBoardIndex >= boards.length;

  const updateBoardTimestamp = (boardIndex) => {
    const newBoards = [...boards];
    newBoards[boardIndex] = {
      ...newBoards[boardIndex],
      lastModified: Date.now()
    };
    setBoards(newBoards);
  };

  // Function to sync changes with all users of a board
  const syncBoardChanges = (updatedBoard, isSharedBoard) => {
    const timestamp = Date.now();
    updatedBoard.lastModified = timestamp;

    if (isSharedBoard) {
      // Update in shared boards
      const newSharedBoards = sharedBoards.map(board =>
        board.title === updatedBoard.title ? updatedBoard : board
      );
      setSharedBoards(newSharedBoards);
      localStorage.setItem(`shared_boards_${user.id}`, JSON.stringify(newSharedBoards));

      // Update owner's board
      const ownerBoards = JSON.parse(localStorage.getItem(`boards_${updatedBoard.ownerId}`) || '[]');
      const updatedOwnerBoards = ownerBoards.map(board =>
        board.title === updatedBoard.title
          ? { ...board, lists: updatedBoard.lists, lastModified: timestamp }
          : board
      );
      localStorage.setItem(`boards_${updatedBoard.ownerId}`, JSON.stringify(updatedOwnerBoards));

      // Update for all other collaborators
      updatedBoard.collaborators?.forEach(collaborator => {
        if (collaborator.id !== user.id) {
          const collaboratorBoards = JSON.parse(localStorage.getItem(`shared_boards_${collaborator.id}`) || '[]');
          const updatedCollaboratorBoards = collaboratorBoards.map(board =>
            board.title === updatedBoard.title
              ? { ...board, lists: updatedBoard.lists, lastModified: timestamp }
              : board
          );
          localStorage.setItem(`shared_boards_${collaborator.id}`, JSON.stringify(updatedCollaboratorBoards));
        }
      });
    } else {
      // Update owner's board and propagate to collaborators
      const newBoards = boards.map(board =>
        board.title === updatedBoard.title ? updatedBoard : board
      );
      setBoards(newBoards);
      localStorage.setItem(`boards_${user.id}`, JSON.stringify(newBoards));

      // Update for all collaborators
      updatedBoard.collaborators?.forEach(collaborator => {
        const collaboratorBoards = JSON.parse(localStorage.getItem(`shared_boards_${collaborator.id}`) || '[]');
        const updatedCollaboratorBoards = collaboratorBoards.map(board =>
          board.title === updatedBoard.title
            ? { ...board, lists: updatedBoard.lists, lastModified: timestamp }
            : board
        );
        localStorage.setItem(`shared_boards_${collaborator.id}`, JSON.stringify(updatedCollaboratorBoards));
      });
    }
  };

  const addTask = (listIndex, task) => {
    if (!task.trim()) return;
    
    const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];

    // Check if user is an observer
    if (isSharedBoard) {
      const userRole = currentBoard.collaborators.find(c => c.id === user.id)?.role;
      if (userRole === 'observer') {
        return; // Observers cannot add tasks
      }
    }
    
    const updatedBoard = {
      ...currentBoard,
      lists: currentBoard.lists.map((list, idx) =>
        idx === listIndex
          ? { 
              ...list, 
              tasks: [...list.tasks, { 
                text: task,
                completed: false,
                createdAt: Date.now(),
                comments: [],
                id: Date.now().toString() // Unique ID for the task
              }] 
            }
          : list
      )
    };
    syncBoardChanges(updatedBoard, isSharedBoard);
  };

  const addComment = (listIndex, taskIndex, comment) => {
    if (!comment.trim()) return;

    const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];

    // Check if user is an observer
    if (isSharedBoard) {
      const userRole = currentBoard.collaborators.find(c => c.id === user.id)?.role;
      if (userRole === 'observer') {
        return; // Observers cannot add comments
      }
    }

    const updatedBoard = {
      ...currentBoard,
      lists: currentBoard.lists.map((list, lIdx) =>
        lIdx === listIndex
          ? {
              ...list,
              tasks: list.tasks.map((task, tIdx) =>
                tIdx === taskIndex
                  ? {
                      ...task,
                      comments: [...(task.comments || []), {
                        id: Date.now().toString(),
                        text: comment,
                        userId: user.id,
                        userEmail: user.email,
                        createdAt: Date.now()
                      }]
                    }
                  : task
              )
            }
          : list
      )
    };
    syncBoardChanges(updatedBoard, isSharedBoard);
  };

  const removeComment = (listIndex, taskIndex, commentId) => {
    const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];

    // Only allow comment removal by the comment author or board owner
    const comment = currentBoard.lists[listIndex].tasks[taskIndex].comments.find(c => c.id === commentId);
    if (isSharedBoard && comment.userId !== user.id && currentBoard.ownerId !== user.id) {
      return; // Only comment author or board owner can remove comments
    }

    const updatedBoard = {
      ...currentBoard,
      lists: currentBoard.lists.map((list, lIdx) =>
        lIdx === listIndex
          ? {
              ...list,
              tasks: list.tasks.map((task, tIdx) =>
                tIdx === taskIndex
                  ? {
                      ...task,
                      comments: task.comments.filter(c => c.id !== commentId)
                    }
                  : task
              )
            }
          : list
      )
    };
    syncBoardChanges(updatedBoard, isSharedBoard);
  };

  const toggleTaskCompletion = (listIndex, taskIndex) => {
    const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];

    // Check if user is an observer
    if (isSharedBoard) {
      const userRole = currentBoard.collaborators.find(c => c.id === user.id)?.role;
      if (userRole === 'observer') {
        return; // Observers cannot toggle tasks
      }
    }

    const updatedBoard = {
      ...currentBoard,
      lists: currentBoard.lists.map((list, idx) =>
        idx === listIndex
          ? {
              ...list,
              tasks: list.tasks.map((task, tIdx) =>
                tIdx === taskIndex
                  ? { ...task, completed: !task.completed }
                  : task
              )
            }
          : list
      )
    };
    syncBoardChanges(updatedBoard, isSharedBoard);
  };

  const removeTask = (listIndex, taskIndex) => {
    const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];

    // Check if user is an observer
    if (isSharedBoard) {
      const userRole = currentBoard.collaborators.find(c => c.id === user.id)?.role;
      if (userRole === 'observer') {
        return; // Observers cannot remove tasks
      }
    }

    const updatedBoard = {
      ...currentBoard,
      lists: currentBoard.lists.map((list, idx) =>
        idx === listIndex
          ? { ...list, tasks: list.tasks.filter((_, i) => i !== taskIndex) }
          : list
      )
    };
    syncBoardChanges(updatedBoard, isSharedBoard);
  };

  const removeList = (listIndex) => {
    const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];

    // Check if user is an observer
    if (isSharedBoard) {
      const userRole = currentBoard.collaborators.find(c => c.id === user.id)?.role;
      if (userRole === 'observer') {
        return; // Observers cannot remove lists
      }
    }

    const updatedBoard = {
      ...currentBoard,
      lists: currentBoard.lists.filter((_, idx) => idx !== listIndex)
    };
    syncBoardChanges(updatedBoard, isSharedBoard);
  };

  const addList = () => {
    if (!newListTitle.trim()) return;
    
    const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];

    // Check if user is an observer
    if (isSharedBoard) {
      const userRole = currentBoard.collaborators.find(c => c.id === user.id)?.role;
      if (userRole === 'observer') {
        return; // Observers cannot add lists
      }
    }

    const updatedBoard = {
      ...currentBoard,
      lists: [...currentBoard.lists, { title: newListTitle, tasks: [], order: currentBoard.lists.length }]
    };
    syncBoardChanges(updatedBoard, isSharedBoard);
    setNewListTitle("");
  };

  const moveList = (fromIndex, toIndex) => {
    const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];

    // Check if user is an observer
    if (isSharedBoard) {
      const userRole = currentBoard.collaborators.find(c => c.id === user.id)?.role;
      if (userRole === 'observer') {
        return; // Observers cannot move lists
      }
    }

    const updatedLists = [...currentBoard.lists];
    const [movedList] = updatedLists.splice(fromIndex, 1);
    updatedLists.splice(toIndex, 0, movedList);

    // Update order property for all lists
    const reorderedLists = updatedLists.map((list, index) => ({
      ...list,
      order: index
    }));

    const updatedBoard = {
      ...currentBoard,
      lists: reorderedLists
    };

    syncBoardChanges(updatedBoard, isSharedBoard);
  };

  const addBoard = () => {
    if (!newBoardTitle.trim()) return;
    const newBoard = {
      title: newBoardTitle,
      lists: [],
      collaborators: [],
      order: boards.length,
      lastModified: Date.now()
    };
    setBoards([...boards, newBoard]);
    localStorage.setItem(`boards_${user.id}`, JSON.stringify([...boards, newBoard]));
    setNewBoardTitle("");
  };

  // Store user's board order preferences
  const [boardOrder, setBoardOrder] = useState(() => {
    const savedOrder = localStorage.getItem(`board_order_${user.id}`);
    return savedOrder ? JSON.parse(savedOrder) : {
      owned: boards.map((_, index) => index),
      shared: []
    };
  });

  // Effect to update board order when boards change
  useEffect(() => {
    const newOrder = {
      owned: Array.from({ length: boards.length }, (_, i) => i),
      shared: Array.from({ length: sharedBoards.length }, (_, i) => i)
    };
    setBoardOrder(newOrder);
  }, [boards.length, sharedBoards.length]);

  // Effect to save board order
  useEffect(() => {
    if (boardOrder.owned.length > 0 || boardOrder.shared.length > 0) {
      localStorage.setItem(`board_order_${user.id}`, JSON.stringify(boardOrder));
    }
  }, [boardOrder, user.id]);

  const moveBoard = (fromIndex, toIndex) => {
    const isFromShared = fromIndex >= boards.length;
    const isToShared = toIndex >= boards.length;

    // If moving between different sections (owned/shared), return
    if (isFromShared !== isToShared) {
      return;
    }

    if (isFromShared) {
      // Moving shared boards
      const sharedFromIndex = fromIndex - boards.length;
      const sharedToIndex = toIndex - boards.length;

      const newSharedOrder = [...boardOrder.shared];
      const [movedItem] = newSharedOrder.splice(sharedFromIndex, 1);
      newSharedOrder.splice(sharedToIndex, 0, movedItem);

      setBoardOrder(prev => ({
        ...prev,
        shared: newSharedOrder
      }));

      // Update current board index if necessary
      if (currentBoardIndex === fromIndex) {
        setCurrentBoardIndex(toIndex);
      } else if (currentBoardIndex > fromIndex && currentBoardIndex <= toIndex) {
        setCurrentBoardIndex(currentBoardIndex - 1);
      } else if (currentBoardIndex < fromIndex && currentBoardIndex >= toIndex) {
        setCurrentBoardIndex(currentBoardIndex + 1);
      }
    } else {
      // Moving owned boards
      const newOwnedOrder = [...boardOrder.owned];
      const [movedItem] = newOwnedOrder.splice(fromIndex, 1);
      newOwnedOrder.splice(toIndex, 0, movedItem);

      setBoardOrder(prev => ({
        ...prev,
        owned: newOwnedOrder
      }));

      // Update current board index if necessary
      if (currentBoardIndex === fromIndex) {
        setCurrentBoardIndex(toIndex);
      } else if (currentBoardIndex > fromIndex && currentBoardIndex <= toIndex) {
        setCurrentBoardIndex(currentBoardIndex - 1);
      } else if (currentBoardIndex < fromIndex && currentBoardIndex >= toIndex) {
        setCurrentBoardIndex(currentBoardIndex + 1);
      }
    }
  };

  // Function to get ordered boards
  const getOrderedBoards = () => {
    // Filter out any undefined indices and map to actual boards
    const orderedOwned = boardOrder.owned
      .filter(index => index < boards.length)
      .map(index => boards[index])
      .filter(Boolean);

    const orderedShared = boardOrder.shared
      .filter(index => index < sharedBoards.length)
      .map(index => sharedBoards[index])
      .filter(Boolean);

    return [...orderedOwned, ...orderedShared];
  };

  const removeBoard = (boardIndex) => {
    if (boardIndex >= boards.length) {
      // Removing from shared boards
      const boardToRemove = sharedBoards[boardIndex - boards.length];
      const newSharedBoards = sharedBoards.filter((_, index) => index !== boardIndex - boards.length);
      setSharedBoards(newSharedBoards);
      localStorage.setItem(`shared_boards_${user.id}`, JSON.stringify(newSharedBoards));

      // Notify owner about removal
      const ownerBoards = JSON.parse(localStorage.getItem(`boards_${boardToRemove.ownerId}`) || '[]');
      const updatedOwnerBoards = ownerBoards.map(board =>
        board.title === boardToRemove.title
          ? {
              ...board,
              collaborators: board.collaborators.filter(c => c.id !== user.id),
              lastModified: Date.now()
            }
          : board
      );
      localStorage.setItem(`boards_${boardToRemove.ownerId}`, JSON.stringify(updatedOwnerBoards));
    } else {
      // Removing owned board
      if (boards.length <= 1) return; // Prevent removing the last board
      const boardToRemove = boards[boardIndex];
      
      // Remove board from owner's boards
      const newBoards = boards.filter((_, index) => index !== boardIndex);
      setBoards(newBoards);
      localStorage.setItem(`boards_${user.id}`, JSON.stringify(newBoards));

      // Remove board from all collaborators
      boardToRemove.collaborators?.forEach(collaborator => {
        const collaboratorBoards = JSON.parse(localStorage.getItem(`shared_boards_${collaborator.id}`) || '[]');
        const updatedCollaboratorBoards = collaboratorBoards.filter(board => board.title !== boardToRemove.title);
        localStorage.setItem(`shared_boards_${collaborator.id}`, JSON.stringify(updatedCollaboratorBoards));
      });

      // Update current board index if necessary
      if (currentBoardIndex >= newBoards.length) {
        setCurrentBoardIndex(newBoards.length - 1);
      }
    }
  };

  const handleAddCollaborator = (collaborator) => {
    const currentBoard = boards[currentBoardIndex];
    const updatedBoard = {
      ...currentBoard,
      collaborators: [...(currentBoard.collaborators || []), collaborator]
    };
    
    // Update the board in owner's boards
    const newBoards = boards.map(board => 
      board.title === currentBoard.title ? updatedBoard : board
    );
    setBoards(newBoards);
    localStorage.setItem(`boards_${user.id}`, JSON.stringify(newBoards));

    // Add board to collaborator's shared boards
    const collaboratorSharedBoards = JSON.parse(localStorage.getItem(`shared_boards_${collaborator.id}`) || '[]');
    const sharedBoardForCollaborator = {
      ...updatedBoard,
      ownerId: user.id,
      ownerEmail: user.email,
      lastModified: Date.now()
    };
    collaboratorSharedBoards.push(sharedBoardForCollaborator);
    localStorage.setItem(`shared_boards_${collaborator.id}`, JSON.stringify(collaboratorSharedBoards));
  };

  const handleRemoveCollaborator = (collaboratorId, boardTitle) => {
    // Get the current board
    const currentBoard = boards[currentBoardIndex];
    
    // Remove collaborator from the board
    const updatedBoard = {
      ...currentBoard,
      collaborators: currentBoard.collaborators.filter(c => c.id !== collaboratorId),
      lastModified: Date.now()
    };

    // Update the board in owner's boards
    const newBoards = boards.map(board =>
      board.title === boardTitle ? updatedBoard : board
    );
    setBoards(newBoards);
    localStorage.setItem(`boards_${user.id}`, JSON.stringify(newBoards));

    // Remove the board from collaborator's shared boards
    const collaboratorSharedBoards = JSON.parse(localStorage.getItem(`shared_boards_${collaboratorId}`) || '[]');
    const updatedCollaboratorBoards = collaboratorSharedBoards.filter(b => b.title !== boardTitle);
    localStorage.setItem(`shared_boards_${collaboratorId}`, JSON.stringify(updatedCollaboratorBoards));

    // If the removed user is the current user, update their view immediately
    if (collaboratorId === user.id) {
      setSharedBoards(prevBoards => prevBoards.filter(b => b.title !== boardTitle));
      
      // If they were viewing the board they were removed from, switch to another board
      if (currentBoard.title === boardTitle) {
        const availableBoards = [...boards, ...updatedCollaboratorBoards];
        if (availableBoards.length > 0) {
          setCurrentBoardIndex(0);
        }
      } else {
        // Adjust currentBoardIndex if necessary
        const totalBoards = boards.length + updatedCollaboratorBoards.length;
        if (currentBoardIndex >= totalBoards) {
          setCurrentBoardIndex(Math.max(0, totalBoards - 1));
        }
      }
    }

    // Notify the removed user through localStorage event
    const notification = {
      type: 'COLLABORATOR_REMOVED',
      boardTitle: boardTitle,
      timestamp: Date.now()
    };
    localStorage.setItem(`notification_${collaboratorId}`, JSON.stringify(notification));
  };

  // Add effect to listen for notifications
  useEffect(() => {
    const checkNotifications = () => {
      const notificationKey = `notification_${user.id}`;
      const notification = JSON.parse(localStorage.getItem(notificationKey) || 'null');
      
      if (notification && notification.type === 'COLLABORATOR_REMOVED') {
        // Clear the notification
        localStorage.removeItem(notificationKey);
        
        // Update shared boards if we were removed
        const updatedSharedBoards = sharedBoards.filter(b => b.title !== notification.boardTitle);
        if (updatedSharedBoards.length !== sharedBoards.length) {
          setSharedBoards(updatedSharedBoards);
          localStorage.setItem(`shared_boards_${user.id}`, JSON.stringify(updatedSharedBoards));

          // If user was viewing the board they were removed from, switch to another board
          const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];
          if (currentBoard && currentBoard.title === notification.boardTitle) {
            setCurrentBoardIndex(0);
          } else {
            // Adjust currentBoardIndex if necessary
            const totalBoards = boards.length + updatedSharedBoards.length;
            if (currentBoardIndex >= totalBoards) {
              setCurrentBoardIndex(Math.max(0, totalBoards - 1));
            }
          }
        }
      }
    };

    // Check for notifications periodically
    const notificationInterval = setInterval(checkNotifications, 1000);
    
    // Check immediately on mount
    checkNotifications();

    return () => clearInterval(notificationInterval);
  }, [user.id, boards, sharedBoards, currentBoardIndex, isSharedBoard]);

  const handleLeaveBoard = (boardIndex) => {
    // Check if it's a valid shared board index
    if (boardIndex < boards.length || boardIndex >= boards.length + sharedBoards.length) {
      console.error('Invalid board index for leaving a shared board');
      return;
    }

    const sharedBoardIndex = boardIndex - boards.length;
    const boardToLeave = sharedBoards[sharedBoardIndex];

    // Validate that we have a valid board to leave
    if (!boardToLeave || !boardToLeave.ownerId) {
      console.error('Invalid board data for leaving a shared board');
      return;
    }
    
    // Remove board from user's shared boards
    const newSharedBoards = sharedBoards.filter((_, index) => index !== sharedBoardIndex);
    setSharedBoards(newSharedBoards);
    localStorage.setItem(`shared_boards_${user.id}`, JSON.stringify(newSharedBoards));

    try {
      // Update owner's board to remove this user from collaborators
      const ownerBoards = JSON.parse(localStorage.getItem(`boards_${boardToLeave.ownerId}`) || '[]');
      const updatedOwnerBoards = ownerBoards.map(board =>
        board.title === boardToLeave.title
          ? {
              ...board,
              collaborators: (board.collaborators || []).filter(c => c.id !== user.id),
              lastModified: Date.now()
            }
          : board
      );
      localStorage.setItem(`boards_${boardToLeave.ownerId}`, JSON.stringify(updatedOwnerBoards));

      // Switch to first available board if current board is being left
      if (currentBoardIndex === boardIndex) {
        setCurrentBoardIndex(0);
      } else if (currentBoardIndex > boardIndex) {
        // Adjust current board index if we're leaving a board that comes before the current one
        setCurrentBoardIndex(currentBoardIndex - 1);
      }
    } catch (error) {
      console.error('Error updating owner boards:', error);
      // Still remove the board from user's shared boards even if updating owner's boards fails
    }
  };

  const [selectedTask, setSelectedTask] = useState(null);
  const [commentInput, setCommentInput] = useState('');

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>Witaj, {user.email}</h1>
        <button 
          className="logout-button"
          onClick={handleLogout}
        >
          Wyloguj się
        </button>
      </div>

      <div className="boards-navigation">
        <div className="board-tabs">
          {getOrderedBoards().map((board, index) => {
            if (!board) return null; // Skip if board is undefined
            const isSharedBoard = index >= boards.length;
            return (
              <div
                key={isSharedBoard ? `shared_${board.title}` : `owned_${board.title}`}
                className={`board-tab ${index === currentBoardIndex ? 'active' : ''}`}
                onClick={() => setCurrentBoardIndex(index)}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', index.toString());
                  e.currentTarget.classList.add('dragging');
                }}
                onDragEnd={(e) => {
                  e.currentTarget.classList.remove('dragging');
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('drag-over');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('drag-over');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('drag-over');
                  const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                  if (fromIndex !== index) {
                    moveBoard(fromIndex, index);
                  }
                }}
              >
                <div className="board-tab-content">
                  <span>{board.title}</span>
                  {isSharedBoard && board.ownerEmail && (
                    <span className="shared-label">
                      Udostępniona przez {board.ownerEmail}
                    </span>
                  )}
                </div>
                <div className="board-actions">
                  {!isSharedBoard && boards.length > 1 && (
                    <button
                      className="remove-board-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBoard(index);
                      }}
                    >
                      ×
                    </button>
                  )}
                  {isSharedBoard ? (
                    <button
                      className="leave-board-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLeaveBoard(index);
                      }}
                    >
                      Opuść tablicę
                    </button>
                  ) : (
                    <button
                      className="share-board-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCollaboratorModal(true);
                      }}
                    >
                      Udostępnij
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div className="new-board-form">
            <input
              type="text"
              placeholder="Nowa tablica"
              value={newBoardTitle}
              onChange={(e) => setNewBoardTitle(e.target.value)}
              maxLength="30"
            />
            <button onClick={addBoard}>+</button>
          </div>
        </div>
      </div>

      {currentBoard && (
        <div className="board">
          {currentBoard.lists
            .slice()
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((list, listIndex) => (
              <div 
                className="list-table" 
                key={listIndex}
                draggable={!isSharedBoard || (isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role !== 'observer')}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', listIndex.toString());
                  e.currentTarget.classList.add('dragging');
                }}
                onDragEnd={(e) => {
                  e.currentTarget.classList.remove('dragging');
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('drag-over');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('drag-over');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('drag-over');
                  const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                  const toIndex = listIndex;
                  if (fromIndex !== toIndex) {
                    moveList(fromIndex, toIndex);
                  }
                }}
              >
                <h3>
                  {list.title}
                  {(!isSharedBoard || (isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role !== 'observer')) && (
                    <button onClick={() => removeList(listIndex)} className="remove-list-btn">
                      Usuń listę
                    </button>
                  )}
                </h3>
                <ul className="task-list">
                  {list.tasks.map((task, taskIndex) => (
                    <li 
                      key={taskIndex} 
                      className={`task ${task.completed ? 'completed' : ''}`}
                      onClick={() => setSelectedTask({ listIndex, taskIndex, task })}
                    >
                      <div className="task-content">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleTaskCompletion(listIndex, taskIndex)}
                          disabled={isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role === 'observer'}
                          className="task-checkbox"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="task-text">{task.text}</span>
                        {task.comments?.length > 0 && (
                          <span className="comment-count">
                            {task.comments.length} 💬
                          </span>
                        )}
                      </div>
                      {(!isSharedBoard || (isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role !== 'observer')) && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTask(listIndex, taskIndex);
                          }}
                        >
                          Usuń
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {(!isSharedBoard || (isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role !== 'observer')) && (
                  <input
                    className="task-input"
                    placeholder="Nowe zadanie"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addTask(listIndex, e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                )}
              </div>
            ))}
          {(!isSharedBoard || (isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role !== 'observer')) && (
            <div className="list-table">
              <input
                className="list-input"
                placeholder="Nowa lista"
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                maxLength="20"
              />
              <button className="add-list-btn" onClick={addList}>
                Dodaj listę
              </button>
            </div>
          )}
        </div>
      )}

      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="task-modal" onClick={(e) => e.stopPropagation()}>
            <div className="task-modal-header">
              <h3>{selectedTask.task.text}</h3>
              <button className="close-btn" onClick={() => setSelectedTask(null)}>×</button>
            </div>
            <div className="comments-section">
              <h4>Komentarze</h4>
              <div className="comments-list">
                {selectedTask.task.comments?.map((comment) => (
                  <div key={comment.id} className="comment">
                    <div className="comment-header">
                      <span className="comment-author">{comment.userEmail}</span>
                      <span className="comment-date">{formatDate(comment.createdAt)}</span>
                      {(comment.userId === user.id || (!isSharedBoard || currentBoard.ownerId === user.id)) && (
                        <button
                          className="remove-comment-btn"
                          onClick={() => removeComment(selectedTask.listIndex, selectedTask.taskIndex, comment.id)}
                        >
                          Usuń
                        </button>
                      )}
                    </div>
                    <div className="comment-text">{comment.text}</div>
                  </div>
                ))}
              </div>
              {(!isSharedBoard || (isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role !== 'observer')) && (
                <div className="comment-input-container">
                  <input
                    type="text"
                    className="comment-input"
                    placeholder="Dodaj komentarz..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && commentInput.trim()) {
                        addComment(selectedTask.listIndex, selectedTask.taskIndex, commentInput);
                        setCommentInput('');
                      }
                    }}
                  />
                  <button
                    className="add-comment-btn"
                    onClick={() => {
                      if (commentInput.trim()) {
                        addComment(selectedTask.listIndex, selectedTask.taskIndex, commentInput);
                        setCommentInput('');
                      }
                    }}
                  >
                    Dodaj
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCollaboratorModal && (
        <CollaboratorModal
          board={boards[currentBoardIndex]}
          onClose={() => setShowCollaboratorModal(false)}
          onAddCollaborator={handleAddCollaborator}
          onRemoveCollaborator={handleRemoveCollaborator}
          currentUser={user}
        />
      )}
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  return user ? <TaskBoard user={user} /> : <Auth onLogin={handleLogin} />;
};

export default App;