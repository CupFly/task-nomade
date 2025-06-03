import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import "./App.css";
import Auth from "./components/Auth";
import Profile from "./components/Profile";
import CollaboratorModal from "./components/CollaboratorModal";

const TaskBoard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [sharedBoards, setSharedBoards] = useState([]);
  const [currentBoardIndex, setCurrentBoardIndex] = useState(0);
  const [newListTitle, setNewListTitle] = useState("");
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [showCollaboratorModal, setShowCollaboratorModal] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [forceUpdate, setForceUpdate] = useState(0);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [selectedTask, setSelectedTask] = useState(null);
  const [commentInput, setCommentInput] = useState('');
  const [isCommentView, setIsCommentView] = useState(false);
  const [addingTaskToList, setAddingTaskToList] = useState(null);
  const [newTaskText, setNewTaskText] = useState('');
  const taskInputRef = useRef(null);
  const [contextMenu, setContextMenu] = useState({ listIndex: null, visible: false });
  const [copyListModal, setCopyListModal] = useState({ visible: false, listIndex: null });
  const [newListName, setNewListName] = useState('');

  const autoResizeTextarea = (element) => {
    if (element) {
      element.style.height = 'auto';
      element.style.height = element.scrollHeight + 'px';
    }
  };

  const handleTextareaChange = (e, setter) => {
    setter(e.target.value);
    autoResizeTextarea(e.target);
  };

  // Function to clean up all drag states
  const cleanupDragStates = () => {
    document.querySelectorAll('.list-table').forEach(list => {
      list.classList.remove('drag-over');
      list.classList.remove('dragging');
    });
    document.querySelectorAll('.task').forEach(task => {
      task.classList.remove('dragging');
    });
  };

  // Add global drag end handler
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      cleanupDragStates();
    };

    document.addEventListener('dragend', handleGlobalDragEnd);
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, []);

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
            { title: "Do zrobienia", tasks: [] },
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

    // Update existing shared boards with owner usernames
    const savedSharedBoards = localStorage.getItem(`shared_boards_${user.id}`);
    if (savedSharedBoards) {
      const sharedBoards = JSON.parse(savedSharedBoards);
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      
      const updatedSharedBoards = sharedBoards.map(board => {
        const owner = users.find(u => u.id === board.ownerId);
        return {
          ...board,
          ownerUsername: owner?.username || null
        };
      });
      
      setSharedBoards(updatedSharedBoards);
      localStorage.setItem(`shared_boards_${user.id}`, JSON.stringify(updatedSharedBoards));
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
    onLogout();
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

  /**
   * Task Color Management
   * - Each task can have a custom background color
   * - Default color is red (#ff0000)
   * - Color is persisted and synced across all users
   * - Only non-observer users can change colors
   */
  const updateTaskColor = (listIndex, taskIndex, color) => {
    const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];

    // Prevent observers from changing task colors in shared boards
    if (isSharedBoard) {
      const userRole = currentBoard.collaborators.find(c => c.id === user.id)?.role;
      if (userRole === 'observer') return;
    }

    const updatedBoard = {
      ...currentBoard,
      lists: currentBoard.lists.map((list, idx) =>
        idx === listIndex
          ? {
              ...list,
              tasks: list.tasks.map((task, tIdx) =>
                tIdx === taskIndex
                  ? { ...task, color: color }
                  : task
              )
            }
          : list
      )
    };
    syncBoardChanges(updatedBoard, isSharedBoard);

    // Update modal view if the task is currently selected
    if (selectedTask && selectedTask.listIndex === listIndex && selectedTask.taskIndex === taskIndex) {
      setSelectedTask(prev => ({
        ...prev,
        task: { ...prev.task, color: color }
      }));
    }
  };

  /**
   * Task Title Management
   * - Titles can be edited inline on the task card or in the modal
   * - Edit mode is triggered by clicking the edit button (✎)
   * - Changes can be saved with Enter or by clicking outside
   * - Escape cancels the edit
   * - Empty titles are not allowed
   * - Only non-observer users can edit titles
   */
  const updateTaskTitle = (listIndex, taskIndex, newTitle) => {
    if (!newTitle.trim()) return;
    
    const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];

    // Prevent observers from editing titles in shared boards
    if (isSharedBoard) {
      const userRole = currentBoard.collaborators.find(c => c.id === user.id)?.role;
      if (userRole === 'observer') return;
    }

    const updatedBoard = {
      ...currentBoard,
      lists: currentBoard.lists.map((list, idx) =>
        idx === listIndex
          ? {
              ...list,
              tasks: list.tasks.map((task, tIdx) =>
                tIdx === taskIndex
                  ? { ...task, text: newTitle }
                  : task
              )
            }
          : list
      )
    };
    syncBoardChanges(updatedBoard, isSharedBoard);

    // Update modal view if the task is currently selected
    if (selectedTask && selectedTask.listIndex === listIndex && selectedTask.taskIndex === taskIndex) {
      setSelectedTask(prev => ({
        ...prev,
        task: { ...prev.task, text: newTitle }
      }));
    }
  };

  /**
   * Task Creation
   * - New tasks are created with a default red background (#ff0000)
   * - Each task has a unique ID based on timestamp
   * - Tasks include support for:
   *   - Custom colors
   *   - Editable titles
   *   - Comments
   *   - Completion status
   */
  const addTask = (listIndex, task) => {
    if (!task.trim()) return;
    
    const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];

    // Prevent observers from adding tasks in shared boards
    if (isSharedBoard) {
      const userRole = currentBoard.collaborators.find(c => c.id === user.id)?.role;
      if (userRole === 'observer') return;
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
                id: Date.now().toString(),
                color: 'rgb(98, 100, 119)' // Default color for new tasks (red)
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
                        username: user.username || user.email.split('@')[0],
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

    // Update the selected task's comments
    if (selectedTask && selectedTask.listIndex === listIndex && selectedTask.taskIndex === taskIndex) {
      setSelectedTask(prev => ({
        ...prev,
        task: {
          ...prev.task,
          comments: [...(prev.task.comments || []), {
            id: Date.now().toString(),
            text: comment,
            userId: user.id,
            userEmail: user.email,
            username: user.username || user.email.split('@')[0],
            createdAt: Date.now()
          }]
        }
      }));
    }
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

    // Update the selected task's comments
    if (selectedTask && selectedTask.listIndex === listIndex && selectedTask.taskIndex === taskIndex) {
      setSelectedTask(prev => ({
        ...prev,
        task: {
          ...prev.task,
          comments: prev.task.comments.filter(c => c.id !== commentId)
        }
      }));
    }
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

      const newSharedBoards = [...sharedBoards];
      const [movedBoard] = newSharedBoards.splice(sharedFromIndex, 1);
      newSharedBoards.splice(sharedToIndex, 0, movedBoard);
      setSharedBoards(newSharedBoards);

      // Update the order
      const newSharedOrder = Array.from({ length: newSharedBoards.length }, (_, i) => i);
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
      const newBoards = [...boards];
      const [movedBoard] = newBoards.splice(fromIndex, 1);
      newBoards.splice(toIndex, 0, movedBoard);
      setBoards(newBoards);

      // Update the order
      const newOwnedOrder = Array.from({ length: newBoards.length }, (_, i) => i);
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

    // Force a refresh of the board effects
    setForceUpdate(prev => prev + 1);
  };

  // Function to get ordered boards
  const getOrderedBoards = () => {
    return [...boards, ...sharedBoards];
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

    // Get owner's username from users array
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const ownerData = users.find(u => u.id === user.id);

    // Add board to collaborator's shared boards
    const collaboratorSharedBoards = JSON.parse(localStorage.getItem(`shared_boards_${collaborator.id}`) || '[]');
    const sharedBoardForCollaborator = {
      ...updatedBoard,
      ownerId: user.id,
      ownerEmail: user.email,
      ownerUsername: ownerData?.username || null,
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

  const moveTask = (fromListIndex, toListIndex, fromTaskIndex, toTaskIndex) => {
    const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];

    // Check if user is an observer
    if (isSharedBoard) {
      const userRole = currentBoard.collaborators.find(c => c.id === user.id)?.role;
      if (userRole === 'observer') {
        return; // Observers cannot move tasks
      }
    }

    const updatedBoard = {
      ...currentBoard,
      lists: currentBoard.lists.map((list, idx) => {
        if (idx === fromListIndex && idx === toListIndex) {
          // Reordering within the same list
          const tasks = [...list.tasks];
          const [movedTask] = tasks.splice(fromTaskIndex, 1);
          tasks.splice(toTaskIndex, 0, movedTask);
          return { ...list, tasks };
        } else if (idx === fromListIndex) {
          // Remove task from source list
          return {
            ...list,
            tasks: list.tasks.filter((_, i) => i !== fromTaskIndex)
          };
        } else if (idx === toListIndex) {
          // Add task to target list
          const taskToMove = currentBoard.lists[fromListIndex].tasks[fromTaskIndex];
          const tasks = [...list.tasks];
          tasks.splice(toTaskIndex, 0, taskToMove);
          return { ...list, tasks };
        }
        return list;
      })
    };
    syncBoardChanges(updatedBoard, isSharedBoard);
  };

  const handleEditClick = (e, listIndex, taskIndex, task) => {
    e.stopPropagation();
    setIsCommentView(false);
    const taskElement = e.currentTarget.closest('.task');
    const rect = taskElement.getBoundingClientRect();
    
    // Calculate position to center the modal relative to the task
    const modalWidth = rect.width + 24;
    const modalPadding = 16;
    const taskPreviewPadding = 16;
    const verticalOffset = 20;
    
    const leftPosition = rect.left - (modalWidth - rect.width) / 2 - 2;
    
    setModalPosition({
      x: leftPosition - modalPadding,
      y: rect.top - modalPadding - taskPreviewPadding + verticalOffset
    });
    
    setSelectedTask({ 
      listIndex, 
      taskIndex, 
      task,
      taskRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    });
    setEditingTitle(task.text);
    setEditingTaskId(task.id);

    // Set initial height after a small delay to ensure the textarea is rendered
    setTimeout(() => {
      const textarea = document.querySelector('.task-title-edit');
      if (textarea) {
        autoResizeTextarea(textarea);
      }
    }, 0);
  };

  const handleCommentsClick = (e, listIndex, taskIndex, task) => {
    e.stopPropagation();
    setIsCommentView(true);
    const taskElement = e.currentTarget.closest('.task');
    const rect = taskElement.getBoundingClientRect();
    
    const modalWidth = rect.width + 24;
    const modalPadding = 16;
    const taskPreviewPadding = 16;
    const verticalOffset = 24;
    
    const leftPosition = rect.left - (modalWidth - rect.width) / 2 - 2;
    
    setModalPosition({
      x: leftPosition - modalPadding,
      y: rect.top - modalPadding - taskPreviewPadding + verticalOffset
    });
    
    setSelectedTask({ 
      listIndex, 
      taskIndex, 
      task,
      taskRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    });
  };

  // Add effect to handle initial textarea height when editing starts
  useEffect(() => {
    if (editingTaskId) {
      const textarea = document.querySelector('.task-title-edit');
      if (textarea) {
        autoResizeTextarea(textarea);
      }
    }
  }, [editingTaskId]);

  // Add effect to handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (selectedTask) {
        const modalElement = document.querySelector('.task-modal');
        if (modalElement) {
          const rect = modalElement.getBoundingClientRect();
          const modalWidth = 320;
          const modalHeight = 400;
          const padding = 20;

          let x = modalPosition.x;
          let y = modalPosition.y;

          // Check right edge
          if (x + modalWidth > window.innerWidth - padding) {
            x = window.innerWidth - modalWidth - padding;
          }

          // Check bottom edge
          if (y + modalHeight > window.innerHeight - padding) {
            y = Math.max(padding, window.innerHeight - modalHeight - padding);
          }

          // Check top edge
          if (y < padding) {
            y = padding;
          }

          setModalPosition({ x, y });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedTask, modalPosition]);

  const handleAddTaskClick = (listIndex) => {
    setAddingTaskToList(listIndex);
    setNewTaskText('');
  };

  const handleAddTaskSubmit = (listIndex) => {
    if (newTaskText.trim()) {
      addTask(listIndex, newTaskText);
    }
    setAddingTaskToList(null);
    setNewTaskText('');
  };

  const handleAddTaskCancel = () => {
    setAddingTaskToList(null);
    setNewTaskText('');
  };

  // Add click outside listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (taskInputRef.current && !taskInputRef.current.contains(event.target)) {
        setAddingTaskToList(null);
        setNewTaskText('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add this function to handle menu visibility
  const handleContextMenu = (listIndex, e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      listIndex,
      visible: true
    });
  };

  // Add this effect to handle clicking outside the menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.list-menu-btn')) {
        setContextMenu({ listIndex: null, visible: false });
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const copyList = (listIndex, newName) => {
    const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];
    const listToCopy = currentBoard.lists[listIndex];
    
    const copiedList = {
      ...listToCopy,
      title: newName,
      tasks: listToCopy.tasks.map(task => ({
        ...task,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      }))
    };

    const updatedBoard = {
      ...currentBoard,
      lists: [
        ...currentBoard.lists.slice(0, listIndex + 1),
        copiedList,
        ...currentBoard.lists.slice(listIndex + 1)
      ]
    };

    syncBoardChanges(updatedBoard, isSharedBoard);
  };

  return (
    <div className="app-container" key={forceUpdate}>
      <div className="sidebar">
        <div 
          className="header clickable"
          onClick={() => navigate('/profile')}
        >
          <div className="header-content">
            <div 
              className="profile-avatar small"
              style={{
                backgroundImage: user.profilePicture ? `url(${user.profilePicture})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                fontSize: 0,
                pointerEvents: 'none'
              }}
            >
              {!user.profilePicture && (user.username ? user.username[0].toUpperCase() : user.email[0].toUpperCase())}
            </div>
            <h1>Witaj, {user.username || user.email}</h1>
          </div>
        </div>
        <div className="boards-navigation">
          <div className="board-tabs">
            {getOrderedBoards().map((board, index) => {
              if (!board) return null;
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
                    cleanupDragStates();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('drag-over');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX;
                    const y = e.clientY;
                    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
                      e.currentTarget.classList.remove('drag-over');
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    cleanupDragStates();
                    
                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    const toIndex = index;
                    
                    if (fromIndex !== toIndex) {
                      // Determine if we're moving between owned and shared boards
                      const isFromShared = fromIndex >= boards.length;
                      const isToShared = toIndex >= boards.length;
                      
                      // Only allow reordering within the same section (owned or shared)
                      if (isFromShared === isToShared) {
                        if (isFromShared) {
                          // Reordering shared boards
                          const sharedFromIndex = fromIndex - boards.length;
                          const sharedToIndex = toIndex - boards.length;
                          
                          // Update the shared boards array
                          const newSharedBoards = [...sharedBoards];
                          const [movedBoard] = newSharedBoards.splice(sharedFromIndex, 1);
                          newSharedBoards.splice(sharedToIndex, 0, movedBoard);
                          setSharedBoards(newSharedBoards);
                          
                          // Update the order
                          const newSharedOrder = Array.from({ length: newSharedBoards.length }, (_, i) => i);
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
                          // Reordering owned boards
                          // Update the boards array
                          const newBoards = [...boards];
                          const [movedBoard] = newBoards.splice(fromIndex, 1);
                          newBoards.splice(toIndex, 0, movedBoard);
                          setBoards(newBoards);
                          
                          // Update the order
                          const newOwnedOrder = Array.from({ length: newBoards.length }, (_, i) => i);
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
                      }
                    }
                  }}
                >
                  <div className="board-tab-content">
                    <span>{board.title}</span>
                    {isSharedBoard && board.ownerEmail && (
                      <span className="shared-label">
                        {board.ownerUsername || board.ownerEmail}
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
      </div>

      <div className="main-content">
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
                    cleanupDragStates();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    const taskData = e.dataTransfer.getData('application/json');
                    if (taskData) {
                      const { fromListIndex, fromTaskIndex } = JSON.parse(taskData);
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY;
                      const tasks = e.currentTarget.querySelectorAll('.task');
                      
                      // Remove existing indicators
                      tasks.forEach(task => task.classList.remove('drag-over-top', 'drag-over-bottom'));
                      
                      // Find the task under the cursor
                      let targetTask = null;
                      let targetIndex = -1;
                      
                      tasks.forEach((task, index) => {
                        const taskRect = task.getBoundingClientRect();
                        if (y >= taskRect.top && y <= taskRect.bottom) {
                          targetTask = task;
                          targetIndex = index;
                        }
                      });
                      
                      if (targetTask) {
                        const taskRect = targetTask.getBoundingClientRect();
                        const threshold = taskRect.top + taskRect.height / 2;
                        
                        if (y < threshold) {
                          targetTask.classList.add('drag-over-top');
                        } else {
                          targetTask.classList.add('drag-over-bottom');
                        }
                      }
                    }
                    e.currentTarget.classList.add('drag-over');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX;
                    const y = e.clientY;
                    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
                      e.currentTarget.classList.remove('drag-over');
                      e.currentTarget.querySelectorAll('.task').forEach(task => {
                        task.classList.remove('drag-over-top', 'drag-over-bottom');
                      });
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    cleanupDragStates();
                    
                    const taskData = e.dataTransfer.getData('application/json');
                    if (taskData) {
                      const { fromListIndex, fromTaskIndex } = JSON.parse(taskData);
                      const y = e.clientY;
                      const tasks = e.currentTarget.querySelectorAll('.task');
                      
                      // Find the task under the cursor
                      let targetIndex = -1;
                      let dropPosition = 'bottom';
                      
                      tasks.forEach((task, index) => {
                        const taskRect = task.getBoundingClientRect();
                        if (y >= taskRect.top && y <= taskRect.bottom) {
                          targetIndex = index;
                          const threshold = taskRect.top + taskRect.height / 2;
                          dropPosition = y < threshold ? 'top' : 'bottom';
                        }
                      });
                      
                      if (targetIndex === -1) {
                        // Drop at the end of the list
                        targetIndex = tasks.length;
                      }
                      
                      // Adjust target index based on drop position
                      if (dropPosition === 'bottom' && targetIndex < tasks.length) {
                        targetIndex++;
                      }
                      
                      // Only move if it's a different position
                      if (fromListIndex !== listIndex || fromTaskIndex !== targetIndex) {
                        moveTask(fromListIndex, listIndex, fromTaskIndex, targetIndex);
                      }
                    } else {
                      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                      const toIndex = listIndex;
                      if (fromIndex !== toIndex) {
                        moveList(fromIndex, toIndex);
                      }
                    }
                  }}
                >
                  <div className="list-header">
                    <input
                      type="text"
                      className="list-title-input"
                      value={list.title}
                      onChange={(e) => {
                        const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];
                        const updatedBoard = {
                          ...currentBoard,
                          lists: currentBoard.lists.map((l, idx) =>
                            idx === listIndex
                              ? { ...l, title: e.target.value }
                              : l
                          )
                        };
                        syncBoardChanges(updatedBoard, isSharedBoard);
                      }}
                      maxLength="20"
                      disabled={isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role === 'observer'}
                    />
                    {(!isSharedBoard || (isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role !== 'observer')) && (
                      <div style={{ position: 'relative' }}>
                        <button 
                          className="list-menu-btn"
                          onClick={(e) => handleContextMenu(listIndex, e)}
                        >
                          •••
                        </button>
                        {contextMenu.visible && contextMenu.listIndex === listIndex && (
                          <div className="list-context-menu">
                            <button 
                              className="list-context-menu-item"
                              onClick={() => {
                                const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];
                                setNewListName(currentBoard.lists[listIndex].title);
                                setCopyListModal({ visible: true, listIndex });
                                setContextMenu({ listIndex: null, visible: false });
                              }}
                            >
                              <span className="icon">⧉</span>
                              Kopiuj
                            </button>
                            <button 
                              className="list-context-menu-item delete"
                              onClick={() => {
                                removeList(listIndex);
                                setContextMenu({ listIndex: null, visible: false });
                              }}
                            >
                              <span className="icon">×</span>
                              Usuń
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <ul className="task-list">
                    {list.tasks.map((task, taskIndex) => (
                      <li 
                        key={taskIndex} 
                        className={`task ${task.completed ? 'completed' : ''}`}
                        draggable={!isSharedBoard || (isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role !== 'observer')}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify({
                            fromListIndex: listIndex,
                            fromTaskIndex: taskIndex
                          }));
                          e.currentTarget.classList.add('dragging');
                        }}
                        onDragEnd={(e) => {
                          cleanupDragStates();
                        }}
                        style={{ backgroundColor: task.color || '#ffffff' }}
                        onClick={(e) => {
                          if (!e.target.classList.contains('task-checkbox') && !e.target.classList.contains('edit-task-btn')) {
                            handleCommentsClick(e, listIndex, taskIndex, task);
                          }
                        }}
                      >
                        <div className="task-title">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleTaskCompletion(listIndex, taskIndex)}
                            disabled={isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role === 'observer'}
                            className="task-checkbox"
                            onClick={(e) => e.stopPropagation()}
                          />
                          {editingTaskId === task.id ? (
                            <textarea
                              className="task-title-edit"
                              value={editingTitle}
                              onChange={(e) => handleTextareaChange(e, setEditingTitle)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  updateTaskTitle(listIndex, taskIndex, editingTitle);
                                  setEditingTaskId(null);
                                  e.stopPropagation();
                                } else if (e.key === 'Escape') {
                                  setEditingTaskId(null);
                                  e.stopPropagation();
                                }
                              }}
                              onBlur={() => {
                                if (editingTitle.trim()) {
                                  updateTaskTitle(listIndex, taskIndex, editingTitle);
                                }
                                setEditingTaskId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              maxLength={60}
                              rows={1}
                              spellCheck="false"
                              style={{ 
                                resize: 'none',
                                overflow: 'hidden',
                                minHeight: '20px',
                                height: 'auto'
                              }}
                            />
                          ) : (
                            <span style={{ 
                              whiteSpace: 'pre-wrap',
                              wordWrap: 'break-word',
                              display: 'block',
                              width: '100%',
                              maxWidth: '220px',
                              paddingRight: '2px',
                              lineHeight: '1.4'
                            }}>{task.text}</span>
                          )}
                          {(!isSharedBoard || (isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role !== 'observer')) && (
                            <div className="task-buttons">
                              <button 
                                className="edit-task-btn"
                                onClick={(e) => handleEditClick(e, listIndex, taskIndex, task)}
                              >
                                Edytuj
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                    {addingTaskToList === listIndex ? (
                      <div className="task-input-container" ref={taskInputRef}>
                        <input
                          className="task-input"
                          placeholder="Nowe zadanie"
                          value={newTaskText}
                          onChange={(e) => setNewTaskText(e.target.value)}
                          maxLength={31}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleAddTaskSubmit(listIndex);
                            } else if (e.key === "Escape") {
                              handleAddTaskCancel();
                            }
                          }}
                        />
                      </div>
                    ) : (
                      (!isSharedBoard || (isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role !== 'observer')) && (
                        <button
                          className="add-task-btn"
                          onClick={() => handleAddTaskClick(listIndex)}
                        >
                          <span>+</span> Dodaj zadanie
                        </button>
                      )
                    )}
                  </ul>
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
          <div 
            className="modal-overlay" 
            onClick={() => setSelectedTask(null)}
          >
            <div 
              className="task-modal" 
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: modalPosition.y,
                left: modalPosition.x,
                width: selectedTask.taskRect.width + 24
              }}
            >
              {!isCommentView ? (
                <>
                  {/* Edited Task Preview */}
                  <div className="edited-task-preview">
                    <div 
                      className="task" 
                      style={{ 
                        backgroundColor: selectedTask.task.color || '#ffffff',
                        width: selectedTask.taskRect.width
                      }}
                    >
                      <div className="task-title">
                        <input
                          type="checkbox"
                          checked={selectedTask.task.completed}
                          onChange={() => toggleTaskCompletion(selectedTask.listIndex, selectedTask.taskIndex)}
                          disabled={isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role === 'observer'}
                          className="task-checkbox"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <textarea
                          className="task-title-edit"
                          value={editingTitle}
                          onChange={(e) => handleTextareaChange(e, setEditingTitle)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              updateTaskTitle(selectedTask.listIndex, selectedTask.taskIndex, editingTitle);
                            } else if (e.key === 'Escape') {
                              setSelectedTask(null);
                            }
                          }}
                          onBlur={() => {
                            if (editingTitle.trim()) {
                              updateTaskTitle(selectedTask.listIndex, selectedTask.taskIndex, editingTitle);
                            }
                          }}
                          autoFocus
                          maxLength={60}
                          rows={1}
                          spellCheck="false"
                          style={{ 
                            resize: 'none',
                            overflow: 'hidden',
                            minHeight: '20px',
                            height: 'auto'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Color Picker Section */}
                  {(!isSharedBoard || (isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role !== 'observer')) && (
                    <div className="task-color-picker">
                      <label>Kolor zadania:</label>
                      <div className="color-options">
                        <button 
                          className="color-option" 
                          style={{ backgroundColor: '#1D9C4E' }}
                          onClick={() => updateTaskColor(selectedTask.listIndex, selectedTask.taskIndex, '#1D9C4E')}
                        />
                        <button 
                          className="color-option" 
                          style={{ backgroundColor: '#E6A23C' }}
                          onClick={() => updateTaskColor(selectedTask.listIndex, selectedTask.taskIndex, '#E6A23C')}
                        />
                        <button 
                          className="color-option" 
                          style={{ backgroundColor: '#C24E1C' }}
                          onClick={() => updateTaskColor(selectedTask.listIndex, selectedTask.taskIndex, '#C24E1C')}
                        />
                        <button 
                          className="color-option" 
                          style={{ backgroundColor: '#CF3333' }}
                          onClick={() => updateTaskColor(selectedTask.listIndex, selectedTask.taskIndex, '#CF3333')}
                        />
                        <button 
                          className="color-option" 
                          style={{ backgroundColor: '#6B4EE6' }}
                          onClick={() => updateTaskColor(selectedTask.listIndex, selectedTask.taskIndex, '#6B4EE6')}
                        />
                        <button 
                          className="color-option" 
                          style={{ backgroundColor: '#2152D9' }}
                          onClick={() => updateTaskColor(selectedTask.listIndex, selectedTask.taskIndex, '#2152D9')}
                        />
                        <button 
                          className="color-option" 
                          style={{ backgroundColor: '#207B6E' }}
                          onClick={() => updateTaskColor(selectedTask.listIndex, selectedTask.taskIndex, '#207B6E')}
                        />
                        <button 
                          className="color-option" 
                          style={{ backgroundColor: '#5E7E1F' }}
                          onClick={() => updateTaskColor(selectedTask.listIndex, selectedTask.taskIndex, '#5E7E1F')}
                        />
                        <button 
                          className="color-option" 
                          style={{ backgroundColor: '#B44C97' }}
                          onClick={() => updateTaskColor(selectedTask.listIndex, selectedTask.taskIndex, '#B44C97')}
                        />
                        <button 
                          className="color-option" 
                          style={{ backgroundColor: '#626477' }}
                          onClick={() => updateTaskColor(selectedTask.listIndex, selectedTask.taskIndex, '#626477')}
                        />
                      </div>
                    </div>
                  )}

                  {/* Task Buttons */}
                  <div className="task-modal-buttons">
                    {(!isSharedBoard || (isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role !== 'observer')) && (
                      <button 
                        className="delete-task-btn"
                        onClick={() => {
                          removeTask(selectedTask.listIndex, selectedTask.taskIndex);
                          setSelectedTask(null);
                        }}
                      >
                        Usuń
                      </button>
                    )}
                    <button 
                      className="edit-task-btn"
                      onClick={() => setSelectedTask(null)}
                    >
                      Zamknij
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Comments Section */}
                  <div className="comments-section">
                    <div className="comments-header">
                      <h4>Komentarze</h4>
                      <button 
                        className="close-comments-btn"
                        onClick={() => setSelectedTask(null)}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="comments-list">
                      {selectedTask.task.comments?.map((comment) => (
                        <div key={comment.id} className="comment">
                          <div className="comment-header">
                            <span className="comment-author">{comment.username || comment.userEmail}</span>
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
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showCollaboratorModal && (
        <CollaboratorModal
          board={boards[currentBoardIndex]}
          onClose={() => setShowCollaboratorModal(false)}
          onAddCollaborator={handleAddCollaborator}
          onRemoveCollaborator={handleRemoveCollaborator}
          currentUser={user}
        />
      )}

      {copyListModal.visible && (
        <>
          <div className="copy-list-modal-overlay" onClick={() => setCopyListModal({ visible: false, listIndex: null })} />
          <div className="copy-list-modal">
            <h3>Nazwa nowej listy</h3>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Wprowadź nazwę listy"
              maxLength="20"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newListName.trim()) {
                  copyList(copyListModal.listIndex, newListName.trim());
                  setCopyListModal({ visible: false, listIndex: null });
                  setNewListName('');
                } else if (e.key === 'Escape') {
                  setCopyListModal({ visible: false, listIndex: null });
                  setNewListName('');
                }
              }}
            />
            <div className="copy-list-modal-buttons">
              <button 
                className="cancel"
                onClick={() => {
                  setCopyListModal({ visible: false, listIndex: null });
                  setNewListName('');
                }}
              >
                Anuluj
              </button>
              <button
                className="confirm"
                onClick={() => {
                  if (newListName.trim()) {
                    copyList(copyListModal.listIndex, newListName.trim());
                    setCopyListModal({ visible: false, listIndex: null });
                    setNewListName('');
                  }
                }}
              >
                Kopiuj
              </button>
            </div>
          </div>
        </>
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

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setUser(null);
  };

  return (
    <Router>
      {!user ? (
        <Routes>
          <Route path="*" element={<Auth onLogin={handleLogin} />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/" element={<TaskBoard user={user} onLogout={handleLogout} />} />
          <Route path="/profile" element={<Profile user={user} onLogout={handleLogout} />} />
        </Routes>
      )}
    </Router>
  );
};

export default App;