import '/components/cyber-seeds-snapshot.js';

function mountSnapshotComponent() {
  if (document.querySelector('cyber-seeds-snapshot')) return;
  const component = document.createElement('cyber-seeds-snapshot');
  document.body.appendChild(component);
}

document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('startSnapshot');
  if (!startButton) return;

  mountSnapshotComponent();

  startButton.addEventListener('click', () => {
    document.querySelector('cyber-seeds-snapshot')?.open?.();
  });
});
