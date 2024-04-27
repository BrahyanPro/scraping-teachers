import json

POINTS_BY_SAME_SPOT = 2
POINTS_BY_OCCURRENCE = 1

json_path_nuevo_semestre = 'full_name_from_nuevosemestre.json'
json_path_ours = 'not-available-teachers.json'
json_output = './names.json'

ours_names = []
nsemestre_names = []

matches_names = []
not_matches_names = []

def clean_name(name):
    name = name.replace("\xa0", "")
    return name

with open(json_path_nuevo_semestre, 'r') as reader:
    names = json.loads(reader.read())

    for name in names:
        cleaned_name = clean_name(name['name'])
        nsemestre_names.append(cleaned_name)

with open(json_path_ours, 'r') as reader:
    names = json.loads(reader.read())

    for name in names:
        cleaned_name = clean_name(name['name'])
        ours_names.append(cleaned_name)

def get_initials(name):
    initials = []

    for word in name.split():
        initials.append(word[0])
    return initials

def compare_initials(our_name, semestre_name):
    initials_our_name = get_initials(our_name)
    initials_semestre_name = get_initials(semestre_name)
    points = 0
    i = 0
    j = 0

    while i < len(initials_our_name):
        found = False
        while j < len(initials_semestre_name):
            if initials_our_name[i] == initials_semestre_name[j]:
                found = True
                if i == j:
                    points += POINTS_BY_SAME_SPOT
                else:
                    points += POINTS_BY_OCCURRENCE
                break;
            j += 1

        if not found:
            return points
        i += 1

    return points


prev_matches = []
for our_name in ours_names:
    max_point_matches = 0
    best_match = ''

    for nsemestre_name in nsemestre_names:
        if nsemestre_name in prev_matches:
            continue

        if our_name.lower() == nsemestre_name.lower():
            best_match = { "our": our_name, "semestre": nsemestre_name }
            prev_matches.append(best_match)
            break

        initials_points = compare_initials(our_name, nsemestre_name)

        if initials_points > max_point_matches:
            max_point_matches = initials_points
            best_match = { "our": our_name, "semestre": nsemestre_name }

    prev_matches.append(best_match)
    matches_names.append(best_match)

with open(json_output, 'w') as writer:
    writer.write(json.dumps(matches_names))

print(len(matches_names))
