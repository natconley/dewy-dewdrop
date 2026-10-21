import "./App.css";
import Dewy from "./components/dewy/dewy";
import { useEffect, useState } from "react";


function App() {

  const [introFinished, setIntroFinished] = useState(false);
  const [hasWaved, setHasWaved] = useState(false);
  const [hasPoked, setHasPoked] = useState(false);

   useEffect(() => {
        const timer = setTimeout(() => {
            setIntroFinished(true);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const hint = !introFinished
    ? "Hi, I'm Dewy!"
    : !hasWaved
      ? "Wave hello!"
      : !hasPoked
        ? "Give me a poke!"
        : "Hehe!";

  return (
    <main className="app">
      <div className="dewy-wrapper">
        <p className="dewy-hint">
          {hint}
        </p>
        <Dewy onWave={() => setHasWaved(true)} onPoke={() => setHasPoked(true)} />
      </div>
    </main>
  );
}

export default App;