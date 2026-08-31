python -c "
from beat_generator import target_frames_for_word_count
assert target_frames_for_word_count(2) == 45
assert target_frames_for_word_count(10) == 45
assert target_frames_for_word_count(20) == 90
assert target_frames_for_word_count(30) == 135
assert target_frames_for_word_count(50) == 180
assert target_frames_for_word_count(100) == 180
print('3.3 OK')
"
