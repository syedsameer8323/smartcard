export default function Spinner({ fullPage = false }) {
  const el = <span className="spinner" role="status" aria-label="Loading" />;
  return fullPage ? <div className="fullpage-center">{el}</div> : el;
}
