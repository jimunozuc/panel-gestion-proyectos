import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function useIniciativaData(num) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(`${API_URL}/api/iniciativas/${num}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status} al cargar los datos`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setState({ loading: false, error: null, data });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: err.message, data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [num, reloadTick]);

  const reload = () => setReloadTick((t) => t + 1);

  return { ...state, reload };
}

export function useMultipleIniciativaData(sheetIds) {
  const key = sheetIds.join(",");
  const [state, setState] = useState({ loading: true, dataById: {} });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, dataById: {} });
    Promise.all(
      sheetIds.map((id) =>
        fetch(`${API_URL}/api/iniciativas/${id}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => [id, data])
          .catch(() => [id, null])
      )
    ).then((entries) => {
      if (!cancelled) setState({ loading: false, dataById: Object.fromEntries(entries) });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
