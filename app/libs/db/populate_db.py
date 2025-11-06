from typing import Dict, List

from app.libs.db import models, db as db_help
from app.libs.stringproc import stringproc


client = db_help.MongoClient(
    db_help.MONGODB_URI,
    server_api=db_help.ServerApi("1"),
    tlsCAFile=db_help.certifi.where()
)
db = client.get_database("odes")


def insert_institutions() -> Dict[str, str]:
    institutions = [
        models.Institution(
            name="UniBuc FMI",
            time_grid_config=models.TimeGridConfig(
                weeks=2,
                days=5,
                timeslots_per_day=12,
                max_timeslots_per_day_per_group=8
            )
        )
    ]
    
    collection = db.get_collection(models.Institution.COLLECTION_NAME)
    result = collection.insert_many(
        [institution.model_dump(by_alias=True) for institution in institutions]
    )
    result_dict = {
        institution.name: institution_id
        for institution, institution_id in zip(institutions, result.inserted_ids)
    }
    print(f"Successfully inserted {len(institutions)} institutions.")
    return result_dict


def insert_rooms(institution_id: str) -> Dict[str, str]:
    rooms = [
        models.Room(
            institution_id=institution_id,
            name=f"{floor}{room}",
            capacity=120
        )
        for floor in range(1, 4)
        for room in range(1, 21)
    ]
    
    collection = db.get_collection(models.Room.COLLECTION_NAME)
    result = collection.insert_many([room.model_dump(by_alias=True) for room in rooms])
    result_dict = {
        room.name: room_id
        for room, room_id in zip(rooms, result.inserted_ids)
    }
    print(f"Successfully inserted {len(rooms)} rooms.")
    return result_dict


