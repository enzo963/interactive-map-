"""Apply reviewed site-identity decisions. Nothing is merged unless a decision names it.

Decision actions:
  * merge     — `merge` is the same place as `keep`. Its name (or the decision's `alias`,
                when the old card title is not a name), alternative names and sources
                are added to `keep`, whose own names are never removed; coordinates
                move only when `keep` has none.
                `keep` lists the old id in `mergedFrom`, and records whose
                `parentSite` pointed at the old id point at `keep`.
  * component — `child` is a monument inside the complex `parent`; sets `child.parentSite`.
  * distinct  — the listed `sites` are different places despite similar names or
                shared evidence. Nothing changes; the report stops listing the pair.

Applying the same decisions again changes nothing.
"""
import copy

from .site_identity import identity_url, normalize_name

ACTIONS = {"merge", "component", "distinct"}


class DecisionError(ValueError):
    pass


def decision_pairs(decisions):
    """Unordered id pairs settled by a decision, for silencing the duplicate report."""
    pairs = set()
    for decision in decisions:
        action = decision.get("action")
        if action == "merge":
            pairs.add(frozenset((decision["keep"], decision["merge"])))
        elif action == "component":
            pairs.add(frozenset((decision["parent"], decision["child"])))
        elif action == "distinct":
            sites = decision["sites"]
            pairs.update(frozenset((a, b)) for i, a in enumerate(sites) for b in sites[i + 1:])
    return pairs


def _check(decision):
    action = decision.get("action")
    if action not in ACTIONS:
        raise DecisionError(f"unknown action {action!r}")
    if not isinstance(decision.get("reason"), str) or not decision["reason"].strip():
        raise DecisionError(f"{action} decision needs a reason")
    keys = {"merge": ("keep", "merge"), "component": ("parent", "child")}.get(action)
    if keys:
        a, b = decision.get(keys[0]), decision.get(keys[1])
        if not isinstance(a, str) or not isinstance(b, str) or a == b:
            raise DecisionError(f"{action} decision needs two different ids: {decision}")
    elif not isinstance(decision.get("sites"), list) or len(set(decision["sites"])) < 2:
        raise DecisionError(f"distinct decision needs at least two ids: {decision}")


def _merge(by_id, records, keep_id, merge_id, reason, alias=None):
    keep = by_id.get(keep_id)
    if keep is None:
        raise DecisionError(f"merge target {keep_id} does not exist")
    duplicate = by_id.get(merge_id)
    if duplicate is None:
        if merge_id in keep.get("mergedFrom", []):
            return None
        raise DecisionError(f"{merge_id} does not exist and was not merged into {keep_id}")

    names = list(keep.get("alternativeNames", []))
    seen = {normalize_name(name) for name in [keep["name"], *names]}
    for name in [alias or duplicate["name"], *duplicate.get("alternativeNames", [])]:
        key = normalize_name(name)
        if key and key not in seen:
            seen.add(key)
            names.append(name)
    keep["alternativeNames"] = names

    urls = {identity_url(source.get("url")) for source in keep["sources"]}
    keep["sources"] = keep["sources"] + [source for source in duplicate["sources"] if identity_url(source.get("url")) not in urls]

    if "latitude" not in keep and "latitude" in duplicate:
        for field in ("latitude", "longitude", "coordinates_source", "coordinates_precision"):
            if field in duplicate:
                keep[field] = duplicate[field]
    if merge_id not in keep.get("mergedFrom", []):
        keep["mergedFrom"] = [*keep.get("mergedFrom", []), merge_id]
        note = f"Merged {merge_id} ({duplicate['name']}): {reason}"
        keep["review_notes"] = f"{keep['review_notes']} {note}" if keep.get("review_notes") else note

    for record in records:
        if record.get("parentSite") == merge_id:
            record["parentSite"] = keep_id
    if keep.get("parentSite") == keep_id:
        del keep["parentSite"]
    return f"merged {merge_id} into {keep_id}"


def _component(by_id, parent_id, child_id):
    if parent_id not in by_id or child_id not in by_id:
        raise DecisionError(f"component decision names a missing id: {parent_id}, {child_id}")
    ancestor = parent_id
    while ancestor:
        if ancestor == child_id:
            raise DecisionError(f"{child_id} cannot sit inside its own component {parent_id}")
        ancestor = by_id[ancestor].get("parentSite") if ancestor in by_id else None
    child = by_id[child_id]
    if child.get("parentSite") == parent_id:
        return None
    child["parentSite"] = parent_id
    return f"{child_id} is a component of {parent_id}"


def apply_decisions(records, decisions):
    """Return (new records, change log). Inputs are not changed."""
    for decision in decisions:
        _check(decision)
    records = copy.deepcopy(records)
    log = []
    for decision in decisions:
        by_id = {record["id"]: record for record in records}
        if decision["action"] == "merge":
            change = _merge(by_id, records, decision["keep"], decision["merge"], decision["reason"], decision.get("alias"))
            if change:
                records = [record for record in records if record["id"] != decision["merge"]]
        elif decision["action"] == "component":
            change = _component(by_id, decision["parent"], decision["child"])
        else:
            missing = [site for site in decision["sites"] if site not in by_id]
            if missing:
                raise DecisionError(f"distinct decision names missing ids: {missing}")
            change = None
        if change:
            log.append(change)
    return records, log
