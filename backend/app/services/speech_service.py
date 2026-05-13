<<<<<<< HEAD
from pydub import AudioSegment
import speech_recognition as sr
import os

recognizer = sr.Recognizer()


def convert_to_wav(input_path, output_path):
    audio = AudioSegment.from_file(input_path)
    audio = audio.set_channels(1)
    audio = audio.set_frame_rate(16000)
    audio.export(output_path, format="wav")


def speech_to_text(file_path: str):

    try:
        converted_path = file_path.replace(".wav", "_clean.wav")

        # FORCE CONVERSION
        convert_to_wav(file_path, converted_path)

        with sr.AudioFile(converted_path) as source:
            audio = recognizer.record(source)

        text = recognizer.recognize_google(audio)

        # cleanup
        os.remove(converted_path)

        return text

    except Exception as e:
        raise Exception(f"Speech processing failed: {str(e)}")
=======
import speech_recognition as sr

def speech_to_text(file_path):

    r = sr.Recognizer()

    with sr.AudioFile(file_path) as source:
        audio = r.record(source)

    return r.recognize_google(audio)
>>>>>>> main
