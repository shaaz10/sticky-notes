import { useState } from "react";
import "./Note.css";

export default function Note({ id, text, saved, update }) {
  const [val, setVal] = useState(text);

  const save = () => update(id, { text: val, saved: true });
  const edit = () => update(id, { saved: false });

  return (
    <div className="note">
      {saved ? (
        <p className="saved-text">{text}</p>
      ) : (
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Write here…"
        />
      )}

      <div className="btn-row">
        {saved ? (
          <button onClick={edit}>✏️ Edit</button>
        ) : (
          <button onClick={save}>💾 Save</button>
        )}
      </div>
    </div>
  );
}
