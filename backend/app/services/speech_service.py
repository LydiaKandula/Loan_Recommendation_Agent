import speech_recognition as sr

def speech_to_text(file_path):

    r = sr.Recognizer()

    with sr.AudioFile(file_path) as source:
        audio = r.record(source)

    return r.recognize_google(audio)
