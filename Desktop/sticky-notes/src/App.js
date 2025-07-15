import { useState, useEffect } from "react";
import Note from "./Note";
import "./App.css";

export default function App() {
  const [notes, setNotes] = useState([]);

  // load saved notes on startup
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("notes") || "[]");
    setNotes(saved);
  }, []);

  // save anytime notes change
  useEffect(() => {
    localStorage.setItem("notes", JSON.stringify(notes));
  }, [notes]);

  const addNote = () =>
    setNotes([...notes, { id: Date.now(), text: "", saved: false }]);

  const updateNote = (id, data) =>
    setNotes(notes.map((n) => (n.id === id ? { ...n, ...data } : n)));

  return (
    <div className="app">
      <button className="add-btn" onClick={addNote}>
        ➕ Add Note
      </button>

      {notes.map((n) => (
        <Note key={n.id} {...n} update={updateNote} />
      ))}
    </div>
  );
}
