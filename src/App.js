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
  const [boardContextMenu, setBoardContextMenu] = useState({ boardIndex: null, visible: false });
  const [listContextMenu, setListContextMenu] = useState({ listIndex: null, visible: false });
  const fileInputRef = useRef(null);
  const [users] = useState(() => JSON.parse(localStorage.getItem('users') || '[]'));
  const [boardEditPanel, setBoardEditPanel] = useState({ visible: false, boardIndex: null });
  const [showNewBoardPanel, setShowNewBoardPanel] = useState(false);
  const newListInputRef = useRef(null);
  const [editingListTitle, setEditingListTitle] = useState({ index: null, previousTitle: '' });
  const [isNewList, setIsNewList] = useState(false);
  const boardRef = useRef(null);
  const [editingDescription, setEditingDescription] = useState('');
  const descriptionTextareaRef = useRef(null);

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
      list.classList.remove('drag-over-left');
      list.classList.remove('drag-over-right');
    });
    document.querySelectorAll('.task').forEach(task => {
      task.classList.remove('dragging');
      task.classList.remove('drag-over-top');
      task.classList.remove('drag-over-bottom');
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
          lastModified: Date.now(),
          backgroundImage: null
        }
      ];
      setBoards(defaultBoards);
      localStorage.setItem(`boards_${user.id}`, JSON.stringify(defaultBoards));
    }

    // Update existing shared boards with owner usernames
    const savedSharedBoards = localStorage.getItem(`shared_boards_${user.id}`);
    if (savedSharedBoards) {
      const sharedBoards = JSON.parse(savedSharedBoards);
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
  }, [user.id, users]);

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
  }, [boards, user.id, users]);

  // Save boards whenever they change
  useEffect(() => {
    if (boards.length > 0) {
      localStorage.setItem(`boards_${user.id}`, JSON.stringify(boards));
    }
  }, [boards, user.id]);

  // Save shared boards whenever they change
  useEffect(() => {
    if (sharedBoards.length > 0) {
      localStorage.setItem(`shared_boards_${user.id}`, JSON.stringify(sharedBoards));
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
        board.title === updatedBoard.title ? {
          ...updatedBoard,
          backgroundImage: updatedBoard.backgroundImage || board.backgroundImage
        } : board
      );
      setSharedBoards(newSharedBoards);
      localStorage.setItem(`shared_boards_${user.id}`, JSON.stringify(newSharedBoards));

      // Sync with owner's board
      const owner = users.find(u => u.id === updatedBoard.ownerId);
      if (owner) {
        const ownerBoards = JSON.parse(localStorage.getItem(`boards_${owner.id}`) || '[]');
        const updatedOwnerBoards = ownerBoards.map(board =>
          board.title === updatedBoard.title ? {
            ...updatedBoard,
            backgroundImage: updatedBoard.backgroundImage || board.backgroundImage
          } : board
        );
        localStorage.setItem(`boards_${owner.id}`, JSON.stringify(updatedOwnerBoards));
      }
    } else {
      // Update in user's boards
      const newBoards = boards.map(board =>
        board.title === updatedBoard.title ? {
          ...updatedBoard,
          backgroundImage: updatedBoard.backgroundImage || board.backgroundImage
        } : board
      );
      setBoards(newBoards);
      localStorage.setItem(`boards_${user.id}`, JSON.stringify(newBoards));

      // Sync with all collaborators
      updatedBoard.collaborators?.forEach(collaborator => {
        const collaboratorBoards = JSON.parse(localStorage.getItem(`shared_boards_${collaborator.id}`) || '[]');
        const updatedCollaboratorBoards = collaboratorBoards.map(board =>
          board.title === updatedBoard.title ? {
            ...updatedBoard,
            backgroundImage: updatedBoard.backgroundImage || board.backgroundImage
          } : board
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

    // Zapobiegaj dodawaniu zadań przez obserwatorów w udostępnionych tablicach
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

    // Zapobiegaj edycji tytułów w udostępnionych tablicach
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
   * Tworzenie zadań
   * - Nowe zadania są tworzone z domyślnym szarym tłem (rgb(98, 100, 119))
   * - Każde zadanie ma unikalny identyfikator oparty na znaczniku czasu
   * - Zadania zawierają wsparcie dla:
   *   - Niestandardowych kolorów
   *   - Edytowalnych tytułów
   *   - Komentarzy
   *   - Statusu ukończenia
   */
  const addTask = (listIndex, task) => {
    if (!task.trim()) return;
    
    const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];

    // Zapobiegaj dodawaniu zadań przez obserwatorów w udostępnionych tablicach
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
                description: '',
                completed: false,
                createdAt: Date.now(),
                comments: [],
                id: Date.now().toString(),
                color: 'rgb(98, 100, 119)' // Default color for new tasks
              }] 
            }
          : list
      )
    };
    syncBoardChanges(updatedBoard, isSharedBoard);
  };

  const updateTaskDescription = (listIndex, taskIndex, newDescription) => {
    const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];

    // Prevent observers from editing descriptions in shared boards
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
                  ? { ...task, description: newDescription }
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
        task: { ...prev.task, description: newDescription }
      }));
    }
  };

  const addComment = (listIndex, taskIndex, comment) => {
    if (!comment.trim()) return;

    const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];

    // Sprawdź, czy użytkownik jest obserwatorem
    if (isSharedBoard) {
      const userRole = currentBoard.collaborators.find(c => c.id === user.id)?.role;
      if (userRole === 'observer') {
        return; // Obserwatorzy nie mogą dodawać komentarzy
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

    // Aktualizuj komentarze wybranego zadania
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

    // Tylko autor komentarza lub właściciel tablicy może usuwać komentarze
    const comment = currentBoard.lists[listIndex].tasks[taskIndex].comments.find(c => c.id === commentId);
    if (isSharedBoard && comment.userId !== user.id && currentBoard.ownerId !== user.id) {
      return; // Tylko autor komentarza lub właściciel tablicy może usuwać komentarze
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

    // Calculate the new scroll position before removing the list
    if (boardRef.current) {
      const board = boardRef.current;
      const currentScroll = board.scrollLeft;
      const listWidth = 320; // Standard list width
      const margin = 8; // List margin
      const newScrollPosition = Math.max(0, currentScroll - (listWidth + margin));
      
      // First update the scroll position smoothly
      board.scrollTo({
        left: newScrollPosition,
        behavior: 'smooth'
      });
    }

    // Remove the list after a longer delay to ensure smooth scrolling completes
    setTimeout(() => {
      const updatedBoard = {
        ...currentBoard,
        lists: currentBoard.lists.filter((_, idx) => idx !== listIndex)
      };
      syncBoardChanges(updatedBoard, isSharedBoard);
    }, 300);
  };

  const addList = (initialTitle = '') => {
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
      lists: [...currentBoard.lists, { title: initialTitle, tasks: [], order: currentBoard.lists.length }]
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
      lastModified: Date.now(),
      backgroundImage: null
    };
    setBoards([...boards, newBoard]);
    localStorage.setItem(`boards_${user.id}`, JSON.stringify([...boards, newBoard]));
    setNewBoardTitle("");
  };

  // Get ordered boards
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
    const allBoards = getOrderedBoards();
    const boardToLeave = allBoards[boardIndex];
    
    // Check if it's a shared board
    if (!boardToLeave || boardIndex < boards.length) {
      console.error('Invalid board index for leaving a shared board');
      return;
    }

    const sharedBoardIndex = boardIndex - boards.length;
    
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

      // Remove board from user's shared boards
      const newSharedBoards = sharedBoards.filter((_, index) => index !== sharedBoardIndex);
      setSharedBoards(newSharedBoards);
      localStorage.setItem(`shared_boards_${user.id}`, JSON.stringify(newSharedBoards));

      // Switch to first available board if current board is being left
      if (currentBoardIndex === boardIndex) {
        setCurrentBoardIndex(0);
      } else if (currentBoardIndex > boardIndex) {
        // Adjust current board index if we're leaving a board that comes before the current one
        setCurrentBoardIndex(currentBoardIndex - 1);
      }

      // Force update the collaborator modal if it's open
      setForceUpdate(prev => prev + 1);
    } catch (error) {
      console.error('Error leaving board:', error);
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
    
    // Oblicz pozycję, aby wyśrodkować modal względem zadania
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

    // Ustaw początkową wysokość po małym opóźnieniu, aby upewnić się, że textarea jest wyrenderowana
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
    setEditingDescription(task.description || '');
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

  // Handle board menu visibility
  const handleBoardEditClick = (boardIndex, e) => {
    e.preventDefault();
    e.stopPropagation();
    setBoardEditPanel({
      visible: true,
      boardIndex
    });
  };

  // Add handler to close the edit panel
  const handleCloseBoardEdit = () => {
    setBoardEditPanel({ visible: false, boardIndex: null });
  };

  // Update the click outside handler to include the edit panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only close if clicking the overlay
      if (event.target.classList.contains('board-edit-overlay')) {
        setBoardEditPanel({ visible: false, boardIndex: null });
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Handle list menu visibility
  const handleListContextMenu = (listIndex, e) => {
    e.preventDefault();
    e.stopPropagation();
    setListContextMenu({
      listIndex,
      visible: true
    });
  };

  // Add click outside listeners for both menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.board-menu-btn')) {
        setBoardContextMenu({ boardIndex: null, visible: false });
      }
      if (!event.target.closest('.list-menu-btn')) {
        setListContextMenu({ listIndex: null, visible: false });
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const copyList = (listIndex) => {
    const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];
    const listToCopy = currentBoard.lists[listIndex];
    
    const copiedList = {
      ...listToCopy,
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
    
    // Set the editing state before setting isNewList
    setEditingListTitle({ index: listIndex + 1, previousTitle: listToCopy.title });
    
    // Use a small timeout to ensure the DOM has updated
    setTimeout(() => {
      setIsNewList(true);
      if (newListInputRef.current) {
        newListInputRef.current.focus();
      }
    }, 0);
  };

  // Add background image state
  const handleBackgroundChange = () => {
    // Only allow background changes for owned boards
    if (isSharedBoard) return;
    
    // Store the selected board index for later use
    const selectedBoardIndex = boardEditPanel.boardIndex;
    const fileInput = fileInputRef.current;
    
    if (fileInput) {
      fileInput.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const imageUrl = e.target?.result;
            if (imageUrl) {
              const updatedBoard = {
                ...boards[selectedBoardIndex],
                backgroundImage: imageUrl
              };
              
              const newBoards = boards.map((board, index) =>
                index === selectedBoardIndex ? updatedBoard : board
              );
              setBoards(newBoards);
              localStorage.setItem(`boards_${user.id}`, JSON.stringify(newBoards));
            }
          };
          reader.readAsDataURL(file);
        }
      };
      fileInput.click();
    }
  };

  const handleResetBackground = () => {
    // Only allow background reset for owned boards
    if (isSharedBoard) return;
    
    const selectedBoardIndex = boardEditPanel.boardIndex;
    const updatedBoard = {
      ...boards[selectedBoardIndex],
      backgroundImage: null
    };
    
    const newBoards = boards.map((board, index) =>
      index === selectedBoardIndex ? updatedBoard : board
    );
    setBoards(newBoards);
    localStorage.setItem(`boards_${user.id}`, JSON.stringify(newBoards));

    // Reset the file input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e) => {
    // Only allow file selection for owned boards
    if (isSharedBoard) return;
    
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result;
        if (imageUrl) {
          const updatedBoard = {
            ...currentBoard,
            backgroundImage: imageUrl
          };
          
            const newBoards = boards.map((board, index) =>
              index === currentBoardIndex ? updatedBoard : board
            );
            setBoards(newBoards);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragStart = (e, listIndex, taskIndex) => {
    if (taskIndex !== undefined) {
      // Task dragging
      e.dataTransfer.setData('application/json', JSON.stringify({
        fromListIndex: listIndex,
        fromTaskIndex: taskIndex
      }));
      e.currentTarget.classList.add('dragging');
    } else {
      // List dragging
      e.dataTransfer.setData('text/plain', listIndex.toString());
      e.currentTarget.classList.add('dragging');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    const list = e.currentTarget;
    
    const tasks = list.querySelectorAll('.task:not(.dragging)');
    const draggingTask = document.querySelector('.task.dragging');
    const draggingList = document.querySelector('.list-table.dragging');
    
    // Remove existing indicators from all lists and tasks first
    document.querySelectorAll('.list-table').forEach(l => {
      l.classList.remove('drag-over-left', 'drag-over-right');
    });
    tasks.forEach(task => {
      task.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    
    if (draggingTask) {
      // Skip if this is the new list button for task dragging
      if (list.classList.contains('new-list')) {
        return;
      }
      
      // Add drag-over class to list only when dragging tasks
      list.classList.add('drag-over');
      
      // For single task, check if we're above or below it
      if (tasks.length === 1) {
        const task = tasks[0];
        const box = task.getBoundingClientRect();
        const offset = e.clientY - box.top - box.height / 2;
        
        // Get the current task's position
        const currentTask = draggingTask.closest('.list-table')?.querySelectorAll('.task');
        const currentTaskIndex = currentTask ? Array.from(currentTask).indexOf(draggingTask) : -1;
        const targetTaskIndex = 0;
        
        // Only show indicators if we're not at the current position
        if (currentTaskIndex !== targetTaskIndex) {
          if (offset < 0) {
            task.classList.add('drag-over-top');
          } else {
            task.classList.add('drag-over-bottom');
          }
        }
      } else {
        const closestTask = [...tasks].reduce((closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = e.clientY - box.top - box.height / 2;
          
          if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
          } else {
            return closest;
          }
        }, { offset: Number.NEGATIVE_INFINITY }).element;

        if (closestTask) {
          // Check if we're closer to the top or bottom of the task
          const box = closestTask.getBoundingClientRect();
          const offset = e.clientY - box.top - box.height / 2;
          
          // Get the current task's position
          const currentTask = draggingTask.closest('.list-table')?.querySelectorAll('.task');
          const currentTaskIndex = currentTask ? Array.from(currentTask).indexOf(draggingTask) : -1;
          const targetTaskIndex = Array.from(tasks).indexOf(closestTask);
          
          // Only show indicators if we're not at the current position
          if (currentTaskIndex !== targetTaskIndex) {
            if (offset < 0) {
              closestTask.classList.add('drag-over-top');
            } else {
              closestTask.classList.add('drag-over-bottom');
            }
          }
        } else {
          // If no closest task found, we're at the end of the list
          const lastTask = tasks[tasks.length - 1];
          if (lastTask) {
            // Only show indicator if we're not already at the end
            const currentTask = draggingTask.closest('.list-table')?.querySelectorAll('.task');
            const currentTaskIndex = currentTask ? Array.from(currentTask).indexOf(draggingTask) : -1;
            if (currentTaskIndex !== tasks.length) {
              lastTask.classList.add('drag-over-bottom');
            }
          }
        }
      }
    } else if (draggingList) {
      // Handle list dragging
      const lists = document.querySelectorAll('.list-table:not(.dragging)');
      const closestList = [...lists].reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = e.clientX - box.left - box.width / 2;
        
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      }, { offset: Number.NEGATIVE_INFINITY }).element;

      if (closestList) {
        // Check if we're closer to the left or right of the list
        const box = closestList.getBoundingClientRect();
        const offset = e.clientX - box.left - box.width / 2;
        
        // Get the current list's position
        const currentListIndex = Array.from(document.querySelectorAll('.list-table')).indexOf(draggingList);
        const targetListIndex = Array.from(lists).indexOf(closestList);
        
        // Only show indicators if we're not at the current position
        if (currentListIndex !== targetListIndex) {
          if (offset < 0) {
            closestList.classList.add('drag-over-left');
          } else {
            closestList.classList.add('drag-over-right');
          }
        }
      } else {
        // If no closest list found, we're at the end
        const lastList = lists[lists.length - 1];
        if (lastList) {
          // Only show indicator if we're not already at the end
          const currentListIndex = Array.from(document.querySelectorAll('.list-table')).indexOf(draggingList);
          if (currentListIndex !== lists.length - 1) {
            lastList.classList.add('drag-over-right');
          }
        }
      }
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // Only remove indicators if we're actually leaving the element
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      e.currentTarget.classList.remove('drag-over');
      e.currentTarget.classList.remove('drag-over-left');
      e.currentTarget.classList.remove('drag-over-right');
      e.currentTarget.querySelectorAll('.task').forEach(task => {
        task.classList.remove('drag-over-top', 'drag-over-bottom');
      });
    }
  };

  const handleDrop = (e, listIndex) => {
    e.preventDefault();
    const taskData = e.dataTransfer.getData('application/json');
    
    if (taskData) {
      const { fromListIndex, fromTaskIndex } = JSON.parse(taskData);
      const tasks = e.currentTarget.querySelectorAll('.task:not(.dragging)');
      let dropIndex = tasks.length;
      
      const afterElement = [...tasks].reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = e.clientY - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      }, { offset: Number.NEGATIVE_INFINITY }).element;
      
      if (afterElement) {
        dropIndex = Array.from(tasks).indexOf(afterElement);
      }
      
      if (fromListIndex !== listIndex || fromTaskIndex !== dropIndex) {
        moveTask(fromListIndex, listIndex, fromTaskIndex, dropIndex);
      }
    } else {
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
      if (fromIndex !== listIndex) {
        moveList(fromIndex, listIndex);
      }
    }
    
    // Clean up drag states immediately after drop
    cleanupDragStates();
  };

  // Add effect to focus on new list input
  useEffect(() => {
    if (newListInputRef.current) {
      newListInputRef.current.focus();
    }
  }, [currentBoard?.lists.length]);

  // Add effect to scroll to new list
  useEffect(() => {
    if (boardRef.current && (isNewList || (editingListTitle.index !== null && editingListTitle.previousTitle === ''))) {
      const board = boardRef.current;
      const lists = board.querySelectorAll('.list-table');
      const targetIndex = editingListTitle.index !== null ? editingListTitle.index : lists.length - 1;
      const targetList = lists[targetIndex];
      
      if (targetList) {
        const listRect = targetList.getBoundingClientRect();
        const boardRect = board.getBoundingClientRect();
        const scrollLeft = board.scrollLeft + listRect.left - boardRect.left - (boardRect.width - listRect.width) / 2;
        
        board.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      }
    }
  }, [isNewList, editingListTitle.index, editingListTitle.previousTitle, currentBoard?.lists.length]);

  // Add function to adjust textarea height
  const adjustTextareaHeight = (textarea) => {
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  };

  // Effect to adjust height when description changes or modal opens
  useEffect(() => {
    if (selectedTask && descriptionTextareaRef.current) {
      adjustTextareaHeight(descriptionTextareaRef.current);
    }
  }, [selectedTask, editingDescription]);

  return (
    <div className="app-container" key={forceUpdate}>
      <div className="sidebar">
        <div className="app-header">
          <div className="app-title">Task Nomade</div>
        </div>
        
        <button 
          className="profile-button"
          onClick={() => navigate('/profile')}
        >
          <div className="profile-info">
            <div 
              className="profile-avatar small"
              style={{
                backgroundImage: user.profilePicture ? `url(${user.profilePicture})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {!user.profilePicture && (user.username ? user.username[0].toUpperCase() : user.email[0].toUpperCase())}
            </div>
            <h1>{user.username || user.email}</h1>
          </div>
        </button>

        <div className="boards-navigation">
          <div className="board-tabs">
            <div className="board-tabs-section">
              <div className="board-category">
                <span>Twoje tablice</span>
                <button
                  className="add-board-btn"
                  onClick={() => setShowNewBoardPanel(true)}
                >
                  +
                </button>
              </div>
              {boards.map((board, index) => (
                <div
                  key={`owned_${board.title}`}
                  className={`board-tab ${index === currentBoardIndex ? 'active' : ''}`}
                  onClick={() => setCurrentBoardIndex(index)}
                >
                  <div className="board-tab-content">
                    {board.backgroundImage ? (
                      <div 
                        className="background-icon"
                        style={{
                          backgroundImage: `url(${board.backgroundImage})`
                        }}
                      />
                    ) : (
                      <div className="background-icon" />
                    )}
                    <span className="board-title">{board.title}</span>
                  </div>
                  <div className="board-actions">
                      <button
                      className="board-menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBoardEditClick(index, e);
                        }}
                      >
                      •••
                      </button>
                  </div>
                </div>
              ))}
            </div>

            {sharedBoards.length > 0 && (
              <div className="board-tabs-section">
                <div className="board-category">Udostępnione tobie</div>
                {sharedBoards.map((board, index) => {
                  const boardIndex = index + boards.length;
                  return (
                    <div
                      key={`shared_${board.title}`}
                      className={`board-tab ${boardIndex === currentBoardIndex ? 'active' : ''}`}
                      onClick={() => setCurrentBoardIndex(boardIndex)}
                    >
                      <div className="board-tab-content">
                        {board.backgroundImage ? (
                          <div 
                            className="background-icon"
                            style={{
                              backgroundImage: `url(${board.backgroundImage})`
                            }}
                          />
                        ) : (
                          <div className="background-icon" />
                        )}
                        <span className="board-title">{board.title}</span>
                        <span className="shared-label">
                          {board.ownerUsername || board.ownerEmail}
                        </span>
                      </div>
                      <div className="board-actions">
                        <button
                          className="board-menu-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBoardEditClick(boardIndex, e);
                          }}
                        >
                          •••
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="main-content">
        {currentBoard && (
          <div 
            className="board" 
            ref={boardRef}
            style={{
              backgroundImage: currentBoard?.backgroundImage ? `url(${currentBoard.backgroundImage})` : null
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleFileSelect}
            />
            {currentBoard.lists.map((list, listIndex) => (
              <div 
                className="list-table" 
                key={listIndex}
                draggable={!isSharedBoard || (isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role !== 'observer')}
                onDragStart={(e) => handleDragStart(e, listIndex)}
                onDragEnd={cleanupDragStates}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, listIndex)}
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
                    onFocus={() => {
                      setEditingListTitle({ 
                        index: listIndex, 
                        previousTitle: list.title 
                      });
                    }}
                    onBlur={() => {
                      if (!list.title.trim()) {
                        if (isNewList && listIndex === currentBoard.lists.length - 1) {
                          // Remove the new list if title is empty
                          const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];
                          
                          // Calculate the new scroll position before removing the list
                          if (boardRef.current) {
                            const board = boardRef.current;
                            const currentScroll = board.scrollLeft;
                            const listWidth = 320; // Standard list width
                            const margin = 8; // List margin
                            const newScrollPosition = Math.max(0, currentScroll - (listWidth + margin));
                            
                            // First update the scroll position smoothly
                            board.scrollTo({
                              left: newScrollPosition,
                              behavior: 'smooth'
                            });
                          }

                          // Remove the list after a longer delay to ensure smooth scrolling completes
                          setTimeout(() => {
                            const updatedBoard = {
                              ...currentBoard,
                              lists: currentBoard.lists.slice(0, -1)
                            };
                            syncBoardChanges(updatedBoard, isSharedBoard);
                          }, 300);
                          
                          setIsNewList(false);
                        } else if (editingListTitle.index === listIndex) {
                          // Restore previous title for existing lists
                          const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];
                          const updatedBoard = {
                            ...currentBoard,
                            lists: currentBoard.lists.map((l, idx) =>
                              idx === listIndex
                                ? { ...l, title: editingListTitle.previousTitle }
                                : l
                            )
                          };
                          syncBoardChanges(updatedBoard, isSharedBoard);
                        }
                      }
                      setEditingListTitle({ index: null, previousTitle: '' });
                      setIsNewList(false);
                    }}
                    maxLength="20"
                    disabled={isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role === 'observer'}
                    ref={(isNewList && listIndex === currentBoard.lists.length - 1) || (!isNewList && editingListTitle.index === listIndex) ? newListInputRef : null}
                  />
                  {(!isSharedBoard || (isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role !== 'observer')) && (
                    <div style={{ position: 'relative' }}>
                      <button 
                        className="list-menu-btn"
                        onClick={(e) => handleListContextMenu(listIndex, e)}
                      >
                        •••
                      </button>
                      {listContextMenu.visible && listContextMenu.listIndex === listIndex && (
                        <div className="list-context-menu">
                          <button 
                            className="list-context-menu-item"
                            onClick={() => {
                              copyList(listIndex);
                              setListContextMenu({ listIndex: null, visible: false });
                            }}
                          >
                            <span className="icon">⧉</span>
                            Kopiuj
                          </button>
                          <button 
                            className="list-context-menu-item delete"
                            onClick={() => {
                              removeList(listIndex);
                              setListContextMenu({ listIndex: null, visible: false });
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
                      onDragStart={(e) => handleDragStart(e, listIndex, taskIndex)}
                      onDragEnd={cleanupDragStates}
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
              <div className="list-table new-list">
                <button 
                  className="add-list-trigger" 
                  onClick={() => {
                    const currentBoard = isSharedBoard ? sharedBoards[currentBoardIndex - boards.length] : boards[currentBoardIndex];
                    const updatedBoard = {
                      ...currentBoard,
                      lists: [...currentBoard.lists, { title: '', tasks: [], order: currentBoard.lists.length }]
                    };
                    syncBoardChanges(updatedBoard, isSharedBoard);
                    setIsNewList(true);
                  }}
                >
                  <span>╋</span> Dodaj nową listę
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
              className={`task-modal ${isCommentView ? 'comments-view' : ''}`}
              onClick={(e) => e.stopPropagation()}
              style={!isCommentView ? {
                top: modalPosition.y,
                left: modalPosition.x,
                width: selectedTask.taskRect.width + 24
              } : undefined}
            >
              {!isCommentView ? (
                <>
                  {/* Podgląd edytowanego zadania */}
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

                  {/* Sekcja wyboru koloru */}
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

                  {/* Przyciski zadania */}
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
                  {/* Sekcja komentarzy */}
                  <div className="comments-section">
                    <div 
                      className="comments-header"
                      style={{ backgroundColor: selectedTask.task.color || '#626477' }}
                    >
                      <h4>{selectedTask.task.text}</h4>
                      <button 
                        className="close-comments-btn"
                        onClick={() => setSelectedTask(null)}
                      >
                        ✕
                      </button>
                    </div>

                    <div className="modal-content">
                      <div className="task-description-container">
                        <label className="task-description-label">Opis</label>
                        <textarea
                          ref={descriptionTextareaRef}
                          className="task-description-edit"
                          value={editingDescription}
                          onChange={(e) => {
                            setEditingDescription(e.target.value);
                            adjustTextareaHeight(e.target);
                          }}
                          onBlur={() => {
                            updateTaskDescription(selectedTask.listIndex, selectedTask.taskIndex, editingDescription);
                          }}
                          placeholder="Add a description..."
                          rows={1}
                          disabled={isSharedBoard && currentBoard.collaborators.find(c => c.id === user.id)?.role === 'observer'}
                        />
                      </div>

                      <div className="comments-container">
                        <label className="task-description-label">Komentarze</label>
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
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showCollaboratorModal && currentBoardIndex < boards.length && (
        <CollaboratorModal
          board={boards[currentBoardIndex] || { collaborators: [] }}
          onClose={() => setShowCollaboratorModal(false)}
          onAddCollaborator={handleAddCollaborator}
          onRemoveCollaborator={handleRemoveCollaborator}
          currentUser={user}
        />
      )}

      {/* Add the board edit panel */}
      {boardEditPanel.visible && (
        <>
          <div className="board-edit-overlay" />
          <div className="board-edit-panel">
            <div className="board-edit-panel-header">
              <h3>Edycja tablicy</h3>
              <button 
                className="board-edit-panel-close"
                onClick={handleCloseBoardEdit}
              >
                ✕
              </button>
            </div>

            {/* Only show background section for owned boards */}
            {boardEditPanel.boardIndex < boards.length && (
              <div className="board-edit-section">
                <h4>Tło tablicy</h4>
                <div 
                  className="board-background-preview"
                  style={{
                    backgroundImage: allBoards[boardEditPanel.boardIndex]?.backgroundImage 
                      ? `url(${allBoards[boardEditPanel.boardIndex].backgroundImage})`
                      : null
                  }}
                >
                  {!allBoards[boardEditPanel.boardIndex]?.backgroundImage && 'Domyślne tło'}
                </div>
                <div className="board-background-actions">
                  <button onClick={() => {
                    handleBackgroundChange();
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    Zmień
                  </button>
                  <button onClick={() => {
                    handleResetBackground();
                  }}>
                    <span style={{ fontSize: '16px' }}>↺</span>
                    Reset
                  </button>
                </div>
              </div>
            )}

            <div className="board-edit-panel-footer">
              {boardEditPanel.boardIndex < boards.length && (
                <button 
                  onClick={() => {
                    handleCloseBoardEdit();
                    setShowCollaboratorModal(true);
                  }}
                >
                  Udostępnij tablicę
                </button>
              )}
              {boardEditPanel.boardIndex >= boards.length ? (
                <button 
                  className="danger"
                  onClick={() => {
                    handleLeaveBoard(boardEditPanel.boardIndex);
                    handleCloseBoardEdit();
                  }}
                >
                  Opuść tablicę
                </button>
              ) : boards.length > 1 && (
                <button 
                  className="danger"
                  onClick={() => {
                    removeBoard(boardEditPanel.boardIndex);
                    handleCloseBoardEdit();
                  }}
                >
                  Usuń tablicę
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* New Board Panel */}
      {showNewBoardPanel && (
        <>
          <div className="board-edit-overlay" onClick={() => setShowNewBoardPanel(false)} />
          <div className="new-board-panel">
            <div className="new-board-panel-header">
              <h3>Nowa tablica</h3>
              <button 
                className="new-board-panel-close"
                onClick={() => setShowNewBoardPanel(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="new-board-panel-content">
              <input
                type="text"
                className="new-board-input"
                placeholder="Nazwa tablicy"
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                maxLength="30"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newBoardTitle.trim()) {
                    addBoard();
                    setShowNewBoardPanel(false);
                  } else if (e.key === 'Escape') {
                    setShowNewBoardPanel(false);
                  }
                }}
              />
            </div>

            <div className="new-board-panel-footer">
              <button onClick={() => setShowNewBoardPanel(false)}>
                Anuluj
              </button>
              <button 
                className="primary"
                onClick={() => {
                  if (newBoardTitle.trim()) {
                    addBoard();
                    setShowNewBoardPanel(false);
                  }
                }}
              >
                Utwórz
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