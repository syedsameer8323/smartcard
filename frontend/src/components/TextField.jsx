// export default function TextField({ id, label, error, ...props }) {
//   return (
//     <div className="field">
//       <label htmlFor={id}>{label}</label>
//       <input id={id} name={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
//         className={error ? "has-error" : ""} {...props} />
//       {error && <p className="field-error" id={`${id}-err`}>{error}</p>}
//     </div>
//   );
// }

export default function TextField({ id, label, error, ...props }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type={props.type || "text"}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`input${error ? " has-error" : ""}`}
        {...props}
      />
      {error && <p className="field-error" id={`${id}-err`}>{error}</p>}
    </div>
  );
}
