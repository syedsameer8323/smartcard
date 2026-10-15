import React, { useState } from "react";

function Component1() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h2>My First React Component</h2>

      <p>Count: {count}</p>

      <button onClick={() => setCount(count + 1)}>
        Click Me
      </button>

      <button onClick={() => setCount(0)}>
        Reset
      </button>
    </div>
  );
}

export default Component1;