def insert_professors(institution_id: str) -> Dict[str, str]:
    profs = [
        models.User(
            name="Boriga",
            email="boriga@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Rusu",
            email="rusu@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Leustean",
            email="leustean@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Baetica",
            email="baetica@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Ilias",
            email="ilias@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Tomi",
            email="tomi@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        
        models.User(
            name="Negru",
            email="negru@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Niga",
            email="niga@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Floroiu",
            email="floroiu@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Balucea",
            email="balucea@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Ozunu",
            email="ozunu@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Popescu",
            email="popescu@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Zahiu",
            email="zahiu@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Dumitrescu",
            email="dumitrescu@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        
        models.User(
            name="Marinescu",
            email="marinescu@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Muresan",
            email="muresan@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Vladoiu",
            email="vladoiu@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Mihail",
            email="mihail@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Breazu",
            email="breazu@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        
        models.User(
            name="Bujor",
            email="bujor@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Macovei",
            email="macovei@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Deaconu",
            email="deaconu@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Cojman",
            email="cojman@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Cristea",
            email="cristea@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Manea",
            email="manea@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        
        models.User(
            name="Sfetcu",
            email="sfetcu@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Bulacu",
            email="bulacu@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Breazu",
            email="breazu@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        
        models.User(
            name="Sipos",
            email="sipos@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Dumitran",
            email="dumitran@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Budau",
            email="budau@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
        models.User(
            name="Magureanu",
            email="magureanu@fmi.unibuc.ro",
            user_roles={institution_id: [models.UserRole.PROFESSOR]}
        ),
    ]
    
    collection = db.get_collection(models.User.COLLECTION_NAME)
    result = collection.insert_many(
        [
            {
                **prof.model_dump(by_alias=True),
                "hashed_password": stringproc.hash_password(prof.email)
            } for prof in profs
        ]
    )
    result_dict = {
        prof.name: prof_id
        for prof, prof_id in zip(profs, result.inserted_ids)
    }
    print(f"Successfully inserted {len(profs)} users.")
    return result_dict


def insert_groups(institution_id: str) -> Dict[str, str]:
    collection = db.get_collection(models.Group.COLLECTION_NAME)
    
    groups_1 = [
        models.Group(
            institution_id=institution_id,
            name="Seria 13"
        ),
        models.Group(
            institution_id=institution_id,
            name="Seria 14"
        ),
        models.Group(
            institution_id=institution_id,
            name="Seria 15"
        )
    ]

    result_1 = collection.insert_many([group.model_dump(by_alias=True) for group in groups_1])
    result_dict_1 = {
        group.name: group_id
        for group, group_id in zip(groups_1, result_1.inserted_ids)
    }

    groups_2 = [
        models.Group(
            institution_id=institution_id,
            name="Grupa 131",
            parent_group_id=result_dict_1["Seria 13"]
        ),
        models.Group(
            institution_id=institution_id,
            name="Grupa 132",
            parent_group_id=result_dict_1["Seria 13"]
        ),
        models.Group(
            institution_id=institution_id,
            name="Grupa 133",
            parent_group_id=result_dict_1["Seria 13"]
        ),
        models.Group(
            institution_id=institution_id,
            name="Grupa 134",
            parent_group_id=result_dict_1["Seria 13"]
        ),

        models.Group(
            institution_id=institution_id,
            name="Grupa 141",
            parent_group_id=result_dict_1["Seria 14"]
        ),
        models.Group(
            institution_id=institution_id,
            name="Grupa 142",
            parent_group_id=result_dict_1["Seria 14"]
        ),
        models.Group(
            institution_id=institution_id,
            name="Grupa 143",
            parent_group_id=result_dict_1["Seria 14"]
        ),
        models.Group(
            institution_id=institution_id,
            name="Grupa 144",
            parent_group_id=result_dict_1["Seria 14"]
        ),

        models.Group(
            institution_id=institution_id,
            name="Grupa 151",
            parent_group_id=result_dict_1["Seria 15"]
        ),
        models.Group(
            institution_id=institution_id,
            name="Grupa 152",
            parent_group_id=result_dict_1["Seria 15"]
        )
    ]

    result_2 = collection.insert_many([group.model_dump(by_alias=True) for group in groups_2])
    result_dict_2 = {
        group.name: group_id
        for group, group_id in zip(groups_2, result_2.inserted_ids)
    }

    groups_3 = [
        models.Group(
            institution_id=institution_id,
            name="Semigrupa 131_1",
            parent_group_id=result_dict_2["Grupa 131"]
        ),
        models.Group(
            institution_id=institution_id,
            name="Semigrupa 131_2",
            parent_group_id=result_dict_2["Grupa 131"]
        ),

        models.Group(
            institution_id=institution_id,
            name="Semigrupa 132_1",
            parent_group_id=result_dict_2["Grupa 132"]
        ),
        models.Group(
            institution_id=institution_id,
            name="Semigrupa 132_2",
            parent_group_id=result_dict_2["Grupa 132"]
        ),

        models.Group(
            institution_id=institution_id,
            name="Semigrupa 133_1",
            parent_group_id=result_dict_2["Grupa 133"]
        ),
        models.Group(
            institution_id=institution_id,
            name="Semigrupa 133_2",
            parent_group_id=result_dict_2["Grupa 133"]
        ),

        models.Group(
            institution_id=institution_id,
            name="Semigrupa 134_1",
            parent_group_id=result_dict_2["Grupa 134"]
        ),
        models.Group(
            institution_id=institution_id,
            name="Semigrupa 134_2",
            parent_group_id=result_dict_2["Grupa 134"]
        ),

        models.Group(
            institution_id=institution_id,
            name="Semigrupa 141_1",
            parent_group_id=result_dict_2["Grupa 141"]
        ),
        models.Group(
            institution_id=institution_id,
            name="Semigrupa 141_2",
            parent_group_id=result_dict_2["Grupa 141"]
        ),

        models.Group(
            institution_id=institution_id,
            name="Semigrupa 142_1",
            parent_group_id=result_dict_2["Grupa 142"]
        ),
        models.Group(
            institution_id=institution_id,
            name="Semigrupa 142_2",
            parent_group_id=result_dict_2["Grupa 142"]
        ),

        models.Group(
            institution_id=institution_id,
            name="Semigrupa 143_1",
            parent_group_id=result_dict_2["Grupa 143"]
        ),
        models.Group(
            institution_id=institution_id,
            name="Semigrupa 143_2",
            parent_group_id=result_dict_2["Grupa 143"]
        ),

        models.Group(
            institution_id=institution_id,
            name="Semigrupa 144_1",
            parent_group_id=result_dict_2["Grupa 144"]
        ),
        models.Group(
            institution_id=institution_id,
            name="Semigrupa 144_2",
            parent_group_id=result_dict_2["Grupa 144"]
        ),

        models.Group(
            institution_id=institution_id,
            name="Semigrupa 151_1",
            parent_group_id=result_dict_2["Grupa 151"]
        ),
        models.Group(
            institution_id=institution_id,
            name="Semigrupa 151_2",
            parent_group_id=result_dict_2["Grupa 151"]
        ),

        models.Group(
            institution_id=institution_id,
            name="Semigrupa 152_1",
            parent_group_id=result_dict_2["Grupa 152"]
        ),
        models.Group(
            institution_id=institution_id,
            name="Semigrupa 152_2",
            parent_group_id=result_dict_2["Grupa 152"]
        )
    ]

    result_3 = collection.insert_many([group.model_dump(by_alias=True) for group in groups_3])
    result_dict_3 = {
        group.name: group_id
        for group, group_id in zip(groups_3, result_3.inserted_ids)
    }

    result_dict = result_dict_1.copy()
    result_dict.update(result_dict_2)
    result_dict.update(result_dict_3)

    print(f"Successfully inserted {len(groups_1) + len(groups_2) + len(groups_3)} groups.")

    return result_dict


def insert_courses(institution_id: str) -> Dict[str, str]:
    courses = [
        models.Course(name="PA", institution_id=institution_id),
        models.Course(name="ASC", institution_id=institution_id),
        models.Course(name="LMC", institution_id=institution_id),
        models.Course(name="SAI", institution_id=institution_id),
        models.Course(name="CDI", institution_id=institution_id),
        models.Course(name="GCEA", institution_id=institution_id)
    ]

    collection = db.get_collection(models.Course.COLLECTION_NAME)
    result = collection.insert_many([course.model_dump(by_alias=True) for course in courses])
    result_dict = {
        course.name: course_id
        for course, course_id in zip(courses, result.inserted_ids)
    }
    return result_dict


def insert_activities(
        institution_id: str,
        courses: Dict[str, str],
        groups: Dict[str, str],
        profs: Dict[str, str]
) -> List[str]:
    activities = [
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.COURSE,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Seria 13"],
            professor_id=profs["Boriga"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.COURSE,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Seria 13"],
            professor_id=profs["Rusu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["LMC"],
            activity_type=models.ActivityType.COURSE,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Seria 13"],
            professor_id=profs["Leustean"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["SAI"],
            activity_type=models.ActivityType.COURSE,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Seria 13"],
            professor_id=profs["Baetica"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["CDI"],
            activity_type=models.ActivityType.COURSE,
            duration_slots=3,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Seria 13"],
            professor_id=profs["Ilias"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["GCEA"],
            activity_type=models.ActivityType.COURSE,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Seria 13"],
            professor_id=profs["Tomi"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 131"],
            professor_id=profs["Boriga"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 132"],
            professor_id=profs["Boriga"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 133"],
            professor_id=profs["Boriga"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 134"],
            professor_id=profs["Boriga"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 131"],
            professor_id=profs["Rusu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 132"],
            professor_id=profs["Rusu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 133"],
            professor_id=profs["Rusu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 134"],
            professor_id=profs["Rusu"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 131_1"],
            professor_id=profs["Negru"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 131_2"],
            professor_id=profs["Negru"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 132_1"],
            professor_id=profs["Negru"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 132_2"],
            professor_id=profs["Negru"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 133_1"],
            professor_id=profs["Negru"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 133_2"],
            professor_id=profs["Negru"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 134_1"],
            professor_id=profs["Niga"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 134_2"],
            professor_id=profs["Floroiu"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 131"],
            professor_id=profs["Balucea"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 132"],
            professor_id=profs["Balucea"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 133"],
            professor_id=profs["Balucea"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 134"],
            professor_id=profs["Balucea"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["LMC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 131"],
            professor_id=profs["Ozunu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["LMC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 132"],
            professor_id=profs["Ozunu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["LMC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 133"],
            professor_id=profs["Ozunu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["LMC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 134"],
            professor_id=profs["Ozunu"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["SAI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 131"],
            professor_id=profs["Baetica"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["SAI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 132"],
            professor_id=profs["Baetica"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["SAI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 133"],
            professor_id=profs["Baetica"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["SAI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 134"],
            professor_id=profs["Popescu"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["CDI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 131"],
            professor_id=profs["Ilias"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["CDI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 132"],
            professor_id=profs["Ilias"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["CDI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 133"],
            professor_id=profs["Ilias"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["CDI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 134"],
            professor_id=profs["Ilias"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["GCEA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 131"],
            professor_id=profs["Zahiu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["GCEA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 132"],
            professor_id=profs["Zahiu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["GCEA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 133"],
            professor_id=profs["Dumitrescu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["GCEA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 134"],
            professor_id=profs["Dumitrescu"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.COURSE,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Seria 14"],
            professor_id=profs["Marinescu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.COURSE,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Seria 14"],
            professor_id=profs["Rusu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["LMC"],
            activity_type=models.ActivityType.COURSE,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Seria 14"],
            professor_id=profs["Muresan"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["SAI"],
            activity_type=models.ActivityType.COURSE,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Seria 14"],
            professor_id=profs["Vladoiu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["CDI"],
            activity_type=models.ActivityType.COURSE,
            duration_slots=3,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Seria 14"],
            professor_id=profs["Mihail"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["GCEA"],
            activity_type=models.ActivityType.COURSE,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Seria 14"],
            professor_id=profs["Breazu"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["SAI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 141"],
            professor_id=profs["Vladoiu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["GCEA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 141"],
            professor_id=profs["Bujor"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 141"],
            professor_id=profs["Deaconu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 141"],
            professor_id=profs["Marinescu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["LMC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 141"],
            professor_id=profs["Muresan"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["CDI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 141"],
            professor_id=profs["Mihail"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 141"],
            professor_id=profs["Macovei"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 141_1"],
            professor_id=profs["Marinescu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 141_2"],
            professor_id=profs["Marinescu"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["SAI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 142"],
            professor_id=profs["Cojman"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["GCEA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 142"],
            professor_id=profs["Bujor"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 142"],
            professor_id=profs["Deaconu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 142"],
            professor_id=profs["Marinescu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["LMC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 142"],
            professor_id=profs["Muresan"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["CDI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 142"],
            professor_id=profs["Mihail"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 142"],
            professor_id=profs["Macovei"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 142_1"],
            professor_id=profs["Marinescu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 142_2"],
            professor_id=profs["Marinescu"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["SAI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 143"],
            professor_id=profs["Cojman"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["GCEA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 143"],
            professor_id=profs["Cristea"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 143"],
            professor_id=profs["Deaconu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 143"],
            professor_id=profs["Marinescu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["LMC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 143"],
            professor_id=profs["Muresan"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["CDI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 143"],
            professor_id=profs["Ilias"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 143"],
            professor_id=profs["Macovei"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 143_1"],
            professor_id=profs["Negru"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 143_2"],
            professor_id=profs["Negru"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["SAI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 144"],
            professor_id=profs["Cojman"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["GCEA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 144"],
            professor_id=profs["Cristea"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 144"],
            professor_id=profs["Deaconu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 144"],
            professor_id=profs["Marinescu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["LMC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 144"],
            professor_id=profs["Muresan"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["CDI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 144"],
            professor_id=profs["Ilias"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 144"],
            professor_id=profs["Macovei"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 144_1"],
            professor_id=profs["Manea"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 144_2"],
            professor_id=profs["Manea"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.COURSE,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Seria 15"],
            professor_id=profs["Boriga"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.COURSE,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Seria 15"],
            professor_id=profs["Rusu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["LMC"],
            activity_type=models.ActivityType.COURSE,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Seria 15"],
            professor_id=profs["Leustean"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["SAI"],
            activity_type=models.ActivityType.COURSE,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Seria 15"],
            professor_id=profs["Bulacu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["CDI"],
            activity_type=models.ActivityType.COURSE,
            duration_slots=3,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Seria 15"],
            professor_id=profs["Sfetcu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["GCEA"],
            activity_type=models.ActivityType.COURSE,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Seria 15"],
            professor_id=profs["Breazu"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 151"],
            professor_id=profs["Dumitran"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 152"],
            professor_id=profs["Dumitran"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["GCEA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 151"],
            professor_id=profs["Zahiu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["GCEA"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 152"],
            professor_id=profs["Zahiu"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["CDI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 151"],
            professor_id=profs["Sfetcu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["CDI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 152"],
            professor_id=profs["Sfetcu"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["LMC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 151"],
            professor_id=profs["Sipos"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["LMC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 152"],
            professor_id=profs["Sipos"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 151"],
            professor_id=profs["Rusu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["ASC"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Grupa 152"],
            professor_id=profs["Rusu"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["SAI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 151"],
            professor_id=profs["Bulacu"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["SAI"],
            activity_type=models.ActivityType.SEMINAR,
            duration_slots=2,
            frequency=models.Frequency.WEEKLY,
            group_id=groups["Grupa 152"],
            professor_id=profs["Bulacu"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 151_1"],
            professor_id=profs["Budau"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 151_2"],
            professor_id=profs["Magureanu"]
        ),

        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 152_2"],
            professor_id=profs["Budau"]
        ),
        models.Activity(
            institution_id=institution_id,
            course_id=courses["PA"],
            activity_type=models.ActivityType.LABORATORY,
            duration_slots=2,
            frequency=models.Frequency.BIWEEKLY,
            group_id=groups["Semigrupa 152_1"],
            professor_id=profs["Magureanu"]
        ),
    ]

    collection = db.get_collection(models.Activity.COLLECTION_NAME)
    result = collection.insert_many(
        [activity.model_dump(by_alias=True) for activity in activities]
    )
    print(f"Successfully inserted {len(activities)} activities")
    return result.inserted_ids


def populate_db_with_sample_data():
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
        groups=groups
    )

    return institution_id, rooms, professors, groups, courses, activities


if __name__ == "__main__":
    populate_db_with_sample_data()
