import os
import re
from typing import Dict, List, Optional

import yaml

from app.libs.db import models, db as db_help
from app.libs.stringproc import stringproc


client = db_help.MongoClient(
    db_help.MONGODB_URI,
    server_api=db_help.ServerApi("1"),
    tlsCAFile=db_help.certifi.where()
)
db = client.get_database("odes")

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def _load(filename: str):
    with open(os.path.join(DATA_DIR, filename)) as f:
        return yaml.safe_load(f)


def insert_admin(institution_id: str, restored_emails: set) -> Optional[str]:
    """Create the institution owner admin account defined in institution.yaml.

    Skips insertion when the email was already restored from a previous run
    (to avoid a duplicate-key error on the unique email index).
    """
    data = _load("institution.yaml")
    admin_data = data["admin"]
    email = admin_data["email"]

    if email in restored_emails:
        print(f"Admin '{email}' already restored — skipping insert.")
        return None

    admin = models.User(
        name=admin_data["name"],
        email=email,
        user_roles={institution_id: [models.UserRole.ADMIN]},
    )
    users_coll = db.get_collection(models.User.COLLECTION_NAME)
    result = users_coll.insert_one({
        **admin.model_dump(by_alias=True),
        "hashed_password": stringproc.hash_password(admin_data["password"]),
    })
    print(f"Inserted admin '{email}'.")
    return result.inserted_id


def insert_institutions() -> Dict[str, str]:
    data = _load("institution.yaml")
    tg = data["time_grid"]
    institution = models.Institution(
        name=data["name"],
        time_grid_config=models.TimeGridConfig(
            weeks=tg["weeks"],
            days=tg["days"],
            timeslots_per_day=tg["timeslots_per_day"],
            max_timeslots_per_day_per_group=tg["max_timeslots_per_day_per_group"],
            start_hour=tg.get("start_hour", 8),
            start_minute=tg.get("start_minute", 0),
            timeslot_duration_minutes=tg.get("timeslot_duration_minutes", 60),
            start_day=tg.get("start_day", 0),
        )
    )
    collection = db.get_collection(models.Institution.COLLECTION_NAME)
    result = collection.insert_one(institution.model_dump(by_alias=True))
    print(f"Successfully inserted institution '{institution.name}'.")
    return {institution.name: result.inserted_id}


def insert_rooms(institution_id: str) -> Dict[str, str]:
    data = _load("rooms.yaml")
    rooms = [
        models.Room(
            institution_id=institution_id,
            name=r["name"],
            capacity=r["capacity"],
            features=r.get("features", []),
        )
        for r in data["rooms"]
    ]
    collection = db.get_collection(models.Room.COLLECTION_NAME)
    result = collection.insert_many([r.model_dump(by_alias=True) for r in rooms])
    result_dict = {r.name: rid for r, rid in zip(rooms, result.inserted_ids)}
    print(f"Successfully inserted {len(rooms)} rooms.")
    return result_dict


def insert_professors(institution_id: str) -> Dict[str, str]:
    data = _load("professors.yaml")
    profs = [
        models.User(
            name=p["name"],
            email=p["email"],
            user_roles={institution_id: [models.UserRole.PROFESSOR]},
        )
        for p in data
    ]
    collection = db.get_collection(models.User.COLLECTION_NAME)
    result = collection.insert_many([
        {**p.model_dump(by_alias=True), "hashed_password": stringproc.hash_password(p.email)}
        for p in profs
    ])
    result_dict = {p.name: pid for p, pid in zip(profs, result.inserted_ids)}
    print(f"Successfully inserted {len(profs)} professors.")
    return result_dict


# ── Per-subtree default timeslot preferences ─────────────────────────────────
# Applied at populate time to a named group AND every descendant of it, so the
# preference lands directly on each group's own document — every master group
# and master optional subgroup an activity might target — rather than relying on
# any ancestor look-up.
#
# Windows are keyed by slot-in-day.  With the institution grid (start_hour=8,
# 60-minute slots) slot-in-day s starts at hour 8 + s:
#   08-10 (slots 0,1)     -> DESIRED      (ideal)
#   10-12 (slots 2,3)     -> NOT_IDEAL    (soft penalty)
#   12-16 (slots 4,5,6,7) -> UNAVAILABLE  (hard block)
#   16-18 (slots 8,9)     -> NOT_IDEAL    (soft penalty)
#   18-20 (slots 10,11)   -> DESIRED      (ideal)
_MASTER_SLOT_PREFERENCES = {
    0: models.TimeslotPreferenceValue.DESIRED,
    1: models.TimeslotPreferenceValue.DESIRED,
    2: models.TimeslotPreferenceValue.NOT_IDEAL,
    3: models.TimeslotPreferenceValue.NOT_IDEAL,
    4: models.TimeslotPreferenceValue.UNAVAILABLE,
    5: models.TimeslotPreferenceValue.UNAVAILABLE,
    6: models.TimeslotPreferenceValue.UNAVAILABLE,
    7: models.TimeslotPreferenceValue.UNAVAILABLE,
    8: models.TimeslotPreferenceValue.NOT_IDEAL,
    9: models.TimeslotPreferenceValue.NOT_IDEAL,
    10: models.TimeslotPreferenceValue.DESIRED,
    11: models.TimeslotPreferenceValue.DESIRED,
}

