import BackButton from "../components/BackButton.jsx";

export default function Personas() {
  return (
    <main className="page">
      <BackButton />
      <h1>Personas</h1>
      <img
        src="/personas-placeholder.svg"
        alt="Personas"
        className="personas-photo"
      />
    </main>
  );
}
