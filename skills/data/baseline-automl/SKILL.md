---
name: baseline-automl
description: Train a quick, honest baseline model on a table (predict churn, price, category) with guardrails — task detection, leakage and ID-column checks, stratified split, preprocessing pipeline, comparison against a dummy model, task-appropriate metrics and permutation importance, with an LLM only explaining the computed results. Use when a user asks "can we predict X from this data", "which features matter", or when building an AutoML button into a data product.
---

# Baseline AutoML

The goal is a trustworthy first answer, not a leaderboard. A random forest with sane preprocessing is a fine
baseline; what makes it trustworthy is the guardrails and the comparison with a model that knows nothing.

## Workflow

1. **Confirm the target and the question.** "Predict `churned` for active customers at signup time" fixes which
   columns are allowed (only those known at prediction time).
2. **Load with a row cap** for every source type (sample with a fixed seed; say so in the result). A capped CSV path
   next to an uncapped `SELECT *` from a database is how a button takes down a server.
3. **Prepare and guard** (below). Stop with a clear 4xx-style message when a guard fails.
4. **Detect the task** unless the user chose: non-numeric target → classification; numeric target with few distinct
   values relative to rows (e.g. `nunique <= 20 and nunique/rows < 0.05`) → classification; otherwise regression.
   Show the decision and let the user override it (a 3-class integer target in 30 rows looks like regression).
5. **Split** 80/20 with a fixed seed; stratify classification when every class has ≥2 rows. For time-ordered data
   use a time split (train on the past, test on the most recent period).
6. **Fit** a pipeline: numeric → median imputation + scaling; categorical → most-frequent imputation + one-hot
   (`handle_unknown="ignore"`, `max_categories=20`); model → random forest (fixed `random_state`).
7. **Compare with a dummy model** (`DummyClassifier(strategy="most_frequent")`, `DummyRegressor()`). Report both.
   A model that does not beat the dummy has learned nothing — say so plainly. (In testing, an imbalanced churn set
   gave 76% accuracy against a 78% majority-class baseline: "76% accurate" alone would have misled.)
8. **Metrics.** Classification: accuracy, weighted precision/recall/F1, the confusion matrix with the full label
   list (`labels=sorted(all classes)`, not only the classes present in the test split), class balance. Regression:
   R², MAE, RMSE, plus the dummy's MAE. Convert NaN/inf to null before serializing.
9. **Feature importance.** Prefer permutation importance on the pipeline's input columns (one value per original
   column, on the test set) over impurity importance of one-hot columns (`plan_pro`, `plan_team`), which is biased
   towards high-cardinality features and hard to explain.
10. **Explain.** Give the LLM the computed metrics, the dummy baseline, the dropped columns with reasons, and the
    top features; ask for a plain-language summary (what it predicts, how well compared to guessing, which features
    matter, caveats, next steps). The LLM never computes or chooses metrics.

## Guardrails

```python
def prepare(df, target):
    df = df.dropna(subset=[target])
    X, y = df.drop(columns=[target]), df[target]
    dropped = {}
    for col in X.select_dtypes(exclude="number").columns:  # parse dates first, or they look like ids
        parsed = pd.to_datetime(X[col], errors="coerce", format="mixed")
        if parsed.notna().mean() > 0.8:
            X[f"{col}_year"], X[f"{col}_month"], X[f"{col}_dow"] = parsed.dt.year, parsed.dt.month, parsed.dt.dayofweek
            X = X.drop(columns=[col])
            dropped[col] = "datetime -> year/month/dow"
    for col in list(X.columns):
        s = X[col]
        if s.nunique(dropna=True) <= 1:
            dropped[col] = "constant"
        elif not pd.api.types.is_numeric_dtype(s) and s.nunique() / len(s) > 0.9:
            dropped[col] = "id-like (near-unique text)"
        elif pd.api.types.is_integer_dtype(s) and s.is_monotonic_increasing and s.nunique() == len(s):
            dropped[col] = "id-like (row counter)"
    return X.drop(columns=[c for c in dropped if c in X.columns]), y, dropped
```

Also check, and report what you did:
- **Minimum rows**: ~50 labelled rows for anything meaningful (10 is a smoke test, not a model).
- **Target sanity**: single class → stop; >50 classes → group or reframe; extreme imbalance → report class shares
  and prefer F1/recall over accuracy.
- **Leakage**: columns derived from the target (`total` when predicting `price * qty`), recorded after the outcome
  (`cancelled_at` when predicting churn), or near-perfectly correlated with it. Flag any feature whose
  single-feature model scores almost perfectly; ask before keeping it.
- **Dtypes**: with pandas ≥ 3 text columns are `str`, not `object` — use `is_numeric_dtype` /
  `select_dtypes(exclude="number")`, not `dtype == object`, or ID checks silently stop working.

## If you are building this into an application

- Train off the request thread (worker or `run_in_executor`); model fitting inside an async handler blocks every
  other request.
- Turn validation errors into 4xx responses, not 500s.
- Store each run: target, task, row count used vs available, dropped columns, metrics, baseline metrics,
  importances, seed and library versions, tenant id.
- Give the run the same tenant scope and LLM-config resolution as the rest of the product (one helper, not a copy).

Related: `dataset-profiling` (types, cardinality, missing values before modelling), `grounded-answers`
(explaining numbers without inventing them).
