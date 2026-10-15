import Child from "./Child.jsx";

export default function Parent() {
  return (
    <div>
      <h1>Parent Components</h1>
      <Child name="Gopinath" age={22} />
      <Child name="Akshitha" age={20} />
    </div>
  );
}