# Root group name -> {slot_in_day: preference}.  The preference applies to the
# named group and ALL of its descendants.
_SUBTREE_PREFERENCE_ROOTS = {
    "Master": _MASTER_SLOT_PREFERENCES,
}


def _build_group_preferences(slot_prefs: Dict[int, "models.TimeslotPreferenceValue"],
                             days: int, tpd: int) -> List[models.TimeslotPreference]:
    """Expand a per-day {slot_in_day: preference} map to absolute within-week
    slots for every day (slot = day * tpd + slot_in_day)."""
    prefs: List[models.TimeslotPreference] = []
    for d in range(days):
        for s, value in slot_prefs.items():
            if s < tpd:
                prefs.append(models.TimeslotPreference(slot=d * tpd + s, preference=value))
    return prefs


def _insert_group_node(
    collection,
    institution_id: str,
    node,
    parent_id: Optional[str],
    ids: Dict[str, str],
    subtree_prefs: Dict[str, List[models.TimeslotPreference]],
    inherited_prefs: List[models.TimeslotPreference],
    counter: Dict[str, int],
):
    name = node if isinstance(node, str) else node["name"]
    children = [] if isinstance(node, str) else node.get("children", [])

    # This node's preferences: if it (or an ancestor) is a preference root, use
    # that root's preferences; the assignment then flows to all descendants.
    prefs = subtree_prefs.get(name, inherited_prefs)

    group = models.Group(
        institution_id=institution_id,
        name=name,
        parent_group_id=parent_id,
        timeslot_preferences=prefs,
    )
    result = collection.insert_one(group.model_dump(by_alias=True))
    ids[name] = result.inserted_id
    if prefs:
        counter["groups"] += 1

    for child in children:
        _insert_group_node(collection, institution_id, child, ids[name], ids,
                           subtree_prefs, prefs, counter)


def insert_groups(institution_id: str) -> Dict[str, str]:
    data = _load("groups.yaml")
    collection = db.get_collection(models.Group.COLLECTION_NAME)

    grid = _load("institution.yaml")["time_grid"]
    days, tpd = grid["days"], grid["timeslots_per_day"]
    subtree_prefs = {
        gname: _build_group_preferences(slot_prefs, days, tpd)
        for gname, slot_prefs in _SUBTREE_PREFERENCE_ROOTS.items()
    }

    ids: Dict[str, str] = {}
    counter = {"groups": 0}
    for node in data:
        _insert_group_node(collection, institution_id, node, None, ids,
                           subtree_prefs, [], counter)
    print(f"Successfully inserted {len(ids)} groups "
          f"(timeslot preferences set on {counter['groups']} group(s)).")
    return ids


def insert_courses(institution_id: str) -> Dict[str, str]:
    data = _load("courses.yaml")
    courses = [models.Course(name=name, institution_id=institution_id) for name in data]
    collection = db.get_collection(models.Course.COLLECTION_NAME)
    result = collection.insert_many([c.model_dump(by_alias=True) for c in courses])
    result_dict = {c.name: cid for c, cid in zip(courses, result.inserted_ids)}
    print(f"Successfully inserted {len(courses)} courses.")
    return result_dict


def _is_numbered_group(name: str) -> bool:
    """True if the group name starts with at least 3 consecutive digits (e.g. '101', '505 BDTS')."""
    return bool(re.match(r'^\d{3}', name))


def insert_students(institution_id: str, groups: Dict[str, str]) -> List[str]:
    data = _load("groups.yaml")

    all_students = []
    student_counter = [0]

    def assign(count: int, path: List[str]):
        group_ids = [str(groups[n]) for n in path if n in groups]
        for _ in range(count):
            student_counter[0] += 1
            idx = student_counter[0]
            all_students.append(models.User(
                name=f"student_{idx}",
                email=f"student.{idx}@fmi.unibuc.ro",
                user_roles={institution_id: [models.UserRole.STUDENT]},
                group_ids=group_ids,
            ))

    def walk(node, ancestors: List[str]):
        name = node if isinstance(node, str) else node["name"]

        # Skip all optional subtrees entirely (no students)
        if name.startswith("Optionale"):
            return

        children = [] if isinstance(node, str) else node.get("children", [])
        current_path = ancestors + [name]

        if _is_numbered_group(name):
            if not children:
                # Leaf numbered group (e.g. "501 ASM"): 26 students
                assign(26, current_path)
            else:
                # Has semigroups: distribute 26 students evenly across children
                n = len(children)
                per_semigroup = 26 // n
                for child in children:
                    child_name = child if isinstance(child, str) else child["name"]
                    assign(per_semigroup, current_path + [child_name])
        else:
            # Non-numbered group: recurse into children
            for child in children:
                walk(child, current_path)

    for root_node in data:
        walk(root_node, [])

    collection = db.get_collection(models.User.COLLECTION_NAME)
    result = collection.insert_many([
        {**s.model_dump(by_alias=True), "hashed_password": stringproc.hash_password(s.email)}
        for s in all_students
    ])
    print(f"Successfully inserted {len(all_students)} students.")
    return result.inserted_ids


