# CyberSeeds


## Canon Integrity Guard

Run the guard locally before committing Snapshot or engine changes:

```bash
bash scripts/canon_guard.sh
```

The guard helps prevent:
- duplicate or shadow scoring functions outside the canonical engine path
- non-canonical Snapshot localStorage keys that can split persisted state
- deprecated scoring or storage module imports in active code
- accidental reintroduction of legacy scoring entrypoints
- drift that makes Snapshot results harder to reproduce consistently
