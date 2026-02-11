// /engine/storage.js

export const SNAP_KEY = "cs_snapshot_latest";
export const HISTORY_KEY = "cs_snapshot_history";

export function saveSnapshot(entry){
  localStorage.setItem(SNAP_KEY, JSON.stringify(entry));

  const history = loadHistory();
  history.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0,24)));
}

export function loadHistory(){
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}