def insert_activities(
    institution_id: str,
    courses: Dict[str, str],
    groups: Dict[str, str],
    profs: Dict[str, str],
) -> List[str]:
    activities_dir = os.path.join(DATA_DIR, "activities")
    all_activities = []

    for filename in sorted(os.listdir(activities_dir)):
        if not filename.endswith(".yaml"):
            continue
        with open(os.path.join(activities_dir, filename)) as f:
            data = yaml.safe_load(f)
        group_name = data["group"]
        for act in data.get("activities", []):
            professor_name = act.get("professor")
            activity_type = models.ActivityType(act["type"])
            required_features = act.get("required_room_features", [])
            if activity_type == models.ActivityType.LABORATORY and "laborator" not in required_features:
                required_features = list(required_features) + ["laborator"]
            sel_ts_data = act.get("selected_timeslot")
            selected_timeslot = None
            if sel_ts_data is not None:
                selected_timeslot = models.SelectedTimeslot(
                    start_timeslot=sel_ts_data["start"],
                    active_weeks=sel_ts_data["weeks"],
                )
            extra_group_ids = [
                groups[g] for g in act.get("additional_groups", []) if g in groups
            ]
            all_activities.append(models.Activity(
                institution_id=institution_id,
                course_id=courses[act["course"]],
                activity_type=activity_type,
                duration_slots=act["duration_slots"],
                frequency=models.Frequency(act["frequency"]),
                group_ids=[groups[group_name]] + extra_group_ids,
                professor_id=profs.get(professor_name) if professor_name else None,
                required_room_features=required_features,
                selected_timeslot=selected_timeslot,
            ))

    collection = db.get_collection(models.Activity.COLLECTION_NAME)
    result = collection.insert_many([a.model_dump(by_alias=True) for a in all_activities])
    print(f"Successfully inserted {len(all_activities)} activities.")
    return result.inserted_ids


_COLLECTIONS_TO_CLEAR = [
    models.Institution.COLLECTION_NAME,
    models.Room.COLLECTION_NAME,
    models.User.COLLECTION_NAME,
    models.Group.COLLECTION_NAME,
    models.Course.COLLECTION_NAME,
    models.Activity.COLLECTION_NAME,
    "schedules",
    "scheduled_activity_records",
]


def drop_all():
    """Drop every ODES collection so the script can be re-run safely.

    Admin users are preserved: their email + hashed_password are saved
    before the drop and re-inserted (with the new institution_id) after
    populate finishes.  Call restore_admins(institution_id) afterwards.
    """
    users_coll = db.get_collection(models.User.COLLECTION_NAME)
    admins = []
    for u in users_coll.find({}):
        for role_list in u.get("user_roles", {}).values():
            if "admin" in role_list:
                admins.append({
                    "_id": u["_id"],
                    "name": u.get("name", ""),
                    "email": u["email"],
                    "hashed_password": u.get("hashed_password"),
                    "user_roles": {},
                    "group_ids": [],
                    "timeslot_preferences": {},
                    "max_timeslots_per_day": {},
                })
                break
    for name in _COLLECTIONS_TO_CLEAR:
        db.drop_collection(name)
    print(f"Dropped {len(_COLLECTIONS_TO_CLEAR)} collections. Saved {len(admins)} admin(s).")
    return admins


def restore_admins(institution_id: str, admins: list):
    """Re-insert saved admin users under the new institution_id."""
    if not admins:
        return
    users_coll = db.get_collection(models.User.COLLECTION_NAME)
    for admin in admins:
        admin["user_roles"] = {str(institution_id): ["admin"]}
        users_coll.insert_one(admin)
    print(f"Restored {len(admins)} admin user(s).")


def _ensure_indexes():
    """Create indexes that must exist for correct query performance."""
    users_coll = db.get_collection(models.User.COLLECTION_NAME)
    users_coll.create_index("email", unique=True)
    users_coll.create_index("group_ids")
    print("Indexes ensured on users collection.")


def populate_db_with_sample_data():
    admins = drop_all()
    institutions = insert_institutions()
    institution_id = institutions["UniBuc FMI"]

    rooms = insert_rooms(institution_id=institution_id)
    professors = insert_professors(institution_id=institution_id)
    groups = insert_groups(institution_id=institution_id)
    courses = insert_courses(institution_id=institution_id)

    activities = insert_activities(
        institution_id=institution_id,
        courses=courses,
        profs=professors,
        groups=groups,
    )

    students = insert_students(institution_id=institution_id, groups=groups)

    restore_admins(institution_id=institution_id, admins=admins)
    restored_emails = {a["email"] for a in admins}
    insert_admin(institution_id=institution_id, restored_emails=restored_emails)
    _ensure_indexes()

    return institution_id, rooms, professors, groups, courses, activities, students


if __name__ == "__main__":
    populate_db_with_sample_data()
