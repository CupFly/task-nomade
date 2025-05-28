import React, { useState } from "react";
import "./App.css";

const initialLists = [
  { title: "Do zrobienia", tasks: ["Zadanie 1", "Zadanie 2"] },
  { title: "W toku", tasks: [] },
  { title: "Zrobione", tasks: [] },
];

const TaskBoard = () => {
  const [lists, setLists] = useState(initialLists);
  const [newListTitle, setNewListTitle] = useState("");

  const addTask = (listIndex, task) => {
    if (!task.trim()) return;
    const newLists = [...lists];
    newLists[listIndex].tasks.push(task);
    setLists(newLists);
  };

  const removeTask = (listIndex, taskIndex) => {
    const newLists = [...lists];
    newLists[listIndex].tasks.splice(taskIndex, 1);
    setLists(newLists);
  };

  const removeList = (listIndex) => {
    setLists(lists.filter((_, index) => index !== listIndex));
  };

  const addList = () => {
    if (!newListTitle.trim()) return;
    setLists([...lists, { title: newListTitle, tasks: [] }]);
    setNewListTitle("");
  };

  return (
    <div className="board">
      {lists.map((list, listIndex) => (
        <div className="list-table" key={listIndex}>
          <h3>
            {list.title} 
            <button onClick={() => removeList(listIndex)} className="remove-list-btn">
              Usuń listę
            </button>
          </h3>
          <ul className="task-list">
            {list.tasks.map((task, taskIndex) => (
              <li key={taskIndex} className="task">
                {task}
                <button onClick={() => removeTask(listIndex, taskIndex)}>
                  Usuń
                </button>
              </li>
            ))}
          </ul>
          <input
            className="task-input"
            placeholder="Nowe zadanie"
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask(listIndex, e.target.value);
            }}
          />
        </div>
      ))}
      <div className="list-table">
        <input
          className="list-input"
          placeholder="Nowa lista"
          value={newListTitle}
          onChange={(e) => setNewListTitle(e.target.value)}
          maxlength="20"
        />
        <button className="add-list-btn" onClick={addList}>
          Dodaj listę
        </button>
      </div>
    </div>
  );
};

export default TaskBoard